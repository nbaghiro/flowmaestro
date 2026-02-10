/**
 * eBay Operation Types
 *
 * Type definitions used across eBay operations
 */

export interface EbayItemSummaryOutput {
    itemId: string;
    title: string;
    price?: {
        value: string;
        currency: string;
    };
    condition?: string;
    image?: string;
    itemWebUrl?: string;
    seller?: {
        username: string;
        feedbackPercentage?: string;
    };
}

export interface EbayItemOutput {
    itemId: string;
    title: string;
    description?: string;
    price?: {
        value: string;
        currency: string;
    };
    condition?: string;
    conditionDescription?: string;
    categoryPath?: string;
    images?: string[];
    itemWebUrl?: string;
    seller?: {
        username: string;
        feedbackPercentage?: string;
        feedbackScore?: number;
    };
    brand?: string;
    mpn?: string;
    color?: string;
    size?: string;
    itemLocation?: {
        city?: string;
        stateOrProvince?: string;
        postalCode?: string;
        country?: string;
    };
    shippingOptions?: Array<{
        shippingCostType?: string;
        shippingCost?: {
            value: string;
            currency: string;
        };
    }>;
}

export interface EbayOrderOutput {
    orderId: string;
    orderStatus?: string;
    creationDate?: string;
    buyer?: {
        username: string;
    };
    pricingSummary?: {
        total?: {
            value: string;
            currency: string;
        };
        subtotal?: {
            value: string;
            currency: string;
        };
        deliveryCost?: {
            value: string;
            currency: string;
        };
    };
    lineItems: Array<{
        lineItemId: string;
        title?: string;
        quantity?: number;
        lineItemCost?: {
            value: string;
            currency: string;
        };
        sku?: string;
    }>;
    shippingAddress?: {
        addressLine1?: string;
        addressLine2?: string;
        city?: string;
        stateOrProvince?: string;
        postalCode?: string;
        countryCode?: string;
    };
    fulfillmentStartInstructions?: Array<{
        shippingStep?: {
            shipTo?: {
                fullName?: string;
            };
        };
    }>;
}

export interface EbayInventoryItemOutput {
    sku: string;
    title?: string;
    description?: string;
    condition?: string;
    quantity?: number;
    images?: string[];
    brand?: string;
    mpn?: string;
}

export interface EbayShippingFulfillmentOutput {
    fulfillmentId: string;
    trackingNumber?: string;
    shippingCarrierCode?: string;
    shippedDate?: string;
    lineItems: Array<{
        lineItemId: string;
        quantity: number;
    }>;
}
