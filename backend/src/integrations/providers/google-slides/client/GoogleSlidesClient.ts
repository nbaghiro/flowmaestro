import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type { OAuth2TokenData } from "../../../../storage/models/Connection";

export interface GoogleSlidesClientConfig {
    accessToken: string;
    connectionId?: string;
    onTokenRefresh?: (tokens: OAuth2TokenData) => Promise<void>;
}

interface GoogleSlidesErrorResponse {
    error: {
        code: number;
        message: string;
        status: string;
        details?: unknown[];
    };
}

/**
 * Google Slides API v1 Client with connection pooling and error handling
 *
 * API Documentation: https://developers.google.com/slides/api/reference/rest
 * Base URL: https://slides.googleapis.com
 */
export class GoogleSlidesClient extends BaseAPIClient {
    private accessToken: string;
    private driveBaseURL = "https://www.googleapis.com/drive/v3";

    constructor(config: GoogleSlidesClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://slides.googleapis.com",
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
     * Handle Google Slides API-specific errors
     */
    protected async handleError(
        error: Error & {
            response?: { status?: number; data?: unknown; headers?: Record<string, string> };
        }
    ): Promise<never> {
        if (error.response) {
            const { status, data } = error.response;

            // Map common Google Slides errors
            if (status === 401) {
                throw new Error("Google Slides authentication failed. Please reconnect.");
            }

            if (status === 403) {
                const errorData = data as GoogleSlidesErrorResponse;
                throw new Error(
                    `Permission denied: ${errorData?.error?.message || "You don't have permission to access this resource."}`
                );
            }

            if (status === 404) {
                throw new Error("Presentation not found.");
            }

            if (status === 429) {
                const retryAfter = error.response.headers?.["retry-after"];
                throw new Error(
                    `Google Slides rate limit exceeded. Retry after ${retryAfter || "60"} seconds.`
                );
            }

            if (status === 400) {
                const errorData = data as GoogleSlidesErrorResponse;
                throw new Error(`Invalid request: ${errorData?.error?.message || "Bad request"}`);
            }

            // Handle structured error response
            if ((data as GoogleSlidesErrorResponse)?.error) {
                const errorData = data as GoogleSlidesErrorResponse;
                throw new Error(`Google Slides API error: ${errorData.error.message}`);
            }
        }

        throw error;
    }

    // ==================== Presentation Operations ====================

    /**
     * Create a new presentation
     */
    async createPresentation(title: string): Promise<unknown> {
        return this.post("/v1/presentations", { title });
    }

    /**
     * Get presentation by ID
     */
    async getPresentation(presentationId: string): Promise<unknown> {
        return this.get(`/v1/presentations/${presentationId}`);
    }

    /**
     * Batch update presentation (create slides, add shapes, text, etc.)
     * All requests are applied atomically
     */
    async batchUpdate(presentationId: string, requests: unknown[]): Promise<unknown> {
        return this.post(`/v1/presentations/${presentationId}:batchUpdate`, {
            requests
        });
    }

    /**
     * Get a specific page (slide) from the presentation
     */
    async getPage(presentationId: string, pageObjectId: string): Promise<unknown> {
        return this.get(`/v1/presentations/${presentationId}/pages/${pageObjectId}`);
    }

    /**
     * Get thumbnail for a specific page (slide)
     */
    async getThumbnail(
        presentationId: string,
        pageObjectId: string,
        thumbnailSize?: "LARGE" | "MEDIUM" | "SMALL"
    ): Promise<unknown> {
        let url = `/v1/presentations/${presentationId}/pages/${pageObjectId}/thumbnail`;
        if (thumbnailSize) {
            url += `?thumbnailProperties.thumbnailSize=${thumbnailSize}`;
        }
        return this.get(url);
    }

    // ==================== Drive Operations (for folder management) ====================

    /**
     * Delete a presentation (uses Drive API)
     */
    async deletePresentation(presentationId: string): Promise<void> {
        const response = await fetch(`${this.driveBaseURL}/files/${presentationId}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${this.accessToken}`
            }
        });

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error("Presentation not found.");
            }
            throw new Error(`Failed to delete presentation: HTTP ${response.status}`);
        }
    }

    /**
     * Move presentation to a folder (uses Drive API)
     */
    async moveToFolder(presentationId: string, folderId: string): Promise<void> {
        // First, get the current parents
        const fileResponse = await fetch(
            `${this.driveBaseURL}/files/${presentationId}?fields=parents`,
            {
                headers: {
                    Authorization: `Bearer ${this.accessToken}`
                }
            }
        );

        if (!fileResponse.ok) {
            if (fileResponse.status === 404) {
                throw new Error("Presentation not found.");
            }
            throw new Error(`Failed to get presentation info: HTTP ${fileResponse.status}`);
        }

        const fileData = (await fileResponse.json()) as { parents?: string[] };
        const previousParents = fileData.parents?.join(",") || "";

        // Move the file to the new folder
        const moveResponse = await fetch(
            `${this.driveBaseURL}/files/${presentationId}?addParents=${folderId}&removeParents=${previousParents}`,
            {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${this.accessToken}`,
                    "Content-Type": "application/json"
                }
            }
        );

        if (!moveResponse.ok) {
            if (moveResponse.status === 404) {
                throw new Error("Presentation or folder not found.");
            }
            throw new Error(`Failed to move presentation: HTTP ${moveResponse.status}`);
        }
    }
}
