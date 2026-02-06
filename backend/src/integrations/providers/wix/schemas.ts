import { z } from "zod";

// ==========================================
// Common Schemas
// ==========================================

export const WixIdSchema = z.string().describe("Wix resource ID");

export const WixPaginationSchema = z.object({
    limit: z.number().min(1).max(100).default(50).describe("Maximum number of results to return"),
    offset: z.number().min(0).default(0).describe("Number of items to skip")
});

// ==========================================
// Product Schemas
// ==========================================

export const WixProductTypeSchema = z
    .enum(["physical", "digital"])
    .optional()
    .describe("Product type");

export const ListProductsSchema = z
    .object({
        query: z.string().optional().describe("Search query for product name or description"),
        includeVariants: z
            .boolean()
            .optional()
            .default(false)
            .describe("Whether to include product variants in response")
    })
    .merge(WixPaginationSchema);

export type ListProductsParams = z.infer<typeof ListProductsSchema>;

export const GetProductSchema = z.object({
    productId: WixIdSchema.describe("The Wix product ID")
});

export type GetProductParams = z.infer<typeof GetProductSchema>;

export const ProductVariantSchema = z.object({
    choices: z.record(z.string()).optional().describe("Variant choices (e.g., { Color: 'Blue' })"),
    sku: z.string().optional().describe("Variant SKU"),
    price: z.number().optional().describe("Variant price"),
    weight: z.number().optional().describe("Variant weight"),
    visible: z.boolean().optional().describe("Whether variant is visible")
});

export const ProductMediaItemSchema = z.object({
    url: z.string().url().describe("Media URL"),
    altText: z.string().optional().describe("Alt text for the media")
});

export const CreateProductSchema = z.object({
    name: z.string().min(1).describe("Product name"),
    productType: WixProductTypeSchema.default("physical"),
    description: z.string().optional().describe("Product description"),
    sku: z.string().optional().describe("Stock keeping unit"),
    price: z.number().min(0).describe("Product price"),
    currency: z.string().default("USD").describe("Currency code (e.g., USD, EUR)"),
    weight: z.number().optional().describe("Product weight"),
    visible: z.boolean().default(true).describe("Whether product is visible in store"),
    manageVariants: z.boolean().optional().describe("Whether product has variants"),
    variants: z.array(ProductVariantSchema).optional().describe("Product variants"),
    media: z.array(ProductMediaItemSchema).optional().describe("Product media items")
});

export type CreateProductParams = z.infer<typeof CreateProductSchema>;

export const UpdateProductSchema = z.object({
    productId: WixIdSchema.describe("The Wix product ID"),
    name: z.string().optional().describe("Product name"),
    description: z.string().optional().describe("Product description"),
    sku: z.string().optional().describe("Stock keeping unit"),
    price: z.number().min(0).optional().describe("Product price"),
    weight: z.number().optional().describe("Product weight"),
    visible: z.boolean().optional().describe("Whether product is visible in store")
});

export type UpdateProductParams = z.infer<typeof UpdateProductSchema>;

export const DeleteProductSchema = z.object({
    productId: WixIdSchema.describe("The Wix product ID to delete")
});

export type DeleteProductParams = z.infer<typeof DeleteProductSchema>;

// ==========================================
// Order Schemas
// ==========================================

export const WixOrderStatusSchema = z
    .enum(["APPROVED", "CANCELED", "FULFILLED", "NOT_FULFILLED", "PARTIALLY_FULFILLED"])
    .optional()
    .describe("Order fulfillment status filter");

export const WixPaymentStatusSchema = z
    .enum(["PAID", "NOT_PAID", "PARTIALLY_PAID", "PARTIALLY_REFUNDED", "FULLY_REFUNDED", "PENDING"])
    .optional()
    .describe("Order payment status filter");

export const ListOrdersSchema = z
    .object({
        fulfillmentStatus: WixOrderStatusSchema,
        paymentStatus: WixPaymentStatusSchema,
        dateCreatedFrom: z
            .string()
            .optional()
            .describe("Filter orders created after this ISO8601 date"),
        dateCreatedTo: z
            .string()
            .optional()
            .describe("Filter orders created before this ISO8601 date")
    })
    .merge(WixPaginationSchema);

export type ListOrdersParams = z.infer<typeof ListOrdersSchema>;

export const GetOrderSchema = z.object({
    orderId: WixIdSchema.describe("The Wix order ID")
});

export type GetOrderParams = z.infer<typeof GetOrderSchema>;

export const UpdateOrderSchema = z.object({
    orderId: WixIdSchema.describe("The Wix order ID"),
    buyerNote: z.string().optional().describe("Note from the buyer"),
    fulfilled: z.boolean().optional().describe("Mark order as fulfilled")
});

export type UpdateOrderParams = z.infer<typeof UpdateOrderSchema>;

export const CancelOrderSchema = z.object({
    orderId: WixIdSchema.describe("The Wix order ID"),
    sendNotification: z.boolean().default(true).describe("Send cancellation notification to buyer")
});

export type CancelOrderParams = z.infer<typeof CancelOrderSchema>;

// ==========================================
// Inventory Schemas
// ==========================================

export const ListInventorySchema = z
    .object({
        productIds: z.array(z.string()).optional().describe("Filter by product IDs"),
        variantIds: z.array(z.string()).optional().describe("Filter by variant IDs")
    })
    .merge(WixPaginationSchema);

export type ListInventoryParams = z.infer<typeof ListInventorySchema>;

export const GetInventorySchema = z.object({
    inventoryId: WixIdSchema.describe("The inventory item ID")
});

export type GetInventoryParams = z.infer<typeof GetInventorySchema>;

export const UpdateInventorySchema = z.object({
    inventoryId: WixIdSchema.describe("The inventory item ID"),
    trackQuantity: z.boolean().optional().describe("Whether to track quantity"),
    quantity: z.number().optional().describe("New quantity (absolute value)")
});

export type UpdateInventoryParams = z.infer<typeof UpdateInventorySchema>;

export const IncrementInventorySchema = z.object({
    inventoryId: WixIdSchema.describe("The inventory item ID"),
    incrementBy: z.number().min(1).describe("Amount to increase inventory by")
});

export type IncrementInventoryParams = z.infer<typeof IncrementInventorySchema>;

export const DecrementInventorySchema = z.object({
    inventoryId: WixIdSchema.describe("The inventory item ID"),
    decrementBy: z.number().min(1).describe("Amount to decrease inventory by")
});

export type DecrementInventoryParams = z.infer<typeof DecrementInventorySchema>;

// ==========================================
// Collection Schemas
// ==========================================

export const ListCollectionsSchema = z
    .object({
        query: z.string().optional().describe("Search query for collection name")
    })
    .merge(WixPaginationSchema);

export type ListCollectionsParams = z.infer<typeof ListCollectionsSchema>;

export const GetCollectionSchema = z.object({
    collectionId: WixIdSchema.describe("The Wix collection ID")
});

export type GetCollectionParams = z.infer<typeof GetCollectionSchema>;
