/**
 * GitBook HTTP Client
 *
 * Handles all HTTP communication with GitBook API
 * Base URL: https://api.gitbook.com/v1
 *
 * Authentication: Bearer token (Personal Access Token)
 * Rate Limits: Conservative defaults (300/min, burst 50)
 */

import { BaseAPIClient, type BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type { GitBookErrorResponse } from "../types";

export interface GitBookClientConfig {
    apiKey: string;
    connectionId?: string;
}

export class GitBookClient extends BaseAPIClient {
    constructor(config: GitBookClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://api.gitbook.com/v1",
            timeout: 30000,
            retryConfig: {
                maxRetries: 3,
                retryableStatuses: [429, 500, 502, 503, 504],
                retryableErrors: ["ECONNRESET", "ETIMEDOUT", "ENOTFOUND"],
                backoffStrategy: "exponential",
                initialDelay: 1000,
                maxDelay: 30000
            },
            connectionPool: {
                keepAlive: true,
                maxSockets: 50,
                maxFreeSockets: 10,
                keepAliveMsecs: 60000
            }
        };

        super(clientConfig);

        // GitBook uses Bearer token authentication with Personal Access Token
        this.client.addRequestInterceptor((requestConfig) => {
            if (!requestConfig.headers) {
                requestConfig.headers = {};
            }
            requestConfig.headers["Authorization"] = `Bearer ${config.apiKey}`;
            requestConfig.headers["Content-Type"] = "application/json";
            requestConfig.headers["Accept"] = "application/json";
            return requestConfig;
        });
    }

    /**
     * Override to handle GitBook-specific error formats
     */
    protected override async handleError(error: unknown): Promise<never> {
        if (error && typeof error === "object" && "response" in error) {
            const errorWithResponse = error as {
                response?: { status?: number; data?: GitBookErrorResponse };
            };
            const response = errorWithResponse.response;

            // Check for GitBook API error structure
            if (response?.data?.error?.message) {
                throw new Error(response.data.error.message);
            }

            if (response?.data?.message) {
                throw new Error(response.data.message);
            }

            if (response?.status === 401) {
                throw new Error(
                    "GitBook authentication failed. Please check your Personal Access Token."
                );
            }

            if (response?.status === 403) {
                throw new Error(
                    "GitBook permission denied. Your token may not have the required permissions."
                );
            }

            if (response?.status === 404) {
                throw new Error("Resource not found in GitBook.");
            }

            if (response?.status === 429) {
                throw new Error("GitBook rate limit exceeded. Please try again later.");
            }
        }

        throw error;
    }

    // ============================================
    // Organization Operations
    // ============================================

    /**
     * List organizations the authenticated user has access to
     */
    async listOrganizations(params?: { page?: string }): Promise<unknown> {
        const queryParams: Record<string, string> = {};
        if (params?.page) queryParams.page = params.page;

        return this.get("/orgs", queryParams);
    }

    /**
     * Get a specific organization by ID
     */
    async getOrganization(organizationId: string): Promise<unknown> {
        return this.get(`/orgs/${organizationId}`);
    }

    // ============================================
    // Space Operations
    // ============================================

    /**
     * List spaces in an organization
     */
    async listSpaces(organizationId: string, params?: { page?: string }): Promise<unknown> {
        const queryParams: Record<string, string> = {};
        if (params?.page) queryParams.page = params.page;

        return this.get(`/orgs/${organizationId}/spaces`, queryParams);
    }

    /**
     * Get a specific space by ID
     */
    async getSpace(spaceId: string): Promise<unknown> {
        return this.get(`/spaces/${spaceId}`);
    }

    /**
     * Search content within a space
     */
    async searchSpaceContent(
        spaceId: string,
        params: { query: string; page?: string }
    ): Promise<unknown> {
        const queryParams: Record<string, string> = {
            query: params.query
        };
        if (params.page) queryParams.page = params.page;

        return this.get(`/spaces/${spaceId}/search`, queryParams);
    }

    // ============================================
    // Page/Content Operations
    // ============================================

    /**
     * List all pages in a space (returns the content structure)
     */
    async listPages(spaceId: string): Promise<unknown> {
        return this.get(`/spaces/${spaceId}/content`);
    }

    /**
     * Get a specific page by ID
     */
    async getPageById(spaceId: string, pageId: string): Promise<unknown> {
        return this.get(`/spaces/${spaceId}/content/page/${pageId}`);
    }

    /**
     * Get a specific page by path
     */
    async getPageByPath(spaceId: string, pagePath: string): Promise<unknown> {
        // Path should be URL-encoded
        const encodedPath = encodeURIComponent(pagePath);
        return this.get(`/spaces/${spaceId}/content/path/${encodedPath}`);
    }
}
