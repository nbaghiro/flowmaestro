import { toJSONSchema } from "../../../core/schema-utils";
import { ShopifyClient } from "../client/ShopifyClient";
import { CloseOrderSchema, type CloseOrderParams } from "../schemas";
import type { ShopifyOrderResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import { getLogger } from "../../../../core/logging";

const logger = getLogger();

/**
 * Close Order operation definition
 */
export const closeOrderOperation: OperationDefinition = (() => {
    try {
        return {
            id: "closeOrder",
            name: "Close Order",
            description: "Mark an order as closed (completed)",
            category: "orders",
            inputSchema: CloseOrderSchema,
            inputSchemaJSON: toJSONSchema(CloseOrderSchema),
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error({ component: "Shopify", err: error }, "Failed to create closeOrderOperation");
        throw new Error(
            `Failed to create closeOrder operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute close order operation
 */
export async function executeCloseOrder(
    client: ShopifyClient,
    params: CloseOrderParams
): Promise<OperationResult> {
    try {
        const response = await client.closeOrder(params.order_id);
        const data = response as ShopifyOrderResponse;

        return {
            success: true,
            data: {
                order: data.order,
                message: "Order closed successfully"
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to close order",
                retryable: true
            }
        };
    }
}
