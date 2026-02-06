import { getLogger } from "../../../../core/logging";
import { WixClient } from "../client/WixClient";
import { GetInventorySchema, type GetInventoryParams } from "../schemas";
import type { WixInventoryResponse } from "./types";
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
            description: "Get a single inventory item by ID",
            category: "inventory",
            inputSchema: GetInventorySchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error({ component: "Wix", err: error }, "Failed to create getInventoryOperation");
        throw new Error(
            `Failed to create getInventory operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get inventory operation
 */
export async function executeGetInventory(
    client: WixClient,
    params: GetInventoryParams
): Promise<OperationResult> {
    try {
        const response = await client.getInventory(params.inventoryId);
        const data = response as WixInventoryResponse;

        return {
            success: true,
            data: {
                inventoryItem: data.inventoryItem
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to get inventory";
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
