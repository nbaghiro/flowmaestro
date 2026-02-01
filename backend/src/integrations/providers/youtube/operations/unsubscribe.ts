import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { YouTubeClient } from "../client/YouTubeClient";

/**
 * Unsubscribe input schema
 */
export const unsubscribeSchema = z.object({
    subscriptionId: z
        .string()
        .min(1)
        .describe("The subscription ID to remove (use listSubscriptions to get this)")
});

export type UnsubscribeParams = z.infer<typeof unsubscribeSchema>;

/**
 * Unsubscribe operation definition
 */
export const unsubscribeOperation: OperationDefinition = {
    id: "unsubscribe",
    name: "Unsubscribe from Channel",
    description:
        "Unsubscribe from a YouTube channel using the subscription ID (get from listSubscriptions)",
    category: "subscriptions",
    retryable: false,
    inputSchema: unsubscribeSchema
};

/**
 * Execute unsubscribe operation
 */
export async function executeUnsubscribe(
    client: YouTubeClient,
    params: UnsubscribeParams
): Promise<OperationResult> {
    try {
        await client.unsubscribe(params.subscriptionId);

        return {
            success: true,
            data: {
                subscriptionId: params.subscriptionId,
                unsubscribed: true,
                message: "Successfully unsubscribed from channel"
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message:
                    error instanceof Error ? error.message : "Failed to unsubscribe from channel",
                retryable: false
            }
        };
    }
}
