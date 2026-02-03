import { z } from "zod";

// ==========================================
// Common Schemas
// ==========================================

export const WooCommerceIdSchema = z.string().describe("WooCommerce resource ID");

export const WooCommercePaginationSchema = z.object({
    page: z.number().min(1).default(1).describe("Page number"),
    per_page: z.number().min(1).max(100).default(10).describe("Maximum number of results per page")
});

export const WooCommerceDateRangeSchema = z.object({
    after: z.string().optional().describe("Limit results to those after a given ISO8601 date"),
    before: z.string().optional().describe("Limit results to those before a given ISO8601 date")
});

// ==========================================
// Order Schemas
// ==========================================

export const WooCommerceOrderStatusSchema = z
    .enum([
        "pending",
        "processing",
        "on-hold",
        "completed",
        "cancelled",
        "refunded",
        "failed",
        "trash",
        "any"
    ])
    .optional()
    .describe("Filter orders by status");

export const ListOrdersSchema = z
    .object({
        status: WooCommerceOrderStatusSchema,
        customer: z
            .number()
            .optional()
            .describe("Limit results to orders for a specific customer ID"),
        product: z
            .number()
            .optional()
            .describe("Limit results to orders with a specific product ID"),
        order: z
            .enum(["asc", "desc"])
            .optional()
            .describe("Order sort attribute ascending or descending"),
        orderby: z
            .enum(["date", "id", "include", "title", "slug"])
            .optional()
            .describe("Sort collection by attribute")
    })
    .merge(WooCommercePaginationSchema)
    .merge(WooCommerceDateRangeSchema);

export type ListOrdersParams = z.infer<typeof ListOrdersSchema>;

export const GetOrderSchema = z.object({
    order_id: WooCommerceIdSchema.describe("The WooCommerce order ID")
});

export type GetOrderParams = z.infer<typeof GetOrderSchema>;

export const OrderLineItemSchema = z.object({
    product_id: z.number().optional().describe("Product ID"),
    variation_id: z.number().optional().describe("Variation ID"),
    quantity: z.number().optional().describe("Quantity ordered"),
    subtotal: z.string().optional().describe("Line subtotal"),
    total: z.string().optional().describe("Line total")
});

export const OrderAddressSchema = z.object({
    first_name: z.string().optional().describe("First name"),
    last_name: z.string().optional().describe("Last name"),
    company: z.string().optional().describe("Company name"),
    address_1: z.string().optional().describe("Address line 1"),
    address_2: z.string().optional().describe("Address line 2"),
    city: z.string().optional().describe("City"),
    state: z.string().optional().describe("State/County code"),
    postcode: z.string().optional().describe("Postal code"),
    country: z.string().optional().describe("Country code"),
    email: z.string().email().optional().describe("Email address"),
    phone: z.string().optional().describe("Phone number")
});

export const CreateOrderSchema = z.object({
    payment_method: z.string().optional().describe("Payment method ID"),
    payment_method_title: z.string().optional().describe("Payment method title"),
    set_paid: z.boolean().optional().describe("Define if the order is paid"),
    status: WooCommerceOrderStatusSchema,
    customer_id: z.number().optional().describe("Customer ID"),
    billing: OrderAddressSchema.optional().describe("Billing address"),
    shipping: OrderAddressSchema.optional().describe("Shipping address"),
    line_items: z.array(OrderLineItemSchema).optional().describe("Line items data")
});

export type CreateOrderParams = z.infer<typeof CreateOrderSchema>;

export const UpdateOrderSchema = z.object({
    order_id: WooCommerceIdSchema.describe("The WooCommerce order ID"),
    status: WooCommerceOrderStatusSchema,
    customer_note: z.string().optional().describe("Note left by customer during checkout"),
    billing: OrderAddressSchema.optional().describe("Billing address"),
    shipping: OrderAddressSchema.optional().describe("Shipping address")
});

export type UpdateOrderParams = z.infer<typeof UpdateOrderSchema>;

// ==========================================
// Product Schemas
// ==========================================

export const WooCommerceProductStatusSchema = z
    .enum(["draft", "pending", "private", "publish", "any"])
    .optional()
    .describe("Product status");

export const WooCommerceProductTypeSchema = z
    .enum(["simple", "grouped", "external", "variable"])
    .optional()
    .describe("Product type");

export const WooCommerceStockStatusSchema = z
    .enum(["instock", "outofstock", "onbackorder"])
    .optional()
    .describe("Stock status");

export const ListProductsSchema = z
    .object({
        status: WooCommerceProductStatusSchema,
        type: WooCommerceProductTypeSchema,
        category: z
            .number()
            .optional()
            .describe("Limit results to products in a specific category ID"),
        tag: z.number().optional().describe("Limit results to products with a specific tag ID"),
        sku: z.string().optional().describe("Limit results to products with a specific SKU"),
        stock_status: WooCommerceStockStatusSchema,
        on_sale: z.boolean().optional().describe("Limit results to products on sale"),
        order: z
            .enum(["asc", "desc"])
            .optional()
            .describe("Order sort attribute ascending or descending"),
        orderby: z
            .enum(["date", "id", "include", "title", "slug", "price", "popularity", "rating"])
            .optional()
            .describe("Sort collection by attribute")
    })
    .merge(WooCommercePaginationSchema);

export type ListProductsParams = z.infer<typeof ListProductsSchema>;

export const GetProductSchema = z.object({
    product_id: WooCommerceIdSchema.describe("The WooCommerce product ID")
});

export type GetProductParams = z.infer<typeof GetProductSchema>;

export const ProductImageSchema = z.object({
    src: z.string().url().optional().describe("Image URL"),
    name: z.string().optional().describe("Image name"),
    alt: z.string().optional().describe("Image alt text")
});

export const ProductAttributeSchema = z.object({
    name: z.string().describe("Attribute name"),
    position: z.number().optional().describe("Attribute position"),
    visible: z.boolean().optional().describe("Whether visible on product page"),
    variation: z.boolean().optional().describe("Whether used for variations"),
    options: z.array(z.string()).optional().describe("Attribute options/values")
});

export const CreateProductSchema = z.object({
    name: z.string().min(1).describe("Product name"),
    type: WooCommerceProductTypeSchema.default("simple"),
    status: WooCommerceProductStatusSchema.default("publish"),
    description: z.string().optional().describe("Product description"),
    short_description: z.string().optional().describe("Product short description"),
    sku: z.string().optional().describe("Stock keeping unit"),
    regular_price: z.string().optional().describe("Product regular price"),
    sale_price: z.string().optional().describe("Product sale price"),
    manage_stock: z.boolean().optional().describe("Stock management at product level"),
    stock_quantity: z.number().optional().describe("Stock quantity"),
    stock_status: WooCommerceStockStatusSchema,
    categories: z
        .array(z.object({ id: z.number() }))
        .optional()
        .describe("Product categories"),
    tags: z
        .array(z.object({ id: z.number() }))
        .optional()
        .describe("Product tags"),
    images: z.array(ProductImageSchema).optional().describe("Product images"),
    attributes: z.array(ProductAttributeSchema).optional().describe("Product attributes")
});

export type CreateProductParams = z.infer<typeof CreateProductSchema>;

export const UpdateProductSchema = z.object({
    product_id: WooCommerceIdSchema.describe("The WooCommerce product ID"),
    name: z.string().optional().describe("Product name"),
    status: WooCommerceProductStatusSchema,
    description: z.string().optional().describe("Product description"),
    short_description: z.string().optional().describe("Product short description"),
    sku: z.string().optional().describe("Stock keeping unit"),
    regular_price: z.string().optional().describe("Product regular price"),
    sale_price: z.string().optional().describe("Product sale price"),
    manage_stock: z.boolean().optional().describe("Stock management at product level"),
    stock_quantity: z.number().optional().describe("Stock quantity"),
    stock_status: WooCommerceStockStatusSchema
});

export type UpdateProductParams = z.infer<typeof UpdateProductSchema>;

// ==========================================
// Customer Schemas
// ==========================================

export const ListCustomersSchema = z
    .object({
        email: z
            .string()
            .email()
            .optional()
            .describe("Limit results to customers with a specific email"),
        role: z
            .enum([
                "all",
                "administrator",
                "editor",
                "author",
                "contributor",
                "subscriber",
                "customer"
            ])
            .optional()
            .describe("Limit results to customers with a specific role"),
        order: z
            .enum(["asc", "desc"])
            .optional()
            .describe("Order sort attribute ascending or descending"),
        orderby: z
            .enum(["id", "include", "name", "registered_date"])
            .optional()
            .describe("Sort collection by attribute")
    })
    .merge(WooCommercePaginationSchema);

export type ListCustomersParams = z.infer<typeof ListCustomersSchema>;

export const GetCustomerSchema = z.object({
    customer_id: WooCommerceIdSchema.describe("The WooCommerce customer ID")
});

export type GetCustomerParams = z.infer<typeof GetCustomerSchema>;

export const CustomerAddressSchema = z.object({
    first_name: z.string().optional().describe("First name"),
    last_name: z.string().optional().describe("Last name"),
    company: z.string().optional().describe("Company name"),
    address_1: z.string().optional().describe("Address line 1"),
    address_2: z.string().optional().describe("Address line 2"),
    city: z.string().optional().describe("City"),
    state: z.string().optional().describe("State/County code"),
    postcode: z.string().optional().describe("Postal code"),
    country: z.string().optional().describe("Country code"),
    email: z.string().email().optional().describe("Email address"),
    phone: z.string().optional().describe("Phone number")
});

export const CreateCustomerSchema = z.object({
    email: z.string().email().describe("Customer email address"),
    first_name: z.string().optional().describe("Customer first name"),
    last_name: z.string().optional().describe("Customer last name"),
    username: z.string().optional().describe("Customer login username"),
    password: z.string().optional().describe("Customer password"),
    billing: CustomerAddressSchema.optional().describe("Billing address"),
    shipping: CustomerAddressSchema.optional().describe("Shipping address")
});

export type CreateCustomerParams = z.infer<typeof CreateCustomerSchema>;

export const UpdateCustomerSchema = z.object({
    customer_id: WooCommerceIdSchema.describe("The WooCommerce customer ID"),
    email: z.string().email().optional().describe("Customer email address"),
    first_name: z.string().optional().describe("Customer first name"),
    last_name: z.string().optional().describe("Customer last name"),
    billing: CustomerAddressSchema.optional().describe("Billing address"),
    shipping: CustomerAddressSchema.optional().describe("Shipping address")
});

export type UpdateCustomerParams = z.infer<typeof UpdateCustomerSchema>;

// ==========================================
// Inventory Schemas
// ==========================================

export const UpdateInventorySchema = z.object({
    product_id: WooCommerceIdSchema.describe("The WooCommerce product ID"),
    stock_quantity: z.number().describe("New stock quantity"),
    stock_status: WooCommerceStockStatusSchema
});

export type UpdateInventoryParams = z.infer<typeof UpdateInventorySchema>;

// ==========================================
// Webhook Schemas
// ==========================================

export const WooCommerceWebhookTopicSchema = z.enum([
    "order.created",
    "order.updated",
    "order.deleted",
    "order.restored",
    "product.created",
    "product.updated",
    "product.deleted",
    "product.restored",
    "customer.created",
    "customer.updated",
    "customer.deleted"
]);

export const ListWebhooksSchema = z.object({
    status: z
        .enum(["active", "paused", "disabled"])
        .optional()
        .describe("Limit results to webhooks with a specific status"),
    per_page: z.number().min(1).max(100).default(10).describe("Maximum number of results per page"),
    page: z.number().min(1).default(1).describe("Page number")
});

export type ListWebhooksParams = z.infer<typeof ListWebhooksSchema>;

export const CreateWebhookSchema = z.object({
    name: z.string().optional().describe("A friendly name for the webhook"),
    topic: WooCommerceWebhookTopicSchema.describe("Webhook topic (event to subscribe to)"),
    delivery_url: z.string().url().describe("Webhook delivery URL"),
    secret: z.string().optional().describe("Secret key used to generate HMAC-SHA256 signature"),
    status: z.enum(["active", "paused", "disabled"]).default("active").describe("Webhook status")
});

export type CreateWebhookParams = z.infer<typeof CreateWebhookSchema>;

export const DeleteWebhookSchema = z.object({
    webhook_id: WooCommerceIdSchema.describe("The webhook ID to delete"),
    force: z.boolean().default(true).describe("Required to be true to permanently delete")
});

export type DeleteWebhookParams = z.infer<typeof DeleteWebhookSchema>;
