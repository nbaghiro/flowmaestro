import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { RingCentralClient } from "../client/RingCentralClient";

export const makeCallSchema = z.object({
    from: z.string().describe("Your phone number to ring first"),
    to: z.string().describe("Destination phone number to connect to"),
    playPrompt: z.boolean().optional().describe("Play prompt to confirm call (default: true)"),
    callerId: z.string().optional().describe("Caller ID to show (must be your number)")
});

export type MakeCallParams = z.infer<typeof makeCallSchema>;

export const makeCallOperation: OperationDefinition = {
    id: "makeCall",
    name: "Make Call (RingOut)",
    description:
        "Initiate a call using RingOut - rings your phone first, then connects to destination",
    category: "voice",
    inputSchema: makeCallSchema,
    retryable: false,
    timeout: 30000
};

export async function executeMakeCall(
    client: RingCentralClient,
    params: MakeCallParams
): Promise<OperationResult> {
    try {
        const response = await client.makeRingOutCall({
            from: { phoneNumber: params.from },
            to: { phoneNumber: params.to },
            playPrompt: params.playPrompt,
            callerId: params.callerId ? { phoneNumber: params.callerId } : undefined
        });

        return {
            success: true,
            data: {
                ringOutId: response.id,
                callStatus: response.status.callStatus,
                callerStatus: response.status.callerStatus,
                calleeStatus: response.status.calleeStatus
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to initiate call",
                retryable: false
            }
        };
    }
}
