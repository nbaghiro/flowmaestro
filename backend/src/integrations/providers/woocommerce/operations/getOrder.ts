import { getLogger } from "../../../../core/logging";
import { WooCommerceClient } from "../client/WooCommerceClient";
import { GetOrderSchema, type GetOrderParams } from "../schemas";
import type { WooCommerceOrder } from "./types";
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
            description:
                "Retrieve a single order by ID with all details including line items and addresses",
            category: "orders",
            inputSchema: GetOrderSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "WooCommerce", err: error },
            "Failed to create getOrderOperation"
        );
        throw new Error(
            `Failed to create getOrder operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get order operation
 */
export async function executeGetOrder(
    client: WooCommerceClient,
    params: GetOrderParams
): Promise<OperationResult> {
    try {
        const response = await client.getOrder(params.order_id);
        const order = response as WooCommerceOrder;

        return {
            success: true,
            data: {
                order
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to get order";
        if (message.includes("not found")) {
            return {
                success: false,
                error: {
                    type: "not_found",
                    message: "Order not found",
                    retryable: false
                }
            };
        }
        return {
            success: false,
            error: {
                type: "server_error",
                message,
                retryable: true
            }
        };
    }
}
