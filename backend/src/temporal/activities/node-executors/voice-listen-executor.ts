import type { JsonObject } from "@flowmaestro/shared";
import { globalEventEmitter } from "../../../services/events/EventEmitter";
import { getVoiceCommandBus } from "../../../services/events/VoiceCommandBus";
import { CallExecutionRepository } from "../../../storage/repositories/CallExecutionRepository";
import { interpolateVariables } from "./utils";

export interface VoiceListenNodeConfig {
    prompt?: string; // Optional prompt to play before listening
    maxDuration?: number; // Max listen duration in seconds (default: 30)
    endSilenceMs?: number; // Silence duration to end listening (default: 1500)
    language?: string; // STT language (default: 'en-US')
    sttProvider?: "deepgram" | "openai"; // STT provider
    saveToVariable?: string; // Variable name to store transcript
    outputVariable?: string; // Where to store full result
}

export interface VoiceListenNodeResult {
    success: boolean;
    transcript: string;
    confidence: number;
    durationMs?: number;
    language?: string;
    timedOut?: boolean;
    error?: string;
}

/**
 * Execute Voice Listen node - Capture user speech
 */
export async function executeVoiceListenNode(
    config: VoiceListenNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    console.log("[VoiceListen] Starting speech capture");

    // Get call execution ID from context
    const callExecutionId = context.callExecutionId as string;
    if (!callExecutionId) {
        throw new Error("callExecutionId not found in context");
    }

    const commandBus = getVoiceCommandBus();

    try {
        // If prompt is provided, play it first
        if (config.prompt) {
            const promptText = interpolateVariables(config.prompt, context);
            console.log(`[VoiceListen] Playing prompt: "${promptText}"`);

            await commandBus.sendCommand(
                callExecutionId,
                "speak",
                {
                    text: promptText,
                    interruptible: false
                },
                30000
            );
        }

        // Send listen command to agent
        console.log("[VoiceListen] Waiting for user speech...");

        const response = await commandBus.sendCommand(
            callExecutionId,
            "listen",
            {
                maxDuration: config.maxDuration || 30,
                endSilenceMs: config.endSilenceMs || 1500,
                language: config.language || "en-US",
                sttProvider: config.sttProvider || "deepgram"
            },
            (config.maxDuration || 30) * 1000 + 10000 // Add 10 seconds buffer
        );

        if (!response.success) {
            throw new Error(response.error || "Speech capture failed");
        }

        interface ListenCommandResult {
            transcript?: string;
            confidence?: number;
            durationMs?: number;
            timedOut?: boolean;
        }

        const commandResult = (response.result || {}) as ListenCommandResult;
        const transcript =
            typeof commandResult.transcript === "string" ? commandResult.transcript : "";
        const confidence =
            typeof commandResult.confidence === "number" ? commandResult.confidence : 0;

        console.log(`[VoiceListen] Transcript: "${transcript}" (confidence: ${confidence})`);

        // Log transcript (user speaking)
        const callRepo = new CallExecutionRepository();
        await callRepo.createTranscript({
            call_execution_id: callExecutionId,
            speaker: "user",
            text: transcript,
            confidence,
            language: config.language || "en-US",
            started_at: new Date(),
            is_final: true
        });

        // Emit real-time transcript event
        globalEventEmitter.emitCallTranscript(
            callExecutionId,
            "user",
            transcript,
            true,
            confidence
        );

        const result: VoiceListenNodeResult = {
            success: true,
            transcript,
            confidence,
            durationMs: commandResult.durationMs,
            language: config.language || "en-US",
            timedOut: commandResult.timedOut || false
        };

        // Build output context
        const output: JsonObject = {};

        // Store transcript in specified variable
        if (config.saveToVariable) {
            output[config.saveToVariable] = transcript;
        }

        // Store full result if specified
        if (config.outputVariable) {
            output[config.outputVariable] = result as unknown as JsonObject;
        }

        // If no output variables specified, return the transcript directly
        if (!config.saveToVariable && !config.outputVariable) {
            output.transcript = transcript;
            output.confidence = confidence;
        }

        console.log("[VoiceListen] Speech capture completed");

        return output;
    } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error("[VoiceListen] Error:", errorMsg);

        const result: VoiceListenNodeResult = {
            success: false,
            transcript: "",
            confidence: 0,
            error: errorMsg
        };

        if (config.outputVariable) {
            return { [config.outputVariable]: result } as unknown as JsonObject;
        }

        // Re-throw error to trigger Temporal retry
        throw error;
    }
}
