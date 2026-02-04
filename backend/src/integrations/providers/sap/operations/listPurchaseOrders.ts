import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { SapClient } from "../client/SapClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

export const listPurchaseOrdersSchema = z.object({
    top: z.number().min(1).max(100).optional().describe("Number of results to return (1-100)"),
    skip: z.number().min(0).optional().describe("Number of results to skip for pagination"),
    filter: z.string().optional().describe("OData $filter expression"),
    select: z.string().optional().describe("Comma-separated list of fields to return")
});

export type ListPurchaseOrdersParams = z.infer<typeof listPurchaseOrdersSchema>;

export const listPurchaseOrdersOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listPurchaseOrders",
            name: "List Purchase Orders",
            description: "List purchase orders in SAP S/4HANA with pagination and filtering",
            category: "erp",
            actionType: "read",
            inputSchema: listPurchaseOrdersSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "SAP", err: error },
            "Failed to create listPurchaseOrdersOperation"
        );
        throw new Error(
            `Failed to create listPurchaseOrders operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

export async function executeListPurchaseOrders(
    client: SapClient,
    params: ListPurchaseOrdersParams
): Promise<OperationResult> {
    try {
        const response = await client.listPurchaseOrders({
            top: params.top,
            skip: params.skip,
            filter: params.filter,
            select: params.select
        });

        return {
            success: true,
            data: {
                purchaseOrders: response.d.results,
                count: response.d.__count
                    ? parseInt(response.d.__count, 10)
                    : response.d.results.length,
                hasMore: !!response.d.__next
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list purchase orders",
                retryable: true
            }
        };
    }
}
