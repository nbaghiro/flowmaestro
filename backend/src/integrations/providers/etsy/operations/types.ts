/**
 * Etsy API Response Types
 */

// ==========================================
// Common Types
// ==========================================

export interface EtsyMoney {
    amount: number;
    divisor: number;
    currency_code: string;
}

export interface EtsyImage {
    listing_id: number;
    listing_image_id: number;
    hex_code: string | null;
    red: number | null;
    green: number | null;
    blue: number | null;
    hue: number | null;
    saturation: number | null;
    brightness: number | null;
    is_black_and_white: boolean | null;
    creation_tsz: number;
    created_timestamp: number;
    rank: number;
    url_75x75: string;
    url_170x135: string;
    url_570xN: string;
    url_fullxfull: string;
    full_height: number;
    full_width: number;
    alt_text: string | null;
}

// ==========================================
// Listing Types
// ==========================================

export interface EtsyListing {
    listing_id: number;
    user_id: number;
    shop_id: number;
    title: string;
    description: string;
    state: "active" | "inactive" | "sold_out" | "draft" | "expired" | "removed";
    creation_timestamp: number;
    created_timestamp: number;
    ending_timestamp: number;
    original_creation_timestamp: number;
    last_modified_timestamp: number;
    updated_timestamp: number;
    state_timestamp: number;
    quantity: number;
    shop_section_id: number | null;
    featured_rank: number;
    url: string;
    num_favorers: number;
    non_taxable: boolean;
    is_taxable: boolean;
    is_customizable: boolean;
    is_personalizable: boolean;
    personalization_is_required: boolean;
    personalization_char_count_max: number | null;
    personalization_instructions: string | null;
    listing_type: string;
    tags: string[];
    materials: string[];
    shipping_profile_id: number | null;
    return_policy_id: number | null;
    processing_min: number | null;
    processing_max: number | null;
    who_made: "i_did" | "someone_else" | "collective";
    when_made: string;
    is_supply: boolean;
    item_weight: number | null;
    item_weight_unit: string | null;
    item_length: number | null;
    item_width: number | null;
    item_height: number | null;
    item_dimensions_unit: string | null;
    is_private: boolean;
    style: string[];
    file_data: string;
    has_variations: boolean;
    should_auto_renew: boolean;
    language: string;
    price: EtsyMoney;
    taxonomy_id: number;
    // Optional includes
    images?: EtsyImage[];
    shop?: EtsyShop;
}

export interface EtsyListingResponse {
    listing: EtsyListing;
}

export interface EtsyListingsResponse {
    count: number;
    results: EtsyListing[];
}

// ==========================================
// Inventory Types
// ==========================================

export interface EtsyPropertyValue {
    property_id: number;
    property_name: string;
    scale_id: number | null;
    scale_name: string | null;
    value_ids: number[];
    values: string[];
}

export interface EtsyOffering {
    offering_id: number;
    price: EtsyMoney;
    quantity: number;
    is_enabled: boolean;
    is_deleted: boolean;
}

export interface EtsyProduct {
    product_id: number;
    sku: string;
    is_deleted: boolean;
    offerings: EtsyOffering[];
    property_values: EtsyPropertyValue[];
}

export interface EtsyInventory {
    products: EtsyProduct[];
    price_on_property: number[];
    quantity_on_property: number[];
    sku_on_property: number[];
}

export interface EtsyInventoryResponse {
    products: EtsyProduct[];
    price_on_property: number[];
    quantity_on_property: number[];
    sku_on_property: number[];
}

// ==========================================
// Receipt (Order) Types
// ==========================================

export interface EtsyTransaction {
    transaction_id: number;
    title: string;
    description: string;
    seller_user_id: number;
    buyer_user_id: number;
    create_timestamp: number;
    created_timestamp: number;
    paid_timestamp: number | null;
    shipped_timestamp: number | null;
    quantity: number;
    listing_image_id: number;
    receipt_id: number;
    is_digital: boolean;
    file_data: string;
    listing_id: number;
    transaction_type: string;
    product_id: number | null;
    sku: string;
    price: EtsyMoney;
    shipping_cost: EtsyMoney;
    variations: EtsyPropertyValue[];
    product_data: EtsyProduct[];
    shipping_profile_id: number | null;
    min_processing_days: number | null;
    max_processing_days: number | null;
    shipping_method: string | null;
    shipping_upgrade: string | null;
    expected_ship_date: number | null;
    buyer_coupon: number;
    shop_coupon: number;
}

export interface EtsyShipment {
    receipt_shipping_id: number;
    shipment_notification_timestamp: number;
    carrier_name: string;
    tracking_code: string;
}

export interface EtsyReceipt {
    receipt_id: number;
    receipt_type: number;
    seller_user_id: number;
    seller_email: string;
    buyer_user_id: number;
    buyer_email: string;
    name: string;
    first_line: string;
    second_line: string | null;
    city: string;
    state: string;
    zip: string;
    status: string;
    formatted_address: string;
    country_iso: string;
    payment_method: string;
    payment_email: string;
    message_from_seller: string | null;
    message_from_buyer: string | null;
    message_from_payment: string | null;
    is_paid: boolean;
    is_shipped: boolean;
    create_timestamp: number;
    created_timestamp: number;
    update_timestamp: number;
    updated_timestamp: number;
    is_gift: boolean;
    gift_message: string;
    grandtotal: EtsyMoney;
    subtotal: EtsyMoney;
    total_price: EtsyMoney;
    total_shipping_cost: EtsyMoney;
    total_tax_cost: EtsyMoney;
    total_vat_cost: EtsyMoney;
    discount_amt: EtsyMoney;
    gift_wrap_price: EtsyMoney;
    shipments: EtsyShipment[];
    transactions: EtsyTransaction[];
    refunds: unknown[];
}

export interface EtsyReceiptResponse {
    receipt: EtsyReceipt;
}

export interface EtsyReceiptsResponse {
    count: number;
    results: EtsyReceipt[];
}

// ==========================================
// Shop Types
// ==========================================

export interface EtsyShop {
    shop_id: number;
    user_id: number;
    shop_name: string;
    create_date: number;
    created_timestamp: number;
    title: string | null;
    announcement: string | null;
    currency_code: string;
    is_vacation: boolean;
    vacation_message: string | null;
    sale_message: string | null;
    digital_sale_message: string | null;
    update_date: number;
    updated_timestamp: number;
    listing_active_count: number;
    digital_listing_count: number;
    login_name: string;
    accepts_custom_requests: boolean;
    vacation_autoreply: string | null;
    url: string;
    image_url_760x100: string | null;
    num_favorers: number;
    languages: string[];
    icon_url_fullxfull: string | null;
    is_using_structured_policies: boolean;
    has_onboarded_structured_policies: boolean;
    include_dispute_form_link: boolean;
    is_direct_checkout_onboarded: boolean;
    is_etsy_payments_onboarded: boolean;
    is_calculated_eligible: boolean;
    is_opted_in_to_buyer_promise: boolean;
    is_shop_us_based: boolean;
    transaction_sold_count: number;
    shipping_from_country_iso: string | null;
    shop_location_country_iso: string | null;
    policy_welcome: string | null;
    policy_payment: string | null;
    policy_shipping: string | null;
    policy_refunds: string | null;
    policy_additional: string | null;
    policy_seller_info: string | null;
    policy_update_date: number;
    policy_has_private_receipt_info: boolean;
    has_unstructured_policies: boolean;
    policy_privacy: string | null;
    review_average: number | null;
    review_count: number | null;
}

export interface EtsyShopResponse {
    shop: EtsyShop;
}

// ==========================================
// User Types
// ==========================================

export interface EtsyUser {
    user_id: number;
    primary_email: string;
    first_name: string;
    last_name: string;
    image_url_75x75: string | null;
}

export interface EtsyUserResponse {
    user: EtsyUser;
}
