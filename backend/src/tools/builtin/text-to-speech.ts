/**
 * Text to Speech Tool
 *
 * Generates speech audio from text using OpenAI's TTS API
 */

import { writeFile, mkdir, stat } from "fs/promises";
import { join } from "path";
import { z } from "zod";
import { createServiceLogger } from "../../core/logging";
import { getAIClient } from "../../services/llm";
import type { BuiltInTool, ToolExecutionContext, ToolExecutionResult } from "../types";

const logger = createServiceLogger("TextToSpeechTool");

/**
 * Input schema for text to speech
 */
export const textToSpeechInputSchema = z.object({
    text: z.string().min(1).max(4096).describe("Text to convert to speech (max 4096 chars)"),
    voice: z
        .enum(["alloy", "echo", "fable", "onyx", "nova", "shimmer"])
        .default("alloy")
        .describe("Voice to use for speech synthesis"),
    model: z
        .enum(["tts-1", "tts-1-hd"])
        .default("tts-1")
        .describe("TTS model (tts-1 is faster, tts-1-hd has higher quality)"),
    speed: z
        .number()
        .min(0.25)
        .max(4.0)
        .default(1.0)
        .describe("Speech speed (0.25 = slow, 4.0 = fast)"),
    format: z
        .enum(["mp3", "opus", "aac", "flac", "wav", "pcm"])
        .default("mp3")
        .describe("Output audio format"),
    filename: z
        .string()
        .min(1)
        .max(255)
        .default("speech")
        .describe("Output filename without extension")
});

export type TextToSpeechInput = z.infer<typeof textToSpeechInputSchema>;

/**
 * Text to speech result
 */
export interface TextToSpeechOutput {
    path: string;
    filename: string;
    format: string;
    size: number;
    characterCount: number;
    voice: string;
    model: string;
}

/**
 * Voice descriptions for user reference
 */
export const voiceDescriptions: Record<string, string> = {
    alloy: "Neutral and balanced voice",
    echo: "Warm and clear voice",
    fable: "Expressive and dramatic voice",
    onyx: "Deep and authoritative voice",
    nova: "Friendly and upbeat voice",
    shimmer: "Soft and gentle voice"
};

/**
 * Execute text to speech using OpenAI TTS API
 */
async function executeTextToSpeech(
    params: Record<string, unknown>,
    context: ToolExecutionContext
): Promise<ToolExecutionResult> {
    const startTime = Date.now();

    try {
        const input = textToSpeechInputSchema.parse(params);

        logger.info(
            {
                textLength: input.text.length,
                voice: input.voice,
                model: input.model,
                format: input.format,
                traceId: context.traceId
            },
            "Generating speech from text"
        );

        // Use unified AI service
        const ai = getAIClient();

        // NOTE: The tool schema includes "pcm" format, but not all providers support it.
        // OpenAI supports: mp3, opus, aac, flac. We map pcm to wav as a fallback.
        const format = input.format === "pcm" ? "wav" : input.format;

        const response = await ai.speech.synthesize({
            provider: "openai",
            model: input.model,
            text: input.text,
            voice: input.voice,
            speed: input.speed,
            outputFormat: format as "mp3" | "wav" | "opus" | "aac" | "flac"
        });

        // Decode base64 audio
        const buffer = Buffer.from(response.base64!, "base64");

        // Determine output directory and path
        const outputDir = context.traceId ? `/tmp/fm-workspace/${context.traceId}` : "/tmp";
        const filename = `${input.filename}.${input.format}`;
        const outputPath = join(outputDir, filename);

        // Ensure output directory exists
        try {
            await mkdir(outputDir, { recursive: true });
        } catch {
            // Directory may already exist
        }

        // Write audio file
        await writeFile(outputPath, buffer);

        // Get file stats
        const stats = await stat(outputPath);

        const output: TextToSpeechOutput = {
            path: outputPath,
            filename,
            format: input.format,
            size: stats.size,
            characterCount: input.text.length,
            voice: input.voice,
            model: input.model
        };

        logger.info(
            {
                path: output.path,
                size: output.size,
                characterCount: output.characterCount,
                traceId: context.traceId
            },
            "Speech generated successfully"
        );

        return {
            success: true,
            data: output,
            metadata: {
                durationMs: Date.now() - startTime,
                creditCost: input.model === "tts-1-hd" ? 2 : 1
            }
        };
    } catch (error) {
        logger.error({ err: error, traceId: context.traceId }, "Text to speech failed");

        return {
            success: false,
            error: {
                message: error instanceof Error ? error.message : "Text to speech failed",
                retryable: false
            },
            metadata: { durationMs: Date.now() - startTime }
        };
    }
}

/**
 * Text to Speech Tool Definition
 */
export const textToSpeechTool: BuiltInTool = {
    name: "text_to_speech",
    displayName: "Text to Speech",
    description:
        "Generate speech audio from text using OpenAI's TTS API. Supports multiple voices, adjustable speed, and various output formats (MP3, WAV, OPUS, AAC, FLAC).",
    category: "media",
    riskLevel: "low",
    inputSchema: {
        type: "object",
        properties: {
            text: {
                type: "string",
                description: "Text to convert to speech (max 4096 chars)",
                maxLength: 4096
            },
            voice: {
                type: "string",
                enum: ["alloy", "echo", "fable", "onyx", "nova", "shimmer"],
                description:
                    "Voice to use: alloy (neutral), echo (warm), fable (expressive), onyx (deep), nova (friendly), shimmer (soft)",
                default: "alloy"
            },
            model: {
                type: "string",
                enum: ["tts-1", "tts-1-hd"],
                description: "TTS model (tts-1 = fast, tts-1-hd = high quality)",
                default: "tts-1"
            },
            speed: {
                type: "number",
                description: "Speech speed (0.25-4.0)",
                minimum: 0.25,
                maximum: 4.0,
                default: 1.0
            },
            format: {
                type: "string",
                enum: ["mp3", "opus", "aac", "flac", "wav", "pcm"],
                description: "Output audio format",
                default: "mp3"
            },
            filename: {
                type: "string",
                description: "Output filename without extension",
                default: "speech"
            }
        },
        required: ["text"]
    },
    zodSchema: textToSpeechInputSchema,
    enabledByDefault: true,
    creditCost: 1,
    tags: ["tts", "speech", "audio", "voice", "openai"],
    execute: executeTextToSpeech
};
