import { getLogger } from "../../../../core/logging";
import { SquarespaceClient } from "../client/SquarespaceClient";
import { ListOrdersSchema, type ListOrdersParams } from "../schemas";
import type { SquarespaceOrdersResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * List Orders operation definition
 */
export const listOrdersOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listOrders",
            name: "List Orders",
            description: "Retrieve all orders with optional filtering by status and date range",
            category: "orders",
            inputSchema: ListOrdersSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "Squarespace", err: error },
            "Failed to create listOrdersOperation"
        );
        throw new Error(
            `Failed to create listOrders operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute list orders operation
 */
export async function executeListOrders(
    client: SquarespaceClient,
    params: ListOrdersParams
): Promise<OperationResult> {
    try {
        const response = await client.listOrders({
            fulfillmentStatus: params.fulfillmentStatus,
            modifiedAfter: params.modifiedAfter,
            modifiedBefore: params.modifiedBefore,
            cursor: params.cursor
        });

        const data = response as SquarespaceOrdersResponse;

        return {
            success: true,
            data: {
                orders: data.result,
                count: data.result.length,
                nextCursor: data.pagination?.nextPageCursor
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list orders",
                retryable: true
            }
        };
    }
}
