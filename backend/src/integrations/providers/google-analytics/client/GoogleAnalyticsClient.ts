import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type { OAuth2TokenData } from "../../../../storage/models/Connection";

export interface GoogleAnalyticsClientConfig {
    accessToken: string;
    connectionId?: string;
    onTokenRefresh?: (tokens: OAuth2TokenData) => Promise<void>;
}

interface GoogleAnalyticsErrorResponse {
    error: {
        code: number;
        message: string;
        status: string;
        details?: unknown[];
    };
}

/**
 * Google Analytics Data API v1beta Client
 *
 * API Documentation: https://developers.google.com/analytics/devguides/reporting/data/v1
 * Base URL: https://analyticsdata.googleapis.com
 */
export class GoogleAnalyticsClient extends BaseAPIClient {
    private accessToken: string;

    constructor(config: GoogleAnalyticsClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://analyticsdata.googleapis.com",
            timeout: 30000,
            retryConfig: {
                maxRetries: 3,
                retryableStatuses: [429, 500, 502, 503, 504],
                backoffStrategy: "exponential"
            },
            connectionPool: {
                maxSockets: 50,
                maxFreeSockets: 10,
                keepAlive: true
            }
        };

        super(clientConfig);
        this.accessToken = config.accessToken;

        // Add request interceptor for auth header
        this.client.addRequestInterceptor((config) => {
            if (!config.headers) {
                config.headers = {};
            }
            config.headers["Authorization"] = `Bearer ${this.accessToken}`;
            config.headers["Content-Type"] = "application/json";
            return config;
        });
    }

    /**
     * Handle Google Analytics API-specific errors
     */
    protected async handleError(
        error: Error & {
            response?: { status?: number; data?: unknown; headers?: Record<string, string> };
        }
    ): Promise<never> {
        if (error.response) {
            const { status, data } = error.response;

            if (status === 401) {
                throw new Error("Google Analytics authentication failed. Please reconnect.");
            }

            if (status === 403) {
                const errorData = data as GoogleAnalyticsErrorResponse;
                throw new Error(
                    `Permission denied: ${errorData?.error?.message || "You don't have permission to access this resource."}`
                );
            }

            if (status === 404) {
                throw new Error("Analytics property or resource not found.");
            }

            if (status === 429) {
                const retryAfter = error.response.headers?.["retry-after"];
                throw new Error(
                    `Google Analytics rate limit exceeded. Retry after ${retryAfter || "60"} seconds.`
                );
            }

            if (status === 400) {
                const errorData = data as GoogleAnalyticsErrorResponse;
                throw new Error(`Invalid request: ${errorData?.error?.message || "Bad request"}`);
            }

            if ((data as GoogleAnalyticsErrorResponse)?.error) {
                const errorData = data as GoogleAnalyticsErrorResponse;
                throw new Error(`Google Analytics API error: ${errorData.error.message}`);
            }
        }

        throw error;
    }

    // ==================== Admin API Operations ====================

    /**
     * List accessible GA4 properties
     * Uses Admin API
     */
    async listProperties(params: {
        pageSize?: number;
        pageToken?: string;
        filter?: string;
    }): Promise<unknown> {
        const queryParams: Record<string, string> = {};
        if (params.pageSize) queryParams.pageSize = params.pageSize.toString();
        if (params.pageToken) queryParams.pageToken = params.pageToken;
        if (params.filter) queryParams.filter = params.filter;

        // Admin API has a different base URL
        const response = await fetch(
            `https://analyticsadmin.googleapis.com/v1beta/properties?${new URLSearchParams(queryParams).toString()}`,
            {
                headers: {
                    Authorization: `Bearer ${this.accessToken}`,
                    "Content-Type": "application/json"
                }
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
                (errorData as GoogleAnalyticsErrorResponse)?.error?.message ||
                    `HTTP ${response.status}: ${response.statusText}`
            );
        }

        return response.json();
    }

    // ==================== Data API Operations ====================

    /**
     * Run a report for a property
     */
    async runReport(params: {
        propertyId: string;
        dateRanges: Array<{ startDate: string; endDate: string }>;
        dimensions?: Array<{ name: string }>;
        metrics: Array<{ name: string }>;
        dimensionFilter?: unknown;
        metricFilter?: unknown;
        orderBys?: unknown[];
        limit?: number;
        offset?: number;
    }): Promise<unknown> {
        return this.post(`/v1beta/properties/${params.propertyId}:runReport`, {
            dateRanges: params.dateRanges,
            dimensions: params.dimensions,
            metrics: params.metrics,
            dimensionFilter: params.dimensionFilter,
            metricFilter: params.metricFilter,
            orderBys: params.orderBys,
            limit: params.limit,
            offset: params.offset
        });
    }

    /**
     * Run multiple reports in a batch
     */
    async batchRunReports(params: {
        propertyId: string;
        requests: Array<{
            dateRanges: Array<{ startDate: string; endDate: string }>;
            dimensions?: Array<{ name: string }>;
            metrics: Array<{ name: string }>;
            dimensionFilter?: unknown;
            metricFilter?: unknown;
            limit?: number;
        }>;
    }): Promise<unknown> {
        return this.post(`/v1beta/properties/${params.propertyId}:batchRunReports`, {
            requests: params.requests
        });
    }

    /**
     * Run a real-time report
     */
    async runRealtimeReport(params: {
        propertyId: string;
        dimensions?: Array<{ name: string }>;
        metrics: Array<{ name: string }>;
        dimensionFilter?: unknown;
        metricFilter?: unknown;
        limit?: number;
    }): Promise<unknown> {
        return this.post(`/v1beta/properties/${params.propertyId}:runRealtimeReport`, {
            dimensions: params.dimensions,
            metrics: params.metrics,
            dimensionFilter: params.dimensionFilter,
            metricFilter: params.metricFilter,
            limit: params.limit
        });
    }

    /**
     * Get metadata about dimensions and metrics
     */
    async getMetadata(params: { propertyId: string }): Promise<unknown> {
        return this.get(`/v1beta/properties/${params.propertyId}/metadata`);
    }
}
