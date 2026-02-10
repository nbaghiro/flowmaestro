import { getLogger } from "../../../../core/logging";
import { EtsyClient } from "../client/EtsyClient";
import { GetListingInventorySchema, type GetListingInventoryParams } from "../schemas";
import type { EtsyInventoryResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get Listing Inventory operation definition
 */
export const getListingInventoryOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getListingInventory",
            name: "Get Listing Inventory",
            description:
                "Get inventory information for an Etsy listing including products, SKUs, and quantities",
            category: "inventory",
            inputSchema: GetListingInventorySchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "Etsy", err: error },
            "Failed to create getListingInventoryOperation"
        );
        throw new Error(
            `Failed to create getListingInventory operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get listing inventory operation
 */
export async function executeGetListingInventory(
    client: EtsyClient,
    params: GetListingInventoryParams
): Promise<OperationResult> {
    try {
        const response = await client.getListingInventory(params.listing_id);

        const inventory = response as EtsyInventoryResponse;

        return {
            success: true,
            data: {
                inventory
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to get listing inventory";
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
