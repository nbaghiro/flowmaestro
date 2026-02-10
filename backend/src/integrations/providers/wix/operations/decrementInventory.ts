import { getLogger } from "../../../../core/logging";
import { WixClient } from "../client/WixClient";
import { DecrementInventorySchema, type DecrementInventoryParams } from "../schemas";
import type { WixInventoryResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Decrement Inventory operation definition
 */
export const decrementInventoryOperation: OperationDefinition = (() => {
    try {
        return {
            id: "decrementInventory",
            name: "Decrement Inventory",
            description: "Decrease stock quantity by a specified amount",
            category: "inventory",
            inputSchema: DecrementInventorySchema,
            retryable: false,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "Wix", err: error },
            "Failed to create decrementInventoryOperation"
        );
        throw new Error(
            `Failed to create decrementInventory operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute decrement inventory operation
 */
export async function executeDecrementInventory(
    client: WixClient,
    params: DecrementInventoryParams
): Promise<OperationResult> {
    try {
        const response = await client.decrementInventory(params.inventoryId, params.decrementBy);

        const data = response as WixInventoryResponse;

        return {
            success: true,
            data: {
                inventoryItem: data.inventoryItem,
                message: `Inventory decreased by ${params.decrementBy}`
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to decrement inventory";
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
