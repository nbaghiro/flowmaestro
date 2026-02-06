import { z } from "zod";
import type { SageInvoiceOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { SageClient } from "../client/SageClient";

export const getInvoiceSchema = z.object({
    invoiceId: z.string().min(1).describe("The Sage sales invoice ID")
});

export type GetInvoiceParams = z.infer<typeof getInvoiceSchema>;

export const getInvoiceOperation: OperationDefinition = {
    id: "getInvoice",
    name: "Get Invoice",
    description: "Get a single sales invoice by ID from Sage",
    category: "invoices",
    inputSchema: getInvoiceSchema,
    retryable: true,
    timeout: 30000
};

export async function executeGetInvoice(
    client: SageClient,
    params: GetInvoiceParams
): Promise<OperationResult> {
    try {
        const invoice = await client.getSalesInvoice(params.invoiceId);

        if (!invoice || !invoice.id) {
            return {
                success: false,
                error: {
                    type: "not_found",
                    message: `Invoice with ID '${params.invoiceId}' not found`,
                    retryable: false
                }
            };
        }

        const formatted: SageInvoiceOutput = {
            id: invoice.id,
            displayedAs: invoice.displayed_as,
            invoiceNumber: invoice.invoice_number,
            status: invoice.status?.displayed_as,
            contact: {
                id: invoice.contact.id,
                displayedAs: invoice.contact.displayed_as
            },
            date: invoice.date,
            dueDate: invoice.due_date,
            lineItems: (invoice.invoice_lines || []).map((li) => ({
                id: li.id,
                description: li.description,
                quantity: li.quantity,
                unitPrice: li.unit_price,
                totalAmount: li.total_amount,
                ledgerAccount: li.ledger_account?.displayed_as,
                taxRateId: li.tax_rate?.id
            })),
            netAmount: invoice.net_amount,
            taxAmount: invoice.tax_amount,
            totalAmount: invoice.total_amount,
            outstandingAmount: invoice.outstanding_amount,
            currency: invoice.currency?.displayed_as,
            reference: invoice.reference,
            createdAt: invoice.created_at,
            updatedAt: invoice.updated_at
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
                message: error instanceof Error ? error.message : "Failed to get invoice",
                retryable: true
            }
        };
    }
}
