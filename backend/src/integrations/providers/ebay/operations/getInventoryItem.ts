import { z } from "zod";
import type { EbayInventoryItemOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { EbayClient } from "../client/EbayClient";

export const getInventoryItemSchema = z.object({
    sku: z.string().min(1).describe("SKU of the inventory item")
});

export type GetInventoryItemParams = z.infer<typeof getInventoryItemSchema>;

export const getInventoryItemOperation: OperationDefinition = {
    id: "getInventoryItem",
    name: "Get Inventory Item",
    description: "Get an inventory item by SKU from eBay",
    category: "inventory",
    inputSchema: getInventoryItemSchema,
    retryable: true,
    timeout: 30000
};

export async function executeGetInventoryItem(
    client: EbayClient,
    params: GetInventoryItemParams
): Promise<OperationResult> {
    try {
        const item = await client.getInventoryItem(params.sku);

        const formatted: EbayInventoryItemOutput = {
            sku: item.sku || params.sku,
            title: item.product?.title,
            description: item.product?.description,
            condition: item.condition,
            quantity: item.availability?.shipToLocationAvailability?.quantity,
            images: item.product?.imageUrls,
            brand: item.product?.brand,
            mpn: item.product?.mpn
        };

        return {
            success: true,
            data: formatted
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get inventory item",
                retryable: true
            }
        };
    }
}
