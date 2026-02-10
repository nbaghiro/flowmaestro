import { getLogger } from "../../../../core/logging";
import { WixClient } from "../client/WixClient";
import { ListOrdersSchema, type ListOrdersParams } from "../schemas";
import type { WixOrdersResponse } from "./types";
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
            description: "Search orders with optional filters for status, payment, and date range",
            category: "orders",
            inputSchema: ListOrdersSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error({ component: "Wix", err: error }, "Failed to create listOrdersOperation");
        throw new Error(
            `Failed to create listOrders operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute list orders operation
 */
export async function executeListOrders(
    client: WixClient,
    params: ListOrdersParams
): Promise<OperationResult> {
    try {
        const response = await client.searchOrders({
            fulfillmentStatus: params.fulfillmentStatus,
            paymentStatus: params.paymentStatus,
            dateCreatedFrom: params.dateCreatedFrom,
            dateCreatedTo: params.dateCreatedTo,
            limit: params.limit,
            offset: params.offset
        });

        const data = response as WixOrdersResponse;
        const orders = data.orders || [];

        return {
            success: true,
            data: {
                orders,
                count: orders.length,
                total: data.pagingMetadata?.total,
                hasNext: data.pagingMetadata?.hasNext
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
