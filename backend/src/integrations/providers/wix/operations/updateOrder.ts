import { getLogger } from "../../../../core/logging";
import { WixClient } from "../client/WixClient";
import { UpdateOrderSchema, type UpdateOrderParams } from "../schemas";
import type { WixOrderResponse } from "./types";
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
            description: "Update order details such as buyer note or fulfillment status",
            category: "orders",
            inputSchema: UpdateOrderSchema,
            retryable: false,
            timeout: 30000
        };
    } catch (error) {
        logger.error({ component: "Wix", err: error }, "Failed to create updateOrderOperation");
        throw new Error(
            `Failed to create updateOrder operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute update order operation
 */
export async function executeUpdateOrder(
    client: WixClient,
    params: UpdateOrderParams
): Promise<OperationResult> {
    try {
        const response = await client.updateOrder(params.orderId, {
            buyerNote: params.buyerNote,
            fulfilled: params.fulfilled
        });

        const data = response as WixOrderResponse;

        return {
            success: true,
            data: {
                order: data.order,
                message: "Order updated successfully"
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to update order";
        const isNotFound = message.toLowerCase().includes("not found");

        return {
            success: false,
            error: {
                type: isNotFound ? "not_found" : "server_error",
                message,
                retryable: !isNotFound
            }
        };
    }
}
