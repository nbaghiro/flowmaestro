import { BaseAPIClient } from "../../../core/BaseAPIClient";

export interface CloseClientConfig {
    accessToken: string;
    connectionId: string;
}

/**
 * Close CRM API Client
 *
 * Handles HTTP communication with Close API v1
 * Base URL: https://api.close.com/api/v1
 *
 * Rate Limits:
 * - Lead POSTs: 40 requests per second
 * - Reports GETs: 10 requests per second
 * - Organization limit: 3× individual API key limits
 */
export class CloseClient extends BaseAPIClient {
    constructor(config: CloseClientConfig) {
        super({
            baseURL: "https://api.close.com/api/v1",
            timeout: 30000
        });

        // Add authorization header via interceptor
        this.client.addRequestInterceptor((requestConfig) => {
            if (!requestConfig.headers) {
                requestConfig.headers = {};
            }
            requestConfig.headers["Authorization"] = `Bearer ${config.accessToken}`;
            requestConfig.headers["Content-Type"] = "application/json";
            return requestConfig;
        });
    }
}
