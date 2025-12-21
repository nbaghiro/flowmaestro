import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type { OAuth2TokenData } from "../../../../storage/models/Connection";

export interface GoogleDocsClientConfig {
    accessToken: string;
    connectionId?: string;
    onTokenRefresh?: (tokens: OAuth2TokenData) => Promise<void>;
}

interface GoogleDocsErrorResponse {
    error: {
        code: number;
        message: string;
        status: string;
        details?: unknown[];
    };
}

/**
 * Google Docs API v1 Client with connection pooling and error handling
 *
 * API Documentation: https://developers.google.com/docs/api/reference/rest
 * Base URL: https://docs.googleapis.com
 */
export class GoogleDocsClient extends BaseAPIClient {
    private accessToken: string;
    private driveBaseURL = "https://www.googleapis.com/drive/v3";

    constructor(config: GoogleDocsClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://docs.googleapis.com",
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
     * Handle Google Docs API-specific errors
     */
    protected async handleError(
        error: Error & {
            response?: { status?: number; data?: unknown; headers?: Record<string, string> };
        }
    ): Promise<never> {
        if (error.response) {
            const { status, data } = error.response;

            // Map common Google Docs errors
            if (status === 401) {
                throw new Error("Google Docs authentication failed. Please reconnect.");
            }

            if (status === 403) {
                const errorData = data as GoogleDocsErrorResponse;
                throw new Error(
                    `Permission denied: ${errorData?.error?.message || "You don't have permission to access this resource."}`
                );
            }

            if (status === 404) {
                throw new Error("Document not found.");
            }

            if (status === 429) {
                const retryAfter = error.response.headers?.["retry-after"];
                throw new Error(
                    `Google Docs rate limit exceeded. Retry after ${retryAfter || "60"} seconds.`
                );
            }

            if (status === 400) {
                const errorData = data as GoogleDocsErrorResponse;
                throw new Error(`Invalid request: ${errorData?.error?.message || "Bad request"}`);
            }

            // Handle structured error response
            if ((data as GoogleDocsErrorResponse)?.error) {
                const errorData = data as GoogleDocsErrorResponse;
                throw new Error(`Google Docs API error: ${errorData.error.message}`);
            }
        }

        throw error;
    }

    // ==================== Document Operations ====================

    /**
     * Create a new document
     */
    async createDocument(title: string): Promise<unknown> {
        return this.post("/v1/documents", { title });
    }

    /**
     * Get document by ID
     */
    async getDocument(documentId: string): Promise<unknown> {
        return this.get(`/v1/documents/${documentId}`);
    }

    /**
     * Batch update document (formatting, content, etc.)
     * All requests are applied atomically
     */
    async batchUpdate(documentId: string, requests: unknown[]): Promise<unknown> {
        return this.post(`/v1/documents/${documentId}:batchUpdate`, {
            requests
        });
    }

    // ==================== Drive Operations (for folder management) ====================

    /**
     * Delete a document (uses Drive API)
     */
    async deleteDocument(documentId: string): Promise<void> {
        const response = await fetch(`${this.driveBaseURL}/files/${documentId}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${this.accessToken}`
            }
        });

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error("Document not found.");
            }
            throw new Error(`Failed to delete document: HTTP ${response.status}`);
        }
    }

    /**
     * Move document to a folder (uses Drive API)
     */
    async moveToFolder(documentId: string, folderId: string): Promise<void> {
        // First, get the current parents
        const fileResponse = await fetch(
            `${this.driveBaseURL}/files/${documentId}?fields=parents`,
            {
                headers: {
                    Authorization: `Bearer ${this.accessToken}`
                }
            }
        );

        if (!fileResponse.ok) {
            if (fileResponse.status === 404) {
                throw new Error("Document not found.");
            }
            throw new Error(`Failed to get document info: HTTP ${fileResponse.status}`);
        }

        const fileData = (await fileResponse.json()) as { parents?: string[] };
        const previousParents = fileData.parents?.join(",") || "";

        // Move the file to the new folder
        const moveResponse = await fetch(
            `${this.driveBaseURL}/files/${documentId}?addParents=${folderId}&removeParents=${previousParents}`,
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
                throw new Error("Document or folder not found.");
            }
            throw new Error(`Failed to move document: HTTP ${moveResponse.status}`);
        }
    }
}
