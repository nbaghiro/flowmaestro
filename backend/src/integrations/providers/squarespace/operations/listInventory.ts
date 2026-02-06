import { getLogger } from "../../../../core/logging";
import { SquarespaceClient } from "../client/SquarespaceClient";
import { ListInventorySchema, type ListInventoryParams } from "../schemas";
import type { SquarespaceInventoryResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * List Inventory operation definition
 */
export const listInventoryOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listInventory",
            name: "List Inventory",
            description: "Retrieve inventory levels for all product variants",
            category: "inventory",
            inputSchema: ListInventorySchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "Squarespace", err: error },
            "Failed to create listInventoryOperation"
        );
        throw new Error(
            `Failed to create listInventory operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute list inventory operation
 */
export async function executeListInventory(
    client: SquarespaceClient,
    params: ListInventoryParams
): Promise<OperationResult> {
    try {
        const response = await client.listInventory({
            cursor: params.cursor
        });

        const data = response as SquarespaceInventoryResponse;

        return {
            success: true,
            data: {
                inventory: data.inventory,
                count: data.inventory.length,
                nextCursor: data.pagination?.nextPageCursor
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list inventory",
                retryable: true
            }
        };
    }
}
