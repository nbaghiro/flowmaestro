import { z } from "zod";

// ==========================================
// Common Schemas
// ==========================================

export const ShippoIdSchema = z.string().describe("Shippo resource ID");

export const ShippoPaginationSchema = z.object({
    page: z.number().min(1).default(1).describe("Page number"),
    results: z.number().min(1).max(100).default(25).describe("Results per page (max 100)")
});

export const ShippoAddressSchema = z.object({
    name: z.string().min(1).describe("Full name"),
    company: z.string().optional().describe("Company name"),
    street1: z.string().min(1).describe("Street address line 1"),
    street2: z.string().optional().describe("Street address line 2"),
    city: z.string().min(1).describe("City"),
    state: z.string().min(1).describe("State/Province (2-letter code for US/CA)"),
    zip: z.string().min(1).describe("Postal/ZIP code"),
    country: z.string().length(2).describe("Country (ISO 3166-1 alpha-2 code)"),
    phone: z.string().optional().describe("Phone number"),
    email: z.string().email().optional().describe("Email address"),
    is_residential: z.boolean().optional().describe("Is this a residential address?")
});

export const ShippoParcelSchema = z.object({
    length: z.number().positive().describe("Length in inches"),
    width: z.number().positive().describe("Width in inches"),
    height: z.number().positive().describe("Height in inches"),
    weight: z.number().positive().describe("Weight in pounds"),
    distance_unit: z
        .enum(["in", "cm", "ft", "mm", "m", "yd"])
        .default("in")
        .describe("Distance unit"),
    mass_unit: z.enum(["lb", "oz", "g", "kg"]).default("lb").describe("Mass unit")
});

// ==========================================
// Address Validation Schemas
// ==========================================

export const ValidateAddressSchema = ShippoAddressSchema.extend({
    validate: z.boolean().default(true).describe("Validate the address")
});

export type ValidateAddressParams = z.infer<typeof ValidateAddressSchema>;

// ==========================================
// Shipment Schemas
// ==========================================

export const CreateShipmentSchema = z.object({
    address_from: ShippoAddressSchema.describe("Sender address"),
    address_to: ShippoAddressSchema.describe("Recipient address"),
    parcels: z.array(ShippoParcelSchema).min(1).describe("Package dimensions and weight"),
    async: z.boolean().default(false).describe("Create shipment asynchronously")
});

export type CreateShipmentParams = z.infer<typeof CreateShipmentSchema>;

export const ListShipmentsSchema = ShippoPaginationSchema;

export type ListShipmentsParams = z.infer<typeof ListShipmentsSchema>;

export const GetShipmentSchema = z.object({
    shipment_id: ShippoIdSchema.describe("Shipment ID")
});

export type GetShipmentParams = z.infer<typeof GetShipmentSchema>;

// ==========================================
// Rate Schemas
// ==========================================

export const GetRatesSchema = z.object({
    shipment_id: ShippoIdSchema.describe("Shipment ID to get rates for"),
    currency_code: z.string().length(3).default("USD").describe("Currency code (ISO 4217)")
});

export type GetRatesParams = z.infer<typeof GetRatesSchema>;

// ==========================================
// Label/Transaction Schemas
// ==========================================

export const CreateLabelSchema = z.object({
    rate: ShippoIdSchema.describe("Rate ID to purchase"),
    label_file_type: z
        .enum(["PDF", "PDF_4x6", "ZPLII", "PNG", "PDF_A4", "PDF_A6"])
        .default("PDF")
        .describe("Label format"),
    async: z.boolean().default(false).describe("Create label asynchronously")
});

export type CreateLabelParams = z.infer<typeof CreateLabelSchema>;

export const GetLabelSchema = z.object({
    transaction_id: ShippoIdSchema.describe("Transaction/Label ID")
});

export type GetLabelParams = z.infer<typeof GetLabelSchema>;

// ==========================================
// Tracking Schemas
// ==========================================

export const TrackShipmentSchema = z.object({
    carrier: z.string().min(1).describe("Carrier token (e.g., 'usps', 'fedex', 'ups')"),
    tracking_number: z.string().min(1).describe("Tracking number")
});

export type TrackShipmentParams = z.infer<typeof TrackShipmentSchema>;

export const GetTrackingStatusSchema = z.object({
    carrier: z.string().min(1).describe("Carrier token"),
    tracking_number: z.string().min(1).describe("Tracking number")
});

export type GetTrackingStatusParams = z.infer<typeof GetTrackingStatusSchema>;

// ==========================================
// Manifest Schemas
// ==========================================

export const CreateManifestSchema = z.object({
    carrier_account: ShippoIdSchema.describe("Carrier account ID"),
    shipment_date: z.string().describe("Shipment date (YYYY-MM-DD)"),
    address_from: ShippoAddressSchema.describe("Pickup/origin address"),
    transactions: z.array(ShippoIdSchema).optional().describe("Transaction IDs to include"),
    async: z.boolean().default(false).describe("Create manifest asynchronously")
});

export type CreateManifestParams = z.infer<typeof CreateManifestSchema>;

// ==========================================
// Carrier Account Schemas
// ==========================================

export const ListCarrierAccountsSchema = z.object({
    carrier: z.string().optional().describe("Filter by carrier (e.g., 'usps', 'fedex')"),
    page: z.number().min(1).default(1).describe("Page number"),
    results: z.number().min(1).max(100).default(25).describe("Results per page")
});

export type ListCarrierAccountsParams = z.infer<typeof ListCarrierAccountsSchema>;
