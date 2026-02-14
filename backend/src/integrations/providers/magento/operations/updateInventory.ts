import { getLogger } from "../../../../core/logging";
import { MagentoClient } from "../client/MagentoClient";
import { UpdateInventorySchema, type UpdateInventoryParams } from "../schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

export const updateInventoryOperation: OperationDefinition = (() => {
    try {
        return {
            id: "updateInventory",
            name: "Update Inventory",
            description: "Update stock quantity for a product using Multi-Source Inventory (MSI)",
            category: "inventory",
            inputSchema: UpdateInventorySchema,
            retryable: false,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "Magento", err: error },
            "Failed to create updateInventoryOperation"
        );
        throw new Error(
            `Failed to create updateInventory operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

export async function executeUpdateInventory(
    client: MagentoClient,
    params: UpdateInventoryParams
): Promise<OperationResult> {
    try {
        // Use MSI (Multi-Source Inventory) API
        await client.updateSourceItem(
            params.sku,
            params.source_code,
            params.quantity,
            params.is_in_stock ? 1 : 0
        );

        return {
            success: true,
            data: {
                sku: params.sku,
                source_code: params.source_code,
                quantity: params.quantity,
                is_in_stock: params.is_in_stock,
                message: "Inventory updated successfully"
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update inventory",
                retryable: false
            }
        };
    }
}
