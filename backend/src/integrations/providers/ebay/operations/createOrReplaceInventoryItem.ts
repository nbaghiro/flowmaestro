import { z } from "zod";
import type { EbayInventoryItemOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { EbayClient } from "../client/EbayClient";

export const createOrReplaceInventoryItemSchema = z.object({
    sku: z.string().min(1).describe("SKU for the inventory item"),
    title: z.string().min(1).describe("Product title"),
    description: z.string().optional().describe("Product description"),
    brand: z.string().optional().describe("Product brand"),
    mpn: z.string().optional().describe("Manufacturer Part Number"),
    imageUrls: z.array(z.string()).optional().describe("Array of image URLs"),
    condition: z.string().min(1).describe("Item condition (e.g., NEW, LIKE_NEW, USED_EXCELLENT)"),
    quantity: z.number().min(0).describe("Available quantity")
});

export type CreateOrReplaceInventoryItemParams = z.infer<typeof createOrReplaceInventoryItemSchema>;

export const createOrReplaceInventoryItemOperation: OperationDefinition = {
    id: "createOrReplaceInventoryItem",
    name: "Create or Replace Inventory Item",
    description: "Create or replace an inventory item on eBay by SKU",
    category: "inventory",
    inputSchema: createOrReplaceInventoryItemSchema,
    retryable: false,
    timeout: 30000
};

export async function executeCreateOrReplaceInventoryItem(
    client: EbayClient,
    params: CreateOrReplaceInventoryItemParams
): Promise<OperationResult> {
    try {
        const product: {
            title: string;
            description?: string;
            brand?: string;
            mpn?: string;
            imageUrls?: string[];
        } = {
            title: params.title
        };

        if (params.description) {
            product.description = params.description;
        }
        if (params.brand) {
            product.brand = params.brand;
        }
        if (params.mpn) {
            product.mpn = params.mpn;
        }
        if (params.imageUrls) {
            product.imageUrls = params.imageUrls;
        }

        await client.createOrReplaceInventoryItem(params.sku, {
            product,
            condition: params.condition,
            availability: {
                shipToLocationAvailability: {
                    quantity: params.quantity
                }
            }
        });

        // PUT returns 204 No Content, so echo back the input data
        const formatted: EbayInventoryItemOutput = {
            sku: params.sku,
            title: params.title,
            description: params.description,
            condition: params.condition,
            quantity: params.quantity,
            images: params.imageUrls,
            brand: params.brand,
            mpn: params.mpn
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
                message:
                    error instanceof Error
                        ? error.message
                        : "Failed to create or replace inventory item",
                retryable: false
            }
        };
    }
}
