import { getLogger } from "../../../../core/logging";
import { BigCommerceClient } from "../client/BigCommerceClient";
import { GetInventorySchema, type GetInventoryParams } from "../schemas";
import type { BigCommerceProductVariant } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get Inventory operation definition
 */
export const getInventoryOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getInventory",
            name: "Get Inventory",
            description: "Get inventory levels for a product's variants",
            category: "inventory",
            inputSchema: GetInventorySchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "BigCommerce", err: error },
            "Failed to create getInventoryOperation"
        );
        throw new Error(
            `Failed to create getInventory operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get inventory operation
 */
export async function executeGetInventory(
    client: BigCommerceClient,
    params: GetInventoryParams
): Promise<OperationResult> {
    try {
        const response = await client.getInventory(params.product_id);
        const variants = response as BigCommerceProductVariant[];

        return {
            success: true,
            data: {
                productId: params.product_id,
                variants: variants.map((v) => ({
                    variantId: v.id,
                    sku: v.sku,
                    inventoryLevel: v.inventory_level,
                    inventoryWarningLevel: v.inventory_warning_level
                })),
                count: variants.length
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to get inventory";
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
