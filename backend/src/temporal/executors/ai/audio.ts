import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import OpenAI from "openai";
import type { JsonObject } from "@flowmaestro/shared";
import { config as appConfig } from "../../../core/config";
import { ConfigurationError, ProviderError, ValidationError } from "../../shared/errors";
import { withHeartbeat, type HeartbeatOperations } from "../../shared/heartbeat";
import { activityLogger } from "../../shared/logger";
import { interpolateVariables } from "../../shared/utils";

export interface AudioNodeConfig {
    provider: "openai" | "elevenlabs" | "google";
    model: string;
    operation: "transcribe" | "tts";

    // For transcribe
    audioInput?: string; // URL, file path, or base64
    language?: string; // ISO 639-1 code
    prompt?: string; // Context hint for transcription

    // For TTS
    textInput?: string;
    voice?: string; // Voice ID or name
    speed?: number; // 0.25 to 4.0

    // ElevenLabs specific
    stability?: number; // 0.0 to 1.0
    similarityBoost?: number; // 0.0 to 1.0

    // Output
    outputFormat?: "mp3" | "wav" | "opus";
    outputPath?: string; // Where to save audio file
    returnFormat?: "url" | "base64" | "path";
    outputVariable?: string;
}

export interface AudioNodeResult {
    operation: string;
    provider: string;
    model: string;

    // For transcribe
    text?: string;
    language?: string;

    // For TTS
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
        activityLogger.info("Audio node execution starting", { provider: config.provider, operation: config.operation });

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

/**
 * Execute OpenAI audio (Whisper for transcribe, TTS for speech)
 */
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
        // Whisper transcription
        const audioInput = interpolateVariables(config.audioInput || "", context);

        activityLogger.info("OpenAI transcribing audio");

        heartbeat.update({ step: "downloading_audio" });
        // Download or read audio file
        const { file: audioFile, path: audioPath } = await getAudioFile(audioInput);

        try {
            heartbeat.update({ step: "transcribing" });
            const response = await openai.audio.transcriptions.create({
                file: audioFile as unknown as File,
                model: config.model || "whisper-1",
                language: config.language,
                prompt: config.prompt
            });

            activityLogger.info("OpenAI transcription complete", { transcriptionLength: response.text.length });

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
            // Clean up temp file if created
            if (audioPath && audioPath.startsWith(os.tmpdir())) {
                await fs.unlink(audioPath).catch(() => {});
            }
        }
    }

    if (config.operation === "tts") {
        // Text-to-speech
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

        // Get audio buffer
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Handle output format
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
            // Default to base64 if no specific format requested
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

/**
 * Execute ElevenLabs audio (TTS only)
 */
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
    const voiceId = config.voice || "21m00Tcm4TlvDq8ikWAM"; // Default: Rachel voice

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

    // Handle output format
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

/**
 * Helper to get audio file from various sources
 */
async function getAudioFile(input: string): Promise<{ file: fs.FileHandle; path: string }> {
    if (input.startsWith("http://") || input.startsWith("https://")) {
        // Download from URL to temp file
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
        // Extract from data URL
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
        // Assume it's a file path
        const file = await fs.open(input, "r");
        return { file, path: input };
    }
}
