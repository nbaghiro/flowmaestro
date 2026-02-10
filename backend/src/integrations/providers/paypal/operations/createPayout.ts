import { z } from "zod";
import { PaypalClient } from "../client/PaypalClient";
import type { PaypalPayoutCreateResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Create Payout operation schema
 */
export const createPayoutSchema = z.object({
    sender_batch_header: z.object({
        sender_batch_id: z
            .string()
            .optional()
            .describe("Unique batch ID (auto-generated if omitted)"),
        email_subject: z.string().optional().describe("Email subject for recipients"),
        email_message: z.string().optional().describe("Email message for recipients")
    }),
    items: z
        .array(
            z.object({
                recipient_type: z
                    .enum(["EMAIL", "PHONE", "PAYPAL_ID"])
                    .default("EMAIL")
                    .describe("Type of recipient identifier"),
                amount: z.object({
                    currency: z.string().length(3).describe("ISO 4217 currency code"),
                    value: z.string().describe("Payout amount (e.g., '10.00')")
                }),
                receiver: z.string().describe("Recipient email, phone, or PayPal ID"),
                note: z.string().optional().describe("Note to recipient"),
                sender_item_id: z.string().optional().describe("Unique item ID for tracking")
            })
        )
        .min(1)
        .describe("Payout items (recipients)")
});

export type CreatePayoutParams = z.infer<typeof createPayoutSchema>;

/**
 * Create Payout operation definition
 */
export const createPayoutOperation: OperationDefinition = {
    id: "createPayout",
    name: "Create Payout",
    description: "Send batch payouts to multiple recipients via PayPal",
    category: "payouts",
    actionType: "write",
    inputSchema: createPayoutSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute create payout operation
 */
export async function executeCreatePayout(
    client: PaypalClient,
    params: CreatePayoutParams
): Promise<OperationResult> {
    try {
        const response = await client.post<PaypalPayoutCreateResponse>(
            "/v1/payments/payouts",
            params
        );

        return {
            success: true,
            data: {
                payoutBatchId: response.batch_header.payout_batch_id,
                batchStatus: response.batch_header.batch_status,
                senderBatchId: response.batch_header.sender_batch_header?.sender_batch_id,
                links: response.links
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create payout",
                retryable: true
            }
        };
    }
}
