import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type { OAuth2TokenData } from "../../../../storage/models/Connection";

export interface GoogleCloudStorageClientConfig {
    accessToken: string;
    projectId: string;
    connectionId?: string;
    onTokenRefresh?: (tokens: OAuth2TokenData) => Promise<void>;
}

interface GCSErrorResponse {
    error: {
        code: number;
        message: string;
        status: string;
        errors?: Array<{
            domain?: string;
            reason?: string;
            message?: string;
        }>;
    };
}

/**
 * Google Cloud Storage JSON API Client
 *
 * API Documentation: https://cloud.google.com/storage/docs/json_api/v1
 * Base URL: https://storage.googleapis.com
 * Upload URL: https://storage.googleapis.com/upload/storage/v1
 */
export class GoogleCloudStorageClient extends BaseAPIClient {
    private accessToken: string;
    private projectId: string;

    constructor(config: GoogleCloudStorageClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://storage.googleapis.com",
            timeout: 60000, // 60 seconds for large file operations
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
        this.projectId = config.projectId;

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
     * Handle Google Cloud Storage API-specific errors
     */
    protected async handleError(
        error: Error & {
            response?: { status?: number; data?: unknown; headers?: Record<string, string> };
        }
    ): Promise<never> {
        if (error.response) {
            const { status, data } = error.response;

            if (status === 401) {
                throw new Error("Google Cloud Storage authentication failed. Please reconnect.");
            }

            if (status === 403) {
                const errorData = data as GCSErrorResponse;
                const reason = errorData?.error?.errors?.[0]?.reason;

                if (reason === "rateLimitExceeded" || reason === "userRateLimitExceeded") {
                    throw new Error(
                        "Google Cloud Storage rate limit exceeded. Please try again later."
                    );
                }

                throw new Error(
                    `Permission denied: ${errorData?.error?.message || "You don't have permission to access this resource."}`
                );
            }

            if (status === 404) {
                throw new Error("Bucket or object not found.");
            }

            if (status === 409) {
                const errorData = data as GCSErrorResponse;
                throw new Error(
                    `Conflict: ${errorData?.error?.message || "Resource already exists or conflict occurred."}`
                );
            }

            if (status === 429) {
                const retryAfter = error.response.headers?.["retry-after"];
                throw new Error(
                    `Google Cloud Storage rate limit exceeded. Retry after ${retryAfter || "60"} seconds.`
                );
            }

            if (status === 400) {
                const errorData = data as GCSErrorResponse;
                throw new Error(`Invalid request: ${errorData?.error?.message || "Bad request"}`);
            }

            if ((data as GCSErrorResponse)?.error) {
                const errorData = data as GCSErrorResponse;
                throw new Error(`Google Cloud Storage API error: ${errorData.error.message}`);
            }
        }

        throw error;
    }

    // ==================== Bucket Operations ====================

    /**
     * List all buckets in the project
     */
    async listBuckets(params?: {
        maxResults?: number;
        pageToken?: string;
        prefix?: string;
    }): Promise<unknown> {
        const queryParams: Record<string, string> = {
            project: this.projectId
        };

        if (params?.maxResults) queryParams.maxResults = params.maxResults.toString();
        if (params?.pageToken) queryParams.pageToken = params.pageToken;
        if (params?.prefix) queryParams.prefix = params.prefix;

        return this.get("/storage/v1/b", { params: queryParams });
    }

    /**
     * Create a new bucket
     */
    async createBucket(params: {
        name: string;
        location?: string;
        storageClass?: string;
    }): Promise<unknown> {
        const body = {
            name: params.name,
            location: params.location || "US",
            storageClass: params.storageClass || "STANDARD"
        };

        return this.post(`/storage/v1/b?project=${encodeURIComponent(this.projectId)}`, body);
    }

    /**
     * Delete a bucket (must be empty)
     */
    async deleteBucket(bucketName: string): Promise<void> {
        await this.delete(`/storage/v1/b/${encodeURIComponent(bucketName)}`);
    }

    /**
     * Get bucket metadata
     */
    async getBucket(bucketName: string): Promise<unknown> {
        return this.get(`/storage/v1/b/${encodeURIComponent(bucketName)}`);
    }

    // ==================== Object Operations ====================

    /**
     * List objects in a bucket
     */
    async listObjects(params: {
        bucket: string;
        prefix?: string;
        delimiter?: string;
        maxResults?: number;
        pageToken?: string;
    }): Promise<unknown> {
        const queryParams: Record<string, string> = {};

        if (params.prefix) queryParams.prefix = params.prefix;
        if (params.delimiter) queryParams.delimiter = params.delimiter;
        if (params.maxResults) queryParams.maxResults = params.maxResults.toString();
        if (params.pageToken) queryParams.pageToken = params.pageToken;

        return this.get(`/storage/v1/b/${encodeURIComponent(params.bucket)}/o`, {
            params: queryParams
        });
    }

    /**
     * Get object metadata
     */
    async getObjectMetadata(bucketName: string, objectName: string): Promise<unknown> {
        return this.get(
            `/storage/v1/b/${encodeURIComponent(bucketName)}/o/${encodeURIComponent(objectName)}`
        );
    }

    /**
     * Download object content
     */
    async downloadObject(bucketName: string, objectName: string): Promise<Blob> {
        const response = (await this.client.request({
            method: "GET",
            url: `/storage/v1/b/${encodeURIComponent(bucketName)}/o/${encodeURIComponent(objectName)}`,
            params: { alt: "media" }
        })) as { data: Blob };

        return response.data as Blob;
    }

    /**
     * Upload object (simple upload for files up to 5MB)
     */
    async uploadObject(params: {
        bucket: string;
        name: string;
        data: string | Buffer;
        contentType: string;
        metadata?: Record<string, string>;
    }): Promise<unknown> {
        const queryParams: Record<string, string> = {
            uploadType: "media",
            name: params.name
        };

        // Convert base64 to Buffer if needed
        let fileData = params.data;
        if (typeof params.data === "string") {
            // Check if it's a data URL
            if (params.data.includes("base64,")) {
                const base64Data = params.data.split("base64,")[1];
                fileData = Buffer.from(base64Data, "base64");
            } else {
                // Assume it's already base64
                fileData = Buffer.from(params.data, "base64");
            }
        }

        const response = await this.client.request({
            method: "POST",
            url: `/upload/storage/v1/b/${encodeURIComponent(params.bucket)}/o`,
            params: queryParams,
            data: fileData,
            headers: {
                "Content-Type": params.contentType
            }
        });

        return response as unknown;
    }

    /**
     * Delete an object
     */
    async deleteObject(bucketName: string, objectName: string): Promise<void> {
        await this.delete(
            `/storage/v1/b/${encodeURIComponent(bucketName)}/o/${encodeURIComponent(objectName)}`
        );
    }

    /**
     * Copy an object
     */
    async copyObject(params: {
        sourceBucket: string;
        sourceObject: string;
        destinationBucket: string;
        destinationObject: string;
    }): Promise<unknown> {
        const url =
            `/storage/v1/b/${encodeURIComponent(params.sourceBucket)}/o/` +
            `${encodeURIComponent(params.sourceObject)}/copyTo/b/` +
            `${encodeURIComponent(params.destinationBucket)}/o/` +
            `${encodeURIComponent(params.destinationObject)}`;

        return this.post(url, {});
    }

    /**
     * Generate a signed URL for temporary access
     * Note: For OAuth-based auth, signed URLs require IAM Credentials API
     * This method creates a public URL for publicly accessible objects
     * For private objects, consider using the IAM Credentials API
     */
    async getSignedUrl(params: {
        bucket: string;
        object: string;
        expiresIn?: number;
        method?: "GET" | "PUT";
    }): Promise<string> {
        // For OAuth tokens, we can't generate classic signed URLs
        // Instead, return the authenticated media download URL
        const url = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(params.bucket)}/o/${encodeURIComponent(params.object)}?alt=media`;
        return url;
    }
}
