import { z } from "zod";

// ==========================================
// Common Schemas
// ==========================================

export const ShipStationIdSchema = z.number().int().positive().describe("ShipStation resource ID");

export const ShipStationPaginationSchema = z.object({
    page: z.number().min(1).default(1).describe("Page number (1-indexed)"),
    pageSize: z.number().min(1).max(500).default(100).describe("Results per page (max 500)")
});

export const ShipStationAddressSchema = z.object({
    name: z.string().min(1).describe("Full name"),
    company: z.string().optional().describe("Company name"),
    street1: z.string().min(1).describe("Street address line 1"),
    street2: z.string().optional().describe("Street address line 2"),
    street3: z.string().optional().describe("Street address line 3"),
    city: z.string().min(1).describe("City"),
    state: z.string().min(1).describe("State/Province code"),
    postalCode: z.string().min(1).describe("Postal/ZIP code"),
    country: z.string().length(2).describe("Country code (ISO 2-letter)"),
    phone: z.string().optional().describe("Phone number"),
    residential: z.boolean().optional().describe("Is this a residential address?")
});

export const ShipStationWeightSchema = z.object({
    value: z.number().positive().describe("Weight value"),
    units: z.enum(["pounds", "ounces", "grams"]).default("pounds").describe("Weight unit")
});

export const ShipStationDimensionsSchema = z.object({
    length: z.number().positive().describe("Length"),
    width: z.number().positive().describe("Width"),
    height: z.number().positive().describe("Height"),
    units: z.enum(["inches", "centimeters"]).default("inches").describe("Dimension unit")
});

// ==========================================
// Order Schemas
// ==========================================

export const ListOrdersSchema = z
    .object({
        customerName: z.string().optional().describe("Filter by customer name"),
        orderNumber: z.string().optional().describe("Filter by order number"),
        orderStatus: z
            .enum([
                "awaiting_payment",
                "awaiting_shipment",
                "pending_fulfillment",
                "shipped",
                "on_hold",
                "cancelled"
            ])
            .optional()
            .describe("Filter by order status"),
        storeId: z.number().optional().describe("Filter by store ID"),
        sortBy: z.enum(["OrderDate", "ModifyDate", "CreateDate"]).optional().describe("Sort field"),
        sortDir: z.enum(["ASC", "DESC"]).default("DESC").describe("Sort direction"),
        createDateStart: z.string().optional().describe("Filter by creation date start (ISO 8601)"),
        createDateEnd: z.string().optional().describe("Filter by creation date end (ISO 8601)"),
        modifyDateStart: z.string().optional().describe("Filter by modification date start"),
        modifyDateEnd: z.string().optional().describe("Filter by modification date end")
    })
    .merge(ShipStationPaginationSchema);

export type ListOrdersParams = z.infer<typeof ListOrdersSchema>;

export const GetOrderSchema = z.object({
    orderId: ShipStationIdSchema.describe("The order ID")
});

export type GetOrderParams = z.infer<typeof GetOrderSchema>;

export const CreateOrderSchema = z.object({
    orderNumber: z.string().min(1).describe("Order number (must be unique)"),
    orderDate: z.string().describe("Order date (ISO 8601)"),
    orderStatus: z
        .enum([
            "awaiting_payment",
            "awaiting_shipment",
            "pending_fulfillment",
            "shipped",
            "on_hold",
            "cancelled"
        ])
        .default("awaiting_shipment")
        .describe("Order status"),
    billTo: ShipStationAddressSchema.describe("Billing address"),
    shipTo: ShipStationAddressSchema.describe("Shipping address"),
    items: z
        .array(
            z.object({
                sku: z.string().optional().describe("Product SKU"),
                name: z.string().min(1).describe("Item name"),
                quantity: z.number().int().min(1).describe("Quantity"),
                unitPrice: z.number().min(0).describe("Unit price"),
                weight: ShipStationWeightSchema.optional().describe("Item weight")
            })
        )
        .min(1)
        .describe("Order line items"),
    amountPaid: z.number().optional().describe("Amount paid"),
    shippingAmount: z.number().optional().describe("Shipping amount"),
    customerEmail: z.string().email().optional().describe("Customer email"),
    customerNotes: z.string().optional().describe("Customer notes"),
    internalNotes: z.string().optional().describe("Internal notes"),
    requestedShippingService: z.string().optional().describe("Requested shipping service")
});

export type CreateOrderParams = z.infer<typeof CreateOrderSchema>;

export const UpdateOrderStatusSchema = z.object({
    orderId: ShipStationIdSchema.describe("The order ID"),
    carrierCode: z.string().min(1).describe("Carrier code (e.g., 'ups', 'fedex', 'usps')"),
    shipDate: z.string().describe("Ship date (ISO 8601)"),
    trackingNumber: z.string().optional().describe("Tracking number"),
    notifyCustomer: z.boolean().default(true).describe("Send shipment notification to customer"),
    notifySalesChannel: z.boolean().default(true).describe("Notify the sales channel")
});

export type UpdateOrderStatusParams = z.infer<typeof UpdateOrderStatusSchema>;

// ==========================================
// Shipment Schemas
// ==========================================

export const CreateShipmentSchema = z.object({
    orderId: ShipStationIdSchema.describe("Order ID to create shipment for"),
    carrierCode: z.string().min(1).describe("Carrier code"),
    serviceCode: z.string().min(1).describe("Service code"),
    packageCode: z.string().optional().describe("Package type code"),
    confirmation: z
        .enum(["none", "delivery", "signature", "adult_signature", "direct_signature"])
        .default("none")
        .describe("Delivery confirmation type"),
    shipDate: z.string().describe("Ship date (ISO 8601)"),
    weight: ShipStationWeightSchema.describe("Package weight"),
    dimensions: ShipStationDimensionsSchema.optional().describe("Package dimensions"),
    testLabel: z.boolean().default(false).describe("Create a test label")
});

export type CreateShipmentParams = z.infer<typeof CreateShipmentSchema>;

// ==========================================
// Rate Schemas
// ==========================================

export const GetRatesSchema = z.object({
    carrierCode: z.string().optional().describe("Filter by carrier code"),
    fromPostalCode: z.string().min(1).describe("Origin postal code"),
    toPostalCode: z.string().min(1).describe("Destination postal code"),
    toCountry: z.string().length(2).describe("Destination country code"),
    weight: ShipStationWeightSchema.describe("Package weight"),
    dimensions: ShipStationDimensionsSchema.optional().describe("Package dimensions"),
    residential: z.boolean().default(false).describe("Is destination residential?")
});

export type GetRatesParams = z.infer<typeof GetRatesSchema>;

// ==========================================
// Label Schemas
// ==========================================

export const CreateLabelSchema = z.object({
    orderId: ShipStationIdSchema.describe("Order ID"),
    carrierCode: z.string().min(1).describe("Carrier code"),
    serviceCode: z.string().min(1).describe("Service code"),
    packageCode: z.string().optional().describe("Package type code"),
    confirmation: z
        .enum(["none", "delivery", "signature", "adult_signature", "direct_signature"])
        .default("none")
        .describe("Delivery confirmation"),
    shipDate: z.string().describe("Ship date (ISO 8601)"),
    weight: ShipStationWeightSchema.describe("Package weight"),
    dimensions: ShipStationDimensionsSchema.optional().describe("Package dimensions"),
    testLabel: z.boolean().default(false).describe("Create a test label")
});

export type CreateLabelParams = z.infer<typeof CreateLabelSchema>;

export const VoidLabelSchema = z.object({
    shipmentId: ShipStationIdSchema.describe("Shipment ID to void")
});

export type VoidLabelParams = z.infer<typeof VoidLabelSchema>;

// ==========================================
// Carrier Schemas
// ==========================================

export const ListCarriersSchema = z.object({});

export type ListCarriersParams = z.infer<typeof ListCarriersSchema>;

export const ListServicesSchema = z.object({
    carrierCode: z.string().min(1).describe("Carrier code to get services for")
});

export type ListServicesParams = z.infer<typeof ListServicesSchema>;

// ==========================================
// Warehouse Schemas
// ==========================================

export const ListWarehousesSchema = z.object({});

export type ListWarehousesParams = z.infer<typeof ListWarehousesSchema>;

// ==========================================
// Store Schemas
// ==========================================

export const ListStoresSchema = z.object({
    showInactive: z.boolean().default(false).describe("Include inactive stores")
});

export type ListStoresParams = z.infer<typeof ListStoresSchema>;
