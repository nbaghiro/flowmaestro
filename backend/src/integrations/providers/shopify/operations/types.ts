/**
 * Shopify API response types
 */

// ==========================================
// Common Types
// ==========================================

export interface ShopifyMoney {
    amount: string;
    currency_code: string;
}

export interface ShopifyAddress {
    id?: number;
    first_name?: string;
    last_name?: string;
    company?: string;
    address1?: string;
    address2?: string;
    city?: string;
    province?: string;
    province_code?: string;
    country?: string;
    country_code?: string;
    zip?: string;
    phone?: string;
    name?: string;
    latitude?: number;
    longitude?: number;
}

// ==========================================
// Order Types
// ==========================================

export interface ShopifyLineItem {
    id: number;
    variant_id?: number;
    product_id?: number;
    title: string;
    variant_title?: string;
    sku?: string;
    vendor?: string;
    quantity: number;
    price: string;
    total_discount: string;
    fulfillment_status?: string;
    gift_card?: boolean;
    taxable?: boolean;
    name: string;
}

export interface ShopifyOrder {
    id: number;
    admin_graphql_api_id: string;
    order_number: number;
    name: string;
    email?: string;
    phone?: string;
    created_at: string;
    updated_at: string;
    closed_at?: string;
    cancelled_at?: string;
    cancel_reason?: string;
    note?: string;
    tags?: string;
    currency: string;
    total_price: string;
    subtotal_price: string;
    total_tax: string;
    total_discounts: string;
    total_line_items_price: string;
    financial_status: string;
    fulfillment_status?: string;
    processing_method: string;
    gateway?: string;
    test: boolean;
    confirmed: boolean;
    buyer_accepts_marketing: boolean;
    line_items: ShopifyLineItem[];
    shipping_address?: ShopifyAddress;
    billing_address?: ShopifyAddress;
    customer?: ShopifyCustomer;
}

export interface ShopifyOrdersResponse {
    orders: ShopifyOrder[];
}

export interface ShopifyOrderResponse {
    order: ShopifyOrder;
}

// ==========================================
// Product Types
// ==========================================

export interface ShopifyProductVariant {
    id: number;
    product_id: number;
    title: string;
    price: string;
    compare_at_price?: string;
    sku?: string;
    position: number;
    inventory_item_id?: number;
    inventory_quantity?: number;
    option1?: string;
    option2?: string;
    option3?: string;
    created_at: string;
    updated_at: string;
    taxable: boolean;
    barcode?: string;
    grams: number;
    weight: number;
    weight_unit: string;
    requires_shipping: boolean;
}

export interface ShopifyProductImage {
    id: number;
    product_id: number;
    position: number;
    created_at: string;
    updated_at: string;
    alt?: string;
    width: number;
    height: number;
    src: string;
}

export interface ShopifyProduct {
    id: number;
    admin_graphql_api_id: string;
    title: string;
    body_html?: string;
    vendor?: string;
    product_type?: string;
    created_at: string;
    updated_at: string;
    published_at?: string;
    template_suffix?: string;
    status: "active" | "archived" | "draft";
    published_scope: string;
    tags: string;
    handle: string;
    variants: ShopifyProductVariant[];
    options: Array<{
        id: number;
        product_id: number;
        name: string;
        position: number;
        values: string[];
    }>;
    images: ShopifyProductImage[];
    image?: ShopifyProductImage;
}

export interface ShopifyProductsResponse {
    products: ShopifyProduct[];
}

export interface ShopifyProductResponse {
    product: ShopifyProduct;
}

// ==========================================
// Inventory Types
// ==========================================

export interface ShopifyInventoryLevel {
    inventory_item_id: number;
    location_id: number;
    available?: number;
    updated_at: string;
}

export interface ShopifyInventoryLevelsResponse {
    inventory_levels: ShopifyInventoryLevel[];
}

export interface ShopifyInventoryLevelResponse {
    inventory_level: ShopifyInventoryLevel;
}

export interface ShopifyLocation {
    id: number;
    name: string;
    address1?: string;
    address2?: string;
    city?: string;
    province?: string;
    country?: string;
    zip?: string;
    phone?: string;
    active: boolean;
    legacy: boolean;
    localized_country_name: string;
    localized_province_name?: string;
}

export interface ShopifyLocationsResponse {
    locations: ShopifyLocation[];
}

// ==========================================
// Customer Types
// ==========================================

export interface ShopifyCustomer {
    id: number;
    admin_graphql_api_id: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    created_at: string;
    updated_at: string;
    orders_count: number;
    total_spent: string;
    verified_email: boolean;
    tax_exempt: boolean;
    accepts_marketing: boolean;
    accepts_marketing_updated_at?: string;
    marketing_opt_in_level?: string;
    tags?: string;
    currency?: string;
    last_order_id?: number;
    last_order_name?: string;
    note?: string;
    state: "disabled" | "invited" | "enabled" | "declined";
    default_address?: ShopifyAddress;
    addresses?: ShopifyAddress[];
}

export interface ShopifyCustomersResponse {
    customers: ShopifyCustomer[];
}

export interface ShopifyCustomerResponse {
    customer: ShopifyCustomer;
}

export interface ShopifyCustomerSearchResponse {
    customers: ShopifyCustomer[];
}

// ==========================================
// Webhook Types
// ==========================================

export interface ShopifyWebhook {
    id: number;
    address: string;
    topic: string;
    created_at: string;
    updated_at: string;
    format: "json" | "xml";
    fields: string[];
    metafield_namespaces: string[];
    api_version: string;
}

export interface ShopifyWebhooksResponse {
    webhooks: ShopifyWebhook[];
}

export interface ShopifyWebhookResponse {
    webhook: ShopifyWebhook;
}

// ==========================================
// Shop Types
// ==========================================

export interface ShopifyShop {
    id: number;
    name: string;
    email: string;
    domain: string;
    myshopify_domain: string;
    shop_owner: string;
    phone?: string;
    address1?: string;
    city?: string;
    province?: string;
    country?: string;
    zip?: string;
    currency: string;
    money_format: string;
    money_with_currency_format: string;
    timezone: string;
    iana_timezone: string;
    plan_name: string;
    plan_display_name: string;
    weight_unit: string;
    created_at: string;
    updated_at: string;
    primary_locale: string;
    enabled_presentment_currencies: string[];
}

export interface ShopifyShopResponse {
    shop: ShopifyShop;
}
