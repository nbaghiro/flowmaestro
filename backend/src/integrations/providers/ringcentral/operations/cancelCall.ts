import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { RingCentralClient } from "../client/RingCentralClient";

export const cancelCallSchema = z.object({
    ringOutId: z.string().describe("The RingOut call ID to cancel")
});

export type CancelCallParams = z.infer<typeof cancelCallSchema>;

export const cancelCallOperation: OperationDefinition = {
    id: "cancelCall",
    name: "Cancel Call",
    description: "Cancel an in-progress RingOut call",
    category: "voice",
    inputSchema: cancelCallSchema,
    retryable: false,
    timeout: 30000
};

export async function executeCancelCall(
    client: RingCentralClient,
    params: CancelCallParams
): Promise<OperationResult> {
    try {
        await client.cancelRingOutCall(params.ringOutId);

        return {
            success: true,
            data: {
                cancelled: true,
                ringOutId: params.ringOutId
            }
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to cancel call";
        const isNotFound = errorMessage.includes("not found") || errorMessage.includes("404");

        return {
            success: false,
            error: {
                type: isNotFound ? "not_found" : "server_error",
                message: errorMessage,
                retryable: !isNotFound
            }
        };
    }
}
