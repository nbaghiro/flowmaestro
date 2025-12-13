import { z } from "zod";

// ==========================================
// Common Schemas
// ==========================================

export const ShopifyIdSchema = z.string().describe("Shopify resource ID");

export const ShopifyPaginationSchema = z.object({
    limit: z.number().min(1).max(250).default(50).describe("Maximum number of results to return"),
    since_id: z.string().optional().describe("Restrict results to after the specified ID")
});

export const ShopifyDateRangeSchema = z.object({
    created_at_min: z.string().optional().describe("Show results created after date (ISO 8601)"),
    created_at_max: z.string().optional().describe("Show results created before date (ISO 8601)"),
    updated_at_min: z.string().optional().describe("Show results updated after date (ISO 8601)"),
    updated_at_max: z.string().optional().describe("Show results updated before date (ISO 8601)")
});

// ==========================================
// Order Schemas
// ==========================================

export const ShopifyOrderStatusSchema = z
    .enum(["open", "closed", "cancelled", "any"])
    .optional()
    .describe("Filter orders by status");

export const ShopifyFinancialStatusSchema = z
    .enum([
        "authorized",
        "pending",
        "paid",
        "partially_paid",
        "refunded",
        "voided",
        "partially_refunded",
        "any",
        "unpaid"
    ])
    .optional()
    .describe("Filter orders by financial status");

export const ShopifyFulfillmentStatusSchema = z
    .enum(["shipped", "partial", "unshipped", "any", "unfulfilled"])
    .optional()
    .describe("Filter orders by fulfillment status");

export const ListOrdersSchema = z
    .object({
        status: ShopifyOrderStatusSchema,
        financial_status: ShopifyFinancialStatusSchema,
        fulfillment_status: ShopifyFulfillmentStatusSchema,
        fields: z.string().optional().describe("Comma-separated list of fields to include")
    })
    .merge(ShopifyPaginationSchema)
    .merge(ShopifyDateRangeSchema);

export type ListOrdersParams = z.infer<typeof ListOrdersSchema>;

export const GetOrderSchema = z.object({
    order_id: ShopifyIdSchema.describe("The Shopify order ID"),
    fields: z.string().optional().describe("Comma-separated list of fields to include")
});

export type GetOrderParams = z.infer<typeof GetOrderSchema>;

export const UpdateOrderSchema = z.object({
    order_id: ShopifyIdSchema.describe("The Shopify order ID"),
    note: z.string().optional().describe("Order note visible to staff"),
    tags: z.string().optional().describe("Comma-separated list of tags"),
    email: z.string().email().optional().describe("Customer email"),
    phone: z.string().optional().describe("Customer phone number"),
    buyer_accepts_marketing: z.boolean().optional().describe("Whether buyer accepts marketing")
});

export type UpdateOrderParams = z.infer<typeof UpdateOrderSchema>;

export const CloseOrderSchema = z.object({
    order_id: ShopifyIdSchema.describe("The Shopify order ID to close")
});

export type CloseOrderParams = z.infer<typeof CloseOrderSchema>;

export const CancelOrderSchema = z.object({
    order_id: ShopifyIdSchema.describe("The Shopify order ID to cancel"),
    reason: z
        .enum(["customer", "fraud", "inventory", "declined", "other"])
        .optional()
        .describe("Reason for cancellation"),
    email: z.boolean().optional().describe("Whether to send cancellation email to customer"),
    restock: z.boolean().optional().describe("Whether to restock items")
});

export type CancelOrderParams = z.infer<typeof CancelOrderSchema>;

// ==========================================
// Product Schemas
// ==========================================

export const ShopifyProductStatusSchema = z
    .enum(["active", "archived", "draft"])
    .optional()
    .describe("Product status");

export const ListProductsSchema = z
    .object({
        ids: z.string().optional().describe("Comma-separated list of product IDs"),
        title: z.string().optional().describe("Filter by product title"),
        vendor: z.string().optional().describe("Filter by vendor"),
        product_type: z.string().optional().describe("Filter by product type"),
        status: ShopifyProductStatusSchema,
        fields: z.string().optional().describe("Comma-separated list of fields to include")
    })
    .merge(ShopifyPaginationSchema)
    .merge(ShopifyDateRangeSchema);

export type ListProductsParams = z.infer<typeof ListProductsSchema>;

export const GetProductSchema = z.object({
    product_id: ShopifyIdSchema.describe("The Shopify product ID"),
    fields: z.string().optional().describe("Comma-separated list of fields to include")
});

export type GetProductParams = z.infer<typeof GetProductSchema>;

export const ProductVariantSchema = z.object({
    option1: z.string().optional().describe("First variant option value"),
    option2: z.string().optional().describe("Second variant option value"),
    option3: z.string().optional().describe("Third variant option value"),
    price: z.string().optional().describe("Variant price"),
    compare_at_price: z.string().optional().describe("Compare at price"),
    sku: z.string().optional().describe("Stock keeping unit"),
    inventory_quantity: z.number().optional().describe("Inventory quantity"),
    weight: z.number().optional().describe("Weight in the shop's unit"),
    weight_unit: z.enum(["g", "kg", "oz", "lb"]).optional().describe("Weight unit")
});

export const ProductImageSchema = z.object({
    src: z.string().url().optional().describe("Image source URL"),
    alt: z.string().optional().describe("Alt text for the image"),
    position: z.number().optional().describe("Image position in the list")
});

export const CreateProductSchema = z.object({
    title: z.string().min(1).describe("Product title"),
    body_html: z.string().optional().describe("Product description in HTML"),
    vendor: z.string().optional().describe("Product vendor"),
    product_type: z.string().optional().describe("Product type"),
    tags: z.string().optional().describe("Comma-separated list of tags"),
    status: ShopifyProductStatusSchema.default("active"),
    variants: z.array(ProductVariantSchema).optional().describe("Product variants"),
    images: z.array(ProductImageSchema).optional().describe("Product images")
});

export type CreateProductParams = z.infer<typeof CreateProductSchema>;

export const UpdateProductSchema = z.object({
    product_id: ShopifyIdSchema.describe("The Shopify product ID"),
    title: z.string().optional().describe("Product title"),
    body_html: z.string().optional().describe("Product description in HTML"),
    vendor: z.string().optional().describe("Product vendor"),
    product_type: z.string().optional().describe("Product type"),
    tags: z.string().optional().describe("Comma-separated list of tags"),
    status: ShopifyProductStatusSchema
});

export type UpdateProductParams = z.infer<typeof UpdateProductSchema>;

export const DeleteProductSchema = z.object({
    product_id: ShopifyIdSchema.describe("The Shopify product ID to delete")
});

export type DeleteProductParams = z.infer<typeof DeleteProductSchema>;

// ==========================================
// Inventory Schemas
// ==========================================

export const ListInventoryLevelsSchema = z.object({
    inventory_item_ids: z.string().optional().describe("Comma-separated inventory item IDs"),
    location_ids: z.string().optional().describe("Comma-separated location IDs"),
    limit: z.number().min(1).max(250).default(50).describe("Maximum results"),
    updated_at_min: z.string().optional().describe("Show results updated after date (ISO 8601)")
});

export type ListInventoryLevelsParams = z.infer<typeof ListInventoryLevelsSchema>;

export const AdjustInventorySchema = z.object({
    inventory_item_id: ShopifyIdSchema.describe("The inventory item ID"),
    location_id: ShopifyIdSchema.describe("The location ID"),
    available_adjustment: z
        .number()
        .describe("Amount to adjust inventory by (positive or negative)")
});

export type AdjustInventoryParams = z.infer<typeof AdjustInventorySchema>;

export const SetInventorySchema = z.object({
    inventory_item_id: ShopifyIdSchema.describe("The inventory item ID"),
    location_id: ShopifyIdSchema.describe("The location ID"),
    available: z.number().min(0).describe("Absolute inventory quantity to set")
});

export type SetInventoryParams = z.infer<typeof SetInventorySchema>;

// ==========================================
// Customer Schemas
// ==========================================

export const ListCustomersSchema = z
    .object({
        ids: z.string().optional().describe("Comma-separated list of customer IDs"),
        fields: z.string().optional().describe("Comma-separated list of fields to include")
    })
    .merge(ShopifyPaginationSchema)
    .merge(ShopifyDateRangeSchema);

export type ListCustomersParams = z.infer<typeof ListCustomersSchema>;

export const GetCustomerSchema = z.object({
    customer_id: ShopifyIdSchema.describe("The Shopify customer ID"),
    fields: z.string().optional().describe("Comma-separated list of fields to include")
});

export type GetCustomerParams = z.infer<typeof GetCustomerSchema>;

export const SearchCustomersSchema = z.object({
    query: z.string().min(1).describe("Search query (email, name, etc.)")
});

export type SearchCustomersParams = z.infer<typeof SearchCustomersSchema>;

export const CustomerAddressSchema = z.object({
    address1: z.string().optional().describe("Street address"),
    address2: z.string().optional().describe("Apartment, suite, etc."),
    city: z.string().optional().describe("City"),
    province: z.string().optional().describe("Province/State"),
    country: z.string().optional().describe("Country"),
    zip: z.string().optional().describe("Postal/ZIP code"),
    phone: z.string().optional().describe("Phone number")
});

export const CreateCustomerSchema = z.object({
    email: z.string().email().optional().describe("Customer email"),
    first_name: z.string().optional().describe("First name"),
    last_name: z.string().optional().describe("Last name"),
    phone: z.string().optional().describe("Phone number"),
    tags: z.string().optional().describe("Comma-separated list of tags"),
    accepts_marketing: z.boolean().optional().describe("Whether customer accepts marketing"),
    addresses: z.array(CustomerAddressSchema).optional().describe("Customer addresses")
});

export type CreateCustomerParams = z.infer<typeof CreateCustomerSchema>;

export const UpdateCustomerSchema = z.object({
    customer_id: ShopifyIdSchema.describe("The Shopify customer ID"),
    email: z.string().email().optional().describe("Customer email"),
    first_name: z.string().optional().describe("First name"),
    last_name: z.string().optional().describe("Last name"),
    phone: z.string().optional().describe("Phone number"),
    tags: z.string().optional().describe("Comma-separated list of tags"),
    accepts_marketing: z.boolean().optional().describe("Whether customer accepts marketing")
});

export type UpdateCustomerParams = z.infer<typeof UpdateCustomerSchema>;

// ==========================================
// Webhook Schemas
// ==========================================

export const ShopifyWebhookTopicSchema = z.enum([
    "orders/create",
    "orders/updated",
    "orders/paid",
    "orders/fulfilled",
    "orders/cancelled",
    "orders/delete",
    "products/create",
    "products/update",
    "products/delete",
    "inventory_levels/update",
    "inventory_levels/connect",
    "customers/create",
    "customers/update",
    "customers/delete",
    "app/uninstalled",
    "shop/update"
]);

export const ListWebhooksSchema = z.object({
    address: z.string().url().optional().describe("Filter by webhook URL"),
    topic: ShopifyWebhookTopicSchema.optional().describe("Filter by webhook topic"),
    limit: z.number().min(1).max(250).default(50).describe("Maximum results"),
    since_id: z.string().optional().describe("Restrict results to after the specified ID")
});

export type ListWebhooksParams = z.infer<typeof ListWebhooksSchema>;

export const CreateWebhookSchema = z.object({
    topic: ShopifyWebhookTopicSchema.describe("Webhook event topic"),
    address: z.string().url().describe("HTTPS URL to receive webhook notifications"),
    format: z.enum(["json", "xml"]).default("json").describe("Webhook payload format")
});

export type CreateWebhookParams = z.infer<typeof CreateWebhookSchema>;

export const GetWebhookSchema = z.object({
    webhook_id: ShopifyIdSchema.describe("The webhook ID")
});

export type GetWebhookParams = z.infer<typeof GetWebhookSchema>;

export const DeleteWebhookSchema = z.object({
    webhook_id: ShopifyIdSchema.describe("The webhook ID to delete")
});

export type DeleteWebhookParams = z.infer<typeof DeleteWebhookSchema>;
