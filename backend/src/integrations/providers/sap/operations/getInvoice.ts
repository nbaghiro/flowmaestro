import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { SapClient } from "../client/SapClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

export const getInvoiceSchema = z.object({
    invoiceId: z.string().min(1).describe("The billing document/invoice ID")
});

export type GetInvoiceParams = z.infer<typeof getInvoiceSchema>;

export const getInvoiceOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getInvoice",
            name: "Get Invoice",
            description: "Get a billing document/invoice by ID from SAP S/4HANA",
            category: "erp",
            actionType: "read",
            inputSchema: getInvoiceSchema,
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error({ component: "SAP", err: error }, "Failed to create getInvoiceOperation");
        throw new Error(
            `Failed to create getInvoice operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

export async function executeGetInvoice(
    client: SapClient,
    params: GetInvoiceParams
): Promise<OperationResult> {
    try {
        const response = await client.getInvoice(params.invoiceId);

        return {
            success: true,
            data: response.d
        };
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
