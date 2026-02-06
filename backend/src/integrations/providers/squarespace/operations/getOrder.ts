import { getLogger } from "../../../../core/logging";
import { SquarespaceClient } from "../client/SquarespaceClient";
import { GetOrderSchema, type GetOrderParams } from "../schemas";
import type { SquarespaceOrder } from "./types";
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
                "Retrieve a single order by its ID with line items and shipping information",
            category: "orders",
            inputSchema: GetOrderSchema,
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "Squarespace", err: error },
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
    client: SquarespaceClient,
    params: GetOrderParams
): Promise<OperationResult> {
    try {
        const response = await client.getOrder(params.order_id);
        const data = response as SquarespaceOrder;

        return {
            success: true,
            data: {
                order: data
            }
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to get order";

        // Check for not found
        if (errorMessage.includes("not found") || errorMessage.includes("404")) {
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
                message: errorMessage,
                retryable: true
            }
        };
    }
}
