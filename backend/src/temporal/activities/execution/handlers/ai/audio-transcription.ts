/**
 * Audio Transcription Node Handler
 *
 * Transcribes audio to text using the audio_transcribe builtin tool (Whisper).
 */

import type { JsonObject } from "@flowmaestro/shared";
import { audioTranscribeTool } from "../../../../../services/tools/builtin/audio-transcribe";
import { createActivityLogger, interpolateVariables, getExecutionContext } from "../../../../core";
import {
    AudioTranscriptionNodeConfigSchema,
    validateOrThrow,
    type AudioTranscriptionNodeConfig
} from "../../../../core/schemas";
import { BaseNodeHandler, type NodeHandlerInput, type NodeHandlerOutput } from "../../types";
import type { ToolExecutionContext } from "../../../../../services/tools/types";

const logger = createActivityLogger({ nodeType: "AudioTranscription" });

// ============================================================================
// TYPES
// ============================================================================

export type { AudioTranscriptionNodeConfig };

/**
 * Result from audio transcription.
 */
export interface AudioTranscriptionNodeResult {
    text: string;
    language: string;
    duration: number;
    wordCount: number;
    segments?: Array<{
        id: number;
        start: number;
        end: number;
        text: string;
        words?: Array<{
            word: string;
            start: number;
            end: number;
        }>;
    }>;
    outputPath?: string;
}

// ============================================================================
// HANDLER
// ============================================================================

/**
 * Handler for AudioTranscription node type.
 * Transcribes audio files to text using Whisper.
 */
export class AudioTranscriptionNodeHandler extends BaseNodeHandler {
    readonly name = "AudioTranscriptionNodeHandler";
    readonly supportedNodeTypes = ["audioTranscription"] as const;

    async execute(input: NodeHandlerInput): Promise<NodeHandlerOutput> {
        const startTime = Date.now();
        const config = validateOrThrow(
            AudioTranscriptionNodeConfigSchema,
            input.nodeConfig,
            "AudioTranscription"
        );
        const context = getExecutionContext(input.context);

        logger.info("Transcribing audio", {
            model: config.model,
            task: config.task,
            outputFormat: config.outputFormat
        });

        // Interpolate variables in audio source
        const audioPath = interpolateVariables(config.audioSource, context);

        if (!audioPath || typeof audioPath !== "string") {
            throw new Error("Audio source path is required");
        }

        // Build tool input
        const toolInput: Record<string, unknown> = {
            path: audioPath,
            model: config.model,
            task: config.task,
            outputFormat: config.outputFormat,
            timestamps: config.timestamps,
            temperature: config.temperature
        };

        // Add optional fields
        if (config.language) {
            toolInput.language = config.language;
        }
        if (config.prompt) {
            toolInput.prompt = interpolateVariables(config.prompt, context);
        }

        // Create tool execution context
        const toolContext: ToolExecutionContext = {
            userId: input.metadata.userId || "system",
            workspaceId: "default",
            mode: "workflow",
            traceId: input.metadata.executionId
        };

        // Execute the builtin tool
        const toolResult = await audioTranscribeTool.execute(toolInput, toolContext);

        if (!toolResult.success) {
            throw new Error(toolResult.error?.message || "Audio transcription failed");
        }

        const result = toolResult.data as AudioTranscriptionNodeResult;

        logger.info("Audio transcribed successfully", {
            wordCount: result.wordCount,
            duration: result.duration,
            language: result.language
        });

        // Build output
        const outputData: JsonObject = {};
        if (config.outputVariable) {
            outputData[config.outputVariable] = result as unknown as JsonObject;
        }

        return this.success(outputData, {}, { durationMs: Date.now() - startTime });
    }
}

/**
 * Factory function for creating AudioTranscription handler.
 */
export function createAudioTranscriptionNodeHandler(): AudioTranscriptionNodeHandler {
    return new AudioTranscriptionNodeHandler();
}
