/**
 * Contentful HTTP Client
 *
 * Handles all HTTP communication with Contentful Content Management API.
 * Uses Bearer token authentication with Personal Access Token.
 *
 * Base URL: https://api.contentful.com
 *
 * Rate limit: 10 requests/second (paid), 7/second (free)
 */

import { BaseAPIClient, type BaseAPIClientConfig } from "../../../core/BaseAPIClient";

export interface ContentfulClientConfig {
    accessToken: string;
    spaceId: string;
    connectionId?: string;
}

// ============================================
// Contentful API Types
// ============================================

export interface ContentfulSys {
    type: string;
    id: string;
    version?: number;
    createdAt?: string;
    updatedAt?: string;
    publishedAt?: string;
    publishedVersion?: number;
    contentType?: {
        sys: {
            type: string;
            linkType: string;
            id: string;
        };
    };
    space?: {
        sys: {
            type: string;
            linkType: string;
            id: string;
        };
    };
    environment?: {
        sys: {
            type: string;
            linkType: string;
            id: string;
        };
    };
}

export interface ContentfulSpace {
    sys: ContentfulSys;
    name: string;
}

export interface ContentfulContentTypeField {
    id: string;
    name: string;
    type: string;
    required: boolean;
    localized: boolean;
}

export interface ContentfulContentType {
    sys: ContentfulSys;
    name: string;
    description: string;
    displayField: string;
    fields: ContentfulContentTypeField[];
}

export interface ContentfulEntry {
    sys: ContentfulSys;
    fields: Record<string, Record<string, unknown>>;
}

export interface ContentfulAsset {
    sys: ContentfulSys;
    fields: {
        title?: Record<string, string>;
        description?: Record<string, string>;
        file?: Record<
            string,
            {
                url: string;
                fileName: string;
                contentType: string;
                details?: {
                    size: number;
                    image?: {
                        width: number;
                        height: number;
                    };
                };
            }
        >;
    };
}

export interface ContentfulCollection<T> {
    sys: { type: string };
    total: number;
    skip: number;
    limit: number;
    items: T[];
}

interface ContentfulErrorResponse {
    sys?: { type: string; id: string };
    message?: string;
    details?: { errors?: Array<{ name?: string; details?: string }> };
}

export class ContentfulClient extends BaseAPIClient {
    private spaceId: string;

    constructor(config: ContentfulClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://api.contentful.com",
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

        this.spaceId = config.spaceId;

        // Add authorization and content-type headers
        this.client.addRequestInterceptor((requestConfig) => {
            if (!requestConfig.headers) {
                requestConfig.headers = {};
            }
            requestConfig.headers["Authorization"] = `Bearer ${config.accessToken}`;
            requestConfig.headers["Content-Type"] = "application/vnd.contentful.management.v1+json";
            requestConfig.headers["Accept"] = "application/json";
            return requestConfig;
        });
    }

    /**
     * Override to handle Contentful-specific error formats
     */
    protected override async handleError(error: unknown): Promise<never> {
        if (error && typeof error === "object" && "response" in error) {
            const errorWithResponse = error as {
                response?: { status?: number; data?: ContentfulErrorResponse };
            };
            const response = errorWithResponse.response;

            if (response?.data?.message) {
                throw new Error(`Contentful API error: ${response.data.message}`);
            }

            if (response?.status === 401) {
                throw new Error(
                    "Contentful authentication failed. Please check your Personal Access Token."
                );
            }

            if (response?.status === 403) {
                throw new Error(
                    "Contentful permission denied. Your token may not have access to this resource."
                );
            }

            if (response?.status === 404) {
                throw new Error("Resource not found in Contentful.");
            }

            if (response?.status === 409) {
                throw new Error(
                    "Contentful version conflict. The entry has been modified since you last retrieved it."
                );
            }

            if (response?.status === 429) {
                throw new Error("Contentful rate limit exceeded. Please try again later.");
            }
        }

        throw error;
    }

    // ============================================
    // Space Operations
    // ============================================

    /**
     * List all accessible spaces
     */
    async listSpaces(): Promise<ContentfulCollection<ContentfulSpace>> {
        return this.get("/spaces");
    }

    // ============================================
    // Content Type Operations
    // ============================================

    /**
     * List content types in a space/environment
     */
    async listContentTypes(
        environmentId: string = "master"
    ): Promise<ContentfulCollection<ContentfulContentType>> {
        return this.get(`/spaces/${this.spaceId}/environments/${environmentId}/content_types`);
    }

    // ============================================
    // Entry Operations
    // ============================================

    /**
     * List entries with optional filters
     */
    async listEntries(
        params: {
            contentType?: string;
            limit?: number;
            skip?: number;
        } = {},
        environmentId: string = "master"
    ): Promise<ContentfulCollection<ContentfulEntry>> {
        const queryParams: Record<string, string> = {};
        if (params.contentType) {
            queryParams["content_type"] = params.contentType;
        }
        if (params.limit !== undefined) {
            queryParams["limit"] = String(params.limit);
        }
        if (params.skip !== undefined) {
            queryParams["skip"] = String(params.skip);
        }

        const queryString = new URLSearchParams(queryParams).toString();
        const path = `/spaces/${this.spaceId}/environments/${environmentId}/entries${
            queryString ? `?${queryString}` : ""
        }`;

        return this.get(path);
    }

    /**
     * Get a single entry by ID
     */
    async getEntry(entryId: string, environmentId: string = "master"): Promise<ContentfulEntry> {
        return this.get(`/spaces/${this.spaceId}/environments/${environmentId}/entries/${entryId}`);
    }

    /**
     * Create a new entry
     */
    async createEntry(
        contentTypeId: string,
        fields: Record<string, Record<string, unknown>>,
        environmentId: string = "master"
    ): Promise<ContentfulEntry> {
        return this.request({
            method: "POST",
            url: `/spaces/${this.spaceId}/environments/${environmentId}/entries`,
            data: { fields },
            headers: {
                "X-Contentful-Content-Type": contentTypeId
            }
        });
    }

    /**
     * Update an existing entry (requires version for optimistic locking)
     */
    async updateEntry(
        entryId: string,
        version: number,
        fields: Record<string, Record<string, unknown>>,
        environmentId: string = "master"
    ): Promise<ContentfulEntry> {
        return this.request({
            method: "PUT",
            url: `/spaces/${this.spaceId}/environments/${environmentId}/entries/${entryId}`,
            data: { fields },
            headers: {
                "X-Contentful-Version": String(version)
            }
        });
    }

    /**
     * Publish an entry
     */
    async publishEntry(
        entryId: string,
        version: number,
        environmentId: string = "master"
    ): Promise<ContentfulEntry> {
        return this.request({
            method: "PUT",
            url: `/spaces/${this.spaceId}/environments/${environmentId}/entries/${entryId}/published`,
            headers: {
                "X-Contentful-Version": String(version)
            }
        });
    }

    /**
     * Unpublish an entry
     */
    async unpublishEntry(
        entryId: string,
        environmentId: string = "master"
    ): Promise<ContentfulEntry> {
        return this.request({
            method: "DELETE",
            url: `/spaces/${this.spaceId}/environments/${environmentId}/entries/${entryId}/published`
        });
    }

    // ============================================
    // Asset Operations
    // ============================================

    /**
     * List assets in a space/environment
     */
    async listAssets(
        params: {
            limit?: number;
            skip?: number;
        } = {},
        environmentId: string = "master"
    ): Promise<ContentfulCollection<ContentfulAsset>> {
        const queryParams: Record<string, string> = {};
        if (params.limit !== undefined) {
            queryParams["limit"] = String(params.limit);
        }
        if (params.skip !== undefined) {
            queryParams["skip"] = String(params.skip);
        }

        const queryString = new URLSearchParams(queryParams).toString();
        const path = `/spaces/${this.spaceId}/environments/${environmentId}/assets${
            queryString ? `?${queryString}` : ""
        }`;

        return this.get(path);
    }
}
