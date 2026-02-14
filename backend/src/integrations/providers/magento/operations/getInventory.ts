import { getLogger } from "../../../../core/logging";
import { MagentoClient } from "../client/MagentoClient";
import { GetInventorySchema, type GetInventoryParams } from "../schemas";
import type { MagentoStockItem } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

export const getInventoryOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getInventory",
            name: "Get Inventory",
            description: "Retrieve stock/inventory information for a product by SKU",
            category: "inventory",
            inputSchema: GetInventorySchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "Magento", err: error },
            "Failed to create getInventoryOperation"
        );
        throw new Error(
            `Failed to create getInventory operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

export async function executeGetInventory(
    client: MagentoClient,
    params: GetInventoryParams
): Promise<OperationResult> {
    try {
        const response = await client.getStockItem(params.sku);
        const stockItem = response as MagentoStockItem;

        return {
            success: true,
            data: {
                sku: params.sku,
                quantity: stockItem.qty,
                is_in_stock: stockItem.is_in_stock,
                stock_item: stockItem
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get inventory",
                retryable: true
            }
        };
    }
}
