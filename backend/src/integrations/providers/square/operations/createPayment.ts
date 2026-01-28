import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import { SquareClient } from "../client/SquareClient";
import type { SquarePaymentResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Create Payment operation schema
 */
export const createPaymentSchema = z.object({
    source_id: z.string().describe("Payment source (nonce, card ID, or 'CASH')"),
    amount_money: z
        .object({
            amount: z.number().int().positive().describe("Amount in smallest currency unit"),
            currency: z.string().length(3).describe("ISO 4217 currency code")
        })
        .describe("Payment amount"),
    idempotency_key: z.string().optional().describe("Unique key for idempotent requests"),
    customer_id: z.string().optional().describe("Square customer ID"),
    location_id: z.string().describe("Square location ID"),
    reference_id: z.string().optional().describe("External reference ID"),
    note: z.string().optional().describe("Payment note")
});

export type CreatePaymentParams = z.infer<typeof createPaymentSchema>;

/**
 * Create Payment operation definition
 */
export const createPaymentOperation: OperationDefinition = {
    id: "createPayment",
    name: "Create Payment",
    description: "Create a new payment in Square",
    category: "payments",
    actionType: "write",
    inputSchema: createPaymentSchema,
    inputSchemaJSON: toJSONSchema(createPaymentSchema),
    retryable: true,
    timeout: 15000
};

/**
 * Execute create payment operation
 */
export async function executeCreatePayment(
    client: SquareClient,
    params: CreatePaymentParams
): Promise<OperationResult> {
    try {
        const response = await client.postWithIdempotency<SquarePaymentResponse>(
            "/payments",
            params,
            params.idempotency_key
        );

        if (response.errors && response.errors.length > 0) {
            return {
                success: false,
                error: {
                    type: "server_error",
                    message: response.errors[0].detail || response.errors[0].code,
                    retryable: false
                }
            };
        }

        const payment = response.payment!;

        return {
            success: true,
            data: {
                id: payment.id,
                amountMoney: payment.amount_money,
                totalMoney: payment.total_money,
                status: payment.status,
                sourceType: payment.source_type,
                locationId: payment.location_id,
                customerId: payment.customer_id,
                referenceId: payment.reference_id,
                note: payment.note,
                receiptNumber: payment.receipt_number,
                receiptUrl: payment.receipt_url,
                createdAt: payment.created_at,
                updatedAt: payment.updated_at
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create payment",
                retryable: true
            }
        };
    }
}
