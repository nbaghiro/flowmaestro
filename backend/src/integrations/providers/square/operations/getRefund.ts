import { z } from "zod";
import { SquareClient } from "../client/SquareClient";
import type { SquareRefundResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Get Refund operation schema
 */
export const getRefundSchema = z.object({
    refund_id: z.string().describe("Refund ID")
});

export type GetRefundParams = z.infer<typeof getRefundSchema>;

/**
 * Get Refund operation definition
 */
export const getRefundOperation: OperationDefinition = {
    id: "getRefund",
    name: "Get Refund",
    description: "Retrieve details of a specific refund",
    category: "refunds",
    actionType: "read",
    inputSchema: getRefundSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute get refund operation
 */
export async function executeGetRefund(
    client: SquareClient,
    params: GetRefundParams
): Promise<OperationResult> {
    try {
        const response = await client.get<SquareRefundResponse>(`/refunds/${params.refund_id}`);

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
                message: error instanceof Error ? error.message : "Failed to get refund",
                retryable: true
            }
        };
    }
}
