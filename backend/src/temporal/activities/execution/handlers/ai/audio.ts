/**
 * Audio Node Execution
 *
 * Complete execution logic and handler for audio nodes.
 * Supports transcription (STT) and text-to-speech (TTS) with OpenAI and ElevenLabs.
 */

import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import OpenAI from "openai";
import type { JsonObject } from "@flowmaestro/shared";
import { config as appConfig } from "../../../../../core/config";
import {
    ConfigurationError,
    ProviderError,
    ValidationError,
    withHeartbeat,
    type HeartbeatOperations
} from "../../../../core";
import { activityLogger, interpolateVariables, getExecutionContext } from "../../../../core";
import { BaseNodeHandler, type NodeHandlerInput, type NodeHandlerOutput } from "../../types";

// ============================================================================
// TYPES
// ============================================================================

export interface AudioNodeConfig {
    provider: "openai" | "elevenlabs" | "google";
    model: string;
    operation: "transcribe" | "tts";

    // For transcribe
    audioInput?: string;
    language?: string;
    prompt?: string;

    // For TTS
    textInput?: string;
    voice?: string;
    speed?: number;

    // ElevenLabs specific
    stability?: number;
    similarityBoost?: number;

    // Output
    outputFormat?: "mp3" | "wav" | "opus";
    outputPath?: string;
    returnFormat?: "url" | "base64" | "path";
    outputVariable?: string;
}

export interface AudioNodeResult {
    operation: string;
    provider: string;
    model: string;
    text?: string;
    language?: string;
    audio?: {
        url?: string;
        base64?: string;
        path?: string;
        duration?: number;
    };
    metadata?: {
        processingTime: number;
        charactersUsed?: number;
    };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function getAudioFile(input: string): Promise<{ file: fs.FileHandle; path: string }> {
    if (input.startsWith("http://") || input.startsWith("https://")) {
        const response = await fetch(input);

        if (!response.ok) {
            throw new Error(`Failed to download audio: HTTP ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const ext = path.extname(new URL(input).pathname) || ".mp3";
        const tempPath = path.join(os.tmpdir(), `flowmaestro-audio-${Date.now()}${ext}`);

        await fs.writeFile(tempPath, buffer);

        const file = await fs.open(tempPath, "r");
        return { file, path: tempPath };
    } else if (input.startsWith("data:")) {
        const matches = input.match(/^data:[^;]+;base64,(.+)$/);
        if (!matches) {
            throw new Error("Invalid data URL format");
        }

        const buffer = Buffer.from(matches[1], "base64");
        const tempPath = path.join(os.tmpdir(), `flowmaestro-audio-${Date.now()}.mp3`);

        await fs.writeFile(tempPath, buffer);

        const file = await fs.open(tempPath, "r");
        return { file, path: tempPath };
    } else {
        const file = await fs.open(input, "r");
        return { file, path: input };
    }
}

// ============================================================================
// PROVIDER IMPLEMENTATIONS
// ============================================================================

async function executeOpenAI(
    config: AudioNodeConfig,
    context: JsonObject,
    heartbeat: HeartbeatOperations
): Promise<JsonObject> {
    const apiKey = appConfig.ai.openai.apiKey;
    if (!apiKey) {
        throw new ConfigurationError(
            "OPENAI_API_KEY environment variable is not set",
            "OPENAI_API_KEY"
        );
    }

    const openai = new OpenAI({ apiKey });

    if (config.operation === "transcribe") {
        const audioInput = interpolateVariables(config.audioInput || "", context);

        activityLogger.info("OpenAI transcribing audio");

        heartbeat.update({ step: "downloading_audio" });
        const { file: audioFile, path: audioPath } = await getAudioFile(audioInput);

        try {
            heartbeat.update({ step: "transcribing" });
            const response = await openai.audio.transcriptions.create({
                file: audioFile as unknown as File,
                model: config.model || "whisper-1",
                language: config.language,
                prompt: config.prompt
            });

            activityLogger.info("OpenAI transcription complete", {
                transcriptionLength: response.text.length
            });

            return {
                operation: "transcribe",
                provider: "openai",
                model: config.model || "whisper-1",
                text: response.text,
                language: config.language,
                metadata: {
                    processingTime: 0
                }
            } as unknown as JsonObject;
        } finally {
            if (audioPath && audioPath.startsWith(os.tmpdir())) {
                await fs.unlink(audioPath).catch(() => {});
            }
        }
    }

    if (config.operation === "tts") {
        const text = interpolateVariables(config.textInput || "", context);

        activityLogger.info("OpenAI generating speech", { characterCount: text.length });

        heartbeat.update({ step: "generating_speech", characters: text.length });
        const response = await openai.audio.speech.create({
            model: config.model || "tts-1",
            voice:
                (config.voice as "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer") ||
                "alloy",
            input: text,
            speed: config.speed || 1.0
        });

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const audioResult: { base64?: string; path?: string } = {};

        if (config.returnFormat === "base64") {
            audioResult.base64 = buffer.toString("base64");
        } else if (config.returnFormat === "path" || config.outputPath) {
            const outputPath = config.outputPath
                ? interpolateVariables(config.outputPath, context)
                : path.join(os.tmpdir(), `flowmaestro-audio-${Date.now()}.mp3`);

            await fs.writeFile(outputPath, buffer);
            audioResult.path = outputPath;
        } else {
            audioResult.base64 = buffer.toString("base64");
        }

        activityLogger.info("OpenAI speech generated");

        return {
            operation: "tts",
            provider: "openai",
            model: config.model || "tts-1",
            audio: audioResult,
            metadata: {
                processingTime: 0,
                charactersUsed: text.length
            }
        } as unknown as JsonObject;
    }

    throw new ValidationError(`Unsupported operation for OpenAI: ${config.operation}`, "operation");
}

async function executeElevenLabs(
    config: AudioNodeConfig,
    context: JsonObject,
    heartbeat: HeartbeatOperations
): Promise<JsonObject> {
    const apiKey = appConfig.ai.elevenlabs.apiKey;
    if (!apiKey) {
        throw new ConfigurationError(
            "ELEVENLABS_API_KEY environment variable is not set",
            "ELEVENLABS_API_KEY"
        );
    }

    if (config.operation !== "tts") {
        throw new ValidationError('ElevenLabs only supports "tts" operation', "operation");
    }

    const text = interpolateVariables(config.textInput || "", context);
    const voiceId = config.voice || "21m00Tcm4TlvDq8ikWAM";

    activityLogger.info("ElevenLabs generating speech", { characterCount: text.length });

    heartbeat.update({ step: "generating_speech", characters: text.length });
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: "POST",
        headers: {
            Accept: "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": apiKey
        },
        body: JSON.stringify({
            text,
            model_id: config.model || "eleven_monolingual_v1",
            voice_settings: {
                stability: config.stability ?? 0.5,
                similarity_boost: config.similarityBoost ?? 0.75
            }
        })
    });

    if (!response.ok) {
        throw new ProviderError("ElevenLabs", response.status, await response.text());
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const audioResult: { base64?: string; path?: string } = {};

    if (config.returnFormat === "base64") {
        audioResult.base64 = buffer.toString("base64");
    } else if (config.returnFormat === "path" || config.outputPath) {
        const outputPath = config.outputPath
            ? interpolateVariables(config.outputPath, context)
            : path.join(os.tmpdir(), `flowmaestro-audio-${Date.now()}.mp3`);

        await fs.writeFile(outputPath, buffer);
        audioResult.path = outputPath;
    } else {
        audioResult.base64 = buffer.toString("base64");
    }

    activityLogger.info("ElevenLabs speech generated");

    return {
        operation: "tts",
        provider: "elevenlabs",
        model: config.model || "eleven_monolingual_v1",
        audio: audioResult,
        metadata: {
            processingTime: 0,
            charactersUsed: text.length
        }
    } as unknown as JsonObject;
}

// ============================================================================
// EXECUTOR FUNCTION
// ============================================================================

/**
 * Execute Audio node - speech-to-text and text-to-speech
 */
export async function executeAudioNode(
    config: AudioNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    return withHeartbeat("audio", async (heartbeat) => {
        const startTime = Date.now();

        heartbeat.update({
            step: "initializing",
            provider: config.provider,
            operation: config.operation
        });
        activityLogger.info("Audio node execution starting", {
            provider: config.provider,
            operation: config.operation
        });

        let result: JsonObject;

        switch (config.provider) {
            case "openai":
                heartbeat.update({ step: "calling_openai" });
                result = await executeOpenAI(config, context, heartbeat);
                break;

            case "elevenlabs":
                heartbeat.update({ step: "calling_elevenlabs" });
                result = await executeElevenLabs(config, context, heartbeat);
                break;

            case "google":
                throw new ValidationError("Google audio provider not yet implemented", "provider");

            default:
                throw new ValidationError(
                    `Unsupported audio provider: ${config.provider}`,
                    "provider"
                );
        }

        result.metadata = {
            ...(result.metadata as JsonObject),
            processingTime: Date.now() - startTime
        };

        heartbeat.update({ step: "completed", percentComplete: 100 });
        activityLogger.info("Audio node execution completed", {
            processingTimeMs: (result.metadata as JsonObject)?.processingTime
        });

        if (config.outputVariable) {
            return { [config.outputVariable]: result } as unknown as JsonObject;
        }

        return result as unknown as JsonObject;
    });
}

// ============================================================================
// HANDLER
// ============================================================================

/**
 * Handler for Audio node type.
 */
export class AudioNodeHandler extends BaseNodeHandler {
    readonly name = "AudioNodeHandler";
    readonly supportedNodeTypes = ["audio"] as const;

    async execute(input: NodeHandlerInput): Promise<NodeHandlerOutput> {
        const startTime = Date.now();
        const context = getExecutionContext(input.context);

        const audioResult = await executeAudioNode(
            input.nodeConfig as unknown as AudioNodeConfig,
            context
        );

        return this.success(
            audioResult as unknown as JsonObject,
            {},
            {
                durationMs: Date.now() - startTime
            }
        );
    }
}

/**
 * Factory function for creating Audio handler.
 */
export function createAudioNodeHandler(): AudioNodeHandler {
    return new AudioNodeHandler();
}
