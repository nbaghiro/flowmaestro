import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type { OAuth2TokenData } from "../../../../storage/models/Connection";

export interface TypeformClientConfig {
    accessToken: string;
    connectionId?: string;
    onTokenRefresh?: (tokens: OAuth2TokenData) => Promise<void>;
}

/**
 * Typeform REST API Client with connection pooling and error handling
 */
export class TypeformClient extends BaseAPIClient {
    private accessToken: string;

    constructor(config: TypeformClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://api.typeform.com",
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

        // Add request interceptor for auth header
        this.client.addRequestInterceptor((requestConfig) => {
            if (!requestConfig.headers) {
                requestConfig.headers = {};
            }
            requestConfig.headers["Authorization"] = `Bearer ${this.accessToken}`;
            requestConfig.headers["Content-Type"] = "application/json";
            return requestConfig;
        });
    }

    /**
     * Handle Typeform-specific errors
     */
    protected async handleError(
        error: Error & {
            response?: { status?: number; data?: unknown; headers?: Record<string, string> };
        }
    ): Promise<never> {
        if (error.response) {
            const { status, data } = error.response;

            // Map common Typeform errors
            if (status === 401) {
                throw new Error("Typeform authentication failed. Please reconnect.");
            }

            if (status === 403) {
                throw new Error("You don't have permission to access this Typeform resource.");
            }

            if (status === 404) {
                throw new Error("Typeform resource not found.");
            }

            if (status === 429) {
                const retryAfter = error.response.headers?.["retry-after"];
                throw new Error(
                    `Typeform rate limit exceeded. Retry after ${retryAfter || "a few"} seconds.`
                );
            }

            // Handle error response body
            if (data && typeof data === "object") {
                const errorData = data as { code?: string; description?: string };
                if (errorData.description) {
                    throw new Error(`Typeform API error: ${errorData.description}`);
                }
            }
        }

        throw error;
    }

    /**
     * List all forms in the account
     */
    async listForms(params?: {
        page?: number;
        pageSize?: number;
        search?: string;
        workspaceId?: string;
    }): Promise<unknown> {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.set("page", params.page.toString());
        if (params?.pageSize) queryParams.set("page_size", params.pageSize.toString());
        if (params?.search) queryParams.set("search", params.search);
        if (params?.workspaceId) queryParams.set("workspace_id", params.workspaceId);

        const url = queryParams.toString() ? `/forms?${queryParams.toString()}` : "/forms";
        return this.get(url);
    }

    /**
     * Get a single form by ID
     */
    async getForm(formId: string): Promise<unknown> {
        return this.get(`/forms/${formId}`);
    }

    /**
     * List responses for a form
     */
    async listResponses(
        formId: string,
        params?: {
            pageSize?: number;
            since?: string;
            until?: string;
            after?: string;
            before?: string;
            includedResponseIds?: string;
            completed?: boolean;
            sort?: "submitted_at,asc" | "submitted_at,desc";
            query?: string;
            fields?: string[];
        }
    ): Promise<unknown> {
        const queryParams = new URLSearchParams();
        if (params?.pageSize) queryParams.set("page_size", params.pageSize.toString());
        if (params?.since) queryParams.set("since", params.since);
        if (params?.until) queryParams.set("until", params.until);
        if (params?.after) queryParams.set("after", params.after);
        if (params?.before) queryParams.set("before", params.before);
        if (params?.includedResponseIds)
            queryParams.set("included_response_ids", params.includedResponseIds);
        if (params?.completed !== undefined)
            queryParams.set("completed", params.completed.toString());
        if (params?.sort) queryParams.set("sort", params.sort);
        if (params?.query) queryParams.set("query", params.query);
        if (params?.fields) queryParams.set("fields", params.fields.join(","));

        const url = queryParams.toString()
            ? `/forms/${formId}/responses?${queryParams.toString()}`
            : `/forms/${formId}/responses`;
        return this.get(url);
    }

    /**
     * List all workspaces
     */
    async listWorkspaces(params?: {
        page?: number;
        pageSize?: number;
        search?: string;
    }): Promise<unknown> {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.set("page", params.page.toString());
        if (params?.pageSize) queryParams.set("page_size", params.pageSize.toString());
        if (params?.search) queryParams.set("search", params.search);

        const url = queryParams.toString()
            ? `/workspaces?${queryParams.toString()}`
            : "/workspaces";
        return this.get(url);
    }

    /**
     * Get current user account info
     */
    async getMe(): Promise<unknown> {
        return this.get("/me");
    }
}
