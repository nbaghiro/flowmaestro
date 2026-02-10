import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type { RequestConfig } from "../../../core/types";

const REGION_ENDPOINTS: Record<string, string> = {
    na: "https://sellingpartnerapi-na.amazon.com",
    eu: "https://sellingpartnerapi-eu.amazon.com",
    fe: "https://sellingpartnerapi-fe.amazon.com"
};

export interface AmazonSellerCentralClientConfig {
    accessToken: string;
    region?: string;
    connectionId?: string;
}

/**
 * Amazon Seller Central SP-API Client
 *
 * Features:
 * - x-amz-access-token header authentication (Login with Amazon / OAuth2)
 * - Regional endpoint support (NA, EU, FE)
 * - Rate limit awareness with exponential backoff
 * - Connection pooling for performance
 */
export class AmazonSellerCentralClient extends BaseAPIClient {
    private accessToken: string;

    constructor(config: AmazonSellerCentralClientConfig) {
        const region = config.region || "na";
        const baseURL = REGION_ENDPOINTS[region] || REGION_ENDPOINTS.na;

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
                maxSockets: 10,
                maxFreeSockets: 5,
                keepAlive: true
            }
        };

        super(clientConfig);

        this.accessToken = config.accessToken;

        // Add request interceptor for authentication
        this.client.addRequestInterceptor((reqConfig) => {
            if (!reqConfig.headers) {
                reqConfig.headers = {};
            }
            reqConfig.headers["x-amz-access-token"] = this.accessToken;
            reqConfig.headers["Content-Type"] = "application/json";
            reqConfig.headers["Accept"] = "application/json";
            return reqConfig;
        });
    }

    /**
     * Override request to handle Amazon SP-API specific errors
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
     * Handle Amazon SP-API specific errors
     */
    protected async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const status = error.response.status;
            const data = error.response.data as Record<string, unknown>;

            if (status === 429) {
                const retryAfter = error.response.headers?.["x-amzn-ratelimit-limit"];
                throw new Error(
                    `Rate limited. Rate limit: ${retryAfter || "unknown"} requests/second.`
                );
            }

            if (status === 401) {
                throw new Error(
                    "Amazon SP-API authentication failed. Please reconnect your Amazon account."
                );
            }

            if (status === 403) {
                throw new Error(
                    "Access forbidden. Your application may not have the required role or scope."
                );
            }

            if (status === 404) {
                throw new Error("Resource not found. Please check the ID and try again.");
            }

            if (status === 400) {
                const errors = data.errors as
                    | Array<{ code?: string; message?: string }>
                    | undefined;
                const message = errors?.map((e) => e.message).join(", ") || "Invalid request";
                throw new Error(`Validation error: ${message}`);
            }

            if (data.errors) {
                const errors = data.errors as Array<{ code?: string; message?: string }>;
                const message = errors.map((e) => e.message).join(", ");
                throw new Error(`Amazon SP-API error: ${message}`);
            }
        }

        throw error;
    }

    // ==========================================
    // Order Operations (Orders API v0)
    // ==========================================

    async listOrders(params: {
        MarketplaceIds: string[];
        OrderStatuses?: string[];
        CreatedAfter?: string;
        CreatedBefore?: string;
        MaxResultsPerPage?: number;
    }): Promise<unknown> {
        const queryParams: Record<string, string> = {
            MarketplaceIds: params.MarketplaceIds.join(",")
        };
        if (params.OrderStatuses) {
            queryParams.OrderStatuses = params.OrderStatuses.join(",");
        }
        if (params.CreatedAfter) {
            queryParams.CreatedAfter = params.CreatedAfter;
        }
        if (params.CreatedBefore) {
            queryParams.CreatedBefore = params.CreatedBefore;
        }
        if (params.MaxResultsPerPage) {
            queryParams.MaxResultsPerPage = String(params.MaxResultsPerPage);
        }
        const response = await this.get<{ payload: unknown }>("/orders/v0/orders", queryParams);
        return response.payload;
    }

    async getOrder(orderId: string): Promise<unknown> {
        const response = await this.get<{ payload: unknown }>(`/orders/v0/orders/${orderId}`);
        return response.payload;
    }

    async getOrderItems(orderId: string): Promise<unknown> {
        const response = await this.get<{ payload: unknown }>(
            `/orders/v0/orders/${orderId}/orderItems`
        );
        return response.payload;
    }

    // ==========================================
    // Catalog Item Operations (Catalog Items API 2022-04-01)
    // ==========================================

    async searchCatalogItems(params: {
        marketplaceIds: string[];
        keywords?: string;
        identifiers?: string[];
        identifiersType?: string;
        pageSize?: number;
        pageToken?: string;
    }): Promise<unknown> {
        const queryParams: Record<string, string> = {
            marketplaceIds: params.marketplaceIds.join(",")
        };
        if (params.keywords) {
            queryParams.keywords = params.keywords;
        }
        if (params.identifiers) {
            queryParams.identifiers = params.identifiers.join(",");
        }
        if (params.identifiersType) {
            queryParams.identifiersType = params.identifiersType;
        }
        if (params.pageSize) {
            queryParams.pageSize = String(params.pageSize);
        }
        if (params.pageToken) {
            queryParams.pageToken = params.pageToken;
        }
        return this.get("/catalog/2022-04-01/items", queryParams);
    }

    async getCatalogItem(
        asin: string,
        params: {
            marketplaceIds: string[];
            includedData?: string[];
        }
    ): Promise<unknown> {
        const queryParams: Record<string, string> = {
            marketplaceIds: params.marketplaceIds.join(",")
        };
        if (params.includedData) {
            queryParams.includedData = params.includedData.join(",");
        }
        return this.get(`/catalog/2022-04-01/items/${asin}`, queryParams);
    }

    // ==========================================
    // FBA Inventory Operations (FBA Inventory API v1)
    // ==========================================

    async getInventorySummaries(params: {
        granularityType: string;
        granularityId: string;
        marketplaceIds: string[];
        sellerSkus?: string[];
        startDateTime?: string;
    }): Promise<unknown> {
        const queryParams: Record<string, string> = {
            details: "true",
            granularityType: params.granularityType,
            granularityId: params.granularityId,
            marketplaceIds: params.marketplaceIds.join(",")
        };
        if (params.sellerSkus) {
            queryParams.sellerSkus = params.sellerSkus.join(",");
        }
        if (params.startDateTime) {
            queryParams.startDateTime = params.startDateTime;
        }
        const response = await this.get<{ payload: unknown }>(
            "/fba/inventory/v1/summaries",
            queryParams
        );
        return response.payload;
    }

    // ==========================================
    // Product Pricing Operations (Pricing API v0)
    // ==========================================

    async getCompetitivePricing(params: {
        MarketplaceId: string;
        ItemType: string;
        Asins?: string[];
        Skus?: string[];
    }): Promise<unknown> {
        const queryParams: Record<string, string> = {
            MarketplaceId: params.MarketplaceId,
            ItemType: params.ItemType
        };
        if (params.Asins) {
            queryParams.Asins = params.Asins.join(",");
        }
        if (params.Skus) {
            queryParams.Skus = params.Skus.join(",");
        }
        const response = await this.get<{ payload: unknown }>(
            "/products/pricing/v0/competitivePrice",
            queryParams
        );
        return response.payload;
    }

    async getItemOffers(
        asin: string,
        params: {
            MarketplaceId: string;
            ItemCondition: string;
        }
    ): Promise<unknown> {
        const response = await this.get<{ payload: unknown }>(
            `/products/pricing/v0/listings/${asin}/offers`,
            {
                MarketplaceId: params.MarketplaceId,
                ItemCondition: params.ItemCondition
            }
        );
        return response.payload;
    }
}
