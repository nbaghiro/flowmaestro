import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type { RequestConfig } from "../../../core/types";

export interface PandaDocClientConfig {
    accessToken: string;
    connectionId?: string;
}

/**
 * PandaDoc API error response format
 */
interface PandaDocErrorResponse {
    type?: string;
    detail?: string;
    fields?: Record<string, string[]>;
}

/**
 * PandaDoc API Client with connection pooling and error handling
 */
export class PandaDocClient extends BaseAPIClient {
    private accessToken: string;

    constructor(config: PandaDocClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://api.pandadoc.com/public/v1",
            timeout: 60000,
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
            if (!config.headers["Content-Type"]) {
                config.headers["Content-Type"] = "application/json";
            }
            return config;
        });
    }

    /**
     * Override request to handle PandaDoc-specific error format
     */
    async request<T = unknown>(config: RequestConfig): Promise<T> {
        const response = await super.request<T & PandaDocErrorResponse>(config);

        // PandaDoc returns type/detail on errors
        if (
            response &&
            typeof response === "object" &&
            "type" in response &&
            "detail" in response
        ) {
            const errResponse = response as PandaDocErrorResponse;
            throw new Error(errResponse.detail || errResponse.type || "PandaDoc API error");
        }

        return response as T;
    }

    /**
     * Handle PandaDoc-specific errors
     */
    protected async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const data = error.response.data as PandaDocErrorResponse;

            if (data.detail) {
                throw new Error(`PandaDoc API error: ${data.detail}`);
            }

            // Handle rate limiting
            if (error.response.status === 429) {
                throw new Error("Rate limited. Please wait before making more requests.");
            }
        }

        throw error;
    }

    /**
     * List documents
     */
    async listDocuments(params?: {
        q?: string;
        status?: number;
        count?: number;
        page?: number;
        tag?: string;
        order_by?: string;
    }): Promise<unknown> {
        return this.get("/documents", params);
    }

    /**
     * Get document details
     */
    async getDocument(documentId: string): Promise<unknown> {
        return this.get(`/documents/${documentId}/details`);
    }

    /**
     * Get document status (lightweight)
     */
    async getDocumentStatus(documentId: string): Promise<unknown> {
        return this.get(`/documents/${documentId}`);
    }

    /**
     * Create a document from template
     */
    async createDocument(params: {
        name: string;
        template_uuid: string;
        recipients: Array<{
            email: string;
            first_name: string;
            last_name: string;
            role?: string;
        }>;
        fields?: Record<string, { value: string }>;
        metadata?: Record<string, string>;
    }): Promise<unknown> {
        return this.post("/documents", params);
    }

    /**
     * Send a document to recipients
     */
    async sendDocument(
        documentId: string,
        params: {
            message?: string;
            subject?: string;
            silent?: boolean;
        }
    ): Promise<unknown> {
        return this.post(`/documents/${documentId}/send`, params);
    }

    /**
     * Download document as PDF
     */
    async downloadDocument(documentId: string): Promise<unknown> {
        return this.get(`/documents/${documentId}/download`);
    }

    /**
     * Delete a document
     */
    async deleteDocument(documentId: string): Promise<unknown> {
        return this.delete(`/documents/${documentId}`);
    }

    /**
     * List templates
     */
    async listTemplates(params?: {
        q?: string;
        count?: number;
        page?: number;
        tag?: string[];
        shared?: boolean;
    }): Promise<unknown> {
        return this.get("/templates", params);
    }
}
