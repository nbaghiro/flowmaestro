import { z } from "zod";
import { PaypalClient } from "../client/PaypalClient";
import type { PaypalPayoutBatch } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Get Payout Details operation schema
 */
export const getPayoutDetailsSchema = z.object({
    payout_batch_id: z.string().describe("PayPal payout batch ID")
});

export type GetPayoutDetailsParams = z.infer<typeof getPayoutDetailsSchema>;

/**
 * Get Payout Details operation definition
 */
export const getPayoutDetailsOperation: OperationDefinition = {
    id: "getPayoutDetails",
    name: "Get Payout Details",
    description: "Retrieve details of a PayPal payout batch",
    category: "payouts",
    actionType: "read",
    inputSchema: getPayoutDetailsSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute get payout details operation
 */
export async function executeGetPayoutDetails(
    client: PaypalClient,
    params: GetPayoutDetailsParams
): Promise<OperationResult> {
    try {
        const response = await client.get<PaypalPayoutBatch>(
            `/v1/payments/payouts/${params.payout_batch_id}`
        );

        const items = (response.items || []).map((item) => ({
            payoutItemId: item.payout_item_id,
            transactionId: item.transaction_id,
            transactionStatus: item.transaction_status,
            fee: item.payout_item_fee,
            recipient: item.payout_item.receiver,
            recipientType: item.payout_item.recipient_type,
            amount: item.payout_item.amount,
            note: item.payout_item.note,
            senderItemId: item.payout_item.sender_item_id
        }));

        return {
            success: true,
            data: {
                payoutBatchId: response.batch_header.payout_batch_id,
                batchStatus: response.batch_header.batch_status,
                senderBatchId: response.batch_header.sender_batch_header?.sender_batch_id,
                timeCreated: response.batch_header.time_created,
                timeCompleted: response.batch_header.time_completed,
                totalAmount: response.batch_header.amount,
                totalFees: response.batch_header.fees,
                items
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get payout details",
                retryable: true
            }
        };
    }
}
