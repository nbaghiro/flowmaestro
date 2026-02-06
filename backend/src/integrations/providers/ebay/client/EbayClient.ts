/**
 * eBay HTTP Client
 *
 * Handles all HTTP communication with eBay APIs.
 * Uses OAuth2 Bearer token authentication.
 *
 * Base URL: https://api.ebay.com
 * APIs: Browse, Fulfillment, Inventory
 *
 * Rate limit: ~5000 calls/day (~80/min conservative)
 */

import { BaseAPIClient, type BaseAPIClientConfig } from "../../../core/BaseAPIClient";

export interface EbayClientConfig {
    accessToken: string;
    connectionId?: string;
}

// ============================================
// eBay API Types
// ============================================

export interface EbayItemSummary {
    itemId?: string;
    title?: string;
    price?: {
        value?: string;
        currency?: string;
    };
    condition?: string;
    image?: {
        imageUrl?: string;
    };
    itemWebUrl?: string;
    seller?: {
        username?: string;
        feedbackPercentage?: string;
    };
}

export interface EbayItem {
    itemId?: string;
    title?: string;
    shortDescription?: string;
    description?: string;
    price?: {
        value?: string;
        currency?: string;
    };
    condition?: string;
    conditionDescription?: string;
    categoryPath?: string;
    image?: {
        imageUrl?: string;
    };
    additionalImages?: Array<{
        imageUrl?: string;
    }>;
    itemWebUrl?: string;
    seller?: {
        username?: string;
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
            value?: string;
            currency?: string;
        };
    }>;
}

export interface EbaySearchResponse {
    itemSummaries?: EbayItemSummary[];
    total?: number;
    offset?: number;
    limit?: number;
}

export interface EbayOrder {
    orderId?: string;
    orderFulfillmentStatus?: string;
    creationDate?: string;
    buyer?: {
        username?: string;
    };
    pricingSummary?: {
        total?: {
            value?: string;
            currency?: string;
        };
        priceSubtotal?: {
            value?: string;
            currency?: string;
        };
        deliveryCost?: {
            value?: string;
            currency?: string;
        };
    };
    lineItems?: Array<{
        lineItemId?: string;
        title?: string;
        quantity?: number;
        lineItemCost?: {
            value?: string;
            currency?: string;
        };
        sku?: string;
    }>;
    fulfillmentStartInstructions?: Array<{
        shippingStep?: {
            shipTo?: {
                fullName?: string;
                contactAddress?: {
                    addressLine1?: string;
                    addressLine2?: string;
                    city?: string;
                    stateOrProvince?: string;
                    postalCode?: string;
                    countryCode?: string;
                };
            };
        };
    }>;
}

export interface EbayOrdersResponse {
    orders?: EbayOrder[];
    total?: number;
    offset?: number;
    limit?: number;
}

export interface EbayInventoryItem {
    sku?: string;
    product?: {
        title?: string;
        description?: string;
        brand?: string;
        mpn?: string;
        imageUrls?: string[];
    };
    condition?: string;
    availability?: {
        shipToLocationAvailability?: {
            quantity?: number;
        };
    };
}

export interface EbayShippingFulfillment {
    fulfillmentId?: string;
    shippedDate?: string;
    shippingCarrierCode?: string;
    trackingNumber?: string;
    lineItems?: Array<{
        lineItemId?: string;
        quantity?: number;
    }>;
}

interface EbayErrorResponse {
    errors?: Array<{
        errorId?: number;
        domain?: string;
        category?: string;
        message?: string;
        longMessage?: string;
    }>;
}

export class EbayClient extends BaseAPIClient {
    constructor(config: EbayClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://api.ebay.com",
            timeout: 30000,
            retryConfig: {
                maxRetries: 3,
                retryableStatuses: [429, 500, 502, 503, 504],
                retryableErrors: ["ECONNRESET", "ETIMEDOUT", "ENOTFOUND"],
                backoffStrategy: "exponential",
                initialDelay: 1000,
                maxDelay: 30000
            },
            connectionPool: {
                keepAlive: true,
                maxSockets: 50,
                maxFreeSockets: 10,
                keepAliveMsecs: 60000
            }
        };

        super(clientConfig);

        // Add authorization headers
        this.client.addRequestInterceptor((requestConfig) => {
            if (!requestConfig.headers) {
                requestConfig.headers = {};
            }
            requestConfig.headers["Authorization"] = `Bearer ${config.accessToken}`;
            requestConfig.headers["Content-Type"] = "application/json";
            requestConfig.headers["Accept"] = "application/json";
            return requestConfig;
        });
    }

    /**
     * Override to handle eBay-specific error formats
     */
    protected override async handleError(error: unknown): Promise<never> {
        if (error && typeof error === "object" && "response" in error) {
            const errorWithResponse = error as {
                response?: { status?: number; data?: EbayErrorResponse };
            };
            const response = errorWithResponse.response;

            const firstError = response?.data?.errors?.[0];

            if (firstError?.message) {
                throw new Error(
                    `eBay API error: ${firstError.message}${
                        firstError.errorId ? ` (errorId: ${firstError.errorId})` : ""
                    }`
                );
            }

            if (response?.status === 401) {
                throw new Error("eBay authentication failed. Please reconnect your eBay account.");
            }

            if (response?.status === 403) {
                throw new Error(
                    "eBay permission denied. Your account may not have access to this resource."
                );
            }

            if (response?.status === 404) {
                throw new Error("Resource not found on eBay.");
            }

            if (response?.status === 429) {
                throw new Error("eBay rate limit exceeded. Please try again later.");
            }
        }

        throw error;
    }

    // ============================================
    // Browse API Operations
    // ============================================

    /**
     * Search items on eBay
     */
    async searchItems(
        query: string,
        limit: number = 10,
        offset: number = 0
    ): Promise<EbaySearchResponse> {
        const params = new URLSearchParams({
            q: query,
            limit: String(limit),
            offset: String(offset)
        });
        return this.get(`/buy/browse/v1/item_summary/search?${params.toString()}`);
    }

    /**
     * Get a single item by ID
     */
    async getItem(itemId: string): Promise<EbayItem> {
        return this.get(`/buy/browse/v1/item/${encodeURIComponent(itemId)}`);
    }

    // ============================================
    // Fulfillment API Operations
    // ============================================

    /**
     * List orders with pagination
     */
    async listOrders(
        limit: number = 50,
        offset: number = 0,
        filter?: string
    ): Promise<EbayOrdersResponse> {
        const params = new URLSearchParams({
            limit: String(limit),
            offset: String(offset)
        });
        if (filter) {
            params.set("filter", filter);
        }
        return this.get(`/sell/fulfillment/v1/order?${params.toString()}`);
    }

    /**
     * Get a single order by ID
     */
    async getOrder(orderId: string): Promise<EbayOrder> {
        return this.get(`/sell/fulfillment/v1/order/${encodeURIComponent(orderId)}`);
    }

    /**
     * Create a shipping fulfillment for an order
     */
    async createShippingFulfillment(
        orderId: string,
        data: {
            lineItems: Array<{ lineItemId: string; quantity: number }>;
            shippedDate: string;
            shippingCarrierCode: string;
            trackingNumber: string;
        }
    ): Promise<EbayShippingFulfillment> {
        return this.post(
            `/sell/fulfillment/v1/order/${encodeURIComponent(orderId)}/shipping_fulfillment`,
            data
        );
    }

    // ============================================
    // Inventory API Operations
    // ============================================

    /**
     * Get an inventory item by SKU
     */
    async getInventoryItem(sku: string): Promise<EbayInventoryItem> {
        return this.get(`/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`);
    }

    /**
     * Create or replace an inventory item
     * Note: PUT returns 204 No Content on success
     */
    async createOrReplaceInventoryItem(
        sku: string,
        data: {
            product: {
                title: string;
                description?: string;
                brand?: string;
                mpn?: string;
                imageUrls?: string[];
            };
            condition: string;
            availability: {
                shipToLocationAvailability: {
                    quantity: number;
                };
            };
        }
    ): Promise<void> {
        await this.put(`/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`, data);
    }
}
