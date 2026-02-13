import { getLogger } from "../../../../core/logging";
import { ShipStationClient } from "../client/ShipStationClient";
import { GetOrderSchema, type GetOrderParams } from "../schemas";
import type { ShipStationOrder } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

export const getOrderOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getOrder",
            name: "Get Order",
            description: "Retrieve a single order by its ID",
            category: "orders",
            inputSchema: GetOrderSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "ShipStation", err: error },
            "Failed to create getOrderOperation"
        );
        throw new Error(
            `Failed to create getOrder operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

export async function executeGetOrder(
    client: ShipStationClient,
    params: GetOrderParams
): Promise<OperationResult> {
    try {
        const response = await client.getOrder(params.orderId);
        const order = response as ShipStationOrder;

        return {
            success: true,
            data: {
                order
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get order",
                retryable: true
            }
        };
    }
}
