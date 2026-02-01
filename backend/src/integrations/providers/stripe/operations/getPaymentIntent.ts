import { z } from "zod";
import { StripeClient } from "../client/StripeClient";
import type { StripePaymentIntent } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Get Payment Intent operation schema
 */
export const getPaymentIntentSchema = z.object({
    payment_intent_id: z.string().describe("Payment intent ID (pi_xxx)")
});

export type GetPaymentIntentParams = z.infer<typeof getPaymentIntentSchema>;

/**
 * Get Payment Intent operation definition
 */
export const getPaymentIntentOperation: OperationDefinition = {
    id: "getPaymentIntent",
    name: "Get Payment Intent",
    description: "Retrieve details of a specific payment intent",
    category: "payments",
    actionType: "read",
    inputSchema: getPaymentIntentSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute get payment intent operation
 */
export async function executeGetPaymentIntent(
    client: StripeClient,
    params: GetPaymentIntentParams
): Promise<OperationResult> {
    try {
        const response = await client.get<StripePaymentIntent>(
            `/payment_intents/${params.payment_intent_id}`
        );

        return {
            success: true,
            data: {
                id: response.id,
                amount: response.amount,
                amountReceived: response.amount_received,
                currency: response.currency,
                status: response.status,
                clientSecret: response.client_secret,
                customer: response.customer,
                description: response.description,
                metadata: response.metadata,
                paymentMethod: response.payment_method,
                receiptEmail: response.receipt_email,
                created: response.created,
                livemode: response.livemode
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get payment intent",
                retryable: true
            }
        };
    }
}
