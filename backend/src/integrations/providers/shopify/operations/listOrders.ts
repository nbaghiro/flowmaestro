import { getLogger } from "../../../../core/logging";
import { ShopifyClient } from "../client/ShopifyClient";
import { ListOrdersSchema, type ListOrdersParams } from "../schemas";
import type { ShopifyOrdersResponse } from "./types";
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
                "Retrieve a list of orders with optional filters for status, dates, and pagination",
            category: "orders",
            inputSchema: ListOrdersSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error({ component: "Shopify", err: error }, "Failed to create listOrdersOperation");
        throw new Error(
            `Failed to create listOrders operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute list orders operation
 */
export async function executeListOrders(
    client: ShopifyClient,
    params: ListOrdersParams
): Promise<OperationResult> {
    try {
        const response = await client.listOrders({
            status: params.status,
            financial_status: params.financial_status,
            fulfillment_status: params.fulfillment_status,
            created_at_min: params.created_at_min,
            created_at_max: params.created_at_max,
            updated_at_min: params.updated_at_min,
            updated_at_max: params.updated_at_max,
            limit: params.limit,
            since_id: params.since_id,
            fields: params.fields
        });

        const data = response as ShopifyOrdersResponse;

        return {
            success: true,
            data: {
                orders: data.orders,
                count: data.orders.length
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
