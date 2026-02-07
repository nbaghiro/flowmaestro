import { z } from "zod";
import { ChargebeeClient } from "../../client/ChargebeeClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { ChargebeeSubscription, ChargebeeSingleResponse } from "../types";

/**
 * Create Subscription operation schema
 */
export const createSubscriptionSchema = z.object({
    customer_id: z.string().min(1).describe("Customer ID to create subscription for"),
    plan_id: z.string().min(1).describe("Plan ID for the subscription"),
    plan_quantity: z.number().min(1).optional().default(1),
    plan_unit_price: z.number().min(0).optional(),
    trial_end: z.number().optional().describe("Trial end timestamp"),
    billing_cycles: z.number().min(1).optional(),
    auto_collection: z.enum(["on", "off"]).optional(),
    po_number: z.string().optional(),
    start_date: z.number().optional().describe("Subscription start timestamp")
});

export type CreateSubscriptionParams = z.infer<typeof createSubscriptionSchema>;

/**
 * Create Subscription operation definition
 */
export const createSubscriptionOperation: OperationDefinition = {
    id: "createSubscription",
    name: "Create Subscription",
    description: "Create a new subscription for a customer in Chargebee",
    category: "subscriptions",
    inputSchema: createSubscriptionSchema,
    retryable: false,
    timeout: 15000
};

/**
 * Execute create subscription operation
 */
export async function executeCreateSubscription(
    client: ChargebeeClient,
    params: CreateSubscriptionParams
): Promise<OperationResult> {
    try {
        const { customer_id, ...subscriptionParams } = params;

        const formData = client.toFormData(subscriptionParams);

        const response = await client.post<ChargebeeSingleResponse<ChargebeeSubscription>>(
            `/customers/${encodeURIComponent(customer_id)}/subscriptions`,
            formData
        );

        if (!response.subscription) {
            return {
                success: false,
                error: {
                    type: "server_error",
                    message: "Failed to create subscription",
                    retryable: false
                }
            };
        }

        return {
            success: true,
            data: response.subscription
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to create subscription";

        if (message.includes("not found")) {
            return {
                success: false,
                error: {
                    type: "not_found",
                    message: "Customer or plan not found",
                    retryable: false
                }
            };
        }

        if (message.includes("validation")) {
            return {
                success: false,
                error: {
                    type: "validation",
                    message,
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
