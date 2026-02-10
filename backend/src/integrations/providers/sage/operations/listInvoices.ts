import { z } from "zod";
import type { SageInvoiceOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { SageClient } from "../client/SageClient";

export const listInvoicesSchema = z.object({
    page: z.number().min(1).optional().default(1).describe("Page number for pagination (1-based)"),
    itemsPerPage: z
        .number()
        .min(1)
        .max(200)
        .optional()
        .default(20)
        .describe("Number of items per page (max 200)")
});

export type ListInvoicesParams = z.infer<typeof listInvoicesSchema>;

export const listInvoicesOperation: OperationDefinition = {
    id: "listInvoices",
    name: "List Invoices",
    description: "Get a list of sales invoices from Sage",
    category: "invoices",
    inputSchema: listInvoicesSchema,
    retryable: true,
    timeout: 30000
};

export async function executeListInvoices(
    client: SageClient,
    params: ListInvoicesParams
): Promise<OperationResult> {
    try {
        const response = await client.listSalesInvoices(params.page, params.itemsPerPage);
        const invoices = response.$items || [];

        const formattedInvoices: SageInvoiceOutput[] = invoices.map((invoice) => ({
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
        }));

        return {
            success: true,
            data: {
                invoices: formattedInvoices,
                count: formattedInvoices.length,
                total: response.$total,
                page: params.page
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list invoices",
                retryable: true
            }
        };
    }
}
