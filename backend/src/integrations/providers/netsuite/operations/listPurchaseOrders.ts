import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { NetsuiteClient } from "../client/NetsuiteClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

export const listPurchaseOrdersSchema = z.object({
    limit: z.number().min(1).max(100).optional().describe("Number of results to return (1-100)"),
    offset: z.number().min(0).optional().describe("Number of results to skip for pagination"),
    q: z.string().optional().describe("SuiteQL search query")
});

export type ListPurchaseOrdersParams = z.infer<typeof listPurchaseOrdersSchema>;

export const listPurchaseOrdersOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listPurchaseOrders",
            name: "List Purchase Orders",
            description: "List purchase orders in NetSuite with pagination",
            category: "erp",
            actionType: "read",
            inputSchema: listPurchaseOrdersSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "NetSuite", err: error },
            "Failed to create listPurchaseOrdersOperation"
        );
        throw new Error(
            `Failed to create listPurchaseOrders operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

export async function executeListPurchaseOrders(
    client: NetsuiteClient,
    params: ListPurchaseOrdersParams
): Promise<OperationResult> {
    try {
        const response = await client.listPurchaseOrders({
            limit: params.limit,
            offset: params.offset,
            q: params.q
        });

        return {
            success: true,
            data: {
                purchaseOrders: response.items,
                totalResults: response.totalResults,
                count: response.count,
                offset: response.offset,
                hasMore: response.hasMore
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
