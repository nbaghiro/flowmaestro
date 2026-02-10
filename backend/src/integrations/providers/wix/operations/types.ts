/**
 * Wix API Response Types
 */

// ==========================================
// Common Types
// ==========================================

export interface WixMoney {
    amount: string;
    currency: string;
    formattedAmount?: string;
}

export interface WixAddress {
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    subdivision?: string;
    country?: string;
    postalCode?: string;
}

export interface WixPagingMetadata {
    count: number;
    offset: number;
    total?: number;
    hasNext?: boolean;
}

// ==========================================
// Product Types
// ==========================================

export interface WixProductMedia {
    mainMedia?: {
        image?: {
            url: string;
            altText?: string;
        };
        video?: {
            url: string;
        };
    };
    items?: Array<{
        image?: {
            url: string;
            altText?: string;
        };
    }>;
}

export interface WixProductPriceData {
    currency: string;
    price: number;
    discountedPrice?: number;
    formatted?: {
        price: string;
        discountedPrice?: string;
    };
}

export interface WixProductStock {
    trackInventory: boolean;
    quantity?: number;
    inStock: boolean;
}

export interface WixProductVariant {
    id: string;
    choices: Record<string, string>;
    sku?: string;
    priceData?: WixProductPriceData;
    stock?: WixProductStock;
    weight?: number;
    visible?: boolean;
}

export interface WixProduct {
    id: string;
    name: string;
    slug: string;
    visible: boolean;
    productType: "physical" | "digital";
    description?: string;
    sku?: string;
    weight?: number;
    priceData?: WixProductPriceData;
    stock?: WixProductStock;
    variants?: WixProductVariant[];
    media?: WixProductMedia;
    createdDate?: string;
    lastUpdated?: string;
}

export interface WixProductResponse {
    product: WixProduct;
}

export interface WixProductsResponse {
    products: WixProduct[];
    pagingMetadata?: WixPagingMetadata;
}

// ==========================================
// Order Types
// ==========================================

export interface WixBuyerInfo {
    contactId?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
}

export interface WixOrderLineItem {
    id: string;
    productId?: string;
    name: string;
    quantity: number;
    sku?: string;
    price: WixMoney;
    totalPrice: WixMoney;
    image?: {
        url: string;
        altText?: string;
    };
}

export interface WixOrderTotals {
    subtotal: WixMoney;
    shipping?: WixMoney;
    tax?: WixMoney;
    discount?: WixMoney;
    total: WixMoney;
}

export interface WixShippingInfo {
    shipmentDetails?: {
        address?: WixAddress;
        trackingNumber?: string;
        trackingUrl?: string;
    };
}

export interface WixOrder {
    id: string;
    number: string;
    createdDate: string;
    updatedDate?: string;
    buyerInfo?: WixBuyerInfo;
    status: string;
    fulfillmentStatus: string;
    paymentStatus: string;
    lineItems: WixOrderLineItem[];
    totals: WixOrderTotals;
    shippingInfo?: WixShippingInfo;
    buyerNote?: string;
}

export interface WixOrderResponse {
    order: WixOrder;
}

export interface WixOrdersResponse {
    orders: WixOrder[];
    pagingMetadata?: WixPagingMetadata;
}

// ==========================================
// Inventory Types
// ==========================================

export interface WixPreorderInfo {
    enabled: boolean;
    message?: string;
    limit?: number;
}

export interface WixInventoryItem {
    id: string;
    productId: string;
    variantId?: string;
    trackQuantity: boolean;
    quantity?: number;
    preorderInfo?: WixPreorderInfo;
    lastUpdated?: string;
}

export interface WixInventoryResponse {
    inventoryItem: WixInventoryItem;
}

export interface WixInventoryItemsResponse {
    inventoryItems: WixInventoryItem[];
    pagingMetadata?: WixPagingMetadata;
}

// ==========================================
// Collection Types
// ==========================================

export interface WixCollectionMedia {
    mainMedia?: {
        image?: {
            url: string;
            altText?: string;
        };
    };
}

export interface WixCollection {
    id: string;
    name: string;
    slug?: string;
    description?: string;
    media?: WixCollectionMedia;
    numberOfProducts?: number;
    visible?: boolean;
}

export interface WixCollectionResponse {
    collection: WixCollection;
}

export interface WixCollectionsResponse {
    collections: WixCollection[];
    pagingMetadata?: WixPagingMetadata;
}

// ==========================================
// Error Types
// ==========================================

export interface WixErrorDetails {
    applicationError?: {
        code: string;
        description: string;
    };
}

export interface WixError {
    message: string;
    details?: WixErrorDetails;
}
