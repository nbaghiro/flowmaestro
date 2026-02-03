import { getLogger } from "../../../../core/logging";
import { AmazonSellerCentralClient } from "../client/AmazonSellerCentralClient";
import { ListOrdersSchema, type ListOrdersParams } from "./schemas";
import type { AmazonOrdersResponse } from "./types";
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
            description:
                "Retrieve seller orders with filters for status, date range, and marketplace",
            category: "orders",
            inputSchema: ListOrdersSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "AmazonSellerCentral", err: error },
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
    client: AmazonSellerCentralClient,
    params: ListOrdersParams
): Promise<OperationResult> {
    try {
        const response = await client.listOrders({
            MarketplaceIds: params.marketplaceIds,
            OrderStatuses: params.orderStatuses,
            CreatedAfter: params.createdAfter,
            CreatedBefore: params.createdBefore,
            MaxResultsPerPage: params.maxResultsPerPage
        });

        const data = response as AmazonOrdersResponse;

        return {
            success: true,
            data: {
                orders: data.Orders,
                nextToken: data.NextToken,
                count: data.Orders.length
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
