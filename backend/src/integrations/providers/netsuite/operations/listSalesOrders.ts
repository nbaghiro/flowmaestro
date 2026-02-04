import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { NetsuiteClient } from "../client/NetsuiteClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

export const listSalesOrdersSchema = z.object({
    limit: z.number().min(1).max(100).optional().describe("Number of results to return (1-100)"),
    offset: z.number().min(0).optional().describe("Number of results to skip for pagination"),
    q: z.string().optional().describe("SuiteQL search query")
});

export type ListSalesOrdersParams = z.infer<typeof listSalesOrdersSchema>;

export const listSalesOrdersOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listSalesOrders",
            name: "List Sales Orders",
            description: "List sales orders in NetSuite with pagination",
            category: "erp",
            actionType: "read",
            inputSchema: listSalesOrdersSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "NetSuite", err: error },
            "Failed to create listSalesOrdersOperation"
        );
        throw new Error(
            `Failed to create listSalesOrders operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

export async function executeListSalesOrders(
    client: NetsuiteClient,
    params: ListSalesOrdersParams
): Promise<OperationResult> {
    try {
        const response = await client.listSalesOrders({
            limit: params.limit,
            offset: params.offset,
            q: params.q
        });

        return {
            success: true,
            data: {
                salesOrders: response.items,
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
                message: error instanceof Error ? error.message : "Failed to list sales orders",
                retryable: true
            }
        };
    }
}
