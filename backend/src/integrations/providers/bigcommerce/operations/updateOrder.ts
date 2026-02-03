import { getLogger } from "../../../../core/logging";
import { BigCommerceClient } from "../client/BigCommerceClient";
import { UpdateOrderSchema, type UpdateOrderParams } from "../schemas";
import type { BigCommerceOrder } from "./types";
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
            description: "Update an existing order's status or notes",
            category: "orders",
            inputSchema: UpdateOrderSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "BigCommerce", err: error },
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
    client: BigCommerceClient,
    params: UpdateOrderParams
): Promise<OperationResult> {
    try {
        const response = await client.updateOrder(params.order_id, {
            status_id: params.status_id,
            staff_notes: params.staff_notes,
            customer_message: params.customer_message
        });

        const order = response as BigCommerceOrder;

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
