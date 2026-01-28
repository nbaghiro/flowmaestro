import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import { StripeClient } from "../client/StripeClient";
import type { StripePaymentIntent } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Confirm Payment Intent operation schema
 */
export const confirmPaymentIntentSchema = z.object({
    payment_intent_id: z.string().describe("Payment intent ID (pi_xxx)"),
    payment_method: z.string().optional().describe("Payment method to use for confirmation"),
    return_url: z
        .string()
        .url()
        .optional()
        .describe("Return URL for redirect-based payment methods")
});

export type ConfirmPaymentIntentParams = z.infer<typeof confirmPaymentIntentSchema>;

/**
 * Confirm Payment Intent operation definition
 */
export const confirmPaymentIntentOperation: OperationDefinition = {
    id: "confirmPaymentIntent",
    name: "Confirm Payment Intent",
    description: "Confirm a payment intent to proceed with payment",
    category: "payments",
    actionType: "write",
    inputSchema: confirmPaymentIntentSchema,
    inputSchemaJSON: toJSONSchema(confirmPaymentIntentSchema),
    retryable: true,
    timeout: 15000
};

/**
 * Execute confirm payment intent operation
 */
export async function executeConfirmPaymentIntent(
    client: StripeClient,
    params: ConfirmPaymentIntentParams
): Promise<OperationResult> {
    try {
        const { payment_intent_id, ...confirmParams } = params;

        const response = await client.postForm<StripePaymentIntent>(
            `/payment_intents/${payment_intent_id}/confirm`,
            confirmParams
        );

        return {
            success: true,
            data: {
                id: response.id,
                amount: response.amount,
                currency: response.currency,
                status: response.status,
                clientSecret: response.client_secret,
                customer: response.customer,
                paymentMethod: response.payment_method,
                created: response.created,
                livemode: response.livemode
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message:
                    error instanceof Error ? error.message : "Failed to confirm payment intent",
                retryable: true
            }
        };
    }
}
