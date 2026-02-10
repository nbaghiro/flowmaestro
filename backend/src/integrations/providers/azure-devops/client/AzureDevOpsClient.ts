import { BaseAPIClient } from "../../../core/BaseAPIClient";
import type { BaseAPIClientConfig } from "../../../core/BaseAPIClient";

/**
 * Azure DevOps Client configuration
 */
export interface AzureDevOpsClientConfig {
    accessToken: string;
    organization: string;
}

/**
 * Azure DevOps API client
 *
 * Handles authentication and requests to Azure DevOps REST API
 * API Documentation: https://docs.microsoft.com/en-us/rest/api/azure/devops/
 */
export class AzureDevOpsClient {
    readonly organization: string;
    private client: BaseAPIClient;
    private accessToken: string;

    constructor(config: AzureDevOpsClientConfig) {
        this.organization = config.organization;
        this.accessToken = config.accessToken;

        const baseURL = `https://dev.azure.com/${this.organization}`;

        const clientConfig: BaseAPIClientConfig = {
            baseURL,
            timeout: 60000,
            retryConfig: {
                maxRetries: 3,
                retryableStatuses: [429, 500, 502, 503, 504],
                backoffStrategy: "exponential",
                initialDelay: 1000,
                maxDelay: 10000
            }
        };

        // Create client using anonymous class pattern
        this.client = new (class extends BaseAPIClient {
            constructor(config: BaseAPIClientConfig, accessToken: string) {
                super(config);
                // Add request interceptor for OAuth2 authentication and API version
                this.client.addRequestInterceptor((requestConfig) => {
                    if (!requestConfig.headers) {
                        requestConfig.headers = {};
                    }
                    requestConfig.headers["Authorization"] = `Bearer ${accessToken}`;
                    requestConfig.headers["Content-Type"] = "application/json";

                    // Add API version to URL if not already present
                    if (requestConfig.url && !requestConfig.url.includes("api-version=")) {
                        const separator = requestConfig.url.includes("?") ? "&" : "?";
                        requestConfig.url = `${requestConfig.url}${separator}api-version=7.2`;
                    }

                    return requestConfig;
                });
            }
        })(clientConfig, this.accessToken);
    }

    /**
     * Make GET request
     */
    async get<T>(url: string): Promise<T> {
        return this.client.get<T>(url);
    }

    /**
     * Make POST request
     */
    async post<T>(url: string, data?: unknown): Promise<T> {
        return this.client.post<T>(url, data);
    }

    /**
     * Make PATCH request
     */
    async patch<T>(url: string, data: unknown): Promise<T> {
        return this.client.patch<T>(url, data);
    }

    /**
     * Make PUT request
     */
    async put<T>(url: string, data: unknown): Promise<T> {
        return this.client.request<T>({
            method: "PUT",
            url,
            data
        });
    }

    /**
     * Make DELETE request
     */
    async delete<T>(url: string): Promise<T> {
        return this.client.delete<T>(url);
    }

    /**
     * Make request with custom configuration
     */
    async request<T>(config: {
        method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
        url: string;
        data?: unknown;
        headers?: Record<string, string>;
    }): Promise<T> {
        return this.client.request<T>(config);
    }
}
