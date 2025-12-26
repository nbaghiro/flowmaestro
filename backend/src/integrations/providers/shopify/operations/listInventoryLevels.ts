import { getLogger } from "../../../../core/logging";
import { toJSONSchema } from "../../../core/schema-utils";
import { ShopifyClient } from "../client/ShopifyClient";
import { ListInventoryLevelsSchema, type ListInventoryLevelsParams } from "../schemas";
import type { ShopifyInventoryLevelsResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * List Inventory Levels operation definition
 */
export const listInventoryLevelsOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listInventoryLevels",
            name: "List Inventory Levels",
            description: "Retrieve inventory levels for items across locations",
            category: "inventory",
            inputSchema: ListInventoryLevelsSchema,
            inputSchemaJSON: toJSONSchema(ListInventoryLevelsSchema),
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "Shopify", err: error },
            "Failed to create listInventoryLevelsOperation"
        );
        throw new Error(
            `Failed to create listInventoryLevels operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute list inventory levels operation
 */
export async function executeListInventoryLevels(
    client: ShopifyClient,
    params: ListInventoryLevelsParams
): Promise<OperationResult> {
    try {
        const response = await client.listInventoryLevels({
            inventory_item_ids: params.inventory_item_ids,
            location_ids: params.location_ids,
            limit: params.limit,
            updated_at_min: params.updated_at_min
        });

        const data = response as ShopifyInventoryLevelsResponse;

        return {
            success: true,
            data: {
                inventory_levels: data.inventory_levels,
                count: data.inventory_levels.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list inventory levels",
                retryable: true
            }
        };
    }
}
