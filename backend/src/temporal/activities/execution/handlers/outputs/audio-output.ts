/**
 * Audio Output Node Handler (TTS - Text-to-Speech)
 *
 * Generates speech from text using OpenAI, ElevenLabs, or Deepgram.
 * This is a terminal node that produces audio output.
 */

import OpenAI from "openai";
import type { JsonObject } from "@flowmaestro/shared";
import { config as appConfig } from "../../../../../core/config";
import { getArtifactsStorageService } from "../../../../../services/GCSStorageService";
import { createActivityLogger, interpolateVariables, getExecutionContext } from "../../../../core";
import {
    AudioOutputNodeConfigSchema,
    validateOrThrow,
    type AudioOutputNodeConfig
} from "../../../../core/schemas";
import { BaseNodeHandler, type NodeHandlerInput, type NodeHandlerOutput } from "../../types";

const logger = createActivityLogger({ nodeType: "AudioOutput" });

// ============================================================================
// TYPES
// ============================================================================

export type { AudioOutputNodeConfig };

/**
 * Result from audio synthesis.
 */
export interface AudioOutputNodeResult {
    audio: {
        base64?: string;
        url?: string;
        format: string;
        duration?: number;
    };
    provider: string;
    model: string;
    charactersUsed: number;
}

// OpenAI TTS voices
type OpenAIVoice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";

// ============================================================================
// PROVIDER IMPLEMENTATIONS
// ============================================================================

/**
 * Synthesize speech using OpenAI TTS.
 */
async function synthesizeWithOpenAI(text: string, config: AudioOutputNodeConfig): Promise<Buffer> {
    const apiKey = appConfig.ai.openai.apiKey;
    if (!apiKey) {
        throw new Error("OPENAI_API_KEY is not configured");
    }

    const openai = new OpenAI({ apiKey });

    logger.info("Calling OpenAI TTS API", {
        model: config.model || "tts-1",
        voice: config.voice || "alloy",
        speed: config.speed,
        characterCount: text.length
    });

    const response = await openai.audio.speech.create({
        model: config.model || "tts-1",
        voice: (config.voice as OpenAIVoice) || "alloy",
        input: text,
        speed: config.speed || 1.0,
        response_format:
            config.outputFormat === "opus" ? "opus" : config.outputFormat === "wav" ? "wav" : "mp3"
    });

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
}

/**
 * Synthesize speech using ElevenLabs.
 */
async function synthesizeWithElevenLabs(
    text: string,
    config: AudioOutputNodeConfig
): Promise<Buffer> {
    const apiKey = appConfig.ai.elevenlabs.apiKey;
    if (!apiKey) {
        throw new Error("ELEVENLABS_API_KEY is not configured");
    }

    // Default to Rachel voice if not specified
    const voiceId = config.voice || "21m00Tcm4TlvDq8ikWAM";

    logger.info("Calling ElevenLabs TTS API", {
        model: config.model || "eleven_multilingual_v2",
        voiceId,
        stability: config.stability,
        similarityBoost: config.similarityBoost,
        characterCount: text.length
    });

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: "POST",
        headers: {
            Accept: config.outputFormat === "wav" ? "audio/wav" : "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": apiKey
        },
        body: JSON.stringify({
            text,
            model_id: config.model || "eleven_multilingual_v2",
            voice_settings: {
                stability: config.stability ?? 0.5,
                similarity_boost: config.similarityBoost ?? 0.75
            }
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs API error: ${response.status} ${errorText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
}

/**
 * Synthesize speech using Deepgram Aura.
 */
async function synthesizeWithDeepgram(
    text: string,
    config: AudioOutputNodeConfig
): Promise<Buffer> {
    const apiKey = appConfig.ai.deepgram?.apiKey;
    if (!apiKey) {
        throw new Error("DEEPGRAM_API_KEY is not configured");
    }

    // Model is the voice model (e.g., aura-asteria-en)
    const model = config.model || "aura-asteria-en";

    logger.info("Calling Deepgram Aura TTS API", {
        model,
        characterCount: text.length
    });

    const response = await fetch(`https://api.deepgram.com/v1/speak?model=${model}`, {
        method: "POST",
        headers: {
            Authorization: `Token ${apiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ text })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Deepgram TTS error: ${response.status} ${errorText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
}

// ============================================================================
// HANDLER
// ============================================================================

/**
 * Handler for AudioOutput node type.
 * Generates speech from text - terminal node for workflow.
 */
export class AudioOutputNodeHandler extends BaseNodeHandler {
    readonly name = "AudioOutputNodeHandler";
    readonly supportedNodeTypes = ["audioOutput"] as const;

    async execute(input: NodeHandlerInput): Promise<NodeHandlerOutput> {
        const startTime = Date.now();
        const config = validateOrThrow(
            AudioOutputNodeConfigSchema,
            input.nodeConfig,
            "AudioOutput"
        );
        const context = getExecutionContext(input.context);

        // Interpolate variables in text
        const text = interpolateVariables(config.textInput, context);

        if (!text || text.trim().length === 0) {
            throw new Error("Text input is empty after variable interpolation");
        }

        logger.info("Generating speech", {
            provider: config.provider,
            model: config.model,
            characterCount: text.length
        });

        // Synthesize audio based on provider
        let audioBuffer: Buffer;
        if (config.provider === "openai") {
            audioBuffer = await synthesizeWithOpenAI(text, config);
        } else if (config.provider === "elevenlabs") {
            audioBuffer = await synthesizeWithElevenLabs(text, config);
        } else {
            audioBuffer = await synthesizeWithDeepgram(text, config);
        }

        // Build result
        const result: AudioOutputNodeResult = {
            audio: {
                format: config.outputFormat || "mp3"
            },
            provider: config.provider,
            model: config.model,
            charactersUsed: text.length
        };

        // Return as URL or base64
        if (config.returnAsUrl) {
            logger.debug("Uploading audio to GCS artifacts bucket");
            const gcsService = getArtifactsStorageService();
            const fileName = `audio-output/${input.metadata.executionId}/${Date.now()}.${config.outputFormat || "mp3"}`;
            const mimeType =
                config.outputFormat === "wav"
                    ? "audio/wav"
                    : config.outputFormat === "opus"
                      ? "audio/opus"
                      : "audio/mpeg";

            const gcsUri = await gcsService.uploadBuffer(audioBuffer, {
                fileName,
                contentType: mimeType
            });
            result.audio.url = gcsUri;
        } else {
            result.audio.base64 = audioBuffer.toString("base64");
        }

        logger.info("Speech generated successfully", {
            provider: config.provider,
            model: config.model,
            format: result.audio.format,
            hasUrl: !!result.audio.url,
            hasBase64: !!result.audio.base64
        });

        // Terminal node - signals workflow endpoint
        return this.terminal(
            { [config.outputVariable]: result as unknown as JsonObject },
            { durationMs: Date.now() - startTime }
        );
    }
}

/**
 * Factory function for creating AudioOutput handler.
 */
export function createAudioOutputNodeHandler(): AudioOutputNodeHandler {
    return new AudioOutputNodeHandler();
}
