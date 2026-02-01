import { getLogger } from "../../../../core/logging";
import { ShopifyClient } from "../client/ShopifyClient";
import { AdjustInventorySchema, type AdjustInventoryParams } from "../schemas";
import type { ShopifyInventoryLevelResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Adjust Inventory operation definition
 */
export const adjustInventoryOperation: OperationDefinition = (() => {
    try {
        return {
            id: "adjustInventory",
            name: "Adjust Inventory",
            description:
                "Adjust inventory level by a relative amount (positive to add, negative to subtract)",
            category: "inventory",
            inputSchema: AdjustInventorySchema,
            retryable: false, // Inventory adjustments should not be retried to avoid double-adjustments
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "Shopify", err: error },
            "Failed to create adjustInventoryOperation"
        );
        throw new Error(
            `Failed to create adjustInventory operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute adjust inventory operation
 */
export async function executeAdjustInventory(
    client: ShopifyClient,
    params: AdjustInventoryParams
): Promise<OperationResult> {
    try {
        const response = await client.adjustInventory({
            inventory_item_id: params.inventory_item_id,
            location_id: params.location_id,
            available_adjustment: params.available_adjustment
        });

        const data = response as ShopifyInventoryLevelResponse;

        return {
            success: true,
            data: {
                inventory_level: data.inventory_level,
                adjustment: params.available_adjustment,
                message: `Inventory adjusted by ${params.available_adjustment}`
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to adjust inventory",
                retryable: false
            }
        };
    }
}
