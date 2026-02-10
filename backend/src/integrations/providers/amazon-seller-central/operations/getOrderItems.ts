import { getLogger } from "../../../../core/logging";
import { AmazonSellerCentralClient } from "../client/AmazonSellerCentralClient";
import { GetOrderItemsSchema, type GetOrderItemsParams } from "./schemas";
import type { AmazonOrderItemsResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get Order Items operation definition
 */
export const getOrderItemsOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getOrderItems",
            name: "Get Order Items",
            description: "Get line items for a specific order by Amazon order ID",
            category: "orders",
            inputSchema: GetOrderItemsSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "AmazonSellerCentral", err: error },
            "Failed to create getOrderItemsOperation"
        );
        throw new Error(
            `Failed to create getOrderItems operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get order items operation
 */
export async function executeGetOrderItems(
    client: AmazonSellerCentralClient,
    params: GetOrderItemsParams
): Promise<OperationResult> {
    try {
        const response = await client.getOrderItems(params.orderId);
        const data = response as AmazonOrderItemsResponse;

        return {
            success: true,
            data: {
                orderItems: data.OrderItems,
                amazonOrderId: data.AmazonOrderId,
                nextToken: data.NextToken,
                count: data.OrderItems.length
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to get order items";
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
