import { getLogger } from "../../../../core/logging";
import { WixClient } from "../client/WixClient";
import { ListInventorySchema, type ListInventoryParams } from "../schemas";
import type { WixInventoryItemsResponse } from "./types";
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
            description: "Query inventory items with optional product or variant ID filters",
            category: "inventory",
            inputSchema: ListInventorySchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error({ component: "Wix", err: error }, "Failed to create listInventoryOperation");
        throw new Error(
            `Failed to create listInventory operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute list inventory operation
 */
export async function executeListInventory(
    client: WixClient,
    params: ListInventoryParams
): Promise<OperationResult> {
    try {
        const response = await client.queryInventory({
            productIds: params.productIds,
            variantIds: params.variantIds,
            limit: params.limit,
            offset: params.offset
        });

        const data = response as WixInventoryItemsResponse;
        const inventoryItems = data.inventoryItems || [];

        return {
            success: true,
            data: {
                inventoryItems,
                count: inventoryItems.length,
                total: data.pagingMetadata?.total,
                hasNext: data.pagingMetadata?.hasNext
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
