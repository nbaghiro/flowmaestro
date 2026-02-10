import { z } from "zod";
import type { XeroInvoiceOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { XeroClient } from "../client/XeroClient";

export const createInvoiceSchema = z.object({
    type: z
        .enum(["ACCREC", "ACCPAY"])
        .describe("Invoice type: ACCREC (accounts receivable) or ACCPAY (accounts payable)"),
    contactId: z.string().min(1).describe("The Xero contact ID for the invoice"),
    lineItems: z
        .array(
            z.object({
                description: z.string().min(1).describe("Line item description"),
                quantity: z.number().optional().default(1).describe("Quantity"),
                unitAmount: z.number().describe("Unit price amount"),
                accountCode: z.string().optional().describe("Account code")
            })
        )
        .min(1)
        .describe("Invoice line items (at least one required)"),
    date: z.string().optional().describe("Invoice date (YYYY-MM-DD format)"),
    dueDate: z.string().optional().describe("Due date (YYYY-MM-DD format)"),
    reference: z.string().optional().describe("Invoice reference"),
    status: z
        .enum(["DRAFT", "SUBMITTED", "AUTHORISED"])
        .optional()
        .default("DRAFT")
        .describe("Invoice status")
});

export type CreateInvoiceParams = z.infer<typeof createInvoiceSchema>;

export const createInvoiceOperation: OperationDefinition = {
    id: "createInvoice",
    name: "Create Invoice",
    description: "Create a new invoice in Xero",
    category: "invoices",
    inputSchema: createInvoiceSchema,
    retryable: false,
    timeout: 30000
};

export async function executeCreateInvoice(
    client: XeroClient,
    params: CreateInvoiceParams
): Promise<OperationResult> {
    try {
        const response = await client.createInvoice({
            Type: params.type,
            Contact: { ContactID: params.contactId },
            LineItems: params.lineItems.map((li) => ({
                Description: li.description,
                Quantity: li.quantity,
                UnitAmount: li.unitAmount,
                AccountCode: li.accountCode
            })),
            Date: params.date,
            DueDate: params.dueDate,
            Reference: params.reference,
            Status: params.status
        });

        const invoices = response.Invoices || [];

        if (invoices.length === 0) {
            return {
                success: false,
                error: {
                    type: "server_error",
                    message: "Failed to create invoice - no response data",
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
                message: error instanceof Error ? error.message : "Failed to create invoice",
                retryable: false
            }
        };
    }
}
