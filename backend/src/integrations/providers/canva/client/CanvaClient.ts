import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type { OAuth2TokenData } from "../../../../storage/models/Connection";

export interface CanvaClientConfig {
    accessToken: string;
    connectionId?: string;
    onTokenRefresh?: (tokens: OAuth2TokenData) => Promise<void>;
}

/**
 * Canva REST API Client with connection pooling and error handling
 */
export class CanvaClient extends BaseAPIClient {
    private accessToken: string;

    constructor(config: CanvaClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://api.canva.com/rest/v1",
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
        this.client.addRequestInterceptor((config) => {
            if (!config.headers) {
                config.headers = {};
            }
            config.headers["Authorization"] = `Bearer ${this.accessToken}`;
            return config;
        });
    }

    /**
     * Handle Canva-specific errors
     */
    protected async handleError(
        error: Error & {
            response?: { status?: number; data?: unknown; headers?: Record<string, string> };
        }
    ): Promise<never> {
        if (error.response) {
            const { status, data, headers } = error.response;

            if (status === 401) {
                throw new Error("Canva authentication failed. Please reconnect.");
            }

            if (status === 403) {
                throw new Error("You don't have permission to access this Canva resource.");
            }

            if (status === 404) {
                throw new Error("Canva resource not found.");
            }

            if (status === 429) {
                const retryAfter = headers?.["retry-after"] || "unknown";
                throw new Error(`Canva rate limit exceeded. Retry after ${retryAfter} seconds.`);
            }

            // Handle Canva error responses
            if (typeof data === "object" && data !== null) {
                const errorData = data as { message?: string; code?: string };
                if (errorData.message) {
                    throw new Error(`Canva API error: ${errorData.message}`);
                }
            }
        }

        throw error;
    }

    /**
     * List designs
     */
    async listDesigns(options?: {
        query?: string;
        continuation?: string;
        ownership?: "owned" | "shared" | "any";
    }): Promise<unknown> {
        const params: Record<string, unknown> = {};
        if (options?.query) params.query = options.query;
        if (options?.continuation) params.continuation = options.continuation;
        if (options?.ownership) params.ownership = options.ownership;

        return this.get("/designs", params);
    }

    /**
     * Get a specific design
     */
    async getDesign(designId: string): Promise<unknown> {
        return this.get(`/designs/${designId}`);
    }

    /**
     * Create a new design
     */
    async createDesign(params: {
        title: string;
        design_type?: { type: string };
        asset_id?: string;
    }): Promise<unknown> {
        return this.post("/designs", params);
    }

    /**
     * List folders
     */
    async listFolders(options?: { continuation?: string }): Promise<unknown> {
        const params: Record<string, unknown> = {};
        if (options?.continuation) params.continuation = options.continuation;

        return this.get("/folders", params);
    }

    /**
     * Create a folder
     */
    async createFolder(params: { name: string; parent_folder_id?: string }): Promise<unknown> {
        return this.post("/folders", params);
    }

    /**
     * List assets
     */
    async listAssets(options?: { continuation?: string }): Promise<unknown> {
        const params: Record<string, unknown> = {};
        if (options?.continuation) params.continuation = options.continuation;

        return this.get("/assets", params);
    }

    /**
     * Upload an asset
     */
    async uploadAsset(params: { name: string; data_url: string }): Promise<unknown> {
        return this.post("/assets", params);
    }

    /**
     * Export a design
     */
    async exportDesign(designId: string, format: "pdf" | "jpg" | "png"): Promise<unknown> {
        return this.post(`/designs/${designId}/export/${format}`, {});
    }
}
