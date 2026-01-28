import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import type { QuickBooksInvoiceOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { QuickBooksClient } from "../client/QuickBooksClient";

export const getInvoiceSchema = z.object({
    invoiceId: z.string().describe("The QuickBooks invoice ID")
});

export type GetInvoiceParams = z.infer<typeof getInvoiceSchema>;

export const getInvoiceOperation: OperationDefinition = {
    id: "getInvoice",
    name: "Get Invoice",
    description: "Get a specific invoice by ID from QuickBooks",
    category: "invoices",
    inputSchema: getInvoiceSchema,
    inputSchemaJSON: toJSONSchema(getInvoiceSchema),
    retryable: true,
    timeout: 30000
};

export async function executeGetInvoice(
    client: QuickBooksClient,
    params: GetInvoiceParams
): Promise<OperationResult> {
    try {
        const response = await client.getInvoice(params.invoiceId);
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
                message: error instanceof Error ? error.message : "Failed to get invoice",
                retryable: true
            }
        };
    }
}
