import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type { RequestConfig } from "../../../core/types";

export interface HelloSignClientConfig {
    accessToken: string;
    connectionId?: string;
}

/**
 * HelloSign API response format
 */
interface HelloSignErrorResponse {
    error?: {
        error_msg?: string;
        error_name?: string;
        error_path?: string;
    };
}

/**
 * HelloSign API Client with connection pooling and error handling
 */
export class HelloSignClient extends BaseAPIClient {
    private accessToken: string;

    constructor(config: HelloSignClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://api.hellosign.com/v3",
            timeout: 60000, // Longer timeout for file operations
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
     * Override request to handle HelloSign-specific response format
     */
    async request<T = unknown>(config: RequestConfig): Promise<T> {
        const response = await super.request<T & HelloSignErrorResponse>(config);

        // HelloSign wraps errors in { error: { ... } }
        if (response && typeof response === "object" && "error" in response && response.error) {
            const errResponse = response as HelloSignErrorResponse;
            throw new Error(
                errResponse.error?.error_msg ||
                    errResponse.error?.error_name ||
                    "HelloSign API error"
            );
        }

        return response as T;
    }

    /**
     * Handle HelloSign-specific errors
     */
    protected async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const data = error.response.data as HelloSignErrorResponse;

            // Map common HelloSign errors
            if (data.error?.error_name === "unauthorized") {
                throw new Error("HelloSign authentication failed. Please reconnect.");
            }

            if (data.error?.error_name === "not_found") {
                throw new Error("The requested resource was not found.");
            }

            if (data.error?.error_name === "team_invite_failed") {
                throw new Error(
                    "Team invite failed. The user may already be part of another team."
                );
            }

            if (data.error?.error_name === "invalid_recipient") {
                throw new Error("Invalid recipient email address.");
            }

            if (data.error?.error_msg) {
                throw new Error(`HelloSign API error: ${data.error.error_msg}`);
            }

            // Handle rate limiting
            if (error.response.status === 429) {
                const retryAfter = error.response.headers["retry-after"];
                throw new Error(`Rate limited. Retry after ${retryAfter || "unknown"} seconds.`);
            }
        }

        throw error;
    }

    /**
     * Get account information
     */
    async getAccount(): Promise<unknown> {
        return this.get("/account");
    }

    /**
     * Create a signature request
     */
    async createSignatureRequest(params: {
        title: string;
        subject?: string;
        message?: string;
        signers: Array<{
            email_address: string;
            name: string;
            order?: number;
            pin?: string;
        }>;
        cc_email_addresses?: string[];
        file_urls?: string[];
        test_mode?: boolean;
        signing_redirect_url?: string;
        metadata?: Record<string, unknown>;
    }): Promise<unknown> {
        return this.post("/signature_request/send", params);
    }

    /**
     * Get a signature request by ID
     */
    async getSignatureRequest(signatureRequestId: string): Promise<unknown> {
        return this.get(`/signature_request/${signatureRequestId}`);
    }

    /**
     * List signature requests
     */
    async listSignatureRequests(params?: {
        page?: number;
        page_size?: number;
        account_id?: string;
    }): Promise<unknown> {
        return this.get("/signature_request/list", params);
    }

    /**
     * Cancel a signature request
     */
    async cancelSignatureRequest(signatureRequestId: string): Promise<unknown> {
        return this.post(`/signature_request/cancel/${signatureRequestId}`);
    }

    /**
     * Download signature request files
     */
    async downloadFiles(
        signatureRequestId: string,
        fileType: "pdf" | "zip" = "pdf"
    ): Promise<unknown> {
        return this.get(`/signature_request/files/${signatureRequestId}`, {
            file_type: fileType,
            get_url: true
        });
    }

    /**
     * List templates
     */
    async listTemplates(params?: {
        page?: number;
        page_size?: number;
        account_id?: string;
    }): Promise<unknown> {
        return this.get("/template/list", params);
    }

    /**
     * Get a template by ID
     */
    async getTemplate(templateId: string): Promise<unknown> {
        return this.get(`/template/${templateId}`);
    }

    /**
     * Create signature request from template
     */
    async createFromTemplate(params: {
        template_ids: string[];
        title?: string;
        subject?: string;
        message?: string;
        signers: Array<{
            email_address: string;
            name: string;
            role: string;
            pin?: string;
        }>;
        ccs?: Array<{
            email_address: string;
            role_name: string;
        }>;
        test_mode?: boolean;
        signing_redirect_url?: string;
        metadata?: Record<string, unknown>;
        custom_fields?: Array<{
            name: string;
            value: string;
        }>;
    }): Promise<unknown> {
        return this.post("/signature_request/send_with_template", params);
    }
}
