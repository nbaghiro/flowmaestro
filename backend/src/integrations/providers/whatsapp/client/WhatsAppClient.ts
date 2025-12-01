import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import {
    META_GRAPH_API_BASE_URL,
    isMetaGraphAPIError,
    type MetaGraphAPIError,
    type WhatsAppBusinessAccount,
    type WhatsAppPhoneNumber,
    type WhatsAppMessageTemplate,
    type WhatsAppSendMessageRequest,
    type WhatsAppSendMessageResponse,
    type WhatsAppBusinessProfile
} from "../types";
import type { RequestConfig } from "../../../core/types";

export interface WhatsAppClientConfig {
    accessToken: string;
    connectionId?: string;
    phoneNumberId?: string;
}

/**
 * Custom error class for Meta API errors
 */
export class MetaAPIError extends Error {
    public readonly code: number;
    public readonly errorType: string;
    public readonly retryable: boolean;
    public readonly subcode?: number;
    public readonly traceId?: string;

    constructor(
        message: string,
        code: number,
        errorType: string,
        retryable: boolean,
        subcode?: number,
        traceId?: string
    ) {
        super(message);
        this.name = "MetaAPIError";
        this.code = code;
        this.errorType = errorType;
        this.retryable = retryable;
        this.subcode = subcode;
        this.traceId = traceId;
    }
}

/**
 * WhatsApp Business API Client
 *
 * Provides:
 * - Connection pooling with keep-alive
 * - Automatic retry with exponential backoff
 * - Meta-specific error handling
 * - WhatsApp messaging operations
 */
export class WhatsAppClient extends BaseAPIClient {
    protected accessToken: string;
    protected connectionId?: string;
    private phoneNumberId?: string;

    constructor(config: WhatsAppClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: META_GRAPH_API_BASE_URL,
            timeout: 30000,
            retryConfig: {
                maxRetries: 3,
                retryableStatuses: [429, 500, 502, 503, 504],
                retryableErrors: ["ECONNRESET", "ETIMEDOUT", "ENOTFOUND"],
                backoffStrategy: "exponential",
                initialDelay: 1000,
                maxDelay: 10000
            },
            connectionPool: {
                maxSockets: 50,
                maxFreeSockets: 10,
                keepAlive: true,
                keepAliveMsecs: 60000
            }
        };

        super(clientConfig);

        this.accessToken = config.accessToken;
        this.connectionId = config.connectionId;
        this.phoneNumberId = config.phoneNumberId;

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
     * Override request to handle Meta-specific response format
     */
    async request<T = unknown>(config: RequestConfig): Promise<T> {
        try {
            const response = await super.request<T>(config);

            if (isMetaGraphAPIError(response)) {
                throw this.createMetaError(response);
            }

            return response;
        } catch (error) {
            await this.handleError(error);
            throw error;
        }
    }

    /**
     * Handle Meta-specific errors
     */
    protected async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const data = error.response.data;

            if (isMetaGraphAPIError(data)) {
                throw this.createMetaError(data);
            }

            if (error.response.status === 429) {
                const retryAfter = error.response.headers["retry-after"];
                throw new MetaAPIError(
                    `Rate limited. Retry after ${retryAfter || "unknown"} seconds.`,
                    429,
                    "rate_limit",
                    true
                );
            }

            if (error.response.status === 401) {
                throw new MetaAPIError(
                    "Authentication failed. Please reconnect your Meta account.",
                    401,
                    "auth_error",
                    false
                );
            }

            if (error.response.status === 403) {
                throw new MetaAPIError(
                    "Permission denied. Please check your account permissions.",
                    403,
                    "permission_error",
                    false
                );
            }
        }

        throw error;
    }

    /**
     * Create a standardized error from Meta API error response
     */
    private createMetaError(response: MetaGraphAPIError): MetaAPIError {
        const { error } = response;
        const code = error.code;
        const subcode = error.error_subcode;

        let errorType = "unknown";
        let retryable = false;

        if (code === 190) {
            errorType = "auth_error";
        } else if (code === 4 || code === 17 || code === 32 || code === 613) {
            errorType = "rate_limit";
            retryable = true;
        } else if (code === 10 || code === 200 || code === 294) {
            errorType = "permission_error";
        } else if (code === 100) {
            errorType = "validation_error";
        } else if (code >= 500) {
            errorType = "server_error";
            retryable = true;
        }

        const message = error.error_user_msg || error.message;
        return new MetaAPIError(message, code, errorType, retryable, subcode, error.fbtrace_id);
    }

    /**
     * Update the access token (e.g., after refresh)
     */
    updateAccessToken(newToken: string): void {
        this.accessToken = newToken;
    }

    /**
     * Set the default phone number ID for operations
     */
    setPhoneNumberId(phoneNumberId: string): void {
        this.phoneNumberId = phoneNumberId;
    }

    /**
     * Get the default phone number ID
     */
    getPhoneNumberId(): string | undefined {
        return this.phoneNumberId;
    }

    // ==========================================================================
    // Message Sending Operations
    // ==========================================================================

    async sendMessage(
        phoneNumberId: string,
        request: WhatsAppSendMessageRequest
    ): Promise<WhatsAppSendMessageResponse> {
        return this.post<WhatsAppSendMessageResponse>(`/${phoneNumberId}/messages`, request);
    }

    async sendTextMessage(
        phoneNumberId: string,
        to: string,
        text: string,
        previewUrl = false
    ): Promise<WhatsAppSendMessageResponse> {
        return this.sendMessage(phoneNumberId, {
            messaging_product: "whatsapp",
            to,
            type: "text",
            text: { preview_url: previewUrl, body: text }
        });
    }

    async sendTemplateMessage(
        phoneNumberId: string,
        to: string,
        templateName: string,
        languageCode: string,
        components?: NonNullable<WhatsAppSendMessageRequest["template"]>["components"]
    ): Promise<WhatsAppSendMessageResponse> {
        return this.sendMessage(phoneNumberId, {
            messaging_product: "whatsapp",
            to,
            type: "template",
            template: { name: templateName, language: { code: languageCode }, components }
        });
    }

    async sendImageMessage(
        phoneNumberId: string,
        to: string,
        options: { link?: string; id?: string; caption?: string }
    ): Promise<WhatsAppSendMessageResponse> {
        return this.sendMessage(phoneNumberId, {
            messaging_product: "whatsapp",
            to,
            type: "image",
            image: { link: options.link, id: options.id, caption: options.caption }
        });
    }

    async sendVideoMessage(
        phoneNumberId: string,
        to: string,
        options: { link?: string; id?: string; caption?: string }
    ): Promise<WhatsAppSendMessageResponse> {
        return this.sendMessage(phoneNumberId, {
            messaging_product: "whatsapp",
            to,
            type: "video",
            video: { link: options.link, id: options.id, caption: options.caption }
        });
    }

    async sendAudioMessage(
        phoneNumberId: string,
        to: string,
        options: { link?: string; id?: string }
    ): Promise<WhatsAppSendMessageResponse> {
        return this.sendMessage(phoneNumberId, {
            messaging_product: "whatsapp",
            to,
            type: "audio",
            audio: { link: options.link, id: options.id }
        });
    }

    async sendDocumentMessage(
        phoneNumberId: string,
        to: string,
        options: { link?: string; id?: string; caption?: string; filename?: string }
    ): Promise<WhatsAppSendMessageResponse> {
        return this.sendMessage(phoneNumberId, {
            messaging_product: "whatsapp",
            to,
            type: "document",
            document: {
                link: options.link,
                id: options.id,
                caption: options.caption,
                filename: options.filename
            }
        });
    }

    async sendStickerMessage(
        phoneNumberId: string,
        to: string,
        options: { link?: string; id?: string }
    ): Promise<WhatsAppSendMessageResponse> {
        return this.sendMessage(phoneNumberId, {
            messaging_product: "whatsapp",
            to,
            type: "sticker",
            sticker: { link: options.link, id: options.id }
        });
    }

    async sendLocationMessage(
        phoneNumberId: string,
        to: string,
        location: { latitude: number; longitude: number; name?: string; address?: string }
    ): Promise<WhatsAppSendMessageResponse> {
        return this.sendMessage(phoneNumberId, {
            messaging_product: "whatsapp",
            to,
            type: "location",
            location
        });
    }

    async sendReaction(
        phoneNumberId: string,
        to: string,
        messageId: string,
        emoji: string
    ): Promise<WhatsAppSendMessageResponse> {
        return this.sendMessage(phoneNumberId, {
            messaging_product: "whatsapp",
            to,
            type: "reaction",
            reaction: { message_id: messageId, emoji }
        });
    }

    async markAsRead(phoneNumberId: string, messageId: string): Promise<{ success: boolean }> {
        return this.post<{ success: boolean }>(`/${phoneNumberId}/messages`, {
            messaging_product: "whatsapp",
            status: "read",
            message_id: messageId
        });
    }

    // ==========================================================================
    // Business Account Operations
    // ==========================================================================

    async getWhatsAppBusinessAccount(wabaId: string): Promise<WhatsAppBusinessAccount> {
        return this.get<WhatsAppBusinessAccount>(
            `/${wabaId}?fields=id,name,timezone_id,message_template_namespace`
        );
    }

    async getPhoneNumbers(
        wabaId: string
    ): Promise<{ data: WhatsAppPhoneNumber[]; paging?: { cursors: { after: string } } }> {
        return this.get<{ data: WhatsAppPhoneNumber[]; paging?: { cursors: { after: string } } }>(
            `/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating,code_verification_status,platform_type,throughput`
        );
    }

    async getPhoneNumber(phoneNumberId: string): Promise<WhatsAppPhoneNumber> {
        return this.get<WhatsAppPhoneNumber>(
            `/${phoneNumberId}?fields=id,display_phone_number,verified_name,quality_rating,code_verification_status,platform_type,throughput`
        );
    }

    async getBusinessProfile(phoneNumberId: string): Promise<{ data: WhatsAppBusinessProfile[] }> {
        return this.get<{ data: WhatsAppBusinessProfile[] }>(
            `/${phoneNumberId}/whatsapp_business_profile?fields=about,address,description,email,profile_picture_url,vertical,websites`
        );
    }

    async updateBusinessProfile(
        phoneNumberId: string,
        profile: Partial<WhatsAppBusinessProfile>
    ): Promise<{ success: boolean }> {
        return this.post<{ success: boolean }>(
            `/${phoneNumberId}/whatsapp_business_profile`,
            profile
        );
    }

    // ==========================================================================
    // Message Templates
    // ==========================================================================

    async getMessageTemplates(
        wabaId: string,
        options?: { status?: "APPROVED" | "PENDING" | "REJECTED"; limit?: number; after?: string }
    ): Promise<{ data: WhatsAppMessageTemplate[]; paging?: { cursors: { after: string } } }> {
        let url = `/${wabaId}/message_templates?fields=id,name,status,category,language,components`;

        if (options?.status) url += `&status=${options.status}`;
        if (options?.limit) url += `&limit=${options.limit}`;
        if (options?.after) url += `&after=${options.after}`;

        return this.get<{
            data: WhatsAppMessageTemplate[];
            paging?: { cursors: { after: string } };
        }>(url);
    }

    // ==========================================================================
    // Media Operations
    // ==========================================================================

    async uploadMedia(
        phoneNumberId: string,
        file: Blob | Buffer,
        mimeType: string,
        filename?: string
    ): Promise<{ id: string }> {
        const formData = new FormData();
        formData.append("messaging_product", "whatsapp");
        formData.append("file", file, filename);
        formData.append("type", mimeType);
        return this.post<{ id: string }>(`/${phoneNumberId}/media`, formData);
    }

    async getMediaUrl(
        mediaId: string
    ): Promise<{ url: string; mime_type: string; sha256: string; file_size: number }> {
        return this.get<{ url: string; mime_type: string; sha256: string; file_size: number }>(
            `/${mediaId}`
        );
    }

    async deleteMedia(mediaId: string): Promise<{ success: boolean }> {
        return this.delete<{ success: boolean }>(`/${mediaId}`);
    }

    // ==========================================================================
    // Utility Methods
    // ==========================================================================

    async getConnectedWABAId(): Promise<string | null> {
        try {
            const response = await this.get<{ data: Array<{ id: string; name: string }> }>(
                "/me/businesses"
            );

            if (response.data && response.data.length > 0) {
                const businessId = response.data[0].id;
                const wabaResponse = await this.get<{ data: Array<{ id: string; name: string }> }>(
                    `/${businessId}/owned_whatsapp_business_accounts`
                );

                if (wabaResponse.data && wabaResponse.data.length > 0) {
                    return wabaResponse.data[0].id;
                }
            }

            return null;
        } catch (error) {
            console.error("[WhatsAppClient] Failed to get connected WABA ID:", error);
            return null;
        }
    }
}
