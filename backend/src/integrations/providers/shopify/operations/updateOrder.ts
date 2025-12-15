import { toJSONSchema } from "../../../core/schema-utils";
import { ShopifyClient } from "../client/ShopifyClient";
import { UpdateOrderSchema, type UpdateOrderParams } from "../schemas";
import type { ShopifyOrderResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Update Order operation definition
 */
export const updateOrderOperation: OperationDefinition = (() => {
    try {
        return {
            id: "updateOrder",
            name: "Update Order",
            description: "Update an existing order's note, tags, email, or other editable fields",
            category: "orders",
            inputSchema: UpdateOrderSchema,
            inputSchemaJSON: toJSONSchema(UpdateOrderSchema),
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        console.error("[Shopify] Failed to create updateOrderOperation:", error);
        throw new Error(
            `Failed to create updateOrder operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute update order operation
 */
export async function executeUpdateOrder(
    client: ShopifyClient,
    params: UpdateOrderParams
): Promise<OperationResult> {
    try {
        const { order_id, ...updateData } = params;

        const response = await client.updateOrder(order_id, {
            note: updateData.note,
            tags: updateData.tags,
            email: updateData.email,
            phone: updateData.phone,
            buyer_accepts_marketing: updateData.buyer_accepts_marketing
        });

        const data = response as ShopifyOrderResponse;

        return {
            success: true,
            data: {
                order: data.order
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update order",
                retryable: true
            }
        };
    }
}
