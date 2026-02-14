import { getLogger } from "../../../../core/logging";
import { MagentoClient } from "../client/MagentoClient";
import { UpdateOrderStatusSchema, type UpdateOrderStatusParams } from "../schemas";
import type { MagentoOrderCommentResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

export const updateOrderStatusOperation: OperationDefinition = (() => {
    try {
        return {
            id: "updateOrderStatus",
            name: "Update Order Status",
            description: "Update the status of an order and optionally add a comment",
            category: "orders",
            inputSchema: UpdateOrderStatusSchema,
            retryable: false,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "Magento", err: error },
            "Failed to create updateOrderStatusOperation"
        );
        throw new Error(
            `Failed to create updateOrderStatus operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

export async function executeUpdateOrderStatus(
    client: MagentoClient,
    params: UpdateOrderStatusParams
): Promise<OperationResult> {
    try {
        const response = await client.addOrderComment(
            params.order_id,
            params.status,
            params.comment,
            params.notify_customer
        );

        const result = response as MagentoOrderCommentResponse;

        return {
            success: true,
            data: {
                order_id: params.order_id,
                new_status: params.status,
                comment_id: result.entity_id,
                message: "Order status updated successfully"
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update order status",
                retryable: false
            }
        };
    }
}
