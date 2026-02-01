import { z } from "zod";
import { StripeClient } from "../client/StripeClient";
import type { StripePaymentIntent } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Create Payment Intent operation schema
 */
export const createPaymentIntentSchema = z.object({
    amount: z
        .number()
        .int()
        .positive()
        .describe("Amount in smallest currency unit (e.g., cents for USD)"),
    currency: z.string().length(3).toLowerCase().describe("ISO 4217 currency code (e.g., usd)"),
    customer: z.string().optional().describe("Stripe customer ID (cus_xxx)"),
    description: z.string().optional().describe("Description for the payment"),
    metadata: z.record(z.string()).optional().describe("Key-value metadata"),
    payment_method: z.string().optional().describe("Payment method ID to attach"),
    confirm: z.boolean().optional().default(false).describe("Confirm immediately if true"),
    receipt_email: z.string().email().optional().describe("Email address for receipt")
});

export type CreatePaymentIntentParams = z.infer<typeof createPaymentIntentSchema>;

/**
 * Create Payment Intent operation definition
 */
export const createPaymentIntentOperation: OperationDefinition = {
    id: "createPaymentIntent",
    name: "Create Payment Intent",
    description: "Create a new payment intent in Stripe",
    category: "payments",
    actionType: "write",
    inputSchema: createPaymentIntentSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute create payment intent operation
 */
export async function executeCreatePaymentIntent(
    client: StripeClient,
    params: CreatePaymentIntentParams
): Promise<OperationResult> {
    try {
        const response = await client.postForm<StripePaymentIntent>("/payment_intents", params);

        return {
            success: true,
            data: {
                id: response.id,
                amount: response.amount,
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
                message: error instanceof Error ? error.message : "Failed to create payment intent",
                retryable: true
            }
        };
    }
}
