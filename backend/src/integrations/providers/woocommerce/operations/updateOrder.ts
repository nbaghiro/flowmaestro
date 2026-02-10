import { getLogger } from "../../../../core/logging";
import { WooCommerceClient } from "../client/WooCommerceClient";
import { UpdateOrderSchema, type UpdateOrderParams } from "../schemas";
import type { WooCommerceOrder } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Update Order operation definition
 */
export const updateOrderOperation: OperationDefinition = (() => {
    try {
        return {
            id: "updateOrder",
            name: "Update Order",
            description: "Update an existing order's status, notes, or addresses",
            category: "orders",
            inputSchema: UpdateOrderSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "WooCommerce", err: error },
            "Failed to create updateOrderOperation"
        );
        throw new Error(
            `Failed to create updateOrder operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute update order operation
 */
export async function executeUpdateOrder(
    client: WooCommerceClient,
    params: UpdateOrderParams
): Promise<OperationResult> {
    try {
        const response = await client.updateOrder(params.order_id, {
            status: params.status,
            customer_note: params.customer_note,
            billing: params.billing,
            shipping: params.shipping
        });

        const order = response as WooCommerceOrder;

        return {
            success: true,
            data: {
                order,
                message: "Order updated successfully"
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to update order";
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
