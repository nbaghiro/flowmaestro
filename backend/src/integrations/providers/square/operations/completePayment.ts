import { z } from "zod";
import { SquareClient } from "../client/SquareClient";
import type { SquarePaymentResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Complete Payment operation schema
 */
export const completePaymentSchema = z.object({
    payment_id: z.string().describe("Payment ID to complete")
});

export type CompletePaymentParams = z.infer<typeof completePaymentSchema>;

/**
 * Complete Payment operation definition
 */
export const completePaymentOperation: OperationDefinition = {
    id: "completePayment",
    name: "Complete Payment",
    description: "Complete a payment that requires additional action",
    category: "payments",
    actionType: "write",
    inputSchema: completePaymentSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute complete payment operation
 */
export async function executeCompletePayment(
    client: SquareClient,
    params: CompletePaymentParams
): Promise<OperationResult> {
    try {
        const response = await client.postWithIdempotency<SquarePaymentResponse>(
            `/payments/${params.payment_id}/complete`,
            {}
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
                status: payment.status,
                locationId: payment.location_id,
                createdAt: payment.created_at,
                updatedAt: payment.updated_at
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to complete payment",
                retryable: true
            }
        };
    }
}
