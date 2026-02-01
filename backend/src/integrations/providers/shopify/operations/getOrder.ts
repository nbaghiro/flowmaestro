import { getLogger } from "../../../../core/logging";
import { ShopifyClient } from "../client/ShopifyClient";
import { GetOrderSchema, type GetOrderParams } from "../schemas";
import type { ShopifyOrderResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get Order operation definition
 */
export const getOrderOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getOrder",
            name: "Get Order",
            description: "Retrieve a single order by its ID with full details",
            category: "orders",
            inputSchema: GetOrderSchema,
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error({ component: "Shopify", err: error }, "Failed to create getOrderOperation");
        throw new Error(
            `Failed to create getOrder operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get order operation
 */
export async function executeGetOrder(
    client: ShopifyClient,
    params: GetOrderParams
): Promise<OperationResult> {
    try {
        const response = await client.getOrder(params.order_id, params.fields);
        const data = response as ShopifyOrderResponse;

        return {
            success: true,
            data: {
                order: data.order
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get order",
                retryable: true
            }
        };
    }
}
