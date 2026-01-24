import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type { RequestConfig } from "../../../core/types";

export interface DocuSignClientConfig {
    accessToken: string;
    accountId: string;
    baseUri: string; // e.g., "https://na3.docusign.net"
    connectionId?: string;
}

/**
 * DocuSign API error response format
 */
interface DocuSignErrorResponse {
    errorCode?: string;
    message?: string;
}

/**
 * DocuSign API Client with connection pooling and error handling
 */
export class DocuSignClient extends BaseAPIClient {
    private accessToken: string;
    private accountId: string;

    constructor(config: DocuSignClientConfig) {
        // DocuSign requires dynamic base URL per account
        const clientConfig: BaseAPIClientConfig = {
            baseURL: `${config.baseUri}/restapi/v2.1/accounts/${config.accountId}`,
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
        this.accountId = config.accountId;

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
     * Get the account ID
     */
    getAccountId(): string {
        return this.accountId;
    }

    /**
     * Override request to handle DocuSign-specific error format
     */
    async request<T = unknown>(config: RequestConfig): Promise<T> {
        const response = await super.request<T & DocuSignErrorResponse>(config);

        // DocuSign returns errorCode on errors
        if (response && typeof response === "object" && "errorCode" in response) {
            const errResponse = response as DocuSignErrorResponse;
            throw new Error(errResponse.message || errResponse.errorCode || "DocuSign API error");
        }

        return response as T;
    }

    /**
     * Handle DocuSign-specific errors
     */
    protected async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const data = error.response.data as DocuSignErrorResponse;

            // Map common DocuSign errors
            if (data.errorCode === "AUTHORIZATION_INVALID_TOKEN") {
                throw new Error("DocuSign authentication failed. Please reconnect.");
            }

            if (data.errorCode === "ENVELOPE_DOES_NOT_EXIST") {
                throw new Error("The requested envelope was not found.");
            }

            if (data.errorCode === "INVALID_RECIPIENT_ID") {
                throw new Error("Invalid recipient ID specified.");
            }

            if (data.errorCode === "ENVELOPE_IS_INCOMPLETE") {
                throw new Error("The envelope is incomplete and cannot be sent.");
            }

            if (data.message) {
                throw new Error(`DocuSign API error: ${data.message}`);
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
     * Create and send an envelope
     */
    async createEnvelope(params: {
        emailSubject: string;
        emailBlurb?: string;
        status: "created" | "sent";
        documents?: Array<{
            documentId: string;
            name: string;
            fileExtension?: string;
            documentBase64?: string;
            remoteUrl?: string;
        }>;
        recipients?: {
            signers?: Array<{
                email: string;
                name: string;
                recipientId: string;
                routingOrder?: string;
                clientUserId?: string;
                tabs?: unknown;
            }>;
            carbonCopies?: Array<{
                email: string;
                name: string;
                recipientId: string;
                routingOrder?: string;
            }>;
        };
    }): Promise<unknown> {
        return this.post("/envelopes", params);
    }

    /**
     * Get an envelope by ID
     */
    async getEnvelope(envelopeId: string, include?: string): Promise<unknown> {
        const params = include ? { include } : undefined;
        return this.get(`/envelopes/${envelopeId}`, params);
    }

    /**
     * List envelopes
     */
    async listEnvelopes(params?: {
        fromDate?: string;
        toDate?: string;
        status?: string;
        count?: string;
        startPosition?: string;
        include?: string;
    }): Promise<unknown> {
        return this.get("/envelopes", params);
    }

    /**
     * Void an envelope
     */
    async voidEnvelope(envelopeId: string, voidedReason: string): Promise<unknown> {
        return this.put(`/envelopes/${envelopeId}`, {
            status: "voided",
            voidedReason
        });
    }

    /**
     * Get envelope recipients
     */
    async getRecipients(envelopeId: string, include?: string): Promise<unknown> {
        const params = include ? { include_tabs: include } : undefined;
        return this.get(`/envelopes/${envelopeId}/recipients`, params);
    }

    /**
     * Download envelope documents
     */
    async downloadDocuments(envelopeId: string, documentId: string = "combined"): Promise<unknown> {
        // Return document URI for now - actual binary download would need different handling
        return this.get(`/envelopes/${envelopeId}/documents/${documentId}`);
    }

    /**
     * List templates
     */
    async listTemplates(params?: {
        count?: string;
        startPosition?: string;
        searchText?: string;
        folder?: string;
    }): Promise<unknown> {
        return this.get("/templates", params);
    }

    /**
     * Get a template by ID
     */
    async getTemplate(templateId: string): Promise<unknown> {
        return this.get(`/templates/${templateId}`);
    }

    /**
     * Create envelope from template
     */
    async createFromTemplate(params: {
        templateId: string;
        emailSubject?: string;
        emailBlurb?: string;
        status: "created" | "sent";
        templateRoles: Array<{
            roleName: string;
            email: string;
            name: string;
            clientUserId?: string;
            tabs?: {
                textTabs?: Array<{
                    tabLabel: string;
                    value: string;
                }>;
            };
        }>;
    }): Promise<unknown> {
        return this.post("/envelopes", params);
    }
}
