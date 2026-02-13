import { z } from "zod";

// ==========================================
// Common Schemas
// ==========================================

export const MagentoIdSchema = z.string().describe("Magento resource ID");

export const MagentoSkuSchema = z.string().min(1).describe("Product SKU");

export const MagentoPaginationSchema = z.object({
    page: z.number().min(1).default(1).describe("Page number (1-indexed)"),
    pageSize: z.number().min(1).max(300).default(20).describe("Number of items per page (max 300)")
});

// ==========================================
// Product Schemas
// ==========================================

export const ListProductsSchema = z
    .object({
        status: z.enum(["1", "2"]).optional().describe("Product status: 1=Enabled, 2=Disabled"),
        type_id: z
            .enum(["simple", "configurable", "grouped", "bundle", "virtual", "downloadable"])
            .optional()
            .describe("Product type"),
        name: z.string().optional().describe("Filter by product name (contains)"),
        sku: z.string().optional().describe("Filter by SKU (contains)")
    })
    .merge(MagentoPaginationSchema);

export type ListProductsParams = z.infer<typeof ListProductsSchema>;

export const GetProductSchema = z.object({
    sku: MagentoSkuSchema.describe("The product SKU to retrieve")
});

export type GetProductParams = z.infer<typeof GetProductSchema>;

export const CreateProductSchema = z.object({
    sku: MagentoSkuSchema.describe("Unique product SKU"),
    name: z.string().min(1).describe("Product name"),
    price: z.number().min(0).describe("Product price"),
    attribute_set_id: z.number().default(4).describe("Attribute set ID (default 4 for Default)"),
    type_id: z
        .enum(["simple", "configurable", "grouped", "bundle", "virtual", "downloadable"])
        .default("simple")
        .describe("Product type"),
    status: z.enum(["1", "2"]).default("1").describe("Product status: 1=Enabled, 2=Disabled"),
    visibility: z
        .enum(["1", "2", "3", "4"])
        .default("4")
        .describe("Visibility: 1=Not Visible, 2=Catalog, 3=Search, 4=Both"),
    weight: z.number().optional().describe("Product weight"),
    description: z.string().optional().describe("Full product description"),
    short_description: z.string().optional().describe("Short description"),
    meta_title: z.string().optional().describe("Meta title for SEO"),
    meta_description: z.string().optional().describe("Meta description for SEO")
});

export type CreateProductParams = z.infer<typeof CreateProductSchema>;

export const UpdateProductSchema = z.object({
    sku: MagentoSkuSchema.describe("Product SKU to update"),
    name: z.string().optional().describe("Product name"),
    price: z.number().min(0).optional().describe("Product price"),
    status: z.enum(["1", "2"]).optional().describe("Product status: 1=Enabled, 2=Disabled"),
    visibility: z
        .enum(["1", "2", "3", "4"])
        .optional()
        .describe("Visibility: 1=Not Visible, 2=Catalog, 3=Search, 4=Both"),
    weight: z.number().optional().describe("Product weight"),
    description: z.string().optional().describe("Full product description"),
    short_description: z.string().optional().describe("Short description")
});

export type UpdateProductParams = z.infer<typeof UpdateProductSchema>;

// ==========================================
// Order Schemas
// ==========================================

export const ListOrdersSchema = z
    .object({
        status: z
            .enum(["pending", "processing", "complete", "holded", "canceled", "closed"])
            .optional()
            .describe("Filter by order status"),
        customer_email: z.string().email().optional().describe("Filter by customer email"),
        created_at_from: z
            .string()
            .optional()
            .describe("Filter orders created after this date (YYYY-MM-DD)"),
        created_at_to: z
            .string()
            .optional()
            .describe("Filter orders created before this date (YYYY-MM-DD)")
    })
    .merge(MagentoPaginationSchema);

export type ListOrdersParams = z.infer<typeof ListOrdersSchema>;

export const GetOrderSchema = z.object({
    order_id: MagentoIdSchema.describe("The order entity ID")
});

export type GetOrderParams = z.infer<typeof GetOrderSchema>;

export const UpdateOrderStatusSchema = z.object({
    order_id: MagentoIdSchema.describe("The order entity ID"),
    status: z
        .enum(["pending", "processing", "complete", "holded", "canceled", "closed"])
        .describe("New order status"),
    comment: z.string().optional().describe("Comment to add to the order"),
    notify_customer: z.boolean().default(false).describe("Whether to notify the customer by email")
});

export type UpdateOrderStatusParams = z.infer<typeof UpdateOrderStatusSchema>;

// ==========================================
// Customer Schemas
// ==========================================

export const ListCustomersSchema = z
    .object({
        email: z.string().optional().describe("Filter by email (contains)"),
        firstname: z.string().optional().describe("Filter by first name (contains)"),
        lastname: z.string().optional().describe("Filter by last name (contains)"),
        group_id: z.number().optional().describe("Filter by customer group ID")
    })
    .merge(MagentoPaginationSchema);

export type ListCustomersParams = z.infer<typeof ListCustomersSchema>;

export const GetCustomerSchema = z.object({
    customer_id: MagentoIdSchema.describe("The customer entity ID")
});

export type GetCustomerParams = z.infer<typeof GetCustomerSchema>;

export const CreateCustomerSchema = z.object({
    email: z.string().email().describe("Customer email address"),
    firstname: z.string().min(1).describe("Customer first name"),
    lastname: z.string().min(1).describe("Customer last name"),
    group_id: z.number().default(1).describe("Customer group ID (1=General)"),
    website_id: z.number().default(1).describe("Website ID"),
    store_id: z.number().default(1).describe("Store ID"),
    prefix: z.string().optional().describe("Name prefix"),
    middlename: z.string().optional().describe("Middle name"),
    suffix: z.string().optional().describe("Name suffix"),
    dob: z.string().optional().describe("Date of birth (YYYY-MM-DD)"),
    gender: z.enum(["1", "2"]).optional().describe("Gender: 1=Male, 2=Female"),
    taxvat: z.string().optional().describe("Tax/VAT number")
});

export type CreateCustomerParams = z.infer<typeof CreateCustomerSchema>;

// ==========================================
// Inventory Schemas
// ==========================================

export const GetInventorySchema = z.object({
    sku: MagentoSkuSchema.describe("Product SKU")
});

export type GetInventoryParams = z.infer<typeof GetInventorySchema>;

export const UpdateInventorySchema = z.object({
    sku: MagentoSkuSchema.describe("Product SKU"),
    quantity: z.number().int().describe("New stock quantity"),
    is_in_stock: z.boolean().default(true).describe("Whether the product is in stock"),
    source_code: z.string().default("default").describe("Inventory source code")
});

export type UpdateInventoryParams = z.infer<typeof UpdateInventorySchema>;

// ==========================================
// Category Schemas
// ==========================================

export const ListCategoriesSchema = z.object({
    root_category_id: z
        .number()
        .optional()
        .describe("Root category ID to start from (default: store root)"),
    depth: z.number().min(1).max(10).optional().describe("Maximum depth to retrieve")
});

export type ListCategoriesParams = z.infer<typeof ListCategoriesSchema>;
