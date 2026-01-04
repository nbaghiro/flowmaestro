/**
 * Audio Input Node Handler (STT - Speech-to-Text)
 *
 * Transcribes audio from file uploads or recordings.
 * Supports OpenAI Whisper and Deepgram providers.
 */

import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import OpenAI from "openai";
import type { JsonObject } from "@flowmaestro/shared";
import { config as appConfig } from "../../../../../core/config";
import { getUploadsStorageService } from "../../../../../services/GCSStorageService";
import { createActivityLogger } from "../../../../core";
import {
    AudioInputNodeConfigSchema,
    validateOrThrow,
    type AudioInputNodeConfig
} from "../../../../core/schemas";
import { BaseNodeHandler, type NodeHandlerInput, type NodeHandlerOutput } from "../../types";

const logger = createActivityLogger({ nodeType: "AudioInput" });

// ============================================================================
// TYPES
// ============================================================================

export type { AudioInputNodeConfig };

/**
 * Audio input data from workflow trigger.
 */
export interface AudioInputData {
    fileName: string;
    mimeType: string;
    gcsUri?: string;
    base64?: string;
}

/**
 * Result from audio transcription.
 */
export interface AudioInputNodeResult {
    text: string;
    language?: string;
    provider: string;
    model: string;
    duration?: number;
    metadata?: {
        confidence?: number;
        words?: Array<{
            word: string;
            start: number;
            end: number;
            confidence?: number;
        }>;
    };
}

// ============================================================================
// PROVIDER IMPLEMENTATIONS
// ============================================================================

/**
 * Transcribe audio using OpenAI Whisper.
 */
async function transcribeWithOpenAI(
    audioPath: string,
    config: AudioInputNodeConfig
): Promise<AudioInputNodeResult> {
    const apiKey = appConfig.ai.openai.apiKey;
    if (!apiKey) {
        throw new Error("OPENAI_API_KEY is not configured");
    }

    const openai = new OpenAI({ apiKey });
    const audioFile = await fs.open(audioPath, "r");

    // Handle "auto" as no language specification
    const language = config.language === "auto" ? undefined : config.language;

    try {
        logger.info("Calling OpenAI Whisper API", {
            model: config.model || "whisper-1",
            language
        });

        const response = await openai.audio.transcriptions.create({
            file: audioFile as unknown as File,
            model: config.model || "whisper-1",
            language,
            response_format: "verbose_json"
        });

        return {
            text: response.text,
            language: response.language,
            provider: "openai",
            model: config.model || "whisper-1",
            duration: response.duration,
            metadata: {
                words: response.words?.map((w) => ({
                    word: w.word,
                    start: w.start,
                    end: w.end
                }))
            }
        };
    } finally {
        await audioFile.close();
    }
}

/**
 * Transcribe audio using Deepgram.
 */
async function transcribeWithDeepgram(
    audioPath: string,
    config: AudioInputNodeConfig
): Promise<AudioInputNodeResult> {
    const apiKey = appConfig.ai.deepgram?.apiKey;
    if (!apiKey) {
        throw new Error("DEEPGRAM_API_KEY is not configured");
    }

    const audioBuffer = await fs.readFile(audioPath);

    // Handle "auto" as no language specification
    const language = config.language === "auto" ? undefined : config.language;

    // Build query params
    const params = new URLSearchParams({
        model: config.model || "nova-2",
        punctuate: String(config.punctuate ?? true),
        diarize: String(config.diarize ?? false)
    });
    if (language) {
        params.set("language", language);
    }

    logger.info("Calling Deepgram API", {
        model: config.model || "nova-2",
        language,
        punctuate: config.punctuate,
        diarize: config.diarize
    });

    const response = await fetch(`https://api.deepgram.com/v1/listen?${params.toString()}`, {
        method: "POST",
        headers: {
            Authorization: `Token ${apiKey}`,
            "Content-Type": "audio/mpeg"
        },
        body: audioBuffer
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Deepgram API error: ${response.status} ${errorText}`);
    }

    interface DeepgramWord {
        word: string;
        start: number;
        end: number;
        confidence: number;
    }

    interface DeepgramResponse {
        results?: {
            channels?: Array<{
                detected_language?: string;
                alternatives?: Array<{
                    transcript?: string;
                    confidence?: number;
                    words?: DeepgramWord[];
                }>;
            }>;
        };
        metadata?: {
            duration?: number;
        };
    }

    const result = (await response.json()) as DeepgramResponse;
    const transcript = result.results?.channels?.[0]?.alternatives?.[0];

    return {
        text: transcript?.transcript || "",
        language: result.results?.channels?.[0]?.detected_language,
        provider: "deepgram",
        model: config.model || "nova-2",
        duration: result.metadata?.duration,
        metadata: {
            confidence: transcript?.confidence,
            words: transcript?.words?.map((w) => ({
                word: w.word,
                start: w.start,
                end: w.end,
                confidence: w.confidence
            }))
        }
    };
}

// ============================================================================
// HANDLER
// ============================================================================

/**
 * Handler for AudioInput node type.
 * Processes audio from workflow inputs at trigger time.
 */
export class AudioInputNodeHandler extends BaseNodeHandler {
    readonly name = "AudioInputNodeHandler";
    readonly supportedNodeTypes = ["audioInput"] as const;

    async execute(input: NodeHandlerInput): Promise<NodeHandlerOutput> {
        const startTime = Date.now();
        const config = validateOrThrow(AudioInputNodeConfigSchema, input.nodeConfig, "AudioInput");

        logger.info("Processing audio input", {
            provider: config.provider,
            model: config.model,
            inputName: config.inputName
        });

        // Get audio from workflow inputs
        const audioData = input.context.inputs?.[config.inputName] as unknown as
            | AudioInputData
            | undefined;

        if (!audioData) {
            throw new Error(
                `Required audio input '${config.inputName}' was not provided. ` +
                    "Ensure audio is uploaded when starting the workflow."
            );
        }

        let tempFilePath: string | null = null;

        try {
            // Download audio from GCS uploads bucket or decode base64
            if (audioData.gcsUri) {
                logger.debug("Downloading audio from GCS", { gcsUri: audioData.gcsUri });
                const gcsService = getUploadsStorageService();
                tempFilePath = await gcsService.downloadToTemp({ gcsUri: audioData.gcsUri });
            } else if (audioData.base64) {
                logger.debug("Decoding base64 audio");
                const ext = audioData.mimeType?.includes("wav") ? ".wav" : ".mp3";
                tempFilePath = path.join(os.tmpdir(), `fm-audio-input-${Date.now()}${ext}`);
                const buffer = Buffer.from(audioData.base64, "base64");
                await fs.writeFile(tempFilePath, buffer);
            } else {
                throw new Error(
                    "Invalid audio input format. Expected either gcsUri or base64 data."
                );
            }

            // Transcribe based on provider
            let result: AudioInputNodeResult;
            if (config.provider === "openai") {
                result = await transcribeWithOpenAI(tempFilePath, config);
            } else {
                result = await transcribeWithDeepgram(tempFilePath, config);
            }

            logger.info("Audio transcribed successfully", {
                provider: result.provider,
                model: result.model,
                textLength: result.text.length,
                duration: result.duration
            });

            return this.success(
                { [config.outputVariable]: result as unknown as JsonObject },
                {},
                { durationMs: Date.now() - startTime }
            );
        } finally {
            // Clean up temp file
            if (tempFilePath) {
                await fs.unlink(tempFilePath).catch((err) => {
                    logger.warn("Failed to clean up temp file", {
                        tempFilePath,
                        error: err instanceof Error ? err.message : String(err)
                    });
                });
            }
        }
    }
}

/**
 * Factory function for creating AudioInput handler.
 */
export function createAudioInputNodeHandler(): AudioInputNodeHandler {
    return new AudioInputNodeHandler();
}
