import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import type { QuickBooksInvoiceOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { QuickBooksClient } from "../client/QuickBooksClient";

export const listInvoicesSchema = z.object({
    maxResults: z
        .number()
        .min(1)
        .max(1000)
        .optional()
        .default(100)
        .describe("Maximum number of results to return (1-1000)"),
    startPosition: z
        .number()
        .min(1)
        .optional()
        .default(1)
        .describe("Starting position for pagination (1-based)")
});

export type ListInvoicesParams = z.infer<typeof listInvoicesSchema>;

export const listInvoicesOperation: OperationDefinition = {
    id: "listInvoices",
    name: "List Invoices",
    description: "Get a list of invoices from QuickBooks",
    category: "invoices",
    inputSchema: listInvoicesSchema,
    inputSchemaJSON: toJSONSchema(listInvoicesSchema),
    retryable: true,
    timeout: 30000
};

export async function executeListInvoices(
    client: QuickBooksClient,
    params: ListInvoicesParams
): Promise<OperationResult> {
    try {
        const response = await client.listInvoices(params.maxResults, params.startPosition);
        const invoices = response.QueryResponse.Invoice || [];

        const formattedInvoices: QuickBooksInvoiceOutput[] = invoices.map((invoice) => ({
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
        }));

        return {
            success: true,
            data: {
                invoices: formattedInvoices,
                count: formattedInvoices.length,
                startPosition: params.startPosition,
                maxResults: params.maxResults
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
