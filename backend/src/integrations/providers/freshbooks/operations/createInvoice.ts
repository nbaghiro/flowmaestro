import { z } from "zod";
import type { FreshBooksInvoiceOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { FreshBooksHttpClient } from "../client/FreshBooksClient";

export const createInvoiceSchema = z.object({
    clientId: z.string().describe("Client ID"),
    lines: z
        .array(
            z.object({
                name: z.string().describe("Line item name/title"),
                amount: z.number().describe("Line item amount"),
                quantity: z.number().optional().default(1).describe("Quantity (default 1)")
            })
        )
        .min(1)
        .describe("Array of line items with name, amount, and quantity"),
    dueOffsetDays: z.number().optional().default(30).describe("Days until due (default 30)"),
    notes: z.string().optional().describe("Notes to include on invoice"),
    createDate: z.string().optional().describe("Invoice date in YYYY-MM-DD format")
});

export type CreateInvoiceParams = z.infer<typeof createInvoiceSchema>;

export const createInvoiceOperation: OperationDefinition = {
    id: "createInvoice",
    name: "Create Invoice",
    description: "Create a new invoice in FreshBooks",
    category: "invoices",
    inputSchema: createInvoiceSchema,
    retryable: false,
    timeout: 30000
};

export async function executeCreateInvoice(
    client: FreshBooksHttpClient,
    params: CreateInvoiceParams
): Promise<OperationResult> {
    try {
        const invoiceData: {
            customerid: number;
            lines: Array<{
                name: string;
                amount: { amount: string; code: string };
                qty: number;
            }>;
            due_offset_days?: number;
            notes?: string;
            create_date?: string;
        } = {
            customerid: parseInt(params.clientId, 10),
            lines: params.lines.map((line) => ({
                name: line.name,
                amount: { amount: line.amount.toString(), code: "USD" },
                qty: line.quantity ?? 1
            }))
        };

        if (params.dueOffsetDays !== undefined) {
            invoiceData.due_offset_days = params.dueOffsetDays;
        }
        if (params.notes) {
            invoiceData.notes = params.notes;
        }
        if (params.createDate) {
            invoiceData.create_date = params.createDate;
        }

        const response = await client.createInvoice(invoiceData);
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
                message: error instanceof Error ? error.message : "Failed to create invoice",
                retryable: false
            }
        };
    }
}
