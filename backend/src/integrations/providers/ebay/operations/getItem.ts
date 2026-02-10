import { z } from "zod";
import type { EbayItemOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { EbayClient } from "../client/EbayClient";

export const getItemSchema = z.object({
    itemId: z.string().min(1).describe("eBay item ID (e.g., v1|123456789|0)")
});

export type GetItemParams = z.infer<typeof getItemSchema>;

export const getItemOperation: OperationDefinition = {
    id: "getItem",
    name: "Get Item",
    description: "Get detailed information about an eBay item",
    category: "browse",
    inputSchema: getItemSchema,
    retryable: true,
    timeout: 30000
};

export async function executeGetItem(
    client: EbayClient,
    params: GetItemParams
): Promise<OperationResult> {
    try {
        const item = await client.getItem(params.itemId);

        const images: string[] = [];
        if (item.image?.imageUrl) {
            images.push(item.image.imageUrl);
        }
        if (item.additionalImages) {
            for (const img of item.additionalImages) {
                if (img.imageUrl) {
                    images.push(img.imageUrl);
                }
            }
        }

        const formatted: EbayItemOutput = {
            itemId: item.itemId || params.itemId,
            title: item.title || "Unknown",
            description: item.shortDescription || item.description,
            price: item.price
                ? {
                      value: item.price.value || "0",
                      currency: item.price.currency || "USD"
                  }
                : undefined,
            condition: item.condition,
            conditionDescription: item.conditionDescription,
            categoryPath: item.categoryPath,
            images: images.length > 0 ? images : undefined,
            itemWebUrl: item.itemWebUrl,
            seller: item.seller
                ? {
                      username: item.seller.username || "unknown",
                      feedbackPercentage: item.seller.feedbackPercentage,
                      feedbackScore: item.seller.feedbackScore
                  }
                : undefined,
            brand: item.brand,
            mpn: item.mpn,
            color: item.color,
            size: item.size,
            itemLocation: item.itemLocation
                ? {
                      city: item.itemLocation.city,
                      stateOrProvince: item.itemLocation.stateOrProvince,
                      postalCode: item.itemLocation.postalCode,
                      country: item.itemLocation.country
                  }
                : undefined,
            shippingOptions: item.shippingOptions?.map((opt) => ({
                shippingCostType: opt.shippingCostType,
                shippingCost: opt.shippingCost
                    ? {
                          value: opt.shippingCost.value || "0",
                          currency: opt.shippingCost.currency || "USD"
                      }
                    : undefined
            }))
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
                message: error instanceof Error ? error.message : "Failed to get item",
                retryable: true
            }
        };
    }
}
