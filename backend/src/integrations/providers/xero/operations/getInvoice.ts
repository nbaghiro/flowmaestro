import { z } from "zod";
import type { XeroInvoiceOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { XeroClient } from "../client/XeroClient";

export const getInvoiceSchema = z.object({
    invoiceId: z.string().min(1).describe("The Xero invoice ID")
});

export type GetInvoiceParams = z.infer<typeof getInvoiceSchema>;

export const getInvoiceOperation: OperationDefinition = {
    id: "getInvoice",
    name: "Get Invoice",
    description: "Get a single invoice by ID from Xero",
    category: "invoices",
    inputSchema: getInvoiceSchema,
    retryable: true,
    timeout: 30000
};

export async function executeGetInvoice(
    client: XeroClient,
    params: GetInvoiceParams
): Promise<OperationResult> {
    try {
        const response = await client.getInvoice(params.invoiceId);
        const invoices = response.Invoices || [];

        if (invoices.length === 0) {
            return {
                success: false,
                error: {
                    type: "not_found",
                    message: `Invoice with ID '${params.invoiceId}' not found`,
                    retryable: false
                }
            };
        }

        const invoice = invoices[0];
        const formatted: XeroInvoiceOutput = {
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
