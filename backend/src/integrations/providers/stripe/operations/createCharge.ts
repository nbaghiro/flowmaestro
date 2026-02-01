import { z } from "zod";
import { StripeClient } from "../client/StripeClient";
import type { StripeCharge } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Create Charge operation schema
 */
export const createChargeSchema = z.object({
    amount: z.number().int().positive().describe("Amount in cents"),
    currency: z.string().length(3).describe("ISO 4217 currency code"),
    source: z.string().describe("Payment source (token or card ID)"),
    customer: z.string().optional().describe("Customer ID"),
    description: z.string().optional().describe("Charge description"),
    metadata: z.record(z.string()).optional().describe("Key-value metadata"),
    receipt_email: z.string().email().optional().describe("Receipt email")
});

export type CreateChargeParams = z.infer<typeof createChargeSchema>;

/**
 * Create Charge operation definition
 */
export const createChargeOperation: OperationDefinition = {
    id: "createCharge",
    name: "Create Charge",
    description: "Create a charge to collect payment immediately",
    category: "charges",
    actionType: "write",
    inputSchema: createChargeSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute create charge operation
 */
export async function executeCreateCharge(
    client: StripeClient,
    params: CreateChargeParams
): Promise<OperationResult> {
    try {
        const response = await client.postForm<StripeCharge>("/charges", params);

        return {
            success: true,
            data: {
                id: response.id,
                amount: response.amount,
                amountRefunded: response.amount_refunded,
                currency: response.currency,
                status: response.status,
                customer: response.customer,
                description: response.description,
                metadata: response.metadata,
                receiptEmail: response.receipt_email,
                receiptUrl: response.receipt_url,
                refunded: response.refunded,
                paymentIntent: response.payment_intent,
                created: response.created,
                livemode: response.livemode
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create charge",
                retryable: true
            }
        };
    }
}
