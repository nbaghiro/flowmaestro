import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";

export interface SegmentClientConfig {
    writeKey: string;
    region?: "us" | "eu";
}

/**
 * Base URLs for different Segment regions
 */
const SEGMENT_URLS: Record<string, string> = {
    us: "https://api.segment.io/v1",
    eu: "https://events.eu1.segmentapis.com/v1"
};

/**
 * Segment API Client
 *
 * Uses Write Key authentication via HTTP Basic Auth:
 * - Username: Write Key
 * - Password: (empty)
 * Authorization: Basic base64(writeKey:)
 *
 * Rate limits:
 * - 1,000 requests per second per workspace
 * - Batch endpoint: max 500KB per request, 32KB per event, 2500 events max
 */
export class SegmentClient extends BaseAPIClient {
    private writeKey: string;
    private authHeader: string;

    constructor(config: SegmentClientConfig) {
        const region = config.region || "us";
        const baseURL = SEGMENT_URLS[region] || SEGMENT_URLS.us;

        const clientConfig: BaseAPIClientConfig = {
            baseURL,
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

        this.writeKey = config.writeKey;

        // Create Basic Auth header: base64(writeKey:)
        // Note: Password is empty for Segment
        const credentials = Buffer.from(`${this.writeKey}:`).toString("base64");
        this.authHeader = `Basic ${credentials}`;

        // Add request interceptor for auth header
        this.client.addRequestInterceptor((reqConfig) => {
            if (!reqConfig.headers) {
                reqConfig.headers = {};
            }
            reqConfig.headers["Authorization"] = this.authHeader;
            reqConfig.headers["Content-Type"] = "application/json";
            return reqConfig;
        });
    }

    /**
     * Track an event
     */
    async track(data: Record<string, unknown>): Promise<SegmentResponse> {
        return this.post<SegmentResponse>("/track", data);
    }

    /**
     * Identify a user
     */
    async identify(data: Record<string, unknown>): Promise<SegmentResponse> {
        return this.post<SegmentResponse>("/identify", data);
    }

    /**
     * Track a page view
     */
    async page(data: Record<string, unknown>): Promise<SegmentResponse> {
        return this.post<SegmentResponse>("/page", data);
    }

    /**
     * Track a screen view (mobile)
     */
    async screen(data: Record<string, unknown>): Promise<SegmentResponse> {
        return this.post<SegmentResponse>("/screen", data);
    }

    /**
     * Associate a user with a group
     */
    async group(data: Record<string, unknown>): Promise<SegmentResponse> {
        return this.post<SegmentResponse>("/group", data);
    }

    /**
     * Link two user identities
     */
    async alias(data: Record<string, unknown>): Promise<SegmentResponse> {
        return this.post<SegmentResponse>("/alias", data);
    }

    /**
     * Send multiple events in a single batch
     */
    async batch(data: Record<string, unknown>): Promise<SegmentResponse> {
        return this.post<SegmentResponse>("/batch", data);
    }

    /**
     * Handle Segment-specific errors
     */
    protected async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const data = error.response.data as {
                message?: string;
                success?: boolean;
                error?: string;
            };

            // Map common Segment errors
            if (error.response.status === 401) {
                throw new Error("Segment Write Key is invalid. Please check your credentials.");
            }

            if (error.response.status === 400) {
                const message = data.message || data.error || "Bad request";
                throw new Error(`Segment API error: ${message}`);
            }

            if (error.response.status === 413) {
                throw new Error(
                    "Segment API error: Request payload too large. Maximum 500KB per request."
                );
            }

            if (error.response.status === 429) {
                throw new Error(
                    "Rate limited by Segment. Maximum 1,000 requests/second per workspace."
                );
            }

            if (data.message || data.error) {
                throw new Error(`Segment API error: ${data.message || data.error}`);
            }
        }

        throw error;
    }
}

/**
 * Segment API response type
 */
export interface SegmentResponse {
    success: boolean;
}
