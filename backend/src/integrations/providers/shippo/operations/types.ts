/**
 * Shippo API response types
 */

// ==========================================
// Common Types
// ==========================================

export interface ShippoListResponse<T> {
    count: number;
    next?: string;
    previous?: string;
    results: T[];
}

export interface ShippoMessage {
    source: string;
    code: string;
    text: string;
}

// ==========================================
// Address Types
// ==========================================

export interface ShippoAddress {
    object_id: string;
    object_created: string;
    object_updated: string;
    object_owner: string;
    is_complete: boolean;
    validation_results?: {
        is_valid: boolean;
        messages: ShippoMessage[];
    };
    name: string;
    company?: string;
    street1: string;
    street2?: string;
    street3?: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    phone?: string;
    email?: string;
    is_residential?: boolean;
}

// ==========================================
// Parcel Types
// ==========================================

export interface ShippoParcel {
    object_id: string;
    object_created: string;
    object_updated: string;
    object_owner: string;
    length: string;
    width: string;
    height: string;
    weight: string;
    distance_unit: string;
    mass_unit: string;
}

// ==========================================
// Shipment Types
// ==========================================

export interface ShippoShipment {
    object_id: string;
    object_created: string;
    object_updated: string;
    object_owner: string;
    object_state: "VALID" | "INVALID";
    status: "SUCCESS" | "QUEUED" | "WAITING" | "ERROR";
    address_from: ShippoAddress;
    address_to: ShippoAddress;
    address_return?: ShippoAddress;
    parcels: ShippoParcel[];
    shipment_date?: string;
    rates: ShippoRate[];
    messages: ShippoMessage[];
}

// ==========================================
// Rate Types
// ==========================================

export interface ShippoRate {
    object_id: string;
    object_created: string;
    object_owner: string;
    shipment: string;
    attributes: string[];
    amount: string;
    currency: string;
    amount_local: string;
    currency_local: string;
    provider: string;
    provider_image_75: string;
    provider_image_200: string;
    servicelevel: {
        name: string;
        token: string;
        terms?: string;
    };
    estimated_days: number;
    arrives_by?: string;
    duration_terms?: string;
    messages: ShippoMessage[];
    carrier_account: string;
    zone?: string;
}

// ==========================================
// Transaction/Label Types
// ==========================================

export interface ShippoTransaction {
    object_id: string;
    object_created: string;
    object_updated: string;
    object_owner: string;
    object_state: "VALID" | "INVALID";
    status:
        | "SUCCESS"
        | "QUEUED"
        | "WAITING"
        | "ERROR"
        | "REFUNDED"
        | "REFUNDPENDING"
        | "REFUNDREJECTED";
    rate: string;
    tracking_number?: string;
    tracking_status?: ShippoTrackingStatus;
    tracking_url_provider?: string;
    label_url?: string;
    commercial_invoice_url?: string;
    messages: ShippoMessage[];
    qr_code_url?: string;
    eta?: string;
    parcel?: string;
}

// ==========================================
// Tracking Types
// ==========================================

export interface ShippoTrackingLocation {
    city: string;
    state: string;
    zip: string;
    country: string;
}

export interface ShippoTrackingEvent {
    object_created: string;
    object_updated: string;
    object_id: string;
    status: string;
    status_details: string;
    status_date: string;
    location: ShippoTrackingLocation;
}

export interface ShippoTrackingStatus {
    object_created: string;
    object_updated: string;
    object_id: string;
    status: "UNKNOWN" | "PRE_TRANSIT" | "TRANSIT" | "DELIVERED" | "RETURNED" | "FAILURE";
    status_details: string;
    status_date: string;
    substatus?: {
        code: string;
        text: string;
        action_required: boolean;
    };
    location: ShippoTrackingLocation;
    tracking_history: ShippoTrackingEvent[];
    eta?: string;
    original_eta?: string;
    servicelevel?: {
        token: string;
        name: string;
    };
}

export interface ShippoTrack {
    carrier: string;
    tracking_number: string;
    address_from?: Partial<ShippoAddress>;
    address_to?: Partial<ShippoAddress>;
    transaction?: string;
    eta?: string;
    original_eta?: string;
    servicelevel?: {
        token: string;
        name: string;
    };
    tracking_status: ShippoTrackingStatus;
    tracking_history: ShippoTrackingEvent[];
    messages?: ShippoMessage[];
}

// ==========================================
// Manifest Types
// ==========================================

export interface ShippoManifest {
    object_id: string;
    object_created: string;
    object_updated: string;
    object_owner: string;
    status: "QUEUED" | "SUCCESS" | "ERROR";
    carrier_account: string;
    shipment_date: string;
    address_from: string;
    transactions: string[];
    documents: string[];
    errors: ShippoMessage[];
}

// ==========================================
// Carrier Account Types
// ==========================================

export interface ShippoCarrierAccount {
    object_id: string;
    object_created: string;
    object_updated: string;
    object_owner: string;
    carrier: string;
    carrier_name: string;
    account_id: string;
    parameters?: Record<string, unknown>;
    test: boolean;
    active: boolean;
}
