import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type { RequestConfig } from "../../../core/types";
import type { TelegramApiResponse } from "../operations/types";

export interface TelegramClientConfig {
    botToken: string;
}

/**
 * Telegram Bot API Client
 *
 * Telegram uses a unique URL pattern where the bot token is part of the path:
 * https://api.telegram.org/bot{token}/{method}
 *
 * This client embeds the token in the base URL.
 */
export class TelegramClient extends BaseAPIClient {
    constructor(config: TelegramClientConfig) {
        // Token is embedded in the base URL for Telegram
        const clientConfig: BaseAPIClientConfig = {
            baseURL: `https://api.telegram.org/bot${config.botToken}`,
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

        // Add request interceptor for content type
        this.client.addRequestInterceptor((reqConfig) => {
            if (!reqConfig.headers) {
                reqConfig.headers = {};
            }
            reqConfig.headers["Content-Type"] = "application/json";
            return reqConfig;
        });
    }

    /**
     * Override request to handle Telegram-specific response format
     * Telegram wraps all responses in { ok: true/false, result: ... }
     */
    async request<T = unknown>(config: RequestConfig): Promise<T> {
        const response = await super.request<TelegramApiResponse<T>>(config);

        // Telegram wraps responses in { ok: true/false, result: ... }
        if (!response.ok) {
            throw new Error(response.description || "Telegram API error");
        }

        return response.result as T;
    }

    /**
     * Handle Telegram-specific errors
     */
    protected async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const status = error.response.status;
            const data = error.response.data as TelegramApiResponse<unknown>;

            // Map common Telegram errors
            if (status === 401 || data.error_code === 401) {
                throw new Error("Invalid bot token. Please check your Telegram bot token.");
            }

            if (status === 403 || data.error_code === 403) {
                throw new Error(
                    "Bot was blocked by the user or lacks permission to perform this action."
                );
            }

            if (status === 400) {
                throw new Error(data.description || "Bad request to Telegram API");
            }

            if (status === 404) {
                throw new Error("Chat or message not found.");
            }

            if (status === 429) {
                throw new Error("Rate limited by Telegram. Please try again later.");
            }

            if (data.description) {
                throw new Error(`Telegram API error: ${data.description}`);
            }
        }

        throw error;
    }

    // =========================================================================
    // MESSAGING METHODS
    // =========================================================================

    /**
     * Send a text message
     */
    async sendMessage(params: {
        chat_id: string | number;
        text: string;
        parse_mode?: string;
        disable_notification?: boolean;
        reply_to_message_id?: number;
    }): Promise<unknown> {
        return this.post("/sendMessage", params);
    }

    /**
     * Send a photo
     */
    async sendPhoto(params: {
        chat_id: string | number;
        photo: string;
        caption?: string;
        parse_mode?: string;
        disable_notification?: boolean;
    }): Promise<unknown> {
        return this.post("/sendPhoto", params);
    }

    /**
     * Send a document
     */
    async sendDocument(params: {
        chat_id: string | number;
        document: string;
        caption?: string;
        parse_mode?: string;
        disable_content_type_detection?: boolean;
        disable_notification?: boolean;
    }): Promise<unknown> {
        return this.post("/sendDocument", params);
    }

    /**
     * Forward a message
     */
    async forwardMessage(params: {
        chat_id: string | number;
        from_chat_id: string | number;
        message_id: number;
        disable_notification?: boolean;
    }): Promise<unknown> {
        return this.post("/forwardMessage", params);
    }

    /**
     * Edit message text
     */
    async editMessageText(params: {
        chat_id: string | number;
        message_id: number;
        text: string;
        parse_mode?: string;
    }): Promise<unknown> {
        return this.post("/editMessageText", params);
    }

    /**
     * Delete a message
     */
    async deleteMessage(params: {
        chat_id: string | number;
        message_id: number;
    }): Promise<unknown> {
        return this.post("/deleteMessage", params);
    }

    // =========================================================================
    // DATA METHODS
    // =========================================================================

    /**
     * Get bot information
     */
    async getMe(): Promise<unknown> {
        return this.get("/getMe");
    }

    /**
     * Get chat information
     */
    async getChat(params: { chat_id: string | number }): Promise<unknown> {
        return this.post("/getChat", params);
    }
}
