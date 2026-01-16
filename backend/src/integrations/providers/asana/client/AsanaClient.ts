import { BaseAPIClient } from "../../../core/BaseAPIClient";

export interface AsanaClientConfig {
    accessToken: string;
    connectionId: string;
}

/**
 * Asana API response wrapper
 * Asana wraps all responses in a "data" field
 */
export interface AsanaResponse<T> {
    data: T;
}

/**
 * Asana paginated response
 */
export interface AsanaPaginatedResponse<T> {
    data: T[];
    next_page?: {
        offset: string;
        path: string;
        uri: string;
    } | null;
}

/**
 * Asana API error response
 */
export interface AsanaErrorResponse {
    errors: Array<{
        message: string;
        help?: string;
        phrase?: string;
    }>;
}

/**
 * Asana REST API Client
 * Handles authentication, pagination, and error handling
 */
export class AsanaClient extends BaseAPIClient {
    private accessToken: string;

    constructor(config: AsanaClientConfig) {
        super({
            baseURL: "https://app.asana.com/api/1.0",
            timeout: 30000,
            retryConfig: {
                maxRetries: 3,
                retryableStatuses: [429, 500, 502, 503, 504],
                backoffStrategy: "exponential"
            }
        });

        this.accessToken = config.accessToken;

        // Add request interceptor for authentication
        this.client.addRequestInterceptor((requestConfig) => {
            if (!requestConfig.headers) {
                requestConfig.headers = {};
            }
            requestConfig.headers["Authorization"] = `Bearer ${this.accessToken}`;
            requestConfig.headers["Accept"] = "application/json";

            // Set Content-Type for JSON payloads
            if (
                requestConfig.data &&
                !(requestConfig.data instanceof FormData) &&
                typeof requestConfig.data === "object"
            ) {
                requestConfig.headers["Content-Type"] = "application/json";
            }

            return requestConfig;
        });
    }

    /**
     * Make a GET request and unwrap the Asana response
     */
    async getAsana<T>(url: string, params?: Record<string, unknown>): Promise<T> {
        const response = await this.get<AsanaResponse<T>>(url, params);
        return response.data;
    }

    /**
     * Make a POST request and unwrap the Asana response
     */
    async postAsana<T>(url: string, data?: unknown): Promise<T> {
        // Asana expects data wrapped in a "data" field for POST/PUT
        const response = await this.post<AsanaResponse<T>>(url, { data });
        return response.data;
    }

    /**
     * Make a PUT request and unwrap the Asana response
     */
    async putAsana<T>(url: string, data?: unknown): Promise<T> {
        // Asana expects data wrapped in a "data" field for POST/PUT
        const response = await this.put<AsanaResponse<T>>(url, { data });
        return response.data;
    }

    /**
     * Make a DELETE request and handle Asana response
     */
    async deleteAsana(url: string): Promise<void> {
        await this.delete(url);
    }

    /**
     * Get paginated results from Asana
     * Handles the next_page pattern
     */
    async getPaginated<T>(
        url: string,
        params?: Record<string, unknown>,
        limit?: number
    ): Promise<T[]> {
        const results: T[] = [];
        let offset: string | undefined;
        const maxResults = limit || 100;

        do {
            const queryParams = {
                ...params,
                limit: Math.min(maxResults - results.length, 100),
                ...(offset && { offset })
            };

            const response = await this.get<AsanaPaginatedResponse<T>>(url, queryParams);
            results.push(...response.data);

            // Check if there are more results
            offset = response.next_page?.offset;
        } while (offset && results.length < maxResults);

        return results;
    }

    /**
     * Build opt_fields query parameter
     */
    buildOptFields(fields?: string[]): string | undefined {
        if (!fields || fields.length === 0) {
            return undefined;
        }
        return fields.join(",");
    }

    /**
     * Override handleError to map Asana-specific errors
     */
    protected handleError(error: unknown): never {
        if (error && typeof error === "object") {
            const err = error as {
                response?: {
                    status?: number;
                    data?: AsanaErrorResponse;
                };
                message?: string;
            };

            const status = err.response?.status;
            const errorData = err.response?.data;

            // Map Asana errors to user-friendly messages
            if (status === 401) {
                throw new Error(
                    "Invalid or expired Asana credentials. Please reconnect your account."
                );
            } else if (status === 402) {
                throw new Error("This feature requires a paid Asana plan.");
            } else if (status === 403) {
                throw new Error("Insufficient permissions for this Asana operation.");
            } else if (status === 404) {
                throw new Error("Resource not found in Asana. It may have been deleted.");
            } else if (status === 429) {
                throw new Error("Asana rate limit exceeded. Please try again later.");
            } else if (status === 451) {
                throw new Error("This Asana operation is not available in your region.");
            } else if (errorData?.errors && errorData.errors.length > 0) {
                const messages = errorData.errors.map((e) => e.message).join("; ");
                throw new Error(messages);
            } else if (err.message) {
                throw new Error(err.message);
            }
        }

        throw new Error("Unknown Asana API error");
    }
}
