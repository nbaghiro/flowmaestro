import { z } from "zod";

// ==========================================
// Common Schemas
// ==========================================

export const SquarespaceIdSchema = z.string().describe("Squarespace resource ID");

export const SquarespaceCursorPaginationSchema = z.object({
    cursor: z.string().optional().describe("Pagination cursor from previous response")
});

// ==========================================
// Product Schemas
// ==========================================

export const SquarespaceProductTypeSchema = z
    .enum(["PHYSICAL", "SERVICE", "GIFT_CARD"])
    .optional()
    .describe("Product type");

export const ListProductsSchema = z
    .object({
        type: SquarespaceProductTypeSchema.describe("Filter by product type")
    })
    .merge(SquarespaceCursorPaginationSchema);

export type ListProductsParams = z.infer<typeof ListProductsSchema>;

export const GetProductSchema = z.object({
    product_id: SquarespaceIdSchema.describe("The Squarespace product ID")
});

export type GetProductParams = z.infer<typeof GetProductSchema>;

export const ProductVariantInputSchema = z.object({
    sku: z.string().optional().describe("Stock keeping unit"),
    pricing: z
        .object({
            basePrice: z
                .object({
                    currency: z.string().default("USD").describe("Currency code"),
                    value: z.string().describe("Price value")
                })
                .optional()
                .describe("Base price"),
            salePrice: z
                .object({
                    currency: z.string().default("USD").describe("Currency code"),
                    value: z.string().describe("Sale price value")
                })
                .optional()
                .describe("Sale price"),
            onSale: z.boolean().optional().describe("Whether item is on sale")
        })
        .optional()
        .describe("Pricing information"),
    stock: z
        .object({
            quantity: z.number().optional().describe("Stock quantity"),
            unlimited: z.boolean().optional().describe("Whether stock is unlimited")
        })
        .optional()
        .describe("Stock information"),
    attributes: z.record(z.string()).optional().describe("Variant attributes like Color, Size")
});

export const CreateProductSchema = z.object({
    type: SquarespaceProductTypeSchema.default("PHYSICAL").describe("Product type"),
    storePageId: SquarespaceIdSchema.describe("Store page ID to add product to"),
    name: z.string().min(1).describe("Product name"),
    description: z.string().optional().describe("Product description (HTML allowed)"),
    tags: z.array(z.string()).optional().describe("Product tags"),
    isVisible: z.boolean().optional().default(true).describe("Whether product is visible"),
    variants: z.array(ProductVariantInputSchema).optional().describe("Product variants")
});

export type CreateProductParams = z.infer<typeof CreateProductSchema>;

export const UpdateProductSchema = z.object({
    product_id: SquarespaceIdSchema.describe("The Squarespace product ID"),
    name: z.string().optional().describe("Product name"),
    description: z.string().optional().describe("Product description"),
    tags: z.array(z.string()).optional().describe("Product tags"),
    isVisible: z.boolean().optional().describe("Whether product is visible"),
    variants: z.array(ProductVariantInputSchema).optional().describe("Product variants")
});

export type UpdateProductParams = z.infer<typeof UpdateProductSchema>;

export const DeleteProductSchema = z.object({
    product_id: SquarespaceIdSchema.describe("The Squarespace product ID to delete")
});

export type DeleteProductParams = z.infer<typeof DeleteProductSchema>;

// ==========================================
// Order Schemas
// ==========================================

export const SquarespaceOrderFulfillmentStatusSchema = z
    .enum(["PENDING", "FULFILLED", "CANCELED"])
    .optional()
    .describe("Order fulfillment status");

export const ListOrdersSchema = z
    .object({
        fulfillmentStatus: SquarespaceOrderFulfillmentStatusSchema.describe(
            "Filter by fulfillment status"
        ),
        modifiedAfter: z
            .string()
            .optional()
            .describe("Filter orders modified after this date (ISO 8601)"),
        modifiedBefore: z
            .string()
            .optional()
            .describe("Filter orders modified before this date (ISO 8601)")
    })
    .merge(SquarespaceCursorPaginationSchema);

export type ListOrdersParams = z.infer<typeof ListOrdersSchema>;

export const GetOrderSchema = z.object({
    order_id: SquarespaceIdSchema.describe("The Squarespace order ID")
});

export type GetOrderParams = z.infer<typeof GetOrderSchema>;

export const FulfillOrderSchema = z.object({
    order_id: SquarespaceIdSchema.describe("The Squarespace order ID"),
    shipments: z
        .array(
            z.object({
                shipDate: z.string().optional().describe("Ship date (ISO 8601)"),
                carrierName: z.string().optional().describe("Carrier name (e.g., USPS, FedEx)"),
                service: z.string().optional().describe("Shipping service type"),
                trackingNumber: z.string().optional().describe("Tracking number"),
                trackingUrl: z.string().url().optional().describe("Tracking URL")
            })
        )
        .min(1)
        .describe("Shipment details for fulfillment"),
    sendNotification: z.boolean().optional().default(true).describe("Send notification to customer")
});

export type FulfillOrderParams = z.infer<typeof FulfillOrderSchema>;

// ==========================================
// Inventory Schemas
// ==========================================

export const ListInventorySchema = z
    .object({})
    .merge(SquarespaceCursorPaginationSchema)
    .describe("List all inventory items");

export type ListInventoryParams = z.infer<typeof ListInventorySchema>;

export const GetInventoryItemSchema = z.object({
    variant_id: SquarespaceIdSchema.describe("The product variant ID")
});

export type GetInventoryItemParams = z.infer<typeof GetInventoryItemSchema>;

export const AdjustInventorySchema = z.object({
    variant_id: SquarespaceIdSchema.describe("The product variant ID"),
    quantity: z.number().describe("Quantity adjustment (positive to add, negative to subtract)")
});

export type AdjustInventoryParams = z.infer<typeof AdjustInventorySchema>;

// ==========================================
// Transaction Schemas
// ==========================================

export const ListTransactionsSchema = z
    .object({
        modifiedAfter: z
            .string()
            .optional()
            .describe("Filter transactions after this date (ISO 8601)"),
        modifiedBefore: z
            .string()
            .optional()
            .describe("Filter transactions before this date (ISO 8601)")
    })
    .merge(SquarespaceCursorPaginationSchema);

export type ListTransactionsParams = z.infer<typeof ListTransactionsSchema>;

// ==========================================
// Site Schemas
// ==========================================

export const GetSiteInfoSchema = z.object({}).describe("Get site/store information");

export type GetSiteInfoParams = z.infer<typeof GetSiteInfoSchema>;
