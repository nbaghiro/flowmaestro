import { BaseAPIClient } from "../../../core/BaseAPIClient";

export interface PipedriveClientConfig {
    accessToken: string;
    apiDomain: string;
    connectionId: string;
}

/**
 * Pipedrive API Client
 *
 * Handles HTTP communication with Pipedrive API v1
 * Base URL: Dynamic - from OAuth token response (e.g., https://company.pipedrive.com/api/v1)
 *
 * Rate Limits:
 * - Burst: 10 requests per 2-second rolling window per token
 * - Daily token budget varies by plan
 */
export class PipedriveClient extends BaseAPIClient {
    constructor(config: PipedriveClientConfig) {
        super({
            baseURL: `${config.apiDomain}/api/v1`,
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
