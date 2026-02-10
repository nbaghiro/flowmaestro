import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { NetsuiteClient } from "../client/NetsuiteClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

export const getInvoiceSchema = z.object({
    invoiceId: z.string().min(1).describe("The internal ID of the invoice")
});

export type GetInvoiceParams = z.infer<typeof getInvoiceSchema>;

export const getInvoiceOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getInvoice",
            name: "Get Invoice",
            description: "Get an invoice by ID from NetSuite",
            category: "erp",
            actionType: "read",
            inputSchema: getInvoiceSchema,
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error({ component: "NetSuite", err: error }, "Failed to create getInvoiceOperation");
        throw new Error(
            `Failed to create getInvoice operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

export async function executeGetInvoice(
    client: NetsuiteClient,
    params: GetInvoiceParams
): Promise<OperationResult> {
    try {
        const invoice = await client.getInvoice(params.invoiceId);

        return { success: true, data: invoice };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get invoice",
                retryable: false
            }
        };
    }
}
