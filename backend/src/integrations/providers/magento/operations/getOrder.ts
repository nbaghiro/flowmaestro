import { getLogger } from "../../../../core/logging";
import { MagentoClient } from "../client/MagentoClient";
import { GetOrderSchema, type GetOrderParams } from "../schemas";
import type { MagentoOrder } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

export const getOrderOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getOrder",
            name: "Get Order",
            description: "Retrieve a single order by its entity ID",
            category: "orders",
            inputSchema: GetOrderSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error({ component: "Magento", err: error }, "Failed to create getOrderOperation");
        throw new Error(
            `Failed to create getOrder operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

export async function executeGetOrder(
    client: MagentoClient,
    params: GetOrderParams
): Promise<OperationResult> {
    try {
        const response = await client.getOrder(params.order_id);
        const order = response as MagentoOrder;

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
