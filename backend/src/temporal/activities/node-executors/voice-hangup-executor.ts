import type { JsonObject } from "@flowmaestro/shared";
import { getVoiceCommandBus } from "../../../services/events/VoiceCommandBus";
import { CallExecutionRepository } from "../../../storage/repositories/CallExecutionRepository";
import { interpolateVariables } from "./utils";

export interface VoiceHangupNodeConfig {
    farewellMessage?: string; // Optional goodbye message before hangup
    reason?: string; // Hangup reason for logging
    outputVariable?: string; // Where to store result
}

export interface VoiceHangupNodeResult {
    success: boolean;
    hangupCause: string;
    farewellPlayed: boolean;
    error?: string;
}

/**
 * Execute Voice Hangup node - End the call
 */
export async function executeVoiceHangupNode(
    config: VoiceHangupNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    console.log("[VoiceHangup] Ending call");

    // Get call execution ID from context
    const callExecutionId = context.callExecutionId as string;
    if (!callExecutionId) {
        throw new Error("callExecutionId not found in context");
    }

    const commandBus = getVoiceCommandBus();
    let farewellPlayed = false;

    try {
        // Play farewell message if provided
        if (config.farewellMessage) {
            const farewell = interpolateVariables(config.farewellMessage, context);
            console.log(`[VoiceHangup] Playing farewell: "${farewell}"`);

            try {
                await commandBus.sendCommand(
                    callExecutionId,
                    "speak",
                    {
                        text: farewell,
                        interruptible: false
                    },
                    30000
                );

                farewellPlayed = true;

                // Log farewell transcript
                const callRepo = new CallExecutionRepository();
                await callRepo.createTranscript({
                    call_execution_id: callExecutionId,
                    speaker: "agent",
                    text: farewell,
                    started_at: new Date(),
                    is_final: true
                });

                // Small delay to ensure message completes
                await new Promise((resolve) => setTimeout(resolve, 500));
            } catch (error: unknown) {
                const errorMsg = error instanceof Error ? error.message : String(error);
                console.error("[VoiceHangup] Failed to play farewell:", errorMsg);
                // Continue with hangup even if farewell fails
            }
        }

        // Send hangup command
        console.log("[VoiceHangup] Sending hangup command");

        await commandBus.sendCommand(
            callExecutionId,
            "hangup",
            {
                reason: config.reason || "normal"
            },
            5000 // Short timeout for hangup
        );

        // Update call execution status
        const callRepo = new CallExecutionRepository();
        await callRepo.updateStatus(callExecutionId, "completed");

        // Log hangup event
        await callRepo.createEvent({
            call_execution_id: callExecutionId,
            event_type: "call:hangup_initiated",
            event_data: {
                reason: config.reason || "normal",
                farewell_played: farewellPlayed
            },
            severity: "info"
        });

        const result: VoiceHangupNodeResult = {
            success: true,
            hangupCause: config.reason || "normal",
            farewellPlayed
        };

        console.log("[VoiceHangup] Call ended successfully");

        if (config.outputVariable) {
            return { [config.outputVariable]: result } as unknown as JsonObject;
        }

        return result as unknown as JsonObject;
    } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error("[VoiceHangup] Error:", errorMsg);

        // Even if hangup command fails, mark call as completed
        // (call might already be disconnected)
        try {
            const callRepo = new CallExecutionRepository();
            await callRepo.updateStatus(callExecutionId, "completed");
        } catch (updateError) {
            console.error("[VoiceHangup] Failed to update call status:", updateError);
        }

        const result: VoiceHangupNodeResult = {
            success: false,
            hangupCause: config.reason || "error",
            farewellPlayed,
            error: errorMsg
        };

        if (config.outputVariable) {
            return { [config.outputVariable]: result } as unknown as JsonObject;
        }

        // Don't re-throw error for hangup - we consider it successful
        // even if the command fails (call might already be disconnected)
        return result as unknown as JsonObject;
    }
}
