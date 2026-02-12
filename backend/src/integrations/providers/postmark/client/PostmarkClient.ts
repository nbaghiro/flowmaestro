/**
 * Postmark HTTP Client
 *
 * Handles all HTTP communication with Postmark API.
 * Uses X-Postmark-Server-Token header for authentication.
 *
 * Base URL: https://api.postmarkapp.com
 *
 * Rate limit: No hard limit, but be reasonable (1000 requests/minute suggested)
 */

import { BaseAPIClient, type BaseAPIClientConfig } from "../../../core/BaseAPIClient";

export interface PostmarkClientConfig {
    serverToken: string;
    connectionId?: string;
}

// ============================================
// Postmark API Types
// ============================================

export interface PostmarkEmailRequest {
    From: string;
    To: string;
    Cc?: string;
    Bcc?: string;
    Subject: string;
    Tag?: string;
    HtmlBody?: string;
    TextBody?: string;
    ReplyTo?: string;
    Headers?: Array<{ Name: string; Value: string }>;
    TrackOpens?: boolean;
    TrackLinks?: "None" | "HtmlAndText" | "HtmlOnly" | "TextOnly";
    Metadata?: Record<string, string>;
    Attachments?: Array<{
        Name: string;
        Content: string;
        ContentType: string;
        ContentID?: string;
    }>;
    MessageStream?: string;
}

export interface PostmarkTemplateEmailRequest {
    From: string;
    To: string;
    Cc?: string;
    Bcc?: string;
    TemplateId?: number;
    TemplateAlias?: string;
    TemplateModel: Record<string, unknown>;
    Tag?: string;
    ReplyTo?: string;
    Headers?: Array<{ Name: string; Value: string }>;
    TrackOpens?: boolean;
    TrackLinks?: "None" | "HtmlAndText" | "HtmlOnly" | "TextOnly";
    Metadata?: Record<string, string>;
    Attachments?: Array<{
        Name: string;
        Content: string;
        ContentType: string;
        ContentID?: string;
    }>;
    MessageStream?: string;
}

export interface PostmarkEmailResponse {
    To: string;
    SubmittedAt: string;
    MessageID: string;
    ErrorCode: number;
    Message: string;
}

export interface PostmarkBatchEmailResponse {
    ErrorCode: number;
    Message: string;
    MessageID?: string;
    SubmittedAt?: string;
    To?: string;
}

export interface PostmarkTemplate {
    TemplateId: number;
    Name: string;
    Alias: string | null;
    Subject: string;
    Active: boolean;
    TemplateType: "Standard" | "Layout";
    LayoutTemplate: string | null;
    AssociatedServerId: number;
}

export interface PostmarkTemplateDetail extends PostmarkTemplate {
    HtmlBody: string | null;
    TextBody: string | null;
}

export interface PostmarkDeliveryStats {
    InactiveMails: number;
    Bounces: Array<{
        Name: string;
        Count: number;
        Type?: string;
    }>;
}

export interface PostmarkBounce {
    ID: number;
    Type: string;
    TypeCode: number;
    Name: string;
    Tag: string | null;
    MessageID: string;
    ServerID: number;
    Description: string;
    Details: string;
    Email: string;
    From: string;
    BouncedAt: string;
    DumpAvailable: boolean;
    Inactive: boolean;
    CanActivate: boolean;
    Subject: string;
    Content?: string;
    MessageStream: string;
}

export interface PostmarkBouncesResponse {
    TotalCount: number;
    Bounces: PostmarkBounce[];
}

interface PostmarkErrorResponse {
    ErrorCode: number;
    Message: string;
}

export class PostmarkClient extends BaseAPIClient {
    constructor(config: PostmarkClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://api.postmarkapp.com",
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

        // Add authorization header using Server Token
        this.client.addRequestInterceptor((requestConfig) => {
            if (!requestConfig.headers) {
                requestConfig.headers = {};
            }
            requestConfig.headers["X-Postmark-Server-Token"] = config.serverToken;
            requestConfig.headers["Content-Type"] = "application/json";
            requestConfig.headers["Accept"] = "application/json";
            return requestConfig;
        });
    }

    /**
     * Override request to handle Postmark-specific error formats
     */
    protected override async handleError(error: unknown): Promise<never> {
        if (error && typeof error === "object" && "response" in error) {
            const errorWithResponse = error as {
                response?: { status?: number; data?: PostmarkErrorResponse };
            };
            const response = errorWithResponse.response;

            if (response?.data?.ErrorCode && response?.data?.Message) {
                const postmarkError = response.data;
                throw new Error(
                    `Postmark API error (${postmarkError.ErrorCode}): ${postmarkError.Message}`
                );
            }

            if (response?.status === 401) {
                throw new Error(
                    "Postmark authentication failed. Please check your Server API Token."
                );
            }

            if (response?.status === 403) {
                throw new Error(
                    "Postmark permission denied. Your API token may not have access to this resource."
                );
            }

            if (response?.status === 404) {
                throw new Error("Resource not found in Postmark.");
            }

            if (response?.status === 422) {
                throw new Error("Invalid request. Please check your input parameters.");
            }
        }

        throw error;
    }

    // ============================================
    // Email Operations
    // ============================================

    /**
     * Send a single email
     */
    async sendEmail(request: PostmarkEmailRequest): Promise<PostmarkEmailResponse> {
        return this.post("/email", request);
    }

    /**
     * Send batch emails (up to 500 per request)
     */
    async sendBatchEmails(requests: PostmarkEmailRequest[]): Promise<PostmarkBatchEmailResponse[]> {
        return this.post("/email/batch", requests);
    }

    /**
     * Send email using a template
     */
    async sendTemplateEmail(request: PostmarkTemplateEmailRequest): Promise<PostmarkEmailResponse> {
        return this.post("/email/withTemplate", request);
    }

    /**
     * Send batch template emails (up to 500 per request)
     */
    async sendBatchTemplateEmails(
        requests: PostmarkTemplateEmailRequest[]
    ): Promise<PostmarkBatchEmailResponse[]> {
        return this.post("/email/batchWithTemplates", { Messages: requests });
    }

    // ============================================
    // Template Operations
    // ============================================

    /**
     * List all templates
     */
    async listTemplates(params?: {
        count?: number;
        offset?: number;
        templateType?: "Standard" | "Layout" | "All";
    }): Promise<{
        TotalCount: number;
        Templates: PostmarkTemplate[];
    }> {
        return this.get("/templates", {
            count: params?.count ?? 100,
            offset: params?.offset ?? 0,
            TemplateType: params?.templateType ?? "All"
        });
    }

    /**
     * Get a template by ID or alias
     */
    async getTemplate(idOrAlias: string | number): Promise<PostmarkTemplateDetail> {
        return this.get(`/templates/${idOrAlias}`);
    }

    // ============================================
    // Bounce Operations
    // ============================================

    /**
     * Get delivery stats including bounce summary
     */
    async getDeliveryStats(): Promise<PostmarkDeliveryStats> {
        return this.get("/deliverystats");
    }

    /**
     * List bounces with optional filters
     */
    async listBounces(params?: {
        count?: number;
        offset?: number;
        type?: string;
        inactive?: boolean;
        emailFilter?: string;
        tag?: string;
        messageID?: string;
        fromDate?: string;
        toDate?: string;
        messageStream?: string;
    }): Promise<PostmarkBouncesResponse> {
        return this.get("/bounces", {
            count: params?.count ?? 50,
            offset: params?.offset ?? 0,
            type: params?.type,
            inactive: params?.inactive,
            emailFilter: params?.emailFilter,
            tag: params?.tag,
            messageID: params?.messageID,
            fromdate: params?.fromDate,
            todate: params?.toDate,
            messagestream: params?.messageStream
        });
    }

    /**
     * Get a single bounce by ID
     */
    async getBounce(bounceId: number): Promise<PostmarkBounce> {
        return this.get(`/bounces/${bounceId}`);
    }

    /**
     * Activate a bounce (allow sending to the email again)
     */
    async activateBounce(bounceId: number): Promise<{
        Message: string;
        Bounce: PostmarkBounce;
    }> {
        return this.put(`/bounces/${bounceId}/activate`, {});
    }
}
