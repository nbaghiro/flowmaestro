import { z } from "zod";

// ==========================================
// Common Schemas
// ==========================================

export const BigCommerceIdSchema = z
    .union([z.string(), z.number()])
    .describe("BigCommerce resource ID");

export const BigCommercePaginationSchema = z.object({
    page: z.number().min(1).default(1).describe("Page number"),
    limit: z.number().min(1).max(250).default(50).describe("Maximum number of results per page")
});

// ==========================================
// Order Schemas (V2 API)
// ==========================================

export const BigCommerceOrderStatusSchema = z
    .number()
    .optional()
    .describe(
        "Order status ID (0=Incomplete, 1=Pending, 2=Shipped, 3=Partially Shipped, 4=Refunded, 5=Cancelled, 6=Declined, 7=Awaiting Payment, 8=Awaiting Pickup, 9=Awaiting Shipment, 10=Completed, 11=Awaiting Fulfillment, 12=Manual Verification Required, 13=Disputed, 14=Partially Refunded)"
    );

export const ListOrdersSchema = z
    .object({
        status_id: BigCommerceOrderStatusSchema,
        customer_id: z.number().optional().describe("Filter by customer ID"),
        min_date_created: z
            .string()
            .optional()
            .describe("Filter orders created after date (RFC 2822)"),
        max_date_created: z
            .string()
            .optional()
            .describe("Filter orders created before date (RFC 2822)"),
        min_date_modified: z
            .string()
            .optional()
            .describe("Filter orders modified after date (RFC 2822)"),
        max_date_modified: z
            .string()
            .optional()
            .describe("Filter orders modified before date (RFC 2822)"),
        min_total: z.number().optional().describe("Minimum order total"),
        max_total: z.number().optional().describe("Maximum order total"),
        is_deleted: z.boolean().optional().describe("Filter deleted orders"),
        sort: z
            .enum([
                "id",
                "customer_id",
                "date_created",
                "date_modified",
                "status_id",
                "total_inc_tax"
            ])
            .optional()
            .describe("Field to sort by")
    })
    .merge(BigCommercePaginationSchema);

export type ListOrdersParams = z.infer<typeof ListOrdersSchema>;

export const GetOrderSchema = z.object({
    order_id: BigCommerceIdSchema.describe("The BigCommerce order ID")
});

export type GetOrderParams = z.infer<typeof GetOrderSchema>;

export const OrderProductSchema = z.object({
    product_id: z.number().describe("Product ID"),
    quantity: z.number().describe("Quantity ordered"),
    price_inc_tax: z.number().optional().describe("Price including tax"),
    price_ex_tax: z.number().optional().describe("Price excluding tax")
});

export const OrderAddressSchema = z.object({
    first_name: z.string().optional().describe("First name"),
    last_name: z.string().optional().describe("Last name"),
    company: z.string().optional().describe("Company name"),
    street_1: z.string().optional().describe("Street address line 1"),
    street_2: z.string().optional().describe("Street address line 2"),
    city: z.string().optional().describe("City"),
    state: z.string().optional().describe("State/Province"),
    zip: z.string().optional().describe("Postal/ZIP code"),
    country: z.string().optional().describe("Country"),
    country_iso2: z.string().optional().describe("Country ISO2 code"),
    phone: z.string().optional().describe("Phone number"),
    email: z.string().email().optional().describe("Email address")
});

export const CreateOrderSchema = z.object({
    customer_id: z.number().optional().describe("Customer ID (0 for guest)"),
    status_id: z.number().optional().describe("Order status ID"),
    billing_address: OrderAddressSchema.optional().describe("Billing address"),
    shipping_addresses: z.array(OrderAddressSchema).optional().describe("Shipping addresses"),
    products: z.array(OrderProductSchema).optional().describe("Order products"),
    staff_notes: z.string().optional().describe("Staff notes"),
    customer_message: z.string().optional().describe("Customer message")
});

export type CreateOrderParams = z.infer<typeof CreateOrderSchema>;

export const UpdateOrderSchema = z.object({
    order_id: BigCommerceIdSchema.describe("The BigCommerce order ID"),
    status_id: z.number().optional().describe("Order status ID"),
    staff_notes: z.string().optional().describe("Staff notes"),
    customer_message: z.string().optional().describe("Customer message")
});

export type UpdateOrderParams = z.infer<typeof UpdateOrderSchema>;

// ==========================================
// Product Schemas (V3 Catalog API)
// ==========================================

export const ListProductsSchema = z
    .object({
        name: z.string().optional().describe("Filter by product name"),
        sku: z.string().optional().describe("Filter by SKU"),
        is_visible: z.boolean().optional().describe("Filter by visibility"),
        is_featured: z.boolean().optional().describe("Filter featured products"),
        type: z.enum(["physical", "digital"]).optional().describe("Filter by product type"),
        categories: z.number().optional().describe("Filter by category ID"),
        brand_id: z.number().optional().describe("Filter by brand ID"),
        availability: z
            .enum(["available", "disabled", "preorder"])
            .optional()
            .describe("Filter by availability"),
        include_fields: z.string().optional().describe("Fields to include (comma-separated)"),
        sort: z
            .enum([
                "id",
                "name",
                "sku",
                "price",
                "date_modified",
                "date_last_imported",
                "inventory_level",
                "is_visible",
                "total_sold"
            ])
            .optional()
            .describe("Sort field"),
        direction: z.enum(["asc", "desc"]).optional().describe("Sort direction")
    })
    .merge(BigCommercePaginationSchema);

export type ListProductsParams = z.infer<typeof ListProductsSchema>;

export const GetProductSchema = z.object({
    product_id: BigCommerceIdSchema.describe("The BigCommerce product ID"),
    include_fields: z.string().optional().describe("Fields to include (comma-separated)")
});

export type GetProductParams = z.infer<typeof GetProductSchema>;

export const ProductVariantSchema = z.object({
    sku: z.string().optional().describe("Variant SKU"),
    price: z.number().optional().describe("Variant price"),
    cost_price: z.number().optional().describe("Cost price"),
    retail_price: z.number().optional().describe("Retail price"),
    sale_price: z.number().optional().describe("Sale price"),
    weight: z.number().optional().describe("Weight"),
    inventory_level: z.number().optional().describe("Inventory level"),
    option_values: z
        .array(
            z.object({
                option_display_name: z.string(),
                label: z.string()
            })
        )
        .optional()
        .describe("Option values")
});

export const CreateProductSchema = z.object({
    name: z.string().min(1).describe("Product name"),
    type: z.enum(["physical", "digital"]).default("physical").describe("Product type"),
    sku: z.string().optional().describe("Product SKU"),
    description: z.string().optional().describe("Product description"),
    price: z.number().describe("Product price"),
    cost_price: z.number().optional().describe("Cost price"),
    retail_price: z.number().optional().describe("Retail price"),
    sale_price: z.number().optional().describe("Sale price"),
    weight: z.number().default(0).describe("Product weight"),
    categories: z.array(z.number()).optional().describe("Category IDs"),
    brand_id: z.number().optional().describe("Brand ID"),
    inventory_level: z.number().optional().describe("Inventory level"),
    inventory_tracking: z
        .enum(["none", "product", "variant"])
        .optional()
        .describe("Inventory tracking type"),
    is_visible: z.boolean().optional().describe("Whether product is visible"),
    variants: z.array(ProductVariantSchema).optional().describe("Product variants")
});

export type CreateProductParams = z.infer<typeof CreateProductSchema>;

export const UpdateProductSchema = z.object({
    product_id: BigCommerceIdSchema.describe("The BigCommerce product ID"),
    name: z.string().optional().describe("Product name"),
    sku: z.string().optional().describe("Product SKU"),
    description: z.string().optional().describe("Product description"),
    price: z.number().optional().describe("Product price"),
    cost_price: z.number().optional().describe("Cost price"),
    retail_price: z.number().optional().describe("Retail price"),
    sale_price: z.number().optional().describe("Sale price"),
    weight: z.number().optional().describe("Product weight"),
    categories: z.array(z.number()).optional().describe("Category IDs"),
    inventory_level: z.number().optional().describe("Inventory level"),
    is_visible: z.boolean().optional().describe("Whether product is visible")
});

export type UpdateProductParams = z.infer<typeof UpdateProductSchema>;

// ==========================================
// Customer Schemas (V3 API)
// ==========================================

export const ListCustomersSchema = z
    .object({
        email: z.string().email().optional().describe("Filter by email address"),
        name: z.string().optional().describe("Filter by name"),
        company: z.string().optional().describe("Filter by company"),
        customer_group_id: z.number().optional().describe("Filter by customer group"),
        date_created: z.string().optional().describe("Filter by creation date"),
        date_modified: z.string().optional().describe("Filter by modification date"),
        include: z
            .string()
            .optional()
            .describe("Sub-resources to include (addresses, storecredit, attributes)"),
        sort: z
            .enum(["id", "last_name", "date_created", "date_modified", "company"])
            .optional()
            .describe("Sort field")
    })
    .merge(BigCommercePaginationSchema);

export type ListCustomersParams = z.infer<typeof ListCustomersSchema>;

export const GetCustomerSchema = z.object({
    customer_id: BigCommerceIdSchema.describe("The BigCommerce customer ID"),
    include: z
        .string()
        .optional()
        .describe("Sub-resources to include (addresses, storecredit, attributes)")
});

export type GetCustomerParams = z.infer<typeof GetCustomerSchema>;

export const CustomerAddressSchema = z.object({
    first_name: z.string().optional().describe("First name"),
    last_name: z.string().optional().describe("Last name"),
    company: z.string().optional().describe("Company"),
    address1: z.string().optional().describe("Address line 1"),
    address2: z.string().optional().describe("Address line 2"),
    city: z.string().optional().describe("City"),
    state_or_province: z.string().optional().describe("State or province"),
    postal_code: z.string().optional().describe("Postal code"),
    country_code: z.string().optional().describe("Country code (ISO Alpha-2)"),
    phone: z.string().optional().describe("Phone number"),
    address_type: z.enum(["residential", "commercial"]).optional().describe("Address type")
});

export const CreateCustomerSchema = z.object({
    email: z.string().email().describe("Customer email address"),
    first_name: z.string().describe("First name"),
    last_name: z.string().describe("Last name"),
    company: z.string().optional().describe("Company name"),
    phone: z.string().optional().describe("Phone number"),
    addresses: z.array(CustomerAddressSchema).optional().describe("Customer addresses"),
    customer_group_id: z.number().optional().describe("Customer group ID")
});

export type CreateCustomerParams = z.infer<typeof CreateCustomerSchema>;

export const UpdateCustomerSchema = z.object({
    customer_id: BigCommerceIdSchema.describe("The BigCommerce customer ID"),
    email: z.string().email().optional().describe("Customer email address"),
    first_name: z.string().optional().describe("First name"),
    last_name: z.string().optional().describe("Last name"),
    company: z.string().optional().describe("Company name"),
    phone: z.string().optional().describe("Phone number"),
    customer_group_id: z.number().optional().describe("Customer group ID")
});

export type UpdateCustomerParams = z.infer<typeof UpdateCustomerSchema>;

// ==========================================
// Inventory Schemas (V3 API)
// ==========================================

export const GetInventorySchema = z.object({
    product_id: BigCommerceIdSchema.describe("The BigCommerce product ID")
});

export type GetInventoryParams = z.infer<typeof GetInventorySchema>;

export const UpdateInventorySchema = z.object({
    product_id: BigCommerceIdSchema.describe("The BigCommerce product ID"),
    variant_id: z.number().optional().describe("Variant ID (required for products with variants)"),
    inventory_level: z.number().describe("New inventory level")
});

export type UpdateInventoryParams = z.infer<typeof UpdateInventorySchema>;

// ==========================================
// Webhook Schemas (V3 API)
// ==========================================

export const BigCommerceWebhookScopeSchema = z.enum([
    "store/order/created",
    "store/order/updated",
    "store/order/archived",
    "store/order/statusUpdated",
    "store/order/message/created",
    "store/product/created",
    "store/product/updated",
    "store/product/deleted",
    "store/product/inventory/updated",
    "store/product/inventory/order/updated",
    "store/customer/created",
    "store/customer/updated",
    "store/customer/deleted",
    "store/customer/address/created",
    "store/customer/address/updated",
    "store/customer/address/deleted",
    "store/cart/created",
    "store/cart/updated",
    "store/cart/deleted",
    "store/cart/converted"
]);

export const ListWebhooksSchema = z.object({
    page: z.number().min(1).default(1).describe("Page number"),
    limit: z.number().min(1).max(250).default(50).describe("Results per page"),
    scope: BigCommerceWebhookScopeSchema.optional().describe("Filter by scope"),
    is_active: z.boolean().optional().describe("Filter by active status")
});

export type ListWebhooksParams = z.infer<typeof ListWebhooksSchema>;

export const CreateWebhookSchema = z.object({
    scope: BigCommerceWebhookScopeSchema.describe("Webhook scope (event type)"),
    destination: z.string().url().describe("Webhook destination URL"),
    is_active: z.boolean().default(true).describe("Whether webhook is active"),
    headers: z.record(z.string()).optional().describe("Custom headers to include")
});

export type CreateWebhookParams = z.infer<typeof CreateWebhookSchema>;

export const DeleteWebhookSchema = z.object({
    webhook_id: BigCommerceIdSchema.describe("The webhook ID to delete")
});

export type DeleteWebhookParams = z.infer<typeof DeleteWebhookSchema>;
