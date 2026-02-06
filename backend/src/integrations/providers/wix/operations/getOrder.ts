import { getLogger } from "../../../../core/logging";
import { WixClient } from "../client/WixClient";
import { GetOrderSchema, type GetOrderParams } from "../schemas";
import type { WixOrderResponse } from "./types";
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
            description: "Get a single order by ID",
            category: "orders",
            inputSchema: GetOrderSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error({ component: "Wix", err: error }, "Failed to create getOrderOperation");
        throw new Error(
            `Failed to create getOrder operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get order operation
 */
export async function executeGetOrder(
    client: WixClient,
    params: GetOrderParams
): Promise<OperationResult> {
    try {
        const response = await client.getOrder(params.orderId);
        const data = response as WixOrderResponse;

        return {
            success: true,
            data: {
                order: data.order
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to get order";
        const isNotFound = message.toLowerCase().includes("not found");

        return {
            success: false,
            error: {
                type: isNotFound ? "not_found" : "server_error",
                message,
                retryable: !isNotFound
            }
        };
    }
}
