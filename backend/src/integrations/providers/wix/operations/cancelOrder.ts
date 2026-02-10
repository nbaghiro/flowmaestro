import { getLogger } from "../../../../core/logging";
import { WixClient } from "../client/WixClient";
import { CancelOrderSchema, type CancelOrderParams } from "../schemas";
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
            description: "Cancel an order and optionally notify the buyer",
            category: "orders",
            inputSchema: CancelOrderSchema,
            retryable: false,
            timeout: 30000
        };
    } catch (error) {
        logger.error({ component: "Wix", err: error }, "Failed to create cancelOrderOperation");
        throw new Error(
            `Failed to create cancelOrder operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute cancel order operation
 */
export async function executeCancelOrder(
    client: WixClient,
    params: CancelOrderParams
): Promise<OperationResult> {
    try {
        await client.cancelOrder(params.orderId, params.sendNotification);

        return {
            success: true,
            data: {
                orderId: params.orderId,
                message: "Order cancelled successfully"
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to cancel order";
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
