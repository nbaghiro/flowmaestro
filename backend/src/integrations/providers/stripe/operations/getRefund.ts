import { z } from "zod";
import { StripeClient } from "../client/StripeClient";
import type { StripeRefund } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Get Refund operation schema
 */
export const getRefundSchema = z.object({
    refund_id: z.string().describe("Refund ID (re_xxx)")
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
    client: StripeClient,
    params: GetRefundParams
): Promise<OperationResult> {
    try {
        const response = await client.get<StripeRefund>(`/refunds/${params.refund_id}`);

        return {
            success: true,
            data: {
                id: response.id,
                amount: response.amount,
                currency: response.currency,
                status: response.status,
                charge: response.charge,
                paymentIntent: response.payment_intent,
                reason: response.reason,
                metadata: response.metadata,
                created: response.created
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
