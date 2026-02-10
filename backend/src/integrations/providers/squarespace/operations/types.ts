/**
 * Squarespace API response types
 */

// ==========================================
// Common Types
// ==========================================

export interface SquarespaceMoney {
    currency: string;
    value: string;
}

export interface SquarespacePagination {
    nextPageCursor?: string;
    nextPageUrl?: string;
    hasNextPage?: boolean;
}

// ==========================================
// Product Types
// ==========================================

export interface SquarespaceProductVariant {
    id: string;
    sku?: string;
    pricing: {
        basePrice: SquarespaceMoney;
        salePrice?: SquarespaceMoney;
        onSale: boolean;
    };
    stock: {
        quantity: number;
        unlimited: boolean;
    };
    attributes?: Record<string, string>;
    shippingMeasurements?: {
        weight?: {
            unit: string;
            value: number;
        };
        dimensions?: {
            unit: string;
            length: number;
            width: number;
            height: number;
        };
    };
}

export interface SquarespaceProductImage {
    id: string;
    url: string;
    altText?: string;
}

export interface SquarespaceProduct {
    id: string;
    type: "PHYSICAL" | "SERVICE" | "GIFT_CARD";
    storePageId: string;
    name: string;
    description?: string;
    url: string;
    urlSlug: string;
    tags: string[];
    isVisible: boolean;
    createdOn: string;
    modifiedOn: string;
    variants: SquarespaceProductVariant[];
    images: SquarespaceProductImage[];
}

export interface SquarespaceProductsResponse {
    products: SquarespaceProduct[];
    pagination?: SquarespacePagination;
}

export interface SquarespaceProductResponse {
    product?: SquarespaceProduct;
}

// ==========================================
// Order Types
// ==========================================

export interface SquarespaceAddress {
    firstName: string;
    lastName: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    postalCode: string;
    countryCode: string;
    phone?: string;
}

export interface SquarespaceLineItem {
    id: string;
    productId: string;
    productName: string;
    variantId: string;
    sku?: string;
    quantity: number;
    unitPricePaid: SquarespaceMoney;
    customizations?: Array<{
        label: string;
        value: string;
    }>;
}

export interface SquarespaceOrder {
    id: string;
    orderNumber: string;
    createdOn: string;
    modifiedOn: string;
    customerEmail: string;
    fulfillmentStatus: "PENDING" | "FULFILLED" | "CANCELED";
    subtotal: SquarespaceMoney;
    shippingTotal: SquarespaceMoney;
    discountTotal?: SquarespaceMoney;
    taxTotal: SquarespaceMoney;
    grandTotal: SquarespaceMoney;
    lineItems: SquarespaceLineItem[];
    shippingAddress?: SquarespaceAddress;
    billingAddress?: SquarespaceAddress;
    fulfillments?: SquarespaceOrderFulfillment[];
    channel?: string;
    externalOrderReference?: string;
}

export interface SquarespaceOrderFulfillment {
    shipDate?: string;
    carrierName?: string;
    service?: string;
    trackingNumber?: string;
    trackingUrl?: string;
}

export interface SquarespaceOrdersResponse {
    result: SquarespaceOrder[];
    pagination?: SquarespacePagination;
}

export interface SquarespaceOrderResponse {
    result?: SquarespaceOrder;
}

// ==========================================
// Inventory Types
// ==========================================

export interface SquarespaceInventoryItem {
    variantId: string;
    sku?: string;
    descriptor?: string;
    isUnlimited: boolean;
    quantity: number;
}

export interface SquarespaceInventoryResponse {
    inventory: SquarespaceInventoryItem[];
    pagination?: SquarespacePagination;
}

export interface SquarespaceInventoryItemResponse {
    variantId: string;
    sku?: string;
    descriptor?: string;
    isUnlimited: boolean;
    quantity: number;
}

// ==========================================
// Transaction Types
// ==========================================

export interface SquarespaceTransaction {
    id: string;
    createdOn: string;
    documentNumber?: string;
    salesOrderId?: string;
    total: SquarespaceMoney;
    customerEmail?: string;
    voided?: boolean;
}

export interface SquarespaceTransactionsResponse {
    documents: SquarespaceTransaction[];
    pagination?: SquarespacePagination;
}

// ==========================================
// Site Types
// ==========================================

export interface SquarespaceSite {
    id: string;
    title: string;
    domain: string;
    siteUrl: string;
    sslSetting?: string;
    created: string;
    modified: string;
}

export interface SquarespaceSiteResponse {
    site?: SquarespaceSite;
}
