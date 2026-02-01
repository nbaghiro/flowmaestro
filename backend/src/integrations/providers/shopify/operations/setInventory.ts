import { getLogger } from "../../../../core/logging";
import { ShopifyClient } from "../client/ShopifyClient";
import { SetInventorySchema, type SetInventoryParams } from "../schemas";
import type { ShopifyInventoryLevelResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Set Inventory operation definition
 */
export const setInventoryOperation: OperationDefinition = (() => {
    try {
        return {
            id: "setInventory",
            name: "Set Inventory",
            description: "Set inventory level to an absolute quantity value",
            category: "inventory",
            inputSchema: SetInventorySchema,
            retryable: true, // Setting is idempotent, safe to retry
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "Shopify", err: error },
            "Failed to create setInventoryOperation"
        );
        throw new Error(
            `Failed to create setInventory operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute set inventory operation
 */
export async function executeSetInventory(
    client: ShopifyClient,
    params: SetInventoryParams
): Promise<OperationResult> {
    try {
        const response = await client.setInventory({
            inventory_item_id: params.inventory_item_id,
            location_id: params.location_id,
            available: params.available
        });

        const data = response as ShopifyInventoryLevelResponse;

        return {
            success: true,
            data: {
                inventory_level: data.inventory_level,
                message: `Inventory set to ${params.available}`
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to set inventory",
                retryable: true
            }
        };
    }
}
