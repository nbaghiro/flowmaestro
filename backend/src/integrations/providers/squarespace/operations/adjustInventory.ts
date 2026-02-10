import { getLogger } from "../../../../core/logging";
import { SquarespaceClient } from "../client/SquarespaceClient";
import { AdjustInventorySchema, type AdjustInventoryParams } from "../schemas";
import type { SquarespaceInventoryItemResponse } from "./types";
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
                "Adjust stock quantity for a product variant (positive to add, negative to subtract)",
            category: "inventory",
            inputSchema: AdjustInventorySchema,
            retryable: false,
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "Squarespace", err: error },
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
    client: SquarespaceClient,
    params: AdjustInventoryParams
): Promise<OperationResult> {
    try {
        const response = await client.adjustInventory(params.variant_id, {
            quantity: params.quantity
        });

        const data = response as SquarespaceInventoryItemResponse;

        return {
            success: true,
            data: {
                inventory: data,
                adjustment: params.quantity,
                message: `Inventory adjusted by ${params.quantity}`
            }
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to adjust inventory";

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

        // Check for validation errors (e.g., insufficient stock)
        if (errorMessage.includes("Validation error") || errorMessage.includes("insufficient")) {
            return {
                success: false,
                error: {
                    type: "validation",
                    message: errorMessage,
                    retryable: false
                }
            };
        }

        return {
            success: false,
            error: {
                type: "server_error",
                message: errorMessage,
                retryable: false
            }
        };
    }
}
