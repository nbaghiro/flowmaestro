/**
 * Magento REST API response types
 */

// ==========================================
// Common Types
// ==========================================

export interface MagentoSearchCriteria {
    filter_groups?: Array<{
        filters: Array<{
            field: string;
            value: string;
            condition_type?: string;
        }>;
    }>;
    sort_orders?: Array<{
        field: string;
        direction: "ASC" | "DESC";
    }>;
    page_size?: number;
    current_page?: number;
}

export interface MagentoSearchResponse<T> {
    items: T[];
    search_criteria: MagentoSearchCriteria;
    total_count: number;
}

export interface MagentoCustomAttribute {
    attribute_code: string;
    value: string | number | boolean;
}

export interface MagentoExtensionAttributes {
    website_ids?: number[];
    category_links?: Array<{
        position: number;
        category_id: string;
    }>;
    stock_item?: MagentoStockItem;
}

// ==========================================
// Product Types
// ==========================================

export interface MagentoProduct {
    id: number;
    sku: string;
    name: string;
    attribute_set_id: number;
    price: number;
    status: number;
    visibility: number;
    type_id: string;
    created_at: string;
    updated_at: string;
    weight?: number;
    extension_attributes?: MagentoExtensionAttributes;
    custom_attributes?: MagentoCustomAttribute[];
    product_links?: Array<{
        sku: string;
        link_type: string;
        linked_product_sku: string;
        linked_product_type: string;
        position: number;
    }>;
    media_gallery_entries?: Array<{
        id: number;
        media_type: string;
        label: string | null;
        position: number;
        disabled: boolean;
        types: string[];
        file: string;
    }>;
}

export type MagentoProductsResponse = MagentoSearchResponse<MagentoProduct>;

// ==========================================
// Order Types
// ==========================================

export interface MagentoOrderItem {
    item_id: number;
    order_id: number;
    product_id: number;
    sku: string;
    name: string;
    qty_ordered: number;
    qty_shipped: number;
    qty_invoiced: number;
    qty_refunded: number;
    qty_canceled: number;
    price: number;
    base_price: number;
    row_total: number;
    base_row_total: number;
    tax_amount: number;
    discount_amount: number;
    product_type: string;
}

export interface MagentoAddress {
    address_type: "billing" | "shipping";
    city: string;
    company?: string;
    country_id: string;
    customer_address_id?: number;
    customer_id?: number;
    email?: string;
    entity_id: number;
    fax?: string;
    firstname: string;
    lastname: string;
    middlename?: string;
    parent_id: number;
    postcode: string;
    prefix?: string;
    region: string;
    region_code?: string;
    region_id?: number;
    street: string[];
    suffix?: string;
    telephone: string;
}

export interface MagentoPayment {
    account_status?: string;
    additional_information?: string[];
    amount_ordered: number;
    amount_paid?: number;
    base_amount_ordered: number;
    base_amount_paid?: number;
    cc_last4?: string;
    cc_type?: string;
    entity_id: number;
    method: string;
    parent_id: number;
}

export interface MagentoStatusHistory {
    comment?: string;
    created_at: string;
    entity_id: number;
    entity_name: string;
    is_customer_notified: number;
    is_visible_on_front: number;
    parent_id: number;
    status: string;
}

export interface MagentoOrder {
    entity_id: number;
    increment_id: string;
    state: string;
    status: string;
    store_id: number;
    customer_id?: number;
    customer_email: string;
    customer_firstname?: string;
    customer_lastname?: string;
    customer_is_guest: number;
    created_at: string;
    updated_at: string;
    base_currency_code: string;
    order_currency_code: string;
    subtotal: number;
    base_subtotal: number;
    grand_total: number;
    base_grand_total: number;
    tax_amount: number;
    shipping_amount: number;
    discount_amount: number;
    total_qty_ordered: number;
    total_item_count: number;
    items: MagentoOrderItem[];
    billing_address?: MagentoAddress;
    payment?: MagentoPayment;
    status_histories?: MagentoStatusHistory[];
    extension_attributes?: {
        shipping_assignments?: Array<{
            shipping: {
                address: MagentoAddress;
                method: string;
            };
            items: MagentoOrderItem[];
        }>;
    };
}

export type MagentoOrdersResponse = MagentoSearchResponse<MagentoOrder>;

export interface MagentoOrderCommentResponse {
    comment: string;
    created_at: string;
    entity_id: number;
    entity_name: string;
    is_customer_notified: number;
    is_visible_on_front: number;
    parent_id: number;
    status: string;
}

// ==========================================
// Customer Types
// ==========================================

export interface MagentoCustomerAddress {
    id?: number;
    customer_id?: number;
    region?: {
        region_code: string;
        region: string;
        region_id: number;
    };
    region_id?: number;
    country_id: string;
    street: string[];
    company?: string;
    telephone: string;
    fax?: string;
    postcode: string;
    city: string;
    firstname: string;
    lastname: string;
    middlename?: string;
    prefix?: string;
    suffix?: string;
    vat_id?: string;
    default_shipping?: boolean;
    default_billing?: boolean;
}

export interface MagentoCustomer {
    id: number;
    group_id: number;
    default_billing?: string;
    default_shipping?: string;
    confirmation?: string;
    created_at: string;
    updated_at?: string;
    created_in: string;
    dob?: string;
    email: string;
    firstname: string;
    lastname: string;
    middlename?: string;
    prefix?: string;
    suffix?: string;
    gender?: number;
    store_id: number;
    taxvat?: string;
    website_id: number;
    addresses?: MagentoCustomerAddress[];
    disable_auto_group_change?: number;
    extension_attributes?: {
        is_subscribed?: boolean;
    };
    custom_attributes?: MagentoCustomAttribute[];
}

export type MagentoCustomersResponse = MagentoSearchResponse<MagentoCustomer>;

// ==========================================
// Inventory Types
// ==========================================

export interface MagentoStockItem {
    item_id: number;
    product_id: number;
    stock_id: number;
    qty: number;
    is_in_stock: boolean;
    is_qty_decimal: boolean;
    show_default_notification_message: boolean;
    use_config_min_qty: boolean;
    min_qty: number;
    use_config_min_sale_qty: number;
    min_sale_qty: number;
    use_config_max_sale_qty: boolean;
    max_sale_qty: number;
    use_config_backorders: boolean;
    backorders: number;
    use_config_notify_stock_qty: boolean;
    notify_stock_qty: number;
    use_config_qty_increments: boolean;
    qty_increments: number;
    use_config_enable_qty_inc: boolean;
    enable_qty_increments: boolean;
    use_config_manage_stock: boolean;
    manage_stock: boolean;
    low_stock_date?: string;
    is_decimal_divided: boolean;
    stock_status_changed_auto: number;
}

export interface MagentoInventorySourceItem {
    sku: string;
    source_code: string;
    quantity: number;
    status: number;
}

// ==========================================
// Category Types
// ==========================================

export interface MagentoCategory {
    id: number;
    parent_id: number;
    name: string;
    is_active: boolean;
    position: number;
    level: number;
    product_count: number;
    children_data?: MagentoCategory[];
    path?: string;
    available_sort_by?: string[];
    include_in_menu?: boolean;
    custom_attributes?: MagentoCustomAttribute[];
}
