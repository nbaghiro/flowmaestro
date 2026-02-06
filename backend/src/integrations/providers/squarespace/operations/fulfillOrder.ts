import { getLogger } from "../../../../core/logging";
import { SquarespaceClient } from "../client/SquarespaceClient";
import { FulfillOrderSchema, type FulfillOrderParams } from "../schemas";
import type { SquarespaceOrder } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Fulfill Order operation definition
 */
export const fulfillOrderOperation: OperationDefinition = (() => {
    try {
        return {
            id: "fulfillOrder",
            name: "Fulfill Order",
            description: "Mark an order as fulfilled with shipment tracking information",
            category: "orders",
            inputSchema: FulfillOrderSchema,
            retryable: false,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "Squarespace", err: error },
            "Failed to create fulfillOrderOperation"
        );
        throw new Error(
            `Failed to create fulfillOrder operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute fulfill order operation
 */
export async function executeFulfillOrder(
    client: SquarespaceClient,
    params: FulfillOrderParams
): Promise<OperationResult> {
    try {
        const response = await client.fulfillOrder(params.order_id, {
            shipments: params.shipments,
            sendNotification: params.sendNotification
        });

        const data = response as SquarespaceOrder;

        return {
            success: true,
            data: {
                order: data,
                message: "Order fulfilled successfully"
            }
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to fulfill order";

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

        // Check for validation errors (e.g., order already fulfilled)
        if (errorMessage.includes("Validation error") || errorMessage.includes("already")) {
            return {
                success: false,
                error: {
                    type: "validation",
                    message: errorMessage,
                    retryable: false
                }
            };
        }

        return {
            success: false,
            error: {
                type: "server_error",
                message: errorMessage,
                retryable: false
            }
        };
    }
}
