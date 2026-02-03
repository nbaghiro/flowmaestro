import { z } from "zod";
import { PaypalClient } from "../client/PaypalClient";
import type { PaypalInvoice } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Create Invoice operation schema
 */
export const createInvoiceSchema = z.object({
    detail: z.object({
        invoice_number: z.string().optional().describe("Custom invoice number"),
        invoice_date: z.string().optional().describe("Invoice date (YYYY-MM-DD)"),
        currency_code: z.string().length(3).describe("ISO 4217 currency code"),
        note: z.string().optional().describe("Note to the recipient"),
        memo: z.string().optional().describe("Private memo for the invoicer"),
        payment_term: z
            .object({
                due_date: z.string().optional().describe("Due date (YYYY-MM-DD)")
            })
            .optional()
            .describe("Payment terms")
    }),
    invoicer: z
        .object({
            email_address: z.string().optional().describe("Invoicer email"),
            name: z
                .object({
                    given_name: z.string().optional(),
                    surname: z.string().optional()
                })
                .optional()
        })
        .optional()
        .describe("Invoicer info"),
    primary_recipients: z
        .array(
            z.object({
                billing_info: z.object({
                    email_address: z.string().describe("Recipient email"),
                    name: z
                        .object({
                            given_name: z.string().optional(),
                            surname: z.string().optional()
                        })
                        .optional()
                })
            })
        )
        .min(1)
        .describe("Invoice recipients"),
    items: z
        .array(
            z.object({
                name: z.string().describe("Item name"),
                description: z.string().optional().describe("Item description"),
                quantity: z.string().describe("Item quantity (e.g., '1')"),
                unit_amount: z.object({
                    currency_code: z.string().length(3),
                    value: z.string().describe("Unit price (e.g., '50.00')")
                })
            })
        )
        .min(1)
        .describe("Line items")
});

export type CreateInvoiceParams = z.infer<typeof createInvoiceSchema>;

/**
 * Create Invoice operation definition
 */
export const createInvoiceOperation: OperationDefinition = {
    id: "createInvoice",
    name: "Create Invoice",
    description: "Create a new PayPal invoice (created in DRAFT status)",
    category: "invoicing",
    actionType: "write",
    inputSchema: createInvoiceSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute create invoice operation
 */
export async function executeCreateInvoice(
    client: PaypalClient,
    params: CreateInvoiceParams
): Promise<OperationResult> {
    try {
        const response = await client.post<PaypalInvoice>("/v2/invoicing/invoices", params);

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
                links: response.links
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create invoice",
                retryable: true
            }
        };
    }
}
