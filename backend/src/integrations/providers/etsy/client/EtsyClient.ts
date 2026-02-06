import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type { RequestConfig } from "../../../core/types";

export interface EtsyClientConfig {
    accessToken: string;
    clientId: string; // Required for x-api-key header
    shopId?: string;
    connectionId?: string;
}

/**
 * Etsy API Client with rate limiting and error handling
 *
 * Features:
 * - OAuth2 Bearer token + x-api-key header authentication
 * - Rate limiting (~10 req/sec conservative estimate)
 * - Exponential backoff on 429 errors
 * - Shop ID handling for shop-scoped operations
 */
export class EtsyClient extends BaseAPIClient {
    private accessToken: string;
    private clientId: string;
    private shopId: string | undefined;

    constructor(config: EtsyClientConfig) {
        const baseURL = "https://api.etsy.com/v3/application";

        const clientConfig: BaseAPIClientConfig = {
            baseURL,
            timeout: 30000,
            retryConfig: {
                maxRetries: 3,
                retryableStatuses: [429, 500, 502, 503, 504],
                backoffStrategy: "exponential",
                initialDelay: 1000,
                maxDelay: 10000
            },
            connectionPool: {
                maxSockets: 50,
                maxFreeSockets: 10,
                keepAlive: true
            }
        };

        super(clientConfig);

        this.accessToken = config.accessToken;
        this.clientId = config.clientId;
        this.shopId = config.shopId;

        // Add request interceptor for auth headers
        this.client.addRequestInterceptor((requestConfig) => {
            if (!requestConfig.headers) {
                requestConfig.headers = {};
            }
            requestConfig.headers["Authorization"] = `Bearer ${this.accessToken}`;
            requestConfig.headers["x-api-key"] = this.clientId;
            requestConfig.headers["Content-Type"] = "application/json";
            return requestConfig;
        });
    }

    /**
     * Override request to handle Etsy-specific rate limiting
     */
    async request<T = unknown>(config: RequestConfig): Promise<T> {
        try {
            const response = await super.request<T>(config);
            return response;
        } catch (error) {
            await this.handleError(error);
            throw error;
        }
    }

    /**
     * Handle Etsy-specific errors
     */
    protected async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const status = error.response.status;
            const data = error.response.data as Record<string, unknown>;

            // Handle rate limiting
            if (status === 429) {
                const retryAfter = error.response.headers?.["retry-after"];
                const delay = retryAfter ? parseInt(retryAfter as string, 10) * 1000 : 2000;
                throw new Error(`Rate limited. Retry after ${delay / 1000} seconds.`);
            }

            // Handle authentication errors
            if (status === 401) {
                throw new Error("Etsy authentication failed. Please reconnect your shop.");
            }

            // Handle forbidden (insufficient scopes)
            if (status === 403) {
                throw new Error("Insufficient permissions. Please check your app's access scopes.");
            }

            // Handle not found
            if (status === 404) {
                throw new Error("Resource not found. Please check the ID and try again.");
            }

            // Handle validation errors
            if (status === 400) {
                const errorMsg = data.error_description || data.error || "Bad request";
                throw new Error(`Validation error: ${errorMsg}`);
            }

            // Handle general API errors
            if (data.error) {
                const errorMsg =
                    typeof data.error === "string" ? data.error : JSON.stringify(data.error);
                throw new Error(`Etsy API error: ${errorMsg}`);
            }
        }

        throw error;
    }

    /**
     * Get shop ID
     */
    getShopId(): string | undefined {
        return this.shopId;
    }

    /**
     * Set shop ID (can be set after initial creation)
     */
    setShopId(shopId: string): void {
        this.shopId = shopId;
    }

    // ==========================================
    // Listing Operations
    // ==========================================

    /**
     * List active listings for a shop
     */
    async listListings(params: {
        shop_id: string;
        state?: string;
        limit?: number;
        offset?: number;
    }): Promise<unknown> {
        const { shop_id, ...queryParams } = params;
        return this.get(`/shops/${shop_id}/listings`, queryParams);
    }

    /**
     * Get a single listing by ID
     */
    async getListing(listingId: string, includes?: string[]): Promise<unknown> {
        const params = includes?.length ? { includes: includes.join(",") } : undefined;
        return this.get(`/listings/${listingId}`, params);
    }

    /**
     * Create a new draft listing
     */
    async createListing(
        shopId: string,
        listing: {
            quantity: number;
            title: string;
            description: string;
            price: number;
            who_made: string;
            when_made: string;
            taxonomy_id: number;
            shipping_profile_id?: number;
            return_policy_id?: number;
            materials?: string[];
            shop_section_id?: number;
            processing_min?: number;
            processing_max?: number;
            tags?: string[];
            styles?: string[];
            item_weight?: number;
            item_weight_unit?: string;
            item_length?: number;
            item_width?: number;
            item_height?: number;
            item_dimensions_unit?: string;
            is_personalizable?: boolean;
            personalization_is_required?: boolean;
            personalization_char_count_max?: number;
            personalization_instructions?: string;
            is_supply?: boolean;
            is_customizable?: boolean;
        }
    ): Promise<unknown> {
        return this.post(`/shops/${shopId}/listings`, listing);
    }

    /**
     * Update an existing listing
     */
    async updateListing(
        shopId: string,
        listingId: string,
        listing: {
            quantity?: number;
            title?: string;
            description?: string;
            price?: number;
            who_made?: string;
            when_made?: string;
            taxonomy_id?: number;
            tags?: string[];
            materials?: string[];
            shop_section_id?: number;
            processing_min?: number;
            processing_max?: number;
            state?: string;
        }
    ): Promise<unknown> {
        return this.patch(`/shops/${shopId}/listings/${listingId}`, listing);
    }

    /**
     * Delete a listing
     */
    async deleteListing(shopId: string, listingId: string): Promise<unknown> {
        return this.delete(`/shops/${shopId}/listings/${listingId}`);
    }

    // ==========================================
    // Inventory Operations
    // ==========================================

    /**
     * Get inventory for a listing
     */
    async getListingInventory(listingId: string): Promise<unknown> {
        return this.get(`/listings/${listingId}/inventory`);
    }

    /**
     * Update inventory for a listing
     */
    async updateListingInventory(
        listingId: string,
        inventory: {
            products: Array<{
                sku?: string;
                property_values?: Array<{
                    property_id: number;
                    value_ids: number[];
                    values: string[];
                }>;
                offerings: Array<{
                    price: number;
                    quantity: number;
                    is_enabled: boolean;
                }>;
            }>;
            price_on_property?: number[];
            quantity_on_property?: number[];
            sku_on_property?: number[];
        }
    ): Promise<unknown> {
        return this.put(`/listings/${listingId}/inventory`, inventory);
    }

    // ==========================================
    // Receipt (Order) Operations
    // ==========================================

    /**
     * List shop receipts (orders)
     */
    async listReceipts(params: {
        shop_id: string;
        min_created?: number;
        max_created?: number;
        min_last_modified?: number;
        max_last_modified?: number;
        was_paid?: boolean;
        was_shipped?: boolean;
        was_delivered?: boolean;
        limit?: number;
        offset?: number;
    }): Promise<unknown> {
        const { shop_id, ...queryParams } = params;
        return this.get(`/shops/${shop_id}/receipts`, queryParams);
    }

    /**
     * Get a single receipt by ID
     */
    async getReceipt(shopId: string, receiptId: string): Promise<unknown> {
        return this.get(`/shops/${shopId}/receipts/${receiptId}`);
    }

    /**
     * Create a shipment for a receipt (add tracking info)
     */
    async createReceiptShipment(
        shopId: string,
        receiptId: string,
        shipment: {
            tracking_code?: string;
            carrier_name?: string;
            send_bcc?: boolean;
            note_to_buyer?: string;
        }
    ): Promise<unknown> {
        return this.post(`/shops/${shopId}/receipts/${receiptId}/tracking`, shipment);
    }

    // ==========================================
    // Shop Operations
    // ==========================================

    /**
     * Get shop information
     */
    async getShop(shopId: string): Promise<unknown> {
        return this.get(`/shops/${shopId}`);
    }

    /**
     * Get the current user's information (useful for getting shop ID)
     */
    async getMe(): Promise<unknown> {
        return this.get("/users/me");
    }

    /**
     * Get shops for the current user
     */
    async getMyShops(): Promise<unknown> {
        // Get user info first, then get their shops
        const user = (await this.getMe()) as { user_id: number };
        return this.get(`/users/${user.user_id}/shops`);
    }
}
