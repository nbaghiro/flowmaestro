import { z } from "zod";
import type { QuickBooksInvoiceOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { QuickBooksClient } from "../client/QuickBooksClient";

export const createInvoiceSchema = z.object({
    customerId: z.string().describe("Customer reference ID"),
    lineItems: z
        .array(
            z.object({
                amount: z.number().describe("Line item amount"),
                description: z.string().optional().describe("Line item description")
            })
        )
        .min(1)
        .describe("Array of line items with amount and description"),
    dueDate: z.string().optional().describe("Due date in YYYY-MM-DD format"),
    docNumber: z.string().optional().describe("Invoice number"),
    customerEmail: z.string().email().optional().describe("Email to send invoice to")
});

export type CreateInvoiceParams = z.infer<typeof createInvoiceSchema>;

export const createInvoiceOperation: OperationDefinition = {
    id: "createInvoice",
    name: "Create Invoice",
    description: "Create a new invoice in QuickBooks",
    category: "invoices",
    inputSchema: createInvoiceSchema,
    retryable: false,
    timeout: 30000
};

export async function executeCreateInvoice(
    client: QuickBooksClient,
    params: CreateInvoiceParams
): Promise<OperationResult> {
    try {
        const invoiceData: {
            CustomerRef: { value: string };
            Line: Array<{
                Amount: number;
                DetailType: string;
                Description?: string;
                SalesItemLineDetail?: {
                    ItemRef?: { value: string };
                    Qty?: number;
                    UnitPrice?: number;
                };
            }>;
            DueDate?: string;
            DocNumber?: string;
            BillEmail?: { Address: string };
        } = {
            CustomerRef: { value: params.customerId },
            Line: params.lineItems.map((item) => ({
                Amount: item.amount,
                DetailType: "SalesItemLineDetail",
                Description: item.description,
                SalesItemLineDetail: {
                    Qty: 1,
                    UnitPrice: item.amount
                }
            }))
        };

        if (params.dueDate) {
            invoiceData.DueDate = params.dueDate;
        }
        if (params.docNumber) {
            invoiceData.DocNumber = params.docNumber;
        }
        if (params.customerEmail) {
            invoiceData.BillEmail = { Address: params.customerEmail };
        }

        const response = await client.createInvoice(invoiceData);
        const invoice = response.Invoice;

        const formattedInvoice: QuickBooksInvoiceOutput = {
            id: invoice.Id,
            docNumber: invoice.DocNumber,
            txnDate: invoice.TxnDate,
            dueDate: invoice.DueDate,
            customer: {
                id: invoice.CustomerRef.value,
                name: invoice.CustomerRef.name
            },
            lineItems: invoice.Line.filter((line) => line.DetailType !== "SubTotalLineDetail").map(
                (line) => ({
                    id: line.Id,
                    lineNum: line.LineNum,
                    description: line.Description,
                    amount: line.Amount,
                    quantity: line.SalesItemLineDetail?.Qty,
                    unitPrice: line.SalesItemLineDetail?.UnitPrice
                })
            ),
            totalAmount: invoice.TotalAmt,
            balance: invoice.Balance,
            billEmail: invoice.BillEmail?.Address,
            emailStatus: invoice.EmailStatus,
            createdAt: invoice.MetaData?.CreateTime,
            updatedAt: invoice.MetaData?.LastUpdatedTime
        };

        return {
            success: true,
            data: formattedInvoice
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
