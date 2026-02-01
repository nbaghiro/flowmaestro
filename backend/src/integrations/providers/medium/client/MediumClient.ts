/**
 * Medium HTTP Client
 *
 * Handles all HTTP communication with Medium API.
 * Uses Bearer token authentication with Integration Token.
 *
 * Base URL: https://api.medium.com/v1
 *
 * Rate limit: 60 requests/minute
 */

import { BaseAPIClient, type BaseAPIClientConfig } from "../../../core/BaseAPIClient";

export interface MediumClientConfig {
    apiKey: string;
    connectionId?: string;
}

// ============================================
// Medium API Types
// ============================================

export interface MediumUser {
    id: string;
    username: string;
    name: string;
    url: string;
    imageUrl: string;
}

export interface MediumPublication {
    id: string;
    name: string;
    description: string;
    url: string;
    imageUrl: string;
}

export interface MediumContributor {
    publicationId: string;
    userId: string;
    role: "editor" | "writer" | "admin";
}

export interface MediumPost {
    id: string;
    title: string;
    authorId: string;
    url: string;
    canonicalUrl?: string;
    publishStatus: "public" | "draft" | "unlisted";
    publishedAt?: number;
    license:
        | "all-rights-reserved"
        | "cc-40-by"
        | "cc-40-by-sa"
        | "cc-40-by-nd"
        | "cc-40-by-nc"
        | "cc-40-by-nc-nd"
        | "cc-40-by-nc-sa"
        | "cc-40-zero"
        | "public-domain";
    licenseUrl?: string;
    tags?: string[];
}

export interface MediumImage {
    url: string;
    md5: string;
}

export interface MediumCreatePostRequest {
    title: string;
    contentFormat: "html" | "markdown";
    content: string;
    tags?: string[];
    canonicalUrl?: string;
    publishStatus?: "public" | "draft" | "unlisted";
    license?: MediumPost["license"];
    notifyFollowers?: boolean;
}

interface MediumErrorResponse {
    errors?: Array<{
        message?: string;
        code?: number;
    }>;
}

export class MediumClient extends BaseAPIClient {
    constructor(config: MediumClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://api.medium.com/v1",
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

        // Add authorization header using Integration Token
        this.client.addRequestInterceptor((requestConfig) => {
            if (!requestConfig.headers) {
                requestConfig.headers = {};
            }
            requestConfig.headers["Authorization"] = `Bearer ${config.apiKey}`;
            requestConfig.headers["Content-Type"] = "application/json";
            requestConfig.headers["Accept"] = "application/json";
            requestConfig.headers["Accept-Charset"] = "utf-8";
            return requestConfig;
        });
    }

    /**
     * Override request to handle Medium-specific error formats
     */
    protected override async handleError(error: unknown): Promise<never> {
        if (error && typeof error === "object" && "response" in error) {
            const errorWithResponse = error as {
                response?: { status?: number; data?: MediumErrorResponse };
            };
            const response = errorWithResponse.response;

            if (response?.data?.errors && response.data.errors.length > 0) {
                const mediumError = response.data.errors[0];
                throw new Error(
                    `Medium API error: ${mediumError.message || "Unknown error"}${
                        mediumError.code ? ` (code: ${mediumError.code})` : ""
                    }`
                );
            }

            if (response?.status === 401) {
                throw new Error(
                    "Medium authentication failed. Please check your Integration Token."
                );
            }

            if (response?.status === 403) {
                throw new Error(
                    "Medium permission denied. Your Integration Token may not have access to this resource."
                );
            }

            if (response?.status === 404) {
                throw new Error("Resource not found in Medium.");
            }

            if (response?.status === 429) {
                throw new Error("Medium rate limit exceeded. Please try again later.");
            }
        }

        throw error;
    }

    // ============================================
    // User Operations
    // ============================================

    /**
     * Get authenticated user details
     */
    async getMe(): Promise<{ data: MediumUser }> {
        return this.get("/me");
    }

    // ============================================
    // Publication Operations
    // ============================================

    /**
     * Get user's publications
     */
    async getPublications(userId: string): Promise<{ data: MediumPublication[] }> {
        return this.get(`/users/${userId}/publications`);
    }

    /**
     * Get publication contributors
     */
    async getPublicationContributors(
        publicationId: string
    ): Promise<{ data: MediumContributor[] }> {
        return this.get(`/publications/${publicationId}/contributors`);
    }

    // ============================================
    // Post Operations
    // ============================================

    /**
     * Create a post under user
     */
    async createPost(
        authorId: string,
        post: MediumCreatePostRequest
    ): Promise<{ data: MediumPost }> {
        return this.post(`/users/${authorId}/posts`, post);
    }

    /**
     * Create a post in a publication
     */
    async createPublicationPost(
        publicationId: string,
        post: MediumCreatePostRequest
    ): Promise<{ data: MediumPost }> {
        return this.post(`/publications/${publicationId}/posts`, post);
    }

    // ============================================
    // Image Operations
    // ============================================

    /**
     * Upload an image
     * Note: This requires multipart/form-data
     */
    async uploadImage(imageData: Buffer, contentType: string): Promise<{ data: MediumImage }> {
        // For image uploads, we need to use FormData
        const formData = new FormData();
        const blob = new Blob([imageData], { type: contentType });
        formData.append("image", blob);

        // Override content-type for this request
        return this.request({
            method: "POST",
            url: "/images",
            data: formData,
            headers: {
                "Content-Type": "multipart/form-data"
            }
        });
    }
}
