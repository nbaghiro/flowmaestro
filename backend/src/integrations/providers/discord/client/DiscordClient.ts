import type {
    DiscordUser,
    DiscordGuild,
    DiscordChannel,
    DiscordWebhook,
    DiscordMessagePayload,
    DiscordWebhookPayload,
    DiscordEmbed
} from "@flowmaestro/shared";
import { DISCORD_API_BASE_URL, DiscordChannelType } from "@flowmaestro/shared";
import { config } from "../../../../core/config";
import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type { OAuth2TokenData } from "../../../../storage/models/Connection";
import type { RequestConfig } from "../../../core/types";

export interface DiscordClientConfig {
    /** Bot token for making API calls */
    botToken?: string;
    /** OAuth2 access token (for user-specific operations like listing guilds) */
    accessToken?: string;
    /** Connection ID for logging/tracking */
    connectionId?: string;
    /** Callback when token is refreshed */
    onTokenRefresh?: (tokens: OAuth2TokenData) => Promise<void>;
}

/**
 * Discord API error response
 */
interface DiscordErrorResponse {
    code?: number;
    message?: string;
    errors?: Record<string, unknown>;
}

/**
 * Discord API Client for bot and OAuth2 operations
 *
 * Discord uses two authentication methods:
 * - Bot token: For server operations (sending messages, managing webhooks)
 * - OAuth2 token: For user operations (listing user's guilds)
 */
export class DiscordClient extends BaseAPIClient {
    private botToken: string;
    private accessToken?: string;

    constructor(clientConfig: DiscordClientConfig) {
        const baseConfig: BaseAPIClientConfig = {
            baseURL: DISCORD_API_BASE_URL,
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

        super(baseConfig);

        // Bot token from config or passed in
        this.botToken = clientConfig.botToken || config.oauth.discord.botToken;
        this.accessToken = clientConfig.accessToken;

        // Add default headers
        this.client.addRequestInterceptor((reqConfig) => {
            if (!reqConfig.headers) {
                reqConfig.headers = {};
            }
            reqConfig.headers["Content-Type"] = "application/json";
            return reqConfig;
        });
    }

    /**
     * Make a request with bot authentication
     */
    async botRequest<T = unknown>(reqConfig: RequestConfig): Promise<T> {
        const configWithAuth: RequestConfig = {
            ...reqConfig,
            headers: {
                ...reqConfig.headers,
                Authorization: `Bot ${this.botToken}`
            }
        };
        return this.request<T>(configWithAuth);
    }

    /**
     * Make a request with OAuth2 user authentication
     */
    async userRequest<T = unknown>(reqConfig: RequestConfig): Promise<T> {
        if (!this.accessToken) {
            throw new Error("No access token available for user request");
        }
        const configWithAuth: RequestConfig = {
            ...reqConfig,
            headers: {
                ...reqConfig.headers,
                Authorization: `Bearer ${this.accessToken}`
            }
        };
        return this.request<T>(configWithAuth);
    }

    /**
     * Handle Discord-specific errors
     */
    protected async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const data = error.response.data as DiscordErrorResponse;

            // Handle rate limiting
            if (error.response.status === 429) {
                const retryAfter =
                    error.response.headers["retry-after"] ||
                    error.response.headers["x-ratelimit-reset-after"];
                throw new Error(
                    `Discord rate limit exceeded. Retry after ${retryAfter || "unknown"} seconds.`
                );
            }

            // Handle common Discord error codes
            if (data.code) {
                switch (data.code) {
                    case 10003:
                        throw new Error("Unknown channel. The channel may have been deleted.");
                    case 10004:
                        throw new Error("Unknown guild. The server may have been deleted.");
                    case 10008:
                        throw new Error("Unknown message. The message may have been deleted.");
                    case 10014:
                        throw new Error("Unknown webhook. The webhook may have been deleted.");
                    case 50001:
                        throw new Error(
                            "Missing access. The bot doesn't have permission to access this resource."
                        );
                    case 50013:
                        throw new Error(
                            "Missing permissions. The bot doesn't have the required permissions."
                        );
                    case 50035:
                        throw new Error(`Invalid form body: ${data.message || "Unknown error"}`);
                    default:
                        throw new Error(
                            `Discord API error ${data.code}: ${data.message || "Unknown error"}`
                        );
                }
            }

            if (data.message) {
                throw new Error(`Discord API error: ${data.message}`);
            }
        }

        throw error;
    }

    // ==========================================================================
    // User Operations (OAuth2)
    // ==========================================================================

    /**
     * Get the current user's information
     */
    async getCurrentUser(): Promise<DiscordUser> {
        return this.userRequest<DiscordUser>({
            method: "GET",
            url: "/users/@me"
        });
    }

    /**
     * Get the current user's guilds
     */
    async getCurrentUserGuilds(): Promise<DiscordGuild[]> {
        return this.userRequest<DiscordGuild[]>({
            method: "GET",
            url: "/users/@me/guilds"
        });
    }

    // ==========================================================================
    // Guild Operations (Bot)
    // ==========================================================================

    /**
     * Get guild channels
     */
    async getGuildChannels(guildId: string): Promise<DiscordChannel[]> {
        return this.botRequest<DiscordChannel[]>({
            method: "GET",
            url: `/guilds/${guildId}/channels`
        });
    }

    /**
     * Get text channels in a guild (filtered)
     */
    async getGuildTextChannels(guildId: string): Promise<DiscordChannel[]> {
        const channels = await this.getGuildChannels(guildId);
        return channels.filter(
            (channel) =>
                channel.type === DiscordChannelType.GUILD_TEXT ||
                channel.type === DiscordChannelType.GUILD_ANNOUNCEMENT
        );
    }

    /**
     * Get guild information
     */
    async getGuild(guildId: string): Promise<unknown> {
        return this.botRequest({
            method: "GET",
            url: `/guilds/${guildId}`
        });
    }

    // ==========================================================================
    // Channel Operations (Bot)
    // ==========================================================================

    /**
     * Get channel information
     */
    async getChannel(channelId: string): Promise<DiscordChannel> {
        return this.botRequest<DiscordChannel>({
            method: "GET",
            url: `/channels/${channelId}`
        });
    }

    /**
     * Send a message to a channel
     */
    async sendMessage(
        channelId: string,
        payload: DiscordMessagePayload
    ): Promise<Record<string, unknown>> {
        return this.botRequest<Record<string, unknown>>({
            method: "POST",
            url: `/channels/${channelId}/messages`,
            data: payload
        });
    }

    /**
     * Send a simple text message to a channel
     */
    async sendTextMessage(channelId: string, content: string): Promise<Record<string, unknown>> {
        return this.sendMessage(channelId, { content });
    }

    /**
     * Send a message with embeds to a channel
     */
    async sendEmbedMessage(
        channelId: string,
        embeds: DiscordEmbed[],
        content?: string
    ): Promise<Record<string, unknown>> {
        return this.sendMessage(channelId, { content, embeds });
    }

    // ==========================================================================
    // Webhook Operations (Bot)
    // ==========================================================================

    /**
     * Create a webhook in a channel
     */
    async createWebhook(channelId: string, name: string, avatar?: string): Promise<DiscordWebhook> {
        return this.botRequest<DiscordWebhook>({
            method: "POST",
            url: `/channels/${channelId}/webhooks`,
            data: { name, avatar }
        });
    }

    /**
     * Get webhooks in a channel
     */
    async getChannelWebhooks(channelId: string): Promise<DiscordWebhook[]> {
        return this.botRequest<DiscordWebhook[]>({
            method: "GET",
            url: `/channels/${channelId}/webhooks`
        });
    }

    /**
     * Get webhooks in a guild
     */
    async getGuildWebhooks(guildId: string): Promise<DiscordWebhook[]> {
        return this.botRequest<DiscordWebhook[]>({
            method: "GET",
            url: `/guilds/${guildId}/webhooks`
        });
    }

    /**
     * Delete a webhook
     */
    async deleteWebhook(webhookId: string): Promise<void> {
        await this.botRequest({
            method: "DELETE",
            url: `/webhooks/${webhookId}`
        });
    }

    /**
     * Execute a webhook (no auth needed - uses webhook token in URL)
     * @param webhookUrl Full webhook URL (https://discord.com/api/webhooks/{id}/{token})
     * @param payload Webhook message payload
     */
    async executeWebhook(
        webhookUrl: string,
        payload: DiscordWebhookPayload
    ): Promise<Record<string, unknown> | void> {
        // Extract webhook ID and token from URL
        const match = webhookUrl.match(/\/webhooks\/(\d+)\/([^/?]+)/);
        if (!match) {
            throw new Error("Invalid webhook URL format");
        }

        const [, webhookId, webhookToken] = match;

        // Webhook execution doesn't need auth header
        const response = await fetch(
            `${DISCORD_API_BASE_URL}/webhooks/${webhookId}/${webhookToken}?wait=true`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            }
        );

        if (!response.ok) {
            const errorData = (await response.json().catch(() => ({}))) as DiscordErrorResponse;
            throw new Error(
                `Webhook execution failed: ${errorData.message || response.statusText}`
            );
        }

        // If wait=true, returns the created message
        if (response.status !== 204) {
            return (await response.json()) as Record<string, unknown>;
        }
    }

    /**
     * Execute a webhook with a simple text message
     */
    async executeWebhookText(webhookUrl: string, content: string): Promise<void> {
        await this.executeWebhook(webhookUrl, { content });
    }

    /**
     * Execute a webhook with embeds
     */
    async executeWebhookEmbed(
        webhookUrl: string,
        embeds: DiscordEmbed[],
        content?: string
    ): Promise<void> {
        await this.executeWebhook(webhookUrl, { content, embeds });
    }
}
