import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";

export interface GoogleFormsClientConfig {
    accessToken: string;
    connectionId?: string;
}

interface GoogleFormsErrorResponse {
    error: {
        code: number;
        message: string;
        status: string;
        details?: unknown[];
    };
}

/**
 * Google Forms API v1 Client with connection pooling and error handling
 *
 * API Documentation: https://developers.google.com/forms/api/reference/rest
 * Base URL: https://forms.googleapis.com
 */
export class GoogleFormsClient extends BaseAPIClient {
    private accessToken: string;

    constructor(config: GoogleFormsClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://forms.googleapis.com",
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
     * Handle Google Forms API-specific errors
     */
    protected async handleError(
        error: Error & {
            response?: { status?: number; data?: unknown; headers?: Record<string, string> };
        }
    ): Promise<never> {
        if (error.response) {
            const { status, data } = error.response;

            // Map common Google Forms errors
            if (status === 401) {
                throw new Error("Google Forms authentication failed. Please reconnect.");
            }

            if (status === 403) {
                const errorData = data as GoogleFormsErrorResponse;
                throw new Error(
                    `Permission denied: ${errorData?.error?.message || "You don't have permission to access this resource."}`
                );
            }

            if (status === 404) {
                throw new Error("Form or resource not found.");
            }

            if (status === 429) {
                const retryAfter = error.response.headers?.["retry-after"];
                throw new Error(
                    `Google Forms rate limit exceeded. Retry after ${retryAfter || "60"} seconds.`
                );
            }

            if (status === 400) {
                const errorData = data as GoogleFormsErrorResponse;
                throw new Error(`Invalid request: ${errorData?.error?.message || "Bad request"}`);
            }

            // Handle structured error response
            if ((data as GoogleFormsErrorResponse)?.error) {
                const errorData = data as GoogleFormsErrorResponse;
                throw new Error(`Google Forms API error: ${errorData.error.message}`);
            }
        }

        throw error;
    }

    // ==================== Form Operations ====================

    /**
     * Get form metadata and structure
     */
    async getForm(formId: string): Promise<unknown> {
        return this.get(`/v1/forms/${formId}`);
    }

    /**
     * Create a new form
     */
    async createForm(params: { title: string }): Promise<unknown> {
        return this.post("/v1/forms", {
            info: {
                title: params.title
            }
        });
    }

    /**
     * Batch update a form (add/modify questions, settings, etc.)
     */
    async batchUpdateForm(formId: string, requests: unknown[]): Promise<unknown> {
        return this.post(`/v1/forms/${formId}:batchUpdate`, {
            requests
        });
    }

    // ==================== Response Operations ====================

    /**
     * List all responses for a form
     */
    async listResponses(
        formId: string,
        params?: {
            pageSize?: number;
            pageToken?: string;
            filter?: string;
        }
    ): Promise<unknown> {
        const queryParams: Record<string, string> = {};

        if (params?.pageSize) {
            queryParams.pageSize = params.pageSize.toString();
        }
        if (params?.pageToken) {
            queryParams.pageToken = params.pageToken;
        }
        if (params?.filter) {
            queryParams.filter = params.filter;
        }

        return this.get(`/v1/forms/${formId}/responses`, {
            params: queryParams
        });
    }

    /**
     * Get a single response by ID
     */
    async getResponse(formId: string, responseId: string): Promise<unknown> {
        return this.get(`/v1/forms/${formId}/responses/${responseId}`);
    }
}
