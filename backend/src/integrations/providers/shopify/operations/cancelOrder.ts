import { getLogger } from "../../../../core/logging";
import { ShopifyClient } from "../client/ShopifyClient";
import { CancelOrderSchema, type CancelOrderParams } from "../schemas";
import type { ShopifyOrderResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Cancel Order operation definition
 */
export const cancelOrderOperation: OperationDefinition = (() => {
    try {
        return {
            id: "cancelOrder",
            name: "Cancel Order",
            description:
                "Cancel an order with optional reason, restock, and email notification options",
            category: "orders",
            inputSchema: CancelOrderSchema,
            retryable: false, // Cancellation should not be retried automatically
            timeout: 15000
        };
    } catch (error) {
        logger.error({ component: "Shopify", err: error }, "Failed to create cancelOrderOperation");
        throw new Error(
            `Failed to create cancelOrder operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute cancel order operation
 */
export async function executeCancelOrder(
    client: ShopifyClient,
    params: CancelOrderParams
): Promise<OperationResult> {
    try {
        const { order_id, ...cancelOptions } = params;

        const response = await client.cancelOrder(order_id, {
            reason: cancelOptions.reason,
            email: cancelOptions.email,
            restock: cancelOptions.restock
        });

        const data = response as ShopifyOrderResponse;

        return {
            success: true,
            data: {
                order: data.order,
                message: "Order cancelled successfully"
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to cancel order",
                retryable: false
            }
        };
    }
}
