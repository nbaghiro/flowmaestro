import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";

export interface BillComClientConfig {
    accessToken: string;
    organizationId?: string;
    sandbox?: boolean;
}

/**
 * Bill.com API Client
 *
 * Bill.com uses OAuth2 for authentication with session management.
 * All API calls require the access token in the Authorization header.
 *
 * Rate limit: 100 requests/minute
 */
export class BillComClient extends BaseAPIClient {
    private accessToken: string;
    private organizationId?: string;

    constructor(config: BillComClientConfig) {
        const baseURL = config.sandbox
            ? "https://api-sandbox.bill.com/api/v2"
            : "https://api.bill.com/api/v2";

        const clientConfig: BaseAPIClientConfig = {
            baseURL,
            timeout: 30000,
            retryConfig: {
                maxRetries: 3,
                retryableStatuses: [429, 500, 502, 503],
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
        this.organizationId = config.organizationId;

        // Add request interceptor for auth
        this.client.addRequestInterceptor((requestConfig) => {
            if (!requestConfig.headers) {
                requestConfig.headers = {};
            }
            requestConfig.headers["Authorization"] = `Bearer ${this.accessToken}`;
            requestConfig.headers["Content-Type"] = "application/json";
            if (this.organizationId) {
                requestConfig.headers["X-Organization-Id"] = this.organizationId;
            }
            return requestConfig;
        });
    }

    /**
     * Handle Bill.com-specific errors
     */
    protected async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const data = error.response.data as {
                response_message?: string;
                response_status?: number;
                error_message?: string;
            };

            if (error.response.status === 401) {
                throw new Error(
                    "Bill.com access token is invalid or expired. Please reconnect your account."
                );
            }

            if (error.response.status === 403) {
                throw new Error("Permission denied. Check your Bill.com account permissions.");
            }

            if (error.response.status === 404) {
                throw new Error("Resource not found in Bill.com.");
            }

            if (error.response.status === 400) {
                const errorMessage =
                    data.response_message || data.error_message || "Validation failed";
                throw new Error(`Bill.com validation error: ${errorMessage}`);
            }

            if (error.response.status === 429) {
                throw new Error("Bill.com rate limit exceeded. Please try again later.");
            }

            if (data.response_message || data.error_message) {
                throw new Error(
                    `Bill.com API error: ${data.response_message || data.error_message}`
                );
            }
        }

        throw error;
    }

    /**
     * Set organization ID for multi-org support
     */
    setOrganizationId(orgId: string): void {
        this.organizationId = orgId;
    }
}
