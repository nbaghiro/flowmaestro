import { getLogger } from "../../../../core/logging";
import { ShipStationClient } from "../client/ShipStationClient";
import { ListOrdersSchema, type ListOrdersParams } from "../schemas";
import type { ShipStationOrdersResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

export const listOrdersOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listOrders",
            name: "List Orders",
            description:
                "Retrieve a list of orders with optional filters for status, customer, and dates",
            category: "orders",
            inputSchema: ListOrdersSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "ShipStation", err: error },
            "Failed to create listOrdersOperation"
        );
        throw new Error(
            `Failed to create listOrders operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

export async function executeListOrders(
    client: ShipStationClient,
    params: ListOrdersParams
): Promise<OperationResult> {
    try {
        const response = await client.listOrders({
            customerName: params.customerName,
            orderNumber: params.orderNumber,
            orderStatus: params.orderStatus,
            storeId: params.storeId,
            sortBy: params.sortBy,
            sortDir: params.sortDir,
            createDateStart: params.createDateStart,
            createDateEnd: params.createDateEnd,
            modifyDateStart: params.modifyDateStart,
            modifyDateEnd: params.modifyDateEnd,
            page: params.page,
            pageSize: params.pageSize
        });

        const data = response as ShipStationOrdersResponse;

        return {
            success: true,
            data: {
                orders: data.orders,
                total: data.total,
                page: data.page,
                pages: data.pages
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
