/**
 * BigCommerce API Response Types
 */

// ==========================================
// Order Types (V2 API)
// ==========================================

export interface BigCommerceOrderAddress {
    first_name: string;
    last_name: string;
    company: string;
    street_1: string;
    street_2: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    country_iso2: string;
    phone: string;
    email: string;
}

export interface BigCommerceOrderProduct {
    id: number;
    order_id: number;
    product_id: number;
    order_address_id: number;
    name: string;
    sku: string;
    type: string;
    base_price: string;
    price_ex_tax: string;
    price_inc_tax: string;
    price_tax: string;
    base_total: string;
    total_ex_tax: string;
    total_inc_tax: string;
    total_tax: string;
    quantity: number;
    base_cost_price: string;
    cost_price_inc_tax: string;
    cost_price_ex_tax: string;
    weight: string;
    cost_price_tax: string;
    is_refunded: boolean;
    refunded_amount: string;
    return_id: number;
    wrapping_name: string;
    base_wrapping_cost: string;
    wrapping_cost_ex_tax: string;
    wrapping_cost_inc_tax: string;
    wrapping_cost_tax: string;
    wrapping_message: string;
    quantity_shipped: number;
    event_name: string | null;
    event_date: string;
    fixed_shipping_cost: string;
    ebay_item_id: string;
    ebay_transaction_id: string;
    option_set_id: number | null;
    parent_order_product_id: number | null;
    is_bundled_product: boolean;
    bin_picking_number: string;
    applied_discounts: Array<{ id: string; amount: string }>;
    product_options: Array<{
        id: number;
        option_id: number;
        order_product_id: number;
        product_option_id: number;
        display_name: string;
        display_value: string;
        value: string;
        type: string;
        name: string;
        display_style: string;
    }>;
    configurable_fields: Array<unknown>;
}

export interface BigCommerceOrder {
    id: number;
    customer_id: number;
    date_created: string;
    date_modified: string;
    date_shipped: string;
    status_id: number;
    status: string;
    subtotal_ex_tax: string;
    subtotal_inc_tax: string;
    subtotal_tax: string;
    base_shipping_cost: string;
    shipping_cost_ex_tax: string;
    shipping_cost_inc_tax: string;
    shipping_cost_tax: string;
    shipping_cost_tax_class_id: number;
    base_handling_cost: string;
    handling_cost_ex_tax: string;
    handling_cost_inc_tax: string;
    handling_cost_tax: string;
    handling_cost_tax_class_id: number;
    base_wrapping_cost: string;
    wrapping_cost_ex_tax: string;
    wrapping_cost_inc_tax: string;
    wrapping_cost_tax: string;
    wrapping_cost_tax_class_id: number;
    total_ex_tax: string;
    total_inc_tax: string;
    total_tax: string;
    items_total: number;
    items_shipped: number;
    payment_method: string;
    payment_provider_id: string | null;
    payment_status: string;
    refunded_amount: string;
    order_is_digital: boolean;
    store_credit_amount: string;
    gift_certificate_amount: string;
    ip_address: string;
    ip_address_v6: string;
    geoip_country: string;
    geoip_country_iso2: string;
    currency_id: number;
    currency_code: string;
    currency_exchange_rate: string;
    default_currency_id: number;
    default_currency_code: string;
    staff_notes: string;
    customer_message: string;
    discount_amount: string;
    coupon_discount: string;
    shipping_address_count: number;
    is_deleted: boolean;
    ebay_order_id: string;
    cart_id: string;
    billing_address: BigCommerceOrderAddress;
    is_email_opt_in: boolean;
    credit_card_type: string | null;
    order_source: string;
    channel_id: number;
    external_source: string | null;
    products: { url: string; resource: string };
    shipping_addresses: { url: string; resource: string };
    coupons: { url: string; resource: string };
    external_id: string | null;
    external_merchant_id: string | null;
    tax_provider_id: string;
    store_default_currency_code: string;
    store_default_to_transactional_exchange_rate: string;
    custom_status: string;
}

export interface BigCommerceOrdersResponse {
    orders: BigCommerceOrder[];
}

// ==========================================
// Product Types (V3 Catalog API)
// ==========================================

export interface BigCommerceProductImage {
    id: number;
    product_id: number;
    is_thumbnail: boolean;
    sort_order: number;
    description: string;
    image_file: string;
    url_zoom: string;
    url_standard: string;
    url_thumbnail: string;
    url_tiny: string;
    date_modified: string;
}

export interface BigCommerceProductVariant {
    id: number;
    product_id: number;
    sku: string;
    sku_id: number | null;
    price: number | null;
    calculated_price: number;
    sale_price: number | null;
    retail_price: number | null;
    map_price: number | null;
    weight: number | null;
    calculated_weight: number;
    width: number | null;
    height: number | null;
    depth: number | null;
    is_free_shipping: boolean;
    fixed_cost_shipping_price: number | null;
    purchasing_disabled: boolean;
    purchasing_disabled_message: string;
    upc: string;
    mpn: string;
    gtin: string;
    inventory_level: number;
    inventory_warning_level: number;
    bin_picking_number: string;
    option_values: Array<{
        id: number;
        label: string;
        option_id: number;
        option_display_name: string;
    }>;
}

export interface BigCommerceProductCustomField {
    id: number;
    name: string;
    value: string;
}

export interface BigCommerceProduct {
    id: number;
    name: string;
    type: string;
    sku: string;
    description: string;
    weight: number;
    width: number;
    depth: number;
    height: number;
    price: number;
    cost_price: number;
    retail_price: number;
    sale_price: number;
    map_price: number;
    tax_class_id: number;
    product_tax_code: string;
    calculated_price: number;
    categories: number[];
    brand_id: number;
    option_set_id: number | null;
    option_set_display: string;
    inventory_level: number;
    inventory_warning_level: number;
    inventory_tracking: string;
    reviews_rating_sum: number;
    reviews_count: number;
    total_sold: number;
    fixed_cost_shipping_price: number;
    is_free_shipping: boolean;
    is_visible: boolean;
    is_featured: boolean;
    related_products: number[];
    warranty: string;
    bin_picking_number: string;
    layout_file: string;
    upc: string;
    mpn: string;
    gtin: string;
    search_keywords: string;
    availability: string;
    availability_description: string;
    gift_wrapping_options_type: string;
    gift_wrapping_options_list: number[];
    sort_order: number;
    condition: string;
    is_condition_shown: boolean;
    order_quantity_minimum: number;
    order_quantity_maximum: number;
    page_title: string;
    meta_keywords: string[];
    meta_description: string;
    date_created: string;
    date_modified: string;
    view_count: number;
    preorder_release_date: string | null;
    preorder_message: string;
    is_preorder_only: boolean;
    is_price_hidden: boolean;
    price_hidden_label: string;
    custom_url: { url: string; is_customized: boolean };
    base_variant_id: number | null;
    open_graph_type: string;
    open_graph_title: string;
    open_graph_description: string;
    open_graph_use_meta_description: boolean;
    open_graph_use_product_name: boolean;
    open_graph_use_image: boolean;
    variants: BigCommerceProductVariant[];
    images: BigCommerceProductImage[];
    custom_fields: BigCommerceProductCustomField[];
}

export interface BigCommerceProductsResponse {
    data: BigCommerceProduct[];
    meta: {
        pagination: {
            total: number;
            count: number;
            per_page: number;
            current_page: number;
            total_pages: number;
        };
    };
}

// ==========================================
// Customer Types (V3 API)
// ==========================================

export interface BigCommerceCustomerAddress {
    id: number;
    customer_id: number;
    first_name: string;
    last_name: string;
    company: string;
    address1: string;
    address2: string;
    city: string;
    state_or_province: string;
    postal_code: string;
    country_code: string;
    phone: string;
    address_type: string;
}

export interface BigCommerceCustomer {
    id: number;
    company: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    date_created: string;
    date_modified: string;
    store_credit_amounts: Array<{ amount: number }>;
    registration_ip_address: string;
    customer_group_id: number;
    notes: string;
    tax_exempt_category: string;
    accepts_product_review_abandoned_cart_emails: boolean;
    channel_ids: number[];
    addresses?: BigCommerceCustomerAddress[];
}

export interface BigCommerceCustomersResponse {
    data: BigCommerceCustomer[];
    meta: {
        pagination: {
            total: number;
            count: number;
            per_page: number;
            current_page: number;
            total_pages: number;
        };
    };
}

// ==========================================
// Webhook Types (V3 API)
// ==========================================

export interface BigCommerceWebhook {
    id: number;
    client_id: string;
    store_hash: string;
    scope: string;
    destination: string;
    headers: Record<string, string> | null;
    is_active: boolean;
    created_at: number;
    updated_at: number;
}

export interface BigCommerceWebhooksResponse {
    data: BigCommerceWebhook[];
    meta: {
        pagination: {
            total: number;
            count: number;
            per_page: number;
            current_page: number;
            total_pages: number;
        };
    };
}
