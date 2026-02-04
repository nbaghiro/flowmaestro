import { z } from "zod";
import type { XeroInvoiceOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { XeroClient } from "../client/XeroClient";

export const listInvoicesSchema = z.object({
    page: z.number().min(1).optional().default(1).describe("Page number for pagination (1-based)")
});

export type ListInvoicesParams = z.infer<typeof listInvoicesSchema>;

export const listInvoicesOperation: OperationDefinition = {
    id: "listInvoices",
    name: "List Invoices",
    description: "Get a list of invoices from Xero",
    category: "invoices",
    inputSchema: listInvoicesSchema,
    retryable: true,
    timeout: 30000
};

export async function executeListInvoices(
    client: XeroClient,
    params: ListInvoicesParams
): Promise<OperationResult> {
    try {
        const response = await client.listInvoices(params.page);
        const invoices = response.Invoices || [];

        const formattedInvoices: XeroInvoiceOutput[] = invoices.map((invoice) => ({
            invoiceId: invoice.InvoiceID,
            invoiceNumber: invoice.InvoiceNumber,
            type: invoice.Type,
            status: invoice.Status,
            contact: {
                contactId: invoice.Contact.ContactID,
                name: invoice.Contact.Name
            },
            date: invoice.Date,
            dueDate: invoice.DueDate,
            lineItems: invoice.LineItems.map((li) => ({
                lineItemId: li.LineItemID,
                description: li.Description,
                quantity: li.Quantity,
                unitAmount: li.UnitAmount,
                lineAmount: li.LineAmount,
                accountCode: li.AccountCode,
                taxType: li.TaxType
            })),
            subTotal: invoice.SubTotal,
            totalTax: invoice.TotalTax,
            total: invoice.Total,
            amountDue: invoice.AmountDue,
            amountPaid: invoice.AmountPaid,
            currencyCode: invoice.CurrencyCode,
            reference: invoice.Reference,
            updatedDateUTC: invoice.UpdatedDateUTC
        }));

        return {
            success: true,
            data: {
                invoices: formattedInvoices,
                count: formattedInvoices.length,
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
