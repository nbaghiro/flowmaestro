import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { NetsuiteClient } from "../client/NetsuiteClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

export const getSalesOrderSchema = z.object({
    salesOrderId: z.string().min(1).describe("The internal ID of the sales order")
});

export type GetSalesOrderParams = z.infer<typeof getSalesOrderSchema>;

export const getSalesOrderOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getSalesOrder",
            name: "Get Sales Order",
            description: "Get a sales order by ID from NetSuite",
            category: "erp",
            actionType: "read",
            inputSchema: getSalesOrderSchema,
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "NetSuite", err: error },
            "Failed to create getSalesOrderOperation"
        );
        throw new Error(
            `Failed to create getSalesOrder operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

export async function executeGetSalesOrder(
    client: NetsuiteClient,
    params: GetSalesOrderParams
): Promise<OperationResult> {
    try {
        const salesOrder = await client.getSalesOrder(params.salesOrderId);

        return { success: true, data: salesOrder };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get sales order",
                retryable: false
            }
        };
    }
}
