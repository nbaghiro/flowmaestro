import { getLogger } from "../../../../core/logging";
import { WooCommerceClient } from "../client/WooCommerceClient";
import { ListOrdersSchema, type ListOrdersParams } from "../schemas";
import type { WooCommerceOrder } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * List Orders operation definition
 */
export const listOrdersOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listOrders",
            name: "List Orders",
            description:
                "Retrieve a list of orders with optional filters for status, customer, dates, and pagination",
            category: "orders",
            inputSchema: ListOrdersSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "WooCommerce", err: error },
            "Failed to create listOrdersOperation"
        );
        throw new Error(
            `Failed to create listOrders operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute list orders operation
 */
export async function executeListOrders(
    client: WooCommerceClient,
    params: ListOrdersParams
): Promise<OperationResult> {
    try {
        const response = await client.listOrders({
            status: params.status,
            customer: params.customer,
            product: params.product,
            after: params.after,
            before: params.before,
            page: params.page,
            per_page: params.per_page,
            order: params.order,
            orderby: params.orderby
        });

        const orders = response as WooCommerceOrder[];

        return {
            success: true,
            data: {
                orders,
                count: orders.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list orders",
                retryable: true
            }
        };
    }
}
