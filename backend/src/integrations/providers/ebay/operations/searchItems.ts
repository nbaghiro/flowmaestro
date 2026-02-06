import { z } from "zod";
import type { EbayItemSummaryOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { EbayClient } from "../client/EbayClient";

export const searchItemsSchema = z.object({
    query: z.string().min(1).describe("Search query string"),
    limit: z
        .number()
        .min(1)
        .max(200)
        .optional()
        .default(10)
        .describe("Number of items to return (max 200)"),
    offset: z.number().min(0).optional().default(0).describe("Offset for pagination (0-based)")
});

export type SearchItemsParams = z.infer<typeof searchItemsSchema>;

export const searchItemsOperation: OperationDefinition = {
    id: "searchItems",
    name: "Search Items",
    description: "Search for items on eBay marketplace",
    category: "browse",
    inputSchema: searchItemsSchema,
    retryable: true,
    timeout: 30000
};

export async function executeSearchItems(
    client: EbayClient,
    params: SearchItemsParams
): Promise<OperationResult> {
    try {
        const response = await client.searchItems(params.query, params.limit, params.offset);
        const items = response.itemSummaries || [];

        const formattedItems: EbayItemSummaryOutput[] = items.map((item) => ({
            itemId: item.itemId || "",
            title: item.title || "Unknown",
            price: item.price
                ? {
                      value: item.price.value || "0",
                      currency: item.price.currency || "USD"
                  }
                : undefined,
            condition: item.condition,
            image: item.image?.imageUrl,
            itemWebUrl: item.itemWebUrl,
            seller: item.seller
                ? {
                      username: item.seller.username || "unknown",
                      feedbackPercentage: item.seller.feedbackPercentage
                  }
                : undefined
        }));

        return {
            success: true,
            data: {
                items: formattedItems,
                count: formattedItems.length,
                total: response.total || 0,
                offset: response.offset || 0,
                limit: response.limit || params.limit
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to search items",
                retryable: true
            }
        };
    }
}
