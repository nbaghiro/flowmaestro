import { getLogger } from "../../../../core/logging";
import { WixClient } from "../client/WixClient";
import { UpdateInventorySchema, type UpdateInventoryParams } from "../schemas";
import type { WixInventoryResponse } from "./types";
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
            description: "Update inventory item tracking and quantity settings",
            category: "inventory",
            inputSchema: UpdateInventorySchema,
            retryable: false,
            timeout: 30000
        };
    } catch (error) {
        logger.error({ component: "Wix", err: error }, "Failed to create updateInventoryOperation");
        throw new Error(
            `Failed to create updateInventory operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute update inventory operation
 */
export async function executeUpdateInventory(
    client: WixClient,
    params: UpdateInventoryParams
): Promise<OperationResult> {
    try {
        const response = await client.updateInventory(params.inventoryId, {
            trackQuantity: params.trackQuantity,
            quantity: params.quantity
        });

        const data = response as WixInventoryResponse;

        return {
            success: true,
            data: {
                inventoryItem: data.inventoryItem,
                message: `Inventory updated${params.quantity !== undefined ? ` to ${params.quantity}` : ""}`
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to update inventory";
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
