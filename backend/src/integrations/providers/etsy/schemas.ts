import { z } from "zod";

// ==========================================
// Common Schemas
// ==========================================

export const EtsyIdSchema = z.string().describe("Etsy resource ID");

export const EtsyPaginationSchema = z.object({
    limit: z.number().min(1).max(100).default(25).describe("Maximum number of results to return"),
    offset: z.number().min(0).default(0).describe("Number of results to skip")
});

// ==========================================
// Listing Schemas
// ==========================================

export const EtsyListingStateSchema = z
    .enum(["active", "inactive", "draft", "expired", "sold_out", "removed"])
    .optional()
    .describe("Listing state filter");

export const ListListingsSchema = z
    .object({
        shop_id: EtsyIdSchema.describe("The Etsy shop ID"),
        state: EtsyListingStateSchema
    })
    .merge(EtsyPaginationSchema);

export type ListListingsParams = z.infer<typeof ListListingsSchema>;

export const GetListingSchema = z.object({
    listing_id: EtsyIdSchema.describe("The Etsy listing ID"),
    includes: z
        .array(z.enum(["Images", "Shop", "User", "Translations", "Inventory", "Videos"]))
        .optional()
        .describe("Additional resources to include")
});

export type GetListingParams = z.infer<typeof GetListingSchema>;

export const EtsyWhoMadeSchema = z.enum(["i_did", "someone_else", "collective"]);
export const EtsyWhenMadeSchema = z.enum([
    "made_to_order",
    "2020_2024",
    "2010_2019",
    "2005_2009",
    "before_2005",
    "2000_2004",
    "1990s",
    "1980s",
    "1970s",
    "1960s",
    "1950s",
    "1940s",
    "1930s",
    "1920s",
    "1910s",
    "1900s",
    "1800s",
    "1700s",
    "before_1700"
]);

export const CreateListingSchema = z.object({
    shop_id: EtsyIdSchema.describe("The Etsy shop ID"),
    quantity: z.number().min(0).describe("Number of items available"),
    title: z.string().min(1).max(140).describe("Listing title"),
    description: z.string().describe("Listing description"),
    price: z.number().min(0.2).describe("Price amount"),
    who_made: EtsyWhoMadeSchema.describe("Who made this item"),
    when_made: EtsyWhenMadeSchema.describe("When was this item made"),
    taxonomy_id: z.number().describe("Etsy taxonomy/category ID"),
    shipping_profile_id: z.number().optional().describe("Shipping profile ID"),
    return_policy_id: z.number().optional().describe("Return policy ID"),
    materials: z.array(z.string()).optional().describe("List of materials used"),
    shop_section_id: z.number().optional().describe("Shop section ID"),
    processing_min: z.number().optional().describe("Minimum processing days"),
    processing_max: z.number().optional().describe("Maximum processing days"),
    tags: z.array(z.string()).max(13).optional().describe("Tags for the listing (max 13)"),
    styles: z.array(z.string()).max(2).optional().describe("Styles for the listing (max 2)"),
    item_weight: z.number().optional().describe("Item weight"),
    item_weight_unit: z.enum(["oz", "lb", "g", "kg"]).optional().describe("Weight unit"),
    item_length: z.number().optional().describe("Item length"),
    item_width: z.number().optional().describe("Item width"),
    item_height: z.number().optional().describe("Item height"),
    item_dimensions_unit: z
        .enum(["in", "ft", "mm", "cm", "m"])
        .optional()
        .describe("Dimension unit"),
    is_personalizable: z.boolean().optional().describe("Whether item can be personalized"),
    personalization_is_required: z
        .boolean()
        .optional()
        .describe("Whether personalization is required"),
    personalization_char_count_max: z
        .number()
        .optional()
        .describe("Max personalization characters"),
    personalization_instructions: z.string().optional().describe("Personalization instructions"),
    is_supply: z.boolean().optional().describe("Whether this is a supply item"),
    is_customizable: z.boolean().optional().describe("Whether this item is customizable")
});

export type CreateListingParams = z.infer<typeof CreateListingSchema>;

export const UpdateListingSchema = z.object({
    shop_id: EtsyIdSchema.describe("The Etsy shop ID"),
    listing_id: EtsyIdSchema.describe("The Etsy listing ID"),
    quantity: z.number().min(0).optional().describe("Number of items available"),
    title: z.string().min(1).max(140).optional().describe("Listing title"),
    description: z.string().optional().describe("Listing description"),
    price: z.number().min(0.2).optional().describe("Price amount"),
    who_made: EtsyWhoMadeSchema.optional().describe("Who made this item"),
    when_made: EtsyWhenMadeSchema.optional().describe("When was this item made"),
    taxonomy_id: z.number().optional().describe("Etsy taxonomy/category ID"),
    tags: z.array(z.string()).max(13).optional().describe("Tags for the listing (max 13)"),
    materials: z.array(z.string()).optional().describe("List of materials used"),
    shop_section_id: z.number().optional().describe("Shop section ID"),
    processing_min: z.number().optional().describe("Minimum processing days"),
    processing_max: z.number().optional().describe("Maximum processing days"),
    state: z.enum(["active", "inactive", "draft"]).optional().describe("Listing state")
});

export type UpdateListingParams = z.infer<typeof UpdateListingSchema>;

export const DeleteListingSchema = z.object({
    shop_id: EtsyIdSchema.describe("The Etsy shop ID"),
    listing_id: EtsyIdSchema.describe("The Etsy listing ID to delete")
});

export type DeleteListingParams = z.infer<typeof DeleteListingSchema>;

// ==========================================
// Inventory Schemas
// ==========================================

export const GetListingInventorySchema = z.object({
    listing_id: EtsyIdSchema.describe("The Etsy listing ID")
});

export type GetListingInventoryParams = z.infer<typeof GetListingInventorySchema>;

export const InventoryProductSchema = z.object({
    sku: z.string().optional().describe("Product SKU"),
    property_values: z
        .array(
            z.object({
                property_id: z.number(),
                property_name: z.string().optional(),
                scale_id: z.number().nullable().optional(),
                scale_name: z.string().nullable().optional(),
                value_ids: z.array(z.number()),
                values: z.array(z.string())
            })
        )
        .optional()
        .describe("Variation property values"),
    offerings: z
        .array(
            z.object({
                price: z.number().describe("Price amount"),
                quantity: z.number().describe("Available quantity"),
                is_enabled: z.boolean().describe("Whether this offering is enabled")
            })
        )
        .describe("Product offerings with price and quantity")
});

export const UpdateListingInventorySchema = z.object({
    listing_id: EtsyIdSchema.describe("The Etsy listing ID"),
    products: z.array(InventoryProductSchema).describe("List of products/variants with inventory"),
    price_on_property: z.array(z.number()).optional().describe("Property IDs that affect price"),
    quantity_on_property: z
        .array(z.number())
        .optional()
        .describe("Property IDs that affect quantity"),
    sku_on_property: z.array(z.number()).optional().describe("Property IDs that affect SKU")
});

export type UpdateListingInventoryParams = z.infer<typeof UpdateListingInventorySchema>;

// ==========================================
// Receipt (Order) Schemas
// ==========================================

export const ListReceiptsSchema = z
    .object({
        shop_id: EtsyIdSchema.describe("The Etsy shop ID"),
        min_created: z.number().optional().describe("Minimum created timestamp (epoch seconds)"),
        max_created: z.number().optional().describe("Maximum created timestamp (epoch seconds)"),
        min_last_modified: z.number().optional().describe("Minimum last modified timestamp"),
        max_last_modified: z.number().optional().describe("Maximum last modified timestamp"),
        was_paid: z.boolean().optional().describe("Filter by payment status"),
        was_shipped: z.boolean().optional().describe("Filter by shipped status"),
        was_delivered: z.boolean().optional().describe("Filter by delivery status")
    })
    .merge(EtsyPaginationSchema);

export type ListReceiptsParams = z.infer<typeof ListReceiptsSchema>;

export const GetReceiptSchema = z.object({
    shop_id: EtsyIdSchema.describe("The Etsy shop ID"),
    receipt_id: EtsyIdSchema.describe("The Etsy receipt ID")
});

export type GetReceiptParams = z.infer<typeof GetReceiptSchema>;

export const CreateReceiptShipmentSchema = z.object({
    shop_id: EtsyIdSchema.describe("The Etsy shop ID"),
    receipt_id: EtsyIdSchema.describe("The Etsy receipt ID"),
    tracking_code: z.string().optional().describe("Shipment tracking code"),
    carrier_name: z.string().optional().describe("Shipping carrier name"),
    send_bcc: z.boolean().optional().describe("Send BCC to shop owner"),
    note_to_buyer: z.string().optional().describe("Note to include in shipping notification")
});

export type CreateReceiptShipmentParams = z.infer<typeof CreateReceiptShipmentSchema>;

// ==========================================
// Shop Schemas
// ==========================================

export const GetShopSchema = z.object({
    shop_id: EtsyIdSchema.describe("The Etsy shop ID")
});

export type GetShopParams = z.infer<typeof GetShopSchema>;
