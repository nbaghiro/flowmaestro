import { z } from "zod";
import { PaypalClient } from "../client/PaypalClient";
import type { PaypalRefund } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Get Refund operation schema
 */
export const getRefundSchema = z.object({
    refund_id: z.string().describe("PayPal refund ID")
});

export type GetRefundParams = z.infer<typeof getRefundSchema>;

/**
 * Get Refund operation definition
 */
export const getRefundOperation: OperationDefinition = {
    id: "getRefund",
    name: "Get Refund",
    description: "Retrieve details of a PayPal refund",
    category: "payments",
    actionType: "read",
    inputSchema: getRefundSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute get refund operation
 */
export async function executeGetRefund(
    client: PaypalClient,
    params: GetRefundParams
): Promise<OperationResult> {
    try {
        const response = await client.get<PaypalRefund>(`/v2/payments/refunds/${params.refund_id}`);

        return {
            success: true,
            data: {
                id: response.id,
                status: response.status,
                amount: response.amount,
                noteToPayer: response.note_to_payer,
                createTime: response.create_time,
                updateTime: response.update_time,
                links: response.links
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
