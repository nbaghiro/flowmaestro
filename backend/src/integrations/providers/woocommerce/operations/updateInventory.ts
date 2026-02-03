import { getLogger } from "../../../../core/logging";
import { WooCommerceClient } from "../client/WooCommerceClient";
import { UpdateInventorySchema, type UpdateInventoryParams } from "../schemas";
import type { WooCommerceProduct } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Update Inventory operation definition
 */
export const updateInventoryOperation: OperationDefinition = (() => {
    try {
        return {
            id: "updateInventory",
            name: "Update Inventory",
            description: "Update stock quantity and status for a product",
            category: "inventory",
            inputSchema: UpdateInventorySchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "WooCommerce", err: error },
            "Failed to create updateInventoryOperation"
        );
        throw new Error(
            `Failed to create updateInventory operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute update inventory operation
 */
export async function executeUpdateInventory(
    client: WooCommerceClient,
    params: UpdateInventoryParams
): Promise<OperationResult> {
    try {
        const response = await client.updateInventory(params.product_id, {
            stock_quantity: params.stock_quantity,
            stock_status: params.stock_status,
            manage_stock: true
        });

        const product = response as WooCommerceProduct;

        return {
            success: true,
            data: {
                product: {
                    id: product.id,
                    name: product.name,
                    stock_quantity: product.stock_quantity,
                    stock_status: product.stock_status,
                    manage_stock: product.manage_stock
                },
                message: `Inventory updated to ${params.stock_quantity}`
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to update inventory";
        if (message.includes("not found")) {
            return {
                success: false,
                error: {
                    type: "not_found",
                    message: "Product not found",
                    retryable: false
                }
            };
        }
        return {
            success: false,
            error: {
                type: "server_error",
                message,
                retryable: true
            }
        };
    }
}
