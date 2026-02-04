import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { SapClient } from "../client/SapClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

export const getSalesOrderSchema = z.object({
    salesOrderId: z.string().min(1).describe("The sales order ID")
});

export type GetSalesOrderParams = z.infer<typeof getSalesOrderSchema>;

export const getSalesOrderOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getSalesOrder",
            name: "Get Sales Order",
            description: "Get a sales order by ID from SAP S/4HANA",
            category: "erp",
            actionType: "read",
            inputSchema: getSalesOrderSchema,
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error({ component: "SAP", err: error }, "Failed to create getSalesOrderOperation");
        throw new Error(
            `Failed to create getSalesOrder operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

export async function executeGetSalesOrder(
    client: SapClient,
    params: GetSalesOrderParams
): Promise<OperationResult> {
    try {
        const response = await client.getSalesOrder(params.salesOrderId);

        return {
            success: true,
            data: response.d
        };
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
