import { getLogger } from "../../../../core/logging";
import { BigCommerceClient } from "../client/BigCommerceClient";
import { UpdateInventorySchema, type UpdateInventoryParams } from "../schemas";
import type { BigCommerceProductVariant, BigCommerceProduct } from "./types";
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
            description: "Update inventory level for a product or variant",
            category: "inventory",
            inputSchema: UpdateInventorySchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "BigCommerce", err: error },
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
    client: BigCommerceClient,
    params: UpdateInventoryParams
): Promise<OperationResult> {
    try {
        let response: unknown;

        if (params.variant_id) {
            // Update variant inventory
            response = await client.updateInventory(
                params.product_id,
                params.variant_id,
                params.inventory_level
            );
            const variant = response as BigCommerceProductVariant;

            return {
                success: true,
                data: {
                    variantId: variant.id,
                    productId: params.product_id,
                    inventoryLevel: variant.inventory_level,
                    message: `Inventory updated to ${params.inventory_level}`
                }
            };
        } else {
            // Update product-level inventory (for simple products)
            response = await client.updateProductInventory(
                params.product_id,
                params.inventory_level
            );
            const product = response as BigCommerceProduct;

            return {
                success: true,
                data: {
                    productId: product.id,
                    inventoryLevel: product.inventory_level,
                    message: `Inventory updated to ${params.inventory_level}`
                }
            };
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to update inventory";
        if (message.includes("not found")) {
            return {
                success: false,
                error: {
                    type: "not_found",
                    message: "Product or variant not found",
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
