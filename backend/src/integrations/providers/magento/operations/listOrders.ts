import { getLogger } from "../../../../core/logging";
import { MagentoClient } from "../client/MagentoClient";
import { ListOrdersSchema, type ListOrdersParams } from "../schemas";
import type { MagentoOrdersResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

export const listOrdersOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listOrders",
            name: "List Orders",
            description:
                "Retrieve a list of orders with optional filters for status, customer, and date range",
            category: "orders",
            inputSchema: ListOrdersSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error({ component: "Magento", err: error }, "Failed to create listOrdersOperation");
        throw new Error(
            `Failed to create listOrders operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

export async function executeListOrders(
    client: MagentoClient,
    params: ListOrdersParams
): Promise<OperationResult> {
    try {
        const response = await client.listOrders({
            status: params.status,
            customer_email: params.customer_email,
            created_at_from: params.created_at_from,
            created_at_to: params.created_at_to,
            page: params.page,
            pageSize: params.pageSize
        });

        const data = response as MagentoOrdersResponse;

        return {
            success: true,
            data: {
                orders: data.items,
                total_count: data.total_count,
                page: params.page || 1,
                page_size: params.pageSize || 20
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
