import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import {
    META_GRAPH_API_BASE_URL,
    isMetaGraphAPIError,
    type MetaGraphAPIError,
    type InstagramAccount,
    type InstagramSendMessageRequest,
    type InstagramSendMessageResponse,
    type InstagramConversation,
    type InstagramMessage,
    type InstagramMediaContainerOptions,
    type InstagramMedia,
    type InstagramMediaInsight,
    type InstagramAccountInsight,
    type InstagramQuickReply,
    type FacebookPage
} from "../types";
import type { RequestConfig } from "../../../core/types";

export interface InstagramClientConfig {
    accessToken: string;
    connectionId?: string;
    pageId?: string;
    igAccountId?: string;
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
 * Instagram API Client
 *
 * Provides:
 * - Connection pooling with keep-alive
 * - Automatic retry with exponential backoff
 * - Meta-specific error handling
 * - Direct messaging (DMs)
 * - Content publishing (photos, carousels, reels, stories)
 * - Account insights
 */
export class InstagramClient extends BaseAPIClient {
    protected accessToken: string;
    protected connectionId?: string;
    private _pageId?: string;
    private _igAccountId?: string;

    constructor(config: InstagramClientConfig) {
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
        this._pageId = config.pageId;
        this._igAccountId = config.igAccountId;

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
     * Set the default Page ID for operations
     */
    setPageId(pageId: string): void {
        this._pageId = pageId;
    }

    /**
     * Get the default Page ID
     */
    getPageId(): string | undefined {
        return this._pageId;
    }

    /**
     * Set the default Instagram Account ID for operations
     */
    setIgAccountId(igAccountId: string): void {
        this._igAccountId = igAccountId;
    }

    /**
     * Get the default Instagram Account ID
     */
    getIgAccountId(): string | undefined {
        return this._igAccountId;
    }

    // ==========================================================================
    // Messaging Operations
    // ==========================================================================

    /**
     * Send a message to an Instagram user
     * Uses the Page ID to send (messages go through Facebook Page)
     */
    async sendMessage(
        pageId: string,
        request: InstagramSendMessageRequest
    ): Promise<InstagramSendMessageResponse> {
        return this.post<InstagramSendMessageResponse>(`/${pageId}/messages`, request);
    }

    /**
     * Send a text message
     */
    async sendTextMessage(
        pageId: string,
        recipientId: string,
        text: string,
        tag?: "HUMAN_AGENT"
    ): Promise<InstagramSendMessageResponse> {
        const request: InstagramSendMessageRequest = {
            recipient: { id: recipientId },
            message: { text },
            messaging_type: tag ? "MESSAGE_TAG" : "RESPONSE",
            tag
        };
        return this.sendMessage(pageId, request);
    }

    /**
     * Send a media message (image, video, audio)
     */
    async sendMediaMessage(
        pageId: string,
        recipientId: string,
        mediaType: "image" | "video" | "audio",
        mediaUrl: string,
        tag?: "HUMAN_AGENT"
    ): Promise<InstagramSendMessageResponse> {
        const request: InstagramSendMessageRequest = {
            recipient: { id: recipientId },
            message: {
                attachment: {
                    type: mediaType,
                    payload: {
                        url: mediaUrl,
                        is_reusable: true
                    }
                }
            },
            messaging_type: tag ? "MESSAGE_TAG" : "RESPONSE",
            tag
        };
        return this.sendMessage(pageId, request);
    }

    /**
     * Send a message with quick reply buttons
     */
    async sendQuickReplies(
        pageId: string,
        recipientId: string,
        text: string,
        quickReplies: InstagramQuickReply[],
        tag?: "HUMAN_AGENT"
    ): Promise<InstagramSendMessageResponse> {
        const request: InstagramSendMessageRequest = {
            recipient: { id: recipientId },
            message: {
                text,
                quick_replies: quickReplies
            },
            messaging_type: tag ? "MESSAGE_TAG" : "RESPONSE",
            tag
        };
        return this.sendMessage(pageId, request);
    }

    /**
     * Get conversations (DMs) for a page filtered by Instagram platform
     */
    async getConversations(
        pageId: string,
        options?: { limit?: number; after?: string }
    ): Promise<{ data: InstagramConversation[]; paging?: { cursors: { after: string } } }> {
        let url = `/${pageId}/conversations?platform=instagram&fields=id,updated_time,participants`;

        if (options?.limit) {
            url += `&limit=${options.limit}`;
        }
        if (options?.after) {
            url += `&after=${options.after}`;
        }

        return this.get<{ data: InstagramConversation[]; paging?: { cursors: { after: string } } }>(
            url
        );
    }

    /**
     * Get messages in a conversation
     */
    async getMessages(
        conversationId: string,
        options?: { limit?: number; after?: string }
    ): Promise<{ data: InstagramMessage[]; paging?: { cursors: { after: string } } }> {
        let url = `/${conversationId}/messages?fields=id,created_time,from,to,message,attachments`;

        if (options?.limit) {
            url += `&limit=${options.limit}`;
        }
        if (options?.after) {
            url += `&after=${options.after}`;
        }

        return this.get<{ data: InstagramMessage[]; paging?: { cursors: { after: string } } }>(url);
    }

    // ==========================================================================
    // Content Publishing Operations
    // ==========================================================================

    /**
     * Create a media container for publishing
     * This is step 1 of the 2-step publishing process
     */
    async createMediaContainer(
        igAccountId: string,
        options: InstagramMediaContainerOptions
    ): Promise<{ id: string }> {
        const params: Record<string, unknown> = {};

        if (options.image_url) params.image_url = options.image_url;
        if (options.video_url) params.video_url = options.video_url;
        if (options.caption) params.caption = options.caption;
        if (options.media_type) params.media_type = options.media_type;
        if (options.children) params.children = options.children;
        if (options.share_to_feed !== undefined) params.share_to_feed = options.share_to_feed;
        if (options.cover_url) params.cover_url = options.cover_url;
        if (options.thumb_offset !== undefined) params.thumb_offset = options.thumb_offset;
        if (options.location_id) params.location_id = options.location_id;
        if (options.user_tags) params.user_tags = JSON.stringify(options.user_tags);

        return this.post<{ id: string }>(`/${igAccountId}/media`, params);
    }

    /**
     * Publish a media container
     * This is step 2 of the 2-step publishing process
     */
    async publishMediaContainer(igAccountId: string, creationId: string): Promise<{ id: string }> {
        return this.post<{ id: string }>(`/${igAccountId}/media_publish`, {
            creation_id: creationId
        });
    }

    /**
     * Check the status of a media container (for async video processing)
     */
    async getContainerStatus(
        containerId: string
    ): Promise<{ status_code: string; status?: string }> {
        return this.get<{ status_code: string; status?: string }>(
            `/${containerId}?fields=status_code,status`
        );
    }

    /**
     * Publish a single photo
     * High-level method that handles both steps
     */
    async publishPhoto(
        igAccountId: string,
        imageUrl: string,
        caption?: string,
        locationId?: string
    ): Promise<{ id: string }> {
        // Step 1: Create container
        const container = await this.createMediaContainer(igAccountId, {
            image_url: imageUrl,
            caption,
            location_id: locationId
        });

        // Step 2: Publish
        return this.publishMediaContainer(igAccountId, container.id);
    }

    /**
     * Publish a carousel (multi-image/video post)
     * High-level method that handles all steps
     */
    async publishCarousel(
        igAccountId: string,
        mediaItems: Array<{ type: "IMAGE" | "VIDEO"; url: string }>,
        caption?: string,
        locationId?: string
    ): Promise<{ id: string }> {
        // Step 1: Create containers for each item
        const childContainerIds: string[] = [];
        for (const item of mediaItems) {
            const container = await this.createMediaContainer(igAccountId, {
                image_url: item.type === "IMAGE" ? item.url : undefined,
                video_url: item.type === "VIDEO" ? item.url : undefined
            });
            childContainerIds.push(container.id);

            // Wait for video processing if needed
            if (item.type === "VIDEO") {
                await this.waitForContainerReady(container.id);
            }
        }

        // Step 2: Create carousel container
        const carouselContainer = await this.createMediaContainer(igAccountId, {
            media_type: "CAROUSEL",
            children: childContainerIds,
            caption,
            location_id: locationId
        });

        // Step 3: Publish
        return this.publishMediaContainer(igAccountId, carouselContainer.id);
    }

    /**
     * Publish a reel (video)
     * High-level method that handles both steps
     */
    async publishReel(
        igAccountId: string,
        videoUrl: string,
        caption?: string,
        options?: {
            shareToFeed?: boolean;
            coverUrl?: string;
            thumbOffset?: number;
            locationId?: string;
        }
    ): Promise<{ id: string }> {
        // Step 1: Create container
        const container = await this.createMediaContainer(igAccountId, {
            video_url: videoUrl,
            media_type: "REELS",
            caption,
            share_to_feed: options?.shareToFeed,
            cover_url: options?.coverUrl,
            thumb_offset: options?.thumbOffset,
            location_id: options?.locationId
        });

        // Wait for video processing
        await this.waitForContainerReady(container.id);

        // Step 2: Publish
        return this.publishMediaContainer(igAccountId, container.id);
    }

    /**
     * Publish a story (image or video)
     * High-level method that handles both steps
     */
    async publishStory(
        igAccountId: string,
        mediaUrl: string,
        mediaType: "image" | "video"
    ): Promise<{ id: string }> {
        // Step 1: Create container
        const container = await this.createMediaContainer(igAccountId, {
            image_url: mediaType === "image" ? mediaUrl : undefined,
            video_url: mediaType === "video" ? mediaUrl : undefined,
            media_type: "STORIES"
        });

        // Wait for video processing if needed
        if (mediaType === "video") {
            await this.waitForContainerReady(container.id);
        }

        // Step 2: Publish
        return this.publishMediaContainer(igAccountId, container.id);
    }

    /**
     * Wait for a media container to be ready (for video processing)
     */
    private async waitForContainerReady(
        containerId: string,
        maxWaitMs = 120000,
        pollIntervalMs = 5000
    ): Promise<void> {
        const startTime = Date.now();

        while (Date.now() - startTime < maxWaitMs) {
            const status = await this.getContainerStatus(containerId);

            if (status.status_code === "FINISHED") {
                return;
            }

            if (status.status_code === "ERROR") {
                throw new Error(`Media container failed: ${status.status || "Unknown error"}`);
            }

            // Wait before polling again
            await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
        }

        throw new Error("Timeout waiting for media container to be ready");
    }

    // ==========================================================================
    // Media Management
    // ==========================================================================

    /**
     * Get media by ID
     */
    async getMedia(mediaId: string): Promise<InstagramMedia> {
        return this.get<InstagramMedia>(
            `/${mediaId}?fields=id,media_type,media_url,thumbnail_url,permalink,caption,timestamp,like_count,comments_count,children{id,media_type,media_url}`
        );
    }

    /**
     * Get insights for a media item
     */
    async getMediaInsights(
        mediaId: string,
        metrics: string[]
    ): Promise<{ data: InstagramMediaInsight[] }> {
        const metricsParam = metrics.join(",");
        return this.get<{ data: InstagramMediaInsight[] }>(
            `/${mediaId}/insights?metric=${metricsParam}`
        );
    }

    // ==========================================================================
    // Account Operations
    // ==========================================================================

    /**
     * Get Instagram account info from a Page ID
     */
    async getInstagramAccount(pageId: string): Promise<InstagramAccount | null> {
        const response = await this.get<{ instagram_business_account?: InstagramAccount }>(
            `/${pageId}?fields=instagram_business_account{id,name,username,profile_picture_url,followers_count,follows_count,media_count,biography,website}`
        );
        return response.instagram_business_account || null;
    }

    /**
     * Get Instagram account info by IG Account ID
     */
    async getAccountInfo(igAccountId: string): Promise<InstagramAccount> {
        return this.get<InstagramAccount>(
            `/${igAccountId}?fields=id,name,username,profile_picture_url,followers_count,follows_count,media_count,biography,website`
        );
    }

    /**
     * Get account-level insights
     */
    async getAccountInsights(
        igAccountId: string,
        metrics: string[],
        period: "day" | "week" | "days_28" | "lifetime"
    ): Promise<{ data: InstagramAccountInsight[] }> {
        const metricsParam = metrics.join(",");
        return this.get<{ data: InstagramAccountInsight[] }>(
            `/${igAccountId}/insights?metric=${metricsParam}&period=${period}`
        );
    }

    /**
     * Get connected Facebook Pages with Instagram accounts
     */
    async getConnectedPages(): Promise<{ data: FacebookPage[] }> {
        return this.get<{ data: FacebookPage[] }>(
            "/me/accounts?fields=id,name,access_token,instagram_business_account"
        );
    }

    /**
     * Discover the connected Instagram account ID
     * Useful after OAuth to find the user's IG business account
     */
    async discoverInstagramAccount(): Promise<{ pageId: string; igAccountId: string } | null> {
        try {
            const pages = await this.getConnectedPages();

            for (const page of pages.data) {
                if (page.instagram_business_account?.id) {
                    return {
                        pageId: page.id,
                        igAccountId: page.instagram_business_account.id
                    };
                }
            }

            return null;
        } catch (error) {
            console.error("[InstagramClient] Failed to discover IG account:", error);
            return null;
        }
    }
}
