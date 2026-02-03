import { z } from "zod";

// ==========================================
// Common Schemas
// ==========================================

export const MarketplaceIdSchema = z
    .string()
    .describe(
        "Amazon marketplace ID (e.g., ATVPDKIKX0DER for US, A1F83G8C2ARO7P for UK, A1PA6795UKMFR9 for DE)"
    );

// ==========================================
// Order Schemas (Orders API v0)
// ==========================================

export const ListOrdersSchema = z.object({
    marketplaceIds: z
        .array(MarketplaceIdSchema)
        .min(1)
        .describe("List of marketplace IDs to filter orders"),
    orderStatuses: z
        .array(
            z.enum([
                "PendingAvailability",
                "Pending",
                "Unshipped",
                "PartiallyShipped",
                "Shipped",
                "InvoiceUnconfirmed",
                "Canceled",
                "Unfulfillable"
            ])
        )
        .optional()
        .describe("Filter by order status"),
    createdAfter: z
        .string()
        .optional()
        .describe("Filter orders created after this date (ISO 8601)"),
    createdBefore: z
        .string()
        .optional()
        .describe("Filter orders created before this date (ISO 8601)"),
    maxResultsPerPage: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe("Maximum number of results per page (1-100)")
});

export type ListOrdersParams = z.infer<typeof ListOrdersSchema>;

export const GetOrderSchema = z.object({
    orderId: z.string().min(1).describe("The Amazon order ID")
});

export type GetOrderParams = z.infer<typeof GetOrderSchema>;

export const GetOrderItemsSchema = z.object({
    orderId: z.string().min(1).describe("The Amazon order ID")
});

export type GetOrderItemsParams = z.infer<typeof GetOrderItemsSchema>;

// ==========================================
// Catalog Item Schemas (Catalog Items API 2022-04-01)
// ==========================================

export const SearchCatalogItemsSchema = z.object({
    marketplaceIds: z
        .array(MarketplaceIdSchema)
        .min(1)
        .describe("List of marketplace IDs to search"),
    keywords: z.string().optional().describe("Search keywords"),
    identifiers: z
        .array(z.string())
        .optional()
        .describe("Product identifiers to search (ASINs, EANs, UPCs, ISBNs)"),
    identifiersType: z
        .enum(["ASIN", "EAN", "UPC", "ISBN"])
        .optional()
        .describe("Type of identifiers provided"),
    pageSize: z.number().min(1).max(20).optional().describe("Number of results per page (1-20)"),
    pageToken: z.string().optional().describe("Token for pagination")
});

export type SearchCatalogItemsParams = z.infer<typeof SearchCatalogItemsSchema>;

export const GetCatalogItemSchema = z.object({
    asin: z.string().min(1).describe("The Amazon Standard Identification Number (ASIN)"),
    marketplaceIds: z.array(MarketplaceIdSchema).min(1).describe("List of marketplace IDs"),
    includedData: z
        .array(
            z.enum([
                "attributes",
                "dimensions",
                "identifiers",
                "images",
                "productTypes",
                "summaries"
            ])
        )
        .optional()
        .describe("Data sets to include in the response")
});

export type GetCatalogItemParams = z.infer<typeof GetCatalogItemSchema>;

// ==========================================
// FBA Inventory Schemas (FBA Inventory API v1)
// ==========================================

export const GetInventorySummariesSchema = z.object({
    granularityType: z.enum(["Marketplace"]).describe("Granularity type for inventory aggregation"),
    granularityId: z.string().min(1).describe("Granularity ID (marketplace ID)"),
    marketplaceIds: z.array(MarketplaceIdSchema).min(1).describe("List of marketplace IDs"),
    sellerSkus: z.array(z.string()).optional().describe("Filter by seller SKUs"),
    startDateTime: z.string().optional().describe("Start date for inventory data (ISO 8601)")
});

export type GetInventorySummariesParams = z.infer<typeof GetInventorySummariesSchema>;

// ==========================================
// Product Pricing Schemas (Pricing API v0)
// ==========================================

export const GetCompetitivePricingSchema = z.object({
    marketplaceId: MarketplaceIdSchema.describe("The marketplace ID"),
    itemType: z.enum(["Asin", "Sku"]).describe("Whether to look up by ASIN or seller SKU"),
    asins: z
        .array(z.string())
        .optional()
        .describe("List of ASINs (required when itemType is Asin, max 20)"),
    skus: z
        .array(z.string())
        .optional()
        .describe("List of seller SKUs (required when itemType is Sku, max 20)")
});

export type GetCompetitivePricingParams = z.infer<typeof GetCompetitivePricingSchema>;

export const GetItemOffersSchema = z.object({
    marketplaceId: MarketplaceIdSchema.describe("The marketplace ID"),
    asin: z.string().min(1).describe("The ASIN to get offers for"),
    itemCondition: z
        .enum(["New", "Used", "Collectible", "Refurbished", "Club"])
        .describe("The condition of the item")
});

export type GetItemOffersParams = z.infer<typeof GetItemOffersSchema>;
