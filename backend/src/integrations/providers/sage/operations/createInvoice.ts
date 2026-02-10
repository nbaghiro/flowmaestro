import { z } from "zod";
import type { SageInvoiceOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { SageClient } from "../client/SageClient";

export const createInvoiceSchema = z.object({
    contactId: z.string().min(1).describe("The Sage contact ID for the invoice"),
    date: z.string().describe("Invoice date (YYYY-MM-DD format)"),
    dueDate: z.string().optional().describe("Due date (YYYY-MM-DD format)"),
    reference: z.string().optional().describe("Invoice reference"),
    lineItems: z
        .array(
            z.object({
                description: z.string().min(1).describe("Line item description"),
                quantity: z.number().optional().default(1).describe("Quantity"),
                unitPrice: z.number().describe("Unit price amount"),
                ledgerAccountId: z.string().optional().describe("Ledger account ID"),
                taxRateId: z.string().optional().describe("Tax rate ID")
            })
        )
        .min(1)
        .describe("Invoice line items (at least one required)")
});

export type CreateInvoiceParams = z.infer<typeof createInvoiceSchema>;

export const createInvoiceOperation: OperationDefinition = {
    id: "createInvoice",
    name: "Create Invoice",
    description: "Create a new sales invoice in Sage",
    category: "invoices",
    inputSchema: createInvoiceSchema,
    retryable: false,
    timeout: 30000
};

export async function executeCreateInvoice(
    client: SageClient,
    params: CreateInvoiceParams
): Promise<OperationResult> {
    try {
        const response = await client.createSalesInvoice({
            sales_invoice: {
                contact_id: params.contactId,
                date: params.date,
                due_date: params.dueDate,
                reference: params.reference,
                invoice_lines: params.lineItems.map((li) => ({
                    description: li.description,
                    quantity: li.quantity,
                    unit_price: li.unitPrice,
                    ledger_account_id: li.ledgerAccountId,
                    tax_rate_id: li.taxRateId
                }))
            }
        });

        if (!response || !response.id) {
            return {
                success: false,
                error: {
                    type: "server_error",
                    message: "Failed to create invoice - no response data",
                    retryable: false
                }
            };
        }

        const formatted: SageInvoiceOutput = {
            id: response.id,
            displayedAs: response.displayed_as,
            invoiceNumber: response.invoice_number,
            status: response.status?.displayed_as,
            contact: {
                id: response.contact.id,
                displayedAs: response.contact.displayed_as
            },
            date: response.date,
            dueDate: response.due_date,
            lineItems: (response.invoice_lines || []).map((li) => ({
                id: li.id,
                description: li.description,
                quantity: li.quantity,
                unitPrice: li.unit_price,
                totalAmount: li.total_amount,
                ledgerAccount: li.ledger_account?.displayed_as,
                taxRateId: li.tax_rate?.id
            })),
            netAmount: response.net_amount,
            taxAmount: response.tax_amount,
            totalAmount: response.total_amount,
            outstandingAmount: response.outstanding_amount,
            currency: response.currency?.displayed_as,
            reference: response.reference,
            createdAt: response.created_at,
            updatedAt: response.updated_at
        };

        return {
            success: true,
            data: formatted
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create invoice",
                retryable: false
            }
        };
    }
}
