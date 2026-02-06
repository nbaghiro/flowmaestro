import { getLogger } from "../../../../core/logging";
import { WixClient } from "../client/WixClient";
import { IncrementInventorySchema, type IncrementInventoryParams } from "../schemas";
import type { WixInventoryResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Increment Inventory operation definition
 */
export const incrementInventoryOperation: OperationDefinition = (() => {
    try {
        return {
            id: "incrementInventory",
            name: "Increment Inventory",
            description: "Increase stock quantity by a specified amount",
            category: "inventory",
            inputSchema: IncrementInventorySchema,
            retryable: false,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "Wix", err: error },
            "Failed to create incrementInventoryOperation"
        );
        throw new Error(
            `Failed to create incrementInventory operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute increment inventory operation
 */
export async function executeIncrementInventory(
    client: WixClient,
    params: IncrementInventoryParams
): Promise<OperationResult> {
    try {
        const response = await client.incrementInventory(params.inventoryId, params.incrementBy);

        const data = response as WixInventoryResponse;

        return {
            success: true,
            data: {
                inventoryItem: data.inventoryItem,
                message: `Inventory increased by ${params.incrementBy}`
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to increment inventory";
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
