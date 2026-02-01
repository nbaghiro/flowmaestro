import { z } from "zod";
import type { FreshBooksInvoiceOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { FreshBooksHttpClient } from "../client/FreshBooksClient";

export const getInvoiceSchema = z.object({
    invoiceId: z.string().describe("The FreshBooks invoice ID")
});

export type GetInvoiceParams = z.infer<typeof getInvoiceSchema>;

export const getInvoiceOperation: OperationDefinition = {
    id: "getInvoice",
    name: "Get Invoice",
    description: "Get a specific invoice by ID from FreshBooks",
    category: "invoices",
    inputSchema: getInvoiceSchema,
    retryable: true,
    timeout: 30000
};

export async function executeGetInvoice(
    client: FreshBooksHttpClient,
    params: GetInvoiceParams
): Promise<OperationResult> {
    try {
        const response = await client.getInvoice(params.invoiceId);
        const inv = response.response.result.invoice;

        const formattedInvoice: FreshBooksInvoiceOutput = {
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
            lineItems: inv.lines?.map((line) => ({
                id: line.lineid,
                name: line.name,
                description: line.description,
                quantity: parseFloat(line.qty),
                unitCost: parseFloat(line.unit_cost.amount),
                amount: parseFloat(line.amount.amount)
            })),
            updatedAt: inv.updated
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
