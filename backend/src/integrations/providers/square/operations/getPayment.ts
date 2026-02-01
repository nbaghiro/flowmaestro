import { z } from "zod";
import { SquareClient } from "../client/SquareClient";
import type { SquarePaymentResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Get Payment operation schema
 */
export const getPaymentSchema = z.object({
    payment_id: z.string().describe("Payment ID")
});

export type GetPaymentParams = z.infer<typeof getPaymentSchema>;

/**
 * Get Payment operation definition
 */
export const getPaymentOperation: OperationDefinition = {
    id: "getPayment",
    name: "Get Payment",
    description: "Retrieve details of a specific payment",
    category: "payments",
    actionType: "read",
    inputSchema: getPaymentSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute get payment operation
 */
export async function executeGetPayment(
    client: SquareClient,
    params: GetPaymentParams
): Promise<OperationResult> {
    try {
        const response = await client.get<SquarePaymentResponse>(`/payments/${params.payment_id}`);

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
                message: error instanceof Error ? error.message : "Failed to get payment",
                retryable: true
            }
        };
    }
}
