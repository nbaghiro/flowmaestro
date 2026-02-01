import { z } from "zod";
import { StripeClient } from "../client/StripeClient";
import type { StripePaymentIntent } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Cancel Payment Intent operation schema
 */
export const cancelPaymentIntentSchema = z.object({
    payment_intent_id: z.string().describe("Payment intent ID (pi_xxx)"),
    cancellation_reason: z
        .enum(["duplicate", "fraudulent", "requested_by_customer", "abandoned"])
        .optional()
        .describe("Reason for cancellation")
});

export type CancelPaymentIntentParams = z.infer<typeof cancelPaymentIntentSchema>;

/**
 * Cancel Payment Intent operation definition
 */
export const cancelPaymentIntentOperation: OperationDefinition = {
    id: "cancelPaymentIntent",
    name: "Cancel Payment Intent",
    description: "Cancel a payment intent that has not been captured",
    category: "payments",
    actionType: "write",
    inputSchema: cancelPaymentIntentSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute cancel payment intent operation
 */
export async function executeCancelPaymentIntent(
    client: StripeClient,
    params: CancelPaymentIntentParams
): Promise<OperationResult> {
    try {
        const { payment_intent_id, ...cancelParams } = params;

        const response = await client.postForm<StripePaymentIntent>(
            `/payment_intents/${payment_intent_id}/cancel`,
            cancelParams
        );

        return {
            success: true,
            data: {
                id: response.id,
                amount: response.amount,
                currency: response.currency,
                status: response.status,
                customer: response.customer,
                created: response.created,
                livemode: response.livemode
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to cancel payment intent",
                retryable: true
            }
        };
    }
}
