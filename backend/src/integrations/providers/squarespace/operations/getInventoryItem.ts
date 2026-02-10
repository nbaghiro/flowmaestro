import { getLogger } from "../../../../core/logging";
import { SquarespaceClient } from "../client/SquarespaceClient";
import { GetInventoryItemSchema, type GetInventoryItemParams } from "../schemas";
import type { SquarespaceInventoryItemResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get Inventory Item operation definition
 */
export const getInventoryItemOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getInventoryItem",
            name: "Get Inventory Item",
            description: "Retrieve inventory level for a specific product variant",
            category: "inventory",
            inputSchema: GetInventoryItemSchema,
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "Squarespace", err: error },
            "Failed to create getInventoryItemOperation"
        );
        throw new Error(
            `Failed to create getInventoryItem operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get inventory item operation
 */
export async function executeGetInventoryItem(
    client: SquarespaceClient,
    params: GetInventoryItemParams
): Promise<OperationResult> {
    try {
        const response = await client.getInventoryItem(params.variant_id);
        const data = response as SquarespaceInventoryItemResponse;

        return {
            success: true,
            data: {
                inventory: data
            }
        };
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : "Failed to get inventory item";

        // Check for not found
        if (errorMessage.includes("not found") || errorMessage.includes("404")) {
            return {
                success: false,
                error: {
                    type: "not_found",
                    message: "Inventory item not found",
                    retryable: false
                }
            };
        }

        return {
            success: false,
            error: {
                type: "server_error",
                message: errorMessage,
                retryable: true
            }
        };
    }
}
