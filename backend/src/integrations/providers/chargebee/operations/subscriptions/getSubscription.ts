import { z } from "zod";
import { ChargebeeClient } from "../../client/ChargebeeClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { ChargebeeSubscription, ChargebeeSingleResponse } from "../types";

/**
 * Get Subscription operation schema
 */
export const getSubscriptionSchema = z.object({
    id: z.string().min(1).describe("Subscription ID")
});

export type GetSubscriptionParams = z.infer<typeof getSubscriptionSchema>;

/**
 * Get Subscription operation definition
 */
export const getSubscriptionOperation: OperationDefinition = {
    id: "getSubscription",
    name: "Get Subscription",
    description: "Get a specific subscription by ID from Chargebee",
    category: "subscriptions",
    inputSchema: getSubscriptionSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute get subscription operation
 */
export async function executeGetSubscription(
    client: ChargebeeClient,
    params: GetSubscriptionParams
): Promise<OperationResult> {
    try {
        const response = await client.get<ChargebeeSingleResponse<ChargebeeSubscription>>(
            `/subscriptions/${encodeURIComponent(params.id)}`
        );

        if (!response.subscription) {
            return {
                success: false,
                error: {
                    type: "not_found",
                    message: "Subscription not found",
                    retryable: false
                }
            };
        }

        return {
            success: true,
            data: response.subscription
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to get subscription";

        if (message.includes("not found") || message.includes("404")) {
            return {
                success: false,
                error: {
                    type: "not_found",
                    message: "Subscription not found",
                    retryable: false
                }
            };
        }

        return {
            success: false,
            error: {
                type: "server_error",
                message,
                retryable: true
            }
        };
    }
}
