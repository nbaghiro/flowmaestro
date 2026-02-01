import { z } from "zod";
import type { FreshBooksInvoiceOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { FreshBooksHttpClient } from "../client/FreshBooksClient";

export const listInvoicesSchema = z.object({
    page: z.number().min(1).optional().default(1).describe("Page number (default 1)"),
    perPage: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .default(25)
        .describe("Results per page (max 100, default 25)"),
    status: z
        .string()
        .optional()
        .describe("Filter by status (draft, sent, viewed, paid, autopaid, retry, failed, partial)")
});

export type ListInvoicesParams = z.infer<typeof listInvoicesSchema>;

export const listInvoicesOperation: OperationDefinition = {
    id: "listInvoices",
    name: "List Invoices",
    description: "Get a list of invoices from FreshBooks",
    category: "invoices",
    inputSchema: listInvoicesSchema,
    retryable: true,
    timeout: 30000
};

export async function executeListInvoices(
    client: FreshBooksHttpClient,
    params: ListInvoicesParams
): Promise<OperationResult> {
    try {
        const response = await client.listInvoices(params.page, params.perPage, params.status);
        const invoices = response.response.result.invoices || [];

        const formattedInvoices: FreshBooksInvoiceOutput[] = invoices.map((inv) => ({
            id: inv.id,
            invoiceNumber: inv.invoice_number,
            customerId: inv.customerid,
            createDate: inv.create_date,
            dueDate: inv.due_date,
            status: inv.v3_status,
            displayStatus: inv.display_status,
            currencyCode: inv.currency_code,
            amount: parseFloat(inv.amount.amount),
            outstanding: parseFloat(inv.outstanding.amount),
            paid: parseFloat(inv.paid.amount),
            notes: inv.notes || undefined,
            terms: inv.terms || undefined,
            updatedAt: inv.updated
        }));

        return {
            success: true,
            data: {
                invoices: formattedInvoices,
                count: formattedInvoices.length,
                page: response.response.result.page,
                pages: response.response.result.pages,
                perPage: response.response.result.per_page,
                total: response.response.result.total
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
