import { z } from "zod";
import { PaypalClient } from "../client/PaypalClient";
import type { PaypalInvoice } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Get Invoice operation schema
 */
export const getInvoiceSchema = z.object({
    invoice_id: z.string().describe("PayPal invoice ID")
});

export type GetInvoiceParams = z.infer<typeof getInvoiceSchema>;

/**
 * Get Invoice operation definition
 */
export const getInvoiceOperation: OperationDefinition = {
    id: "getInvoice",
    name: "Get Invoice",
    description: "Retrieve details of a PayPal invoice",
    category: "invoicing",
    actionType: "read",
    inputSchema: getInvoiceSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute get invoice operation
 */
export async function executeGetInvoice(
    client: PaypalClient,
    params: GetInvoiceParams
): Promise<OperationResult> {
    try {
        const response = await client.get<PaypalInvoice>(
            `/v2/invoicing/invoices/${params.invoice_id}`
        );

        return {
            success: true,
            data: {
                id: response.id,
                status: response.status,
                detail: response.detail,
                invoicer: response.invoicer,
                primaryRecipients: response.primary_recipients,
                items: response.items,
                amount: response.amount,
                dueAmount: response.due_amount,
                links: response.links
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get invoice",
                retryable: true
            }
        };
    }
}
