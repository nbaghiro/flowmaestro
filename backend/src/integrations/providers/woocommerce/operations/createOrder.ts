import { getLogger } from "../../../../core/logging";
import { WooCommerceClient } from "../client/WooCommerceClient";
import { CreateOrderSchema, type CreateOrderParams } from "../schemas";
import type { WooCommerceOrder } from "./types";
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
            description: "Create a new order with line items, billing and shipping addresses",
            category: "orders",
            inputSchema: CreateOrderSchema,
            retryable: false,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "WooCommerce", err: error },
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
    client: WooCommerceClient,
    params: CreateOrderParams
): Promise<OperationResult> {
    try {
        const response = await client.createOrder({
            payment_method: params.payment_method,
            payment_method_title: params.payment_method_title,
            set_paid: params.set_paid,
            status: params.status,
            customer_id: params.customer_id,
            billing: params.billing,
            shipping: params.shipping,
            line_items: params.line_items
        });

        const order = response as WooCommerceOrder;

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
