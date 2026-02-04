import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { NetsuiteClient } from "../client/NetsuiteClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

export const createInvoiceSchema = z.object({
    entity: z.object({ id: z.string() }).describe("Customer reference (internal ID)"),
    tranDate: z.string().optional().describe("Transaction date (YYYY-MM-DD)"),
    dueDate: z.string().optional().describe("Due date (YYYY-MM-DD)"),
    memo: z.string().optional().describe("Memo/notes for the invoice"),
    currency: z.object({ id: z.string() }).optional().describe("Currency reference")
});

export type CreateInvoiceParams = z.infer<typeof createInvoiceSchema>;

export const createInvoiceOperation: OperationDefinition = (() => {
    try {
        return {
            id: "createInvoice",
            name: "Create Invoice",
            description: "Create a new invoice in NetSuite",
            category: "erp",
            actionType: "write",
            inputSchema: createInvoiceSchema,
            retryable: false,
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "NetSuite", err: error },
            "Failed to create createInvoiceOperation"
        );
        throw new Error(
            `Failed to create createInvoice operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

export async function executeCreateInvoice(
    client: NetsuiteClient,
    params: CreateInvoiceParams
): Promise<OperationResult> {
    try {
        const invoice = await client.createInvoice(params);

        return { success: true, data: invoice };
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
