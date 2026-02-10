/**
 * WooCommerce API Response Types
 */

// ==========================================
// Order Types
// ==========================================

export interface WooCommerceAddress {
    first_name: string;
    last_name: string;
    company: string;
    address_1: string;
    address_2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
    email?: string;
    phone: string;
}

export interface WooCommerceLineItem {
    id: number;
    name: string;
    product_id: number;
    variation_id: number;
    quantity: number;
    tax_class: string;
    subtotal: string;
    subtotal_tax: string;
    total: string;
    total_tax: string;
    taxes: Array<{ id: number; total: string; subtotal: string }>;
    meta_data: Array<{ id: number; key: string; value: string }>;
    sku: string;
    price: number;
}

export interface WooCommerceOrder {
    id: number;
    parent_id: number;
    number: string;
    order_key: string;
    created_via: string;
    version: string;
    status: string;
    currency: string;
    date_created: string;
    date_created_gmt: string;
    date_modified: string;
    date_modified_gmt: string;
    discount_total: string;
    discount_tax: string;
    shipping_total: string;
    shipping_tax: string;
    cart_tax: string;
    total: string;
    total_tax: string;
    prices_include_tax: boolean;
    customer_id: number;
    customer_ip_address: string;
    customer_user_agent: string;
    customer_note: string;
    billing: WooCommerceAddress;
    shipping: WooCommerceAddress;
    payment_method: string;
    payment_method_title: string;
    transaction_id: string;
    date_paid: string | null;
    date_paid_gmt: string | null;
    date_completed: string | null;
    date_completed_gmt: string | null;
    cart_hash: string;
    meta_data: Array<{ id: number; key: string; value: string }>;
    line_items: WooCommerceLineItem[];
    tax_lines: Array<{
        id: number;
        rate_code: string;
        rate_id: number;
        label: string;
        compound: boolean;
        tax_total: string;
        shipping_tax_total: string;
    }>;
    shipping_lines: Array<{
        id: number;
        method_title: string;
        method_id: string;
        total: string;
        total_tax: string;
    }>;
    fee_lines: Array<{
        id: number;
        name: string;
        tax_class: string;
        tax_status: string;
        total: string;
        total_tax: string;
    }>;
    coupon_lines: Array<{ id: number; code: string; discount: string; discount_tax: string }>;
    refunds: Array<{ id: number; reason: string; total: string }>;
    _links: Record<string, Array<{ href: string }>>;
}

export interface WooCommerceOrdersResponse {
    orders: WooCommerceOrder[];
}

export interface WooCommerceOrderResponse {
    order: WooCommerceOrder;
}

// ==========================================
// Product Types
// ==========================================

export interface WooCommerceProductImage {
    id: number;
    date_created: string;
    date_created_gmt: string;
    date_modified: string;
    date_modified_gmt: string;
    src: string;
    name: string;
    alt: string;
}

export interface WooCommerceProductAttribute {
    id: number;
    name: string;
    position: number;
    visible: boolean;
    variation: boolean;
    options: string[];
}

export interface WooCommerceProductCategory {
    id: number;
    name: string;
    slug: string;
}

export interface WooCommerceProductTag {
    id: number;
    name: string;
    slug: string;
}

export interface WooCommerceProduct {
    id: number;
    name: string;
    slug: string;
    permalink: string;
    date_created: string;
    date_created_gmt: string;
    date_modified: string;
    date_modified_gmt: string;
    type: string;
    status: string;
    featured: boolean;
    catalog_visibility: string;
    description: string;
    short_description: string;
    sku: string;
    price: string;
    regular_price: string;
    sale_price: string;
    date_on_sale_from: string | null;
    date_on_sale_from_gmt: string | null;
    date_on_sale_to: string | null;
    date_on_sale_to_gmt: string | null;
    price_html: string;
    on_sale: boolean;
    purchasable: boolean;
    total_sales: number;
    virtual: boolean;
    downloadable: boolean;
    downloads: Array<{ id: string; name: string; file: string }>;
    download_limit: number;
    download_expiry: number;
    external_url: string;
    button_text: string;
    tax_status: string;
    tax_class: string;
    manage_stock: boolean;
    stock_quantity: number | null;
    stock_status: string;
    backorders: string;
    backorders_allowed: boolean;
    backordered: boolean;
    sold_individually: boolean;
    weight: string;
    dimensions: { length: string; width: string; height: string };
    shipping_required: boolean;
    shipping_taxable: boolean;
    shipping_class: string;
    shipping_class_id: number;
    reviews_allowed: boolean;
    average_rating: string;
    rating_count: number;
    related_ids: number[];
    upsell_ids: number[];
    cross_sell_ids: number[];
    parent_id: number;
    purchase_note: string;
    categories: WooCommerceProductCategory[];
    tags: WooCommerceProductTag[];
    images: WooCommerceProductImage[];
    attributes: WooCommerceProductAttribute[];
    default_attributes: Array<{ id: number; name: string; option: string }>;
    variations: number[];
    grouped_products: number[];
    menu_order: number;
    meta_data: Array<{ id: number; key: string; value: string }>;
    _links: Record<string, Array<{ href: string }>>;
}

export interface WooCommerceProductsResponse {
    products: WooCommerceProduct[];
}

export interface WooCommerceProductResponse {
    product: WooCommerceProduct;
}

// ==========================================
// Customer Types
// ==========================================

export interface WooCommerceCustomer {
    id: number;
    date_created: string;
    date_created_gmt: string;
    date_modified: string;
    date_modified_gmt: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    username: string;
    billing: WooCommerceAddress;
    shipping: WooCommerceAddress;
    is_paying_customer: boolean;
    avatar_url: string;
    meta_data: Array<{ id: number; key: string; value: string }>;
    _links: Record<string, Array<{ href: string }>>;
}

export interface WooCommerceCustomersResponse {
    customers: WooCommerceCustomer[];
}

export interface WooCommerceCustomerResponse {
    customer: WooCommerceCustomer;
}

// ==========================================
// Webhook Types
// ==========================================

export interface WooCommerceWebhook {
    id: number;
    name: string;
    status: string;
    topic: string;
    resource: string;
    event: string;
    hooks: string[];
    delivery_url: string;
    secret: string;
    date_created: string;
    date_created_gmt: string;
    date_modified: string;
    date_modified_gmt: string;
    _links: Record<string, Array<{ href: string }>>;
}

export interface WooCommerceWebhooksResponse {
    webhooks: WooCommerceWebhook[];
}

export interface WooCommerceWebhookResponse {
    webhook: WooCommerceWebhook;
}
