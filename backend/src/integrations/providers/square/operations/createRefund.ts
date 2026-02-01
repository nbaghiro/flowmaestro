import { z } from "zod";
import { SquareClient } from "../client/SquareClient";
import type { SquareRefundResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Create Refund operation schema
 */
export const createRefundSchema = z.object({
    payment_id: z.string().describe("Payment ID to refund"),
    idempotency_key: z.string().describe("Unique idempotency key"),
    amount_money: z
        .object({
            amount: z.number().int().positive().describe("Refund amount"),
            currency: z.string().length(3).describe("Currency code")
        })
        .describe("Refund amount"),
    reason: z.string().optional().describe("Refund reason")
});

export type CreateRefundParams = z.infer<typeof createRefundSchema>;

/**
 * Create Refund operation definition
 */
export const createRefundOperation: OperationDefinition = {
    id: "createRefund",
    name: "Create Refund",
    description: "Create a refund for a payment",
    category: "refunds",
    actionType: "write",
    inputSchema: createRefundSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute create refund operation
 */
export async function executeCreateRefund(
    client: SquareClient,
    params: CreateRefundParams
): Promise<OperationResult> {
    try {
        const response = await client.postWithIdempotency<SquareRefundResponse>(
            "/refunds",
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

        const refund = response.refund!;

        return {
            success: true,
            data: {
                id: refund.id,
                paymentId: refund.payment_id,
                amountMoney: refund.amount_money,
                status: refund.status,
                locationId: refund.location_id,
                reason: refund.reason,
                createdAt: refund.created_at,
                updatedAt: refund.updated_at
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create refund",
                retryable: true
            }
        };
    }
}
