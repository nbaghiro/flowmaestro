/**
 * Ghost HTTP Client
 *
 * Handles all HTTP communication with the Ghost Admin API.
 * Uses Admin API Key authentication with per-request JWT generation.
 *
 * The Admin API key is in {id}:{secret} format. For each request, a short-lived
 * JWT token (HS256, 5-minute expiry) is generated from the key.
 *
 * Rate limit: ~50 requests/second recommended
 */

import crypto from "crypto";
import { BaseAPIClient, type BaseAPIClientConfig } from "../../../core/BaseAPIClient";

export interface GhostClientConfig {
    adminApiKey: string;
    siteUrl: string;
    connectionId?: string;
}

// ============================================
// Ghost API Types
// ============================================

export interface GhostPost {
    id: string;
    uuid: string;
    title: string;
    slug: string;
    html: string;
    plaintext?: string;
    status: "published" | "draft" | "scheduled" | "sent";
    visibility: "public" | "members" | "paid" | "tiers";
    created_at: string;
    updated_at: string;
    published_at: string | null;
    url: string;
    excerpt?: string;
    feature_image?: string | null;
    featured: boolean;
    tags?: GhostTag[];
    authors?: GhostAuthor[];
}

export interface GhostTag {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    visibility: string;
    url: string;
}

export interface GhostAuthor {
    id: string;
    name: string;
    slug: string;
    email?: string;
    profile_image?: string | null;
    bio?: string | null;
    url: string;
}

export interface GhostMember {
    id: string;
    uuid: string;
    email: string;
    name: string | null;
    status: "free" | "paid" | "comped";
    created_at: string;
    updated_at: string;
    subscribed: boolean;
}

export interface GhostSiteInfo {
    title: string;
    description: string;
    logo: string | null;
    url: string;
    version: string;
}

export interface GhostPagination {
    page: number;
    limit: number;
    pages: number;
    total: number;
    next: number | null;
    prev: number | null;
}

export interface GhostCreatePostRequest {
    title: string;
    html?: string;
    mobiledoc?: string;
    status?: "published" | "draft" | "scheduled";
    visibility?: "public" | "members" | "paid";
    tags?: Array<{ name: string } | { id: string }>;
    featured?: boolean;
    feature_image?: string;
    published_at?: string;
    excerpt?: string;
}

export interface GhostUpdatePostRequest extends GhostCreatePostRequest {
    updated_at: string;
}

interface GhostErrorResponse {
    errors?: Array<{
        message?: string;
        type?: string;
        context?: string;
    }>;
}

export class GhostClient extends BaseAPIClient {
    private keyId: string;
    private keySecret: Buffer;

    constructor(config: GhostClientConfig) {
        // Normalize site URL - remove trailing slash
        const siteUrl = config.siteUrl.replace(/\/+$/, "");

        const clientConfig: BaseAPIClientConfig = {
            baseURL: `${siteUrl}/ghost/api/admin`,
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

        // Split admin API key into id and secret
        const [id, secret] = config.adminApiKey.split(":");
        if (!id || !secret) {
            throw new Error("Invalid Ghost Admin API Key format. Expected format: {id}:{secret}");
        }

        this.keyId = id;
        this.keySecret = Buffer.from(secret, "hex");

        // Add authorization and version headers via interceptor
        this.client.addRequestInterceptor((requestConfig) => {
            if (!requestConfig.headers) {
                requestConfig.headers = {};
            }
            requestConfig.headers["Authorization"] = `Ghost ${this.generateJWT()}`;
            requestConfig.headers["Accept-Version"] = "v5.0";
            requestConfig.headers["Content-Type"] = "application/json";
            requestConfig.headers["Accept"] = "application/json";
            return requestConfig;
        });
    }

    /**
     * Generate a short-lived JWT for Ghost Admin API authentication.
     * The token uses HS256 signing with the hex-decoded secret from the API key.
     */
    private generateJWT(): string {
        const now = Math.floor(Date.now() / 1000);

        // Header
        const header = {
            alg: "HS256",
            typ: "JWT",
            kid: this.keyId
        };

        // Payload with 5-minute expiry
        const payload = {
            iat: now,
            exp: now + 300,
            aud: "/admin/"
        };

        // Base64url encode
        const encodedHeader = this.base64url(JSON.stringify(header));
        const encodedPayload = this.base64url(JSON.stringify(payload));

        // Create signature
        const signatureInput = `${encodedHeader}.${encodedPayload}`;
        const signature = crypto
            .createHmac("sha256", this.keySecret)
            .update(signatureInput)
            .digest();

        const encodedSignature = this.bufferToBase64url(signature);

        return `${signatureInput}.${encodedSignature}`;
    }

    private base64url(str: string): string {
        return Buffer.from(str)
            .toString("base64")
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "");
    }

    private bufferToBase64url(buf: Buffer): string {
        return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    }

    /**
     * Override to handle Ghost-specific error formats
     */
    protected override async handleError(error: unknown): Promise<never> {
        if (error && typeof error === "object" && "response" in error) {
            const errorWithResponse = error as {
                response?: { status?: number; data?: GhostErrorResponse };
            };
            const response = errorWithResponse.response;

            if (response?.data?.errors && response.data.errors.length > 0) {
                const ghostError = response.data.errors[0];
                throw new Error(
                    `Ghost API error: ${ghostError.message || "Unknown error"}${
                        ghostError.context ? ` - ${ghostError.context}` : ""
                    }`
                );
            }

            if (response?.status === 401) {
                throw new Error("Ghost authentication failed. Please check your Admin API Key.");
            }

            if (response?.status === 403) {
                throw new Error(
                    "Ghost permission denied. Your API key may not have access to this resource."
                );
            }

            if (response?.status === 404) {
                throw new Error("Resource not found in Ghost.");
            }

            if (response?.status === 422) {
                throw new Error("Ghost validation error. Please check the request data.");
            }

            if (response?.status === 429) {
                throw new Error("Ghost rate limit exceeded. Please try again later.");
            }
        }

        throw error;
    }

    // ============================================
    // Post Operations
    // ============================================

    /**
     * List posts with optional filters
     */
    async listPosts(
        params: {
            filter?: string;
            limit?: number;
            page?: number;
            include?: string;
        } = {}
    ): Promise<{ posts: GhostPost[]; meta: { pagination: GhostPagination } }> {
        const queryParams: Record<string, string> = {};
        if (params.filter) {
            queryParams["filter"] = params.filter;
        }
        if (params.limit !== undefined) {
            queryParams["limit"] = String(params.limit);
        }
        if (params.page !== undefined) {
            queryParams["page"] = String(params.page);
        }
        queryParams["include"] = params.include || "tags,authors";

        const queryString = new URLSearchParams(queryParams).toString();
        return this.get(`/posts/?${queryString}`);
    }

    /**
     * Get a single post by ID
     */
    async getPostById(
        id: string,
        include: string = "tags,authors"
    ): Promise<{ posts: GhostPost[] }> {
        return this.get(`/posts/${id}/?include=${include}`);
    }

    /**
     * Get a single post by slug
     */
    async getPostBySlug(
        slug: string,
        include: string = "tags,authors"
    ): Promise<{ posts: GhostPost[] }> {
        return this.get(`/posts/slug/${slug}/?include=${include}`);
    }

    /**
     * Create a new post
     */
    async createPost(post: GhostCreatePostRequest): Promise<{ posts: GhostPost[] }> {
        return this.post("/posts/", { posts: [post] });
    }

    /**
     * Update an existing post
     */
    async updatePost(id: string, post: GhostUpdatePostRequest): Promise<{ posts: GhostPost[] }> {
        return this.put(`/posts/${id}/`, { posts: [post] });
    }

    /**
     * Delete a post
     */
    async deletePost(id: string): Promise<void> {
        return this.delete(`/posts/${id}/`);
    }

    // ============================================
    // Tag Operations
    // ============================================

    /**
     * List tags
     */
    async listTags(
        params: {
            limit?: number;
            page?: number;
        } = {}
    ): Promise<{ tags: GhostTag[]; meta: { pagination: GhostPagination } }> {
        const queryParams: Record<string, string> = {};
        if (params.limit !== undefined) {
            queryParams["limit"] = String(params.limit);
        }
        if (params.page !== undefined) {
            queryParams["page"] = String(params.page);
        }

        const queryString = new URLSearchParams(queryParams).toString();
        return this.get(`/tags/${queryString ? `?${queryString}` : ""}`);
    }

    // ============================================
    // Member Operations
    // ============================================

    /**
     * List members
     */
    async listMembers(
        params: {
            filter?: string;
            limit?: number;
            page?: number;
        } = {}
    ): Promise<{ members: GhostMember[]; meta: { pagination: GhostPagination } }> {
        const queryParams: Record<string, string> = {};
        if (params.filter) {
            queryParams["filter"] = params.filter;
        }
        if (params.limit !== undefined) {
            queryParams["limit"] = String(params.limit);
        }
        if (params.page !== undefined) {
            queryParams["page"] = String(params.page);
        }

        const queryString = new URLSearchParams(queryParams).toString();
        return this.get(`/members/${queryString ? `?${queryString}` : ""}`);
    }

    // ============================================
    // Site Operations
    // ============================================

    /**
     * Get site info
     */
    async getSiteInfo(): Promise<{ site: GhostSiteInfo }> {
        return this.get("/site/");
    }
}
