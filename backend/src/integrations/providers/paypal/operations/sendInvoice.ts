import { z } from "zod";
import { PaypalClient } from "../client/PaypalClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Send Invoice operation schema
 */
export const sendInvoiceSchema = z.object({
    invoice_id: z.string().describe("PayPal invoice ID to send"),
    subject: z.string().optional().describe("Custom email subject"),
    note: z.string().optional().describe("Note to include in the email"),
    send_to_invoicer: z.boolean().optional().default(false).describe("Send a copy to the invoicer")
});

export type SendInvoiceParams = z.infer<typeof sendInvoiceSchema>;

/**
 * Send Invoice operation definition
 */
export const sendInvoiceOperation: OperationDefinition = {
    id: "sendInvoice",
    name: "Send Invoice",
    description: "Send a draft PayPal invoice to the recipient",
    category: "invoicing",
    actionType: "write",
    inputSchema: sendInvoiceSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute send invoice operation
 */
export async function executeSendInvoice(
    client: PaypalClient,
    params: SendInvoiceParams
): Promise<OperationResult> {
    try {
        const body: Record<string, unknown> = {};
        if (params.subject) {
            body.subject = params.subject;
        }
        if (params.note) {
            body.note = params.note;
        }
        if (params.send_to_invoicer) {
            body.send_to_invoicer = params.send_to_invoicer;
        }

        // PayPal returns 202 Accepted with no body on success
        await client.post(
            `/v2/invoicing/invoices/${params.invoice_id}/send`,
            Object.keys(body).length > 0 ? body : undefined
        );

        return {
            success: true,
            data: {
                invoiceId: params.invoice_id,
                sent: true
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to send invoice",
                retryable: true
            }
        };
    }
}
