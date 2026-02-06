import { BaseAPIClient } from "../../../core/BaseAPIClient";
import { ZOHO_DATA_CENTERS, type ZohoDataCenter } from "../operations/types";

export interface ZohoCrmClientConfig {
    accessToken: string;
    connectionId: string;
    dataCenter?: ZohoDataCenter;
}

/**
 * Zoho CRM API Client
 *
 * Handles HTTP communication with Zoho CRM API v8
 *
 * Key differences from other providers:
 * - Multi-region data center support (US, EU, AU, IN, JP, CN, CA)
 * - Uses "Zoho-oauthtoken" instead of "Bearer" for auth header
 * - API version 8 (latest as of 2024)
 *
 * Rate Limits:
 * - Concurrency-based (not time-based)
 * - Credits per 24h: varies by edition (Enterprise = 5M)
 * - Batch: up to 100 records per insert/update/delete
 * - Fetch: up to 200 records per GET
 *
 * Documentation: https://www.zoho.com/crm/developer/docs/api/v8/
 */
export class ZohoCrmClient extends BaseAPIClient {
    private dataCenter: ZohoDataCenter;

    constructor(config: ZohoCrmClientConfig) {
        const dataCenter = config.dataCenter || "us";
        const dcConfig = ZOHO_DATA_CENTERS[dataCenter];

        super({
            baseURL: dcConfig.apiUrl,
            timeout: 30000
        });

        this.dataCenter = dataCenter;

        // Add authorization header via interceptor
        // CRITICAL: Zoho uses "Zoho-oauthtoken" NOT "Bearer"
        this.client.addRequestInterceptor((requestConfig) => {
            if (!requestConfig.headers) {
                requestConfig.headers = {};
            }
            requestConfig.headers["Authorization"] = `Zoho-oauthtoken ${config.accessToken}`;
            requestConfig.headers["Content-Type"] = "application/json";
            return requestConfig;
        });
    }

    /**
     * Get the data center being used
     */
    getDataCenter(): ZohoDataCenter {
        return this.dataCenter;
    }

    /**
     * Get the API URL for this data center
     */
    getApiUrl(): string {
        return ZOHO_DATA_CENTERS[this.dataCenter].apiUrl;
    }
}
