/**
 * Audio Transcribe Tool
 *
 * Transcribes audio files to text using OpenAI's Whisper API
 */

import { readFile, writeFile, access, constants, stat, mkdir } from "fs/promises";
import { join, extname } from "path";
import { z } from "zod";
import { createServiceLogger } from "../../core/logging";
import { getAIClient } from "../../services/ai";
import type { BuiltInTool, ToolExecutionContext, ToolExecutionResult } from "../types";

const logger = createServiceLogger("AudioTranscribeTool");

/**
 * Input schema for audio transcription
 */
export const audioTranscribeInputSchema = z.object({
    path: z.string().min(1).describe("Path to the audio file"),
    language: z
        .string()
        .length(2)
        .optional()
        .describe("ISO 639-1 language code (e.g., 'en', 'es', 'fr'). Auto-detect if not provided"),
    model: z.enum(["whisper-1"]).default("whisper-1").describe("Whisper model to use"),
    task: z
        .enum(["transcribe", "translate"])
        .default("transcribe")
        .describe("Transcribe in original language or translate to English"),
    timestamps: z.boolean().default(false).describe("Include word-level timestamps"),
    outputFormat: z
        .enum(["text", "json", "srt", "vtt"])
        .default("text")
        .describe("Output format for transcription"),
    prompt: z
        .string()
        .max(224)
        .optional()
        .describe("Optional prompt to guide the model's style or continue previous audio"),
    temperature: z
        .number()
        .min(0)
        .max(1)
        .default(0)
        .describe("Sampling temperature (0 = deterministic)")
});

export type AudioTranscribeInput = z.infer<typeof audioTranscribeInputSchema>;

/**
 * Transcription segment with timing
 */
export interface TranscriptionSegment {
    id: number;
    start: number;
    end: number;
    text: string;
    words?: Array<{
        word: string;
        start: number;
        end: number;
    }>;
}

/**
 * Audio transcription result
 */
export interface AudioTranscribeOutput {
    text: string;
    language: string;
    duration: number;
    segments?: TranscriptionSegment[];
    wordCount: number;
    outputPath?: string;
}

/**
 * Validate path doesn't escape allowed directories
 */
function validatePath(path: string): { valid: boolean; error?: string } {
    // Block path traversal
    if (path.includes("..")) {
        return { valid: false, error: "Path traversal not allowed" };
    }

    // Block sensitive paths
    const blockedPaths = ["/etc", "/proc", "/sys", "/dev", "/root", "/home"];
    const normalizedPath = path.toLowerCase();
    for (const blocked of blockedPaths) {
        if (normalizedPath.startsWith(blocked)) {
            return { valid: false, error: `Access to ${blocked} not allowed` };
        }
    }

    return { valid: true };
}

/**
 * Get supported audio formats
 */
function isValidAudioFormat(filePath: string): boolean {
    const validExtensions = [".mp3", ".mp4", ".mpeg", ".mpga", ".m4a", ".wav", ".webm"];
    const ext = extname(filePath).toLowerCase();
    return validExtensions.includes(ext);
}

/**
 * Format seconds to SRT timestamp (HH:MM:SS,mmm)
 */
function formatSrtTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const millis = Math.floor((seconds % 1) * 1000);
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")},${millis.toString().padStart(3, "0")}`;
}

/**
 * Format seconds to VTT timestamp (HH:MM:SS.mmm)
 */
function formatVttTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const millis = Math.floor((seconds % 1) * 1000);
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${millis.toString().padStart(3, "0")}`;
}

/**
 * Generate SRT format from segments
 */
function generateSrt(segments: TranscriptionSegment[]): string {
    return segments
        .map((seg, i) => {
            return `${i + 1}\n${formatSrtTime(seg.start)} --> ${formatSrtTime(seg.end)}\n${seg.text.trim()}\n`;
        })
        .join("\n");
}

/**
 * Generate VTT format from segments
 */
function generateVtt(segments: TranscriptionSegment[]): string {
    const lines = ["WEBVTT\n"];
    for (const seg of segments) {
        lines.push(`${formatVttTime(seg.start)} --> ${formatVttTime(seg.end)}`);
        lines.push(seg.text.trim());
        lines.push("");
    }
    return lines.join("\n");
}

/**
 * Execute audio transcription using OpenAI Whisper API
 */
async function executeAudioTranscribe(
    params: Record<string, unknown>,
    context: ToolExecutionContext
): Promise<ToolExecutionResult> {
    const startTime = Date.now();

    try {
        const input = audioTranscribeInputSchema.parse(params);

        logger.info(
            {
                path: input.path,
                model: input.model,
                task: input.task,
                outputFormat: input.outputFormat,
                traceId: context.traceId
            },
            "Transcribing audio"
        );

        // Validate path
        const pathValidation = validatePath(input.path);
        if (!pathValidation.valid) {
            return {
                success: false,
                error: {
                    message: pathValidation.error!,
                    code: "ACCESS_DENIED",
                    retryable: false
                },
                metadata: { durationMs: Date.now() - startTime }
            };
        }

        // Check file exists
        try {
            await access(input.path, constants.R_OK);
        } catch {
            return {
                success: false,
                error: {
                    message: `Audio file not found: ${input.path}`,
                    code: "FILE_NOT_FOUND",
                    retryable: false
                },
                metadata: { durationMs: Date.now() - startTime }
            };
        }

        // Validate audio format
        if (!isValidAudioFormat(input.path)) {
            return {
                success: false,
                error: {
                    message:
                        "Unsupported audio format. Supported: mp3, mp4, mpeg, mpga, m4a, wav, webm",
                    code: "INVALID_FORMAT",
                    retryable: false
                },
                metadata: { durationMs: Date.now() - startTime }
            };
        }

        // Check file size (25MB limit for Whisper API)
        const fileStats = await stat(input.path);
        const maxSize = 25 * 1024 * 1024; // 25MB
        if (fileStats.size > maxSize) {
            return {
                success: false,
                error: {
                    message: `Audio file too large (${Math.round(fileStats.size / 1024 / 1024)}MB). Maximum size is 25MB.`,
                    code: "FILE_TOO_LARGE",
                    retryable: false
                },
                metadata: { durationMs: Date.now() - startTime }
            };
        }

        // Read audio file and convert to base64 data URL
        const audioBuffer = await readFile(input.path);
        const base64Audio = audioBuffer.toString("base64");
        const mimeType = `audio/${extname(input.path).slice(1)}`;
        const dataUrl = `data:${mimeType};base64,${base64Audio}`;

        // Determine if we need timestamps
        const needsTimestamps = input.timestamps || input.outputFormat !== "text";

        // Build timestamp granularities if needed
        const timestampGranularities: Array<"segment" | "word"> = [];
        if (needsTimestamps) {
            timestampGranularities.push("segment");
            if (input.timestamps) {
                timestampGranularities.push("word");
            }
        }

        // Use unified AI service for transcription
        const ai = getAIClient();
        const response = await ai.speech.transcribe({
            provider: "openai",
            model: input.model,
            audioInput: dataUrl,
            language: input.language,
            prompt: input.prompt,
            temperature: input.temperature,
            timestamps: needsTimestamps,
            timestampGranularities: needsTimestamps ? timestampGranularities : undefined
        });

        const text = response.text;
        const detectedLanguage = response.language || input.language || "en";
        const duration = response.duration ?? 0;

        // Map response segments to tool output format
        let segments: TranscriptionSegment[] = [];
        if (response.segments) {
            segments = response.segments.map((seg) => ({
                id: seg.id,
                start: seg.start,
                end: seg.end,
                text: seg.text,
                words: seg.words?.map((w) => ({
                    word: w.word,
                    start: w.start,
                    end: w.end
                }))
            }));
        }

        // Generate output file if needed
        let outputPath: string | undefined;
        const outputDir = context.traceId ? `/tmp/fm-workspace/${context.traceId}` : "/tmp";

        try {
            await mkdir(outputDir, { recursive: true });
        } catch {
            // Directory may already exist
        }

        if (input.outputFormat === "srt" && segments.length > 0) {
            const srtContent = generateSrt(segments);
            outputPath = join(outputDir, "transcription.srt");
            await writeFile(outputPath, srtContent, "utf-8");
        } else if (input.outputFormat === "vtt" && segments.length > 0) {
            const vttContent = generateVtt(segments);
            outputPath = join(outputDir, "transcription.vtt");
            await writeFile(outputPath, vttContent, "utf-8");
        } else if (input.outputFormat === "json") {
            outputPath = join(outputDir, "transcription.json");
            await writeFile(
                outputPath,
                JSON.stringify(
                    {
                        text,
                        language: detectedLanguage,
                        duration,
                        segments
                    },
                    null,
                    2
                ),
                "utf-8"
            );
        }

        const output: AudioTranscribeOutput = {
            text,
            language: detectedLanguage,
            duration,
            wordCount: text.split(/\s+/).filter((w) => w.length > 0).length
        };

        if (segments.length > 0 && (input.timestamps || input.outputFormat !== "text")) {
            output.segments = segments;
        }

        if (outputPath) {
            output.outputPath = outputPath;
        }

        logger.info(
            {
                path: input.path,
                language: output.language,
                duration: output.duration,
                wordCount: output.wordCount,
                traceId: context.traceId
            },
            "Audio transcription completed"
        );

        return {
            success: true,
            data: output,
            metadata: {
                durationMs: Date.now() - startTime,
                creditCost: 2
            }
        };
    } catch (error) {
        logger.error({ err: error, traceId: context.traceId }, "Audio transcription failed");

        return {
            success: false,
            error: {
                message: error instanceof Error ? error.message : "Audio transcription failed",
                retryable: false
            },
            metadata: { durationMs: Date.now() - startTime }
        };
    }
}

/**
 * Audio Transcribe Tool Definition
 */
export const audioTranscribeTool: BuiltInTool = {
    name: "audio_transcribe",
    displayName: "Transcribe Audio",
    description:
        "Transcribe audio files to text using OpenAI's Whisper model. Supports multiple languages, translation to English, timestamps, and various output formats (text, JSON, SRT, VTT).",
    category: "media",
    riskLevel: "low",
    inputSchema: {
        type: "object",
        properties: {
            path: {
                type: "string",
                description: "Path to the audio file"
            },
            language: {
                type: "string",
                description: "ISO 639-1 language code (auto-detect if not provided)"
            },
            model: {
                type: "string",
                enum: ["whisper-1"],
                description: "Whisper model to use",
                default: "whisper-1"
            },
            task: {
                type: "string",
                enum: ["transcribe", "translate"],
                description: "Transcribe or translate to English",
                default: "transcribe"
            },
            timestamps: {
                type: "boolean",
                description: "Include word-level timestamps",
                default: false
            },
            outputFormat: {
                type: "string",
                enum: ["text", "json", "srt", "vtt"],
                description: "Output format",
                default: "text"
            },
            prompt: {
                type: "string",
                description: "Optional prompt to guide transcription style",
                maxLength: 224
            },
            temperature: {
                type: "number",
                description: "Sampling temperature (0-1)",
                minimum: 0,
                maximum: 1,
                default: 0
            }
        },
        required: ["path"]
    },
    zodSchema: audioTranscribeInputSchema,
    enabledByDefault: true,
    creditCost: 2,
    tags: ["audio", "transcription", "speech-to-text", "whisper", "openai"],
    execute: executeAudioTranscribe
};
