import { getLogger } from "../../../../core/logging";
import { BigCommerceClient } from "../client/BigCommerceClient";
import { CreateOrderSchema, type CreateOrderParams } from "../schemas";
import type { BigCommerceOrder } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Create Order operation definition
 */
export const createOrderOperation: OperationDefinition = (() => {
    try {
        return {
            id: "createOrder",
            name: "Create Order",
            description: "Create a new order with products, billing and shipping addresses",
            category: "orders",
            inputSchema: CreateOrderSchema,
            retryable: false,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "BigCommerce", err: error },
            "Failed to create createOrderOperation"
        );
        throw new Error(
            `Failed to create createOrder operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute create order operation
 */
export async function executeCreateOrder(
    client: BigCommerceClient,
    params: CreateOrderParams
): Promise<OperationResult> {
    try {
        const response = await client.createOrder({
            customer_id: params.customer_id,
            status_id: params.status_id,
            billing_address: params.billing_address,
            shipping_addresses: params.shipping_addresses,
            products: params.products,
            staff_notes: params.staff_notes,
            customer_message: params.customer_message
        });

        const order = response as BigCommerceOrder;

        return {
            success: true,
            data: {
                order,
                orderId: String(order.id),
                message: "Order created successfully"
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create order",
                retryable: false
            }
        };
    }
}
