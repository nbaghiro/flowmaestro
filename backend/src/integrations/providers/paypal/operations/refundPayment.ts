import { z } from "zod";
import { PaypalClient } from "../client/PaypalClient";
import type { PaypalRefund } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Refund Payment operation schema
 */
export const refundPaymentSchema = z.object({
    capture_id: z.string().describe("PayPal capture ID to refund"),
    amount: z
        .object({
            currency_code: z.string().length(3).describe("ISO 4217 currency code"),
            value: z.string().describe("Refund amount (e.g., '10.00'). Omit for full refund.")
        })
        .optional()
        .describe("Refund amount. Omit for full refund."),
    note_to_payer: z.string().optional().describe("Note to the payer about the refund")
});

export type RefundPaymentParams = z.infer<typeof refundPaymentSchema>;

/**
 * Refund Payment operation definition
 */
export const refundPaymentOperation: OperationDefinition = {
    id: "refundPayment",
    name: "Refund Payment",
    description: "Refund a captured PayPal payment (full or partial)",
    category: "payments",
    actionType: "write",
    inputSchema: refundPaymentSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute refund payment operation
 */
export async function executeRefundPayment(
    client: PaypalClient,
    params: RefundPaymentParams
): Promise<OperationResult> {
    try {
        const body: Record<string, unknown> = {};
        if (params.amount) {
            body.amount = params.amount;
        }
        if (params.note_to_payer) {
            body.note_to_payer = params.note_to_payer;
        }

        const response = await client.post<PaypalRefund>(
            `/v2/payments/captures/${params.capture_id}/refund`,
            Object.keys(body).length > 0 ? body : undefined
        );

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
                message: error instanceof Error ? error.message : "Failed to refund payment",
                retryable: true
            }
        };
    }
}
