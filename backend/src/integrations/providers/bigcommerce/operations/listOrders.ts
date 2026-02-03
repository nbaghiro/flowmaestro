import { getLogger } from "../../../../core/logging";
import { BigCommerceClient } from "../client/BigCommerceClient";
import { ListOrdersSchema, type ListOrdersParams } from "../schemas";
import type { BigCommerceOrder } from "./types";
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
            { component: "BigCommerce", err: error },
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
    client: BigCommerceClient,
    params: ListOrdersParams
): Promise<OperationResult> {
    try {
        const response = await client.listOrders({
            status_id: params.status_id,
            customer_id: params.customer_id,
            min_date_created: params.min_date_created,
            max_date_created: params.max_date_created,
            min_date_modified: params.min_date_modified,
            max_date_modified: params.max_date_modified,
            min_total: params.min_total,
            max_total: params.max_total,
            is_deleted: params.is_deleted,
            sort: params.sort,
            page: params.page,
            limit: params.limit
        });

        const orders = response as BigCommerceOrder[];

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
