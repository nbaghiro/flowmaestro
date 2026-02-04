import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { NetsuiteClient } from "../client/NetsuiteClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

export const createSalesOrderSchema = z.object({
    entity: z.object({ id: z.string() }).describe("Customer reference (internal ID)"),
    tranDate: z.string().optional().describe("Transaction date (YYYY-MM-DD)"),
    memo: z.string().optional().describe("Memo/notes for the sales order"),
    currency: z.object({ id: z.string() }).optional().describe("Currency reference")
});

export type CreateSalesOrderParams = z.infer<typeof createSalesOrderSchema>;

export const createSalesOrderOperation: OperationDefinition = (() => {
    try {
        return {
            id: "createSalesOrder",
            name: "Create Sales Order",
            description: "Create a new sales order in NetSuite",
            category: "erp",
            actionType: "write",
            inputSchema: createSalesOrderSchema,
            retryable: false,
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "NetSuite", err: error },
            "Failed to create createSalesOrderOperation"
        );
        throw new Error(
            `Failed to create createSalesOrder operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

export async function executeCreateSalesOrder(
    client: NetsuiteClient,
    params: CreateSalesOrderParams
): Promise<OperationResult> {
    try {
        const salesOrder = await client.createSalesOrder(params);

        return { success: true, data: salesOrder };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create sales order",
                retryable: false
            }
        };
    }
}
