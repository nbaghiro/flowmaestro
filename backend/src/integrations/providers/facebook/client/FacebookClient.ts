import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import {
    META_GRAPH_API_BASE_URL,
    isMetaGraphAPIError,
    type MetaGraphAPIError,
    type MessengerSendMessageRequest,
    type MessengerSendMessageResponse,
    type MessengerMessageTag,
    type MessengerQuickReply,
    type MessengerButton,
    type MessengerGenericTemplateElement,
    type MessengerSenderActionRequest,
    type MessengerConversation,
    type MessengerMessage,
    type FacebookPage,
    type FacebookCreatePostRequest,
    type FacebookCreatePhotoRequest,
    type FacebookCreateMultiPhotoPostRequest,
    type FacebookCreateVideoRequest,
    type FacebookUpdatePostRequest,
    type FacebookPagePost,
    type FacebookPhoto,
    type FacebookVideo,
    type FacebookPostInsight,
    type FacebookPostInsightMetric,
    type FacebookPaginatedResponse
} from "../types";
import type { RequestConfig } from "../../../core/types";

export interface FacebookClientConfig {
    accessToken: string;
    connectionId?: string;
    pageId?: string;
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
 * Facebook API Client
 *
 * Provides:
 * - Connection pooling with keep-alive
 * - Automatic retry with exponential backoff
 * - Meta-specific error handling
 * - Sending messages (text, templates, quick replies)
 * - Sender actions (typing indicator, mark as seen)
 * - Conversation management
 */
export class FacebookClient extends BaseAPIClient {
    protected accessToken: string;
    protected connectionId?: string;
    private pageId?: string;

    constructor(config: FacebookClientConfig) {
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
        this.pageId = config.pageId;

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
        this.pageId = pageId;
    }

    /**
     * Get the default Page ID
     */
    getPageId(): string | undefined {
        return this.pageId;
    }

    // ==========================================================================
    // Message Sending Operations
    // ==========================================================================

    /**
     * Send a message
     */
    async sendMessage(
        pageId: string,
        request: MessengerSendMessageRequest
    ): Promise<MessengerSendMessageResponse> {
        return this.post<MessengerSendMessageResponse>(`/${pageId}/messages`, request);
    }

    /**
     * Send a text message
     */
    async sendTextMessage(
        pageId: string,
        recipientId: string,
        text: string,
        tag?: MessengerMessageTag
    ): Promise<MessengerSendMessageResponse> {
        const request: MessengerSendMessageRequest = {
            recipient: { id: recipientId },
            message: { text },
            messaging_type: tag ? "MESSAGE_TAG" : "RESPONSE",
            tag
        };
        return this.sendMessage(pageId, request);
    }

    /**
     * Send a button template
     * Displays text with up to 3 buttons
     */
    async sendButtonTemplate(
        pageId: string,
        recipientId: string,
        text: string,
        buttons: MessengerButton[],
        tag?: MessengerMessageTag
    ): Promise<MessengerSendMessageResponse> {
        const request: MessengerSendMessageRequest = {
            recipient: { id: recipientId },
            message: {
                attachment: {
                    type: "template",
                    payload: {
                        template_type: "button",
                        text,
                        buttons
                    }
                }
            },
            messaging_type: tag ? "MESSAGE_TAG" : "RESPONSE",
            tag
        };
        return this.sendMessage(pageId, request);
    }

    /**
     * Send a generic template (carousel of cards)
     * Each element can have title, subtitle, image, buttons
     */
    async sendGenericTemplate(
        pageId: string,
        recipientId: string,
        elements: MessengerGenericTemplateElement[],
        tag?: MessengerMessageTag
    ): Promise<MessengerSendMessageResponse> {
        const request: MessengerSendMessageRequest = {
            recipient: { id: recipientId },
            message: {
                attachment: {
                    type: "template",
                    payload: {
                        template_type: "generic",
                        elements
                    }
                }
            },
            messaging_type: tag ? "MESSAGE_TAG" : "RESPONSE",
            tag
        };
        return this.sendMessage(pageId, request);
    }

    /**
     * Send a media template
     * Displays an image or video with optional button
     */
    async sendMediaTemplate(
        pageId: string,
        recipientId: string,
        mediaType: "image" | "video",
        mediaUrl: string,
        buttons?: MessengerButton[],
        tag?: MessengerMessageTag
    ): Promise<MessengerSendMessageResponse> {
        const request: MessengerSendMessageRequest = {
            recipient: { id: recipientId },
            message: {
                attachment: {
                    type: "template",
                    payload: {
                        template_type: "media",
                        elements: [
                            {
                                title: "",
                                image_url: mediaType === "image" ? mediaUrl : undefined,
                                buttons
                            }
                        ],
                        media_type: mediaType
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
        quickReplies: MessengerQuickReply[],
        tag?: MessengerMessageTag
    ): Promise<MessengerSendMessageResponse> {
        const request: MessengerSendMessageRequest = {
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
     * Send a standalone attachment (image, video, audio, file)
     */
    async sendAttachment(
        pageId: string,
        recipientId: string,
        attachmentType: "image" | "video" | "audio" | "file",
        url: string,
        isReusable = true,
        tag?: MessengerMessageTag
    ): Promise<MessengerSendMessageResponse> {
        const request: MessengerSendMessageRequest = {
            recipient: { id: recipientId },
            message: {
                attachment: {
                    type: attachmentType,
                    payload: {
                        url,
                        is_reusable: isReusable
                    }
                }
            },
            messaging_type: tag ? "MESSAGE_TAG" : "RESPONSE",
            tag
        };
        return this.sendMessage(pageId, request);
    }

    // ==========================================================================
    // Sender Actions
    // ==========================================================================

    /**
     * Send a sender action (typing indicator or mark seen)
     */
    async sendSenderAction(
        pageId: string,
        recipientId: string,
        action: "typing_on" | "typing_off" | "mark_seen"
    ): Promise<{ recipient_id: string }> {
        const request: MessengerSenderActionRequest = {
            recipient: { id: recipientId },
            sender_action: action
        };
        return this.post<{ recipient_id: string }>(`/${pageId}/messages`, request);
    }

    /**
     * Show typing indicator
     */
    async sendTypingIndicator(
        pageId: string,
        recipientId: string,
        on: boolean
    ): Promise<{ recipient_id: string }> {
        return this.sendSenderAction(pageId, recipientId, on ? "typing_on" : "typing_off");
    }

    /**
     * Mark a message as seen
     */
    async markAsSeen(pageId: string, recipientId: string): Promise<{ recipient_id: string }> {
        return this.sendSenderAction(pageId, recipientId, "mark_seen");
    }

    // ==========================================================================
    // Conversation Management
    // ==========================================================================

    /**
     * Get conversations for a page
     */
    async getConversations(
        pageId: string,
        options?: { limit?: number; after?: string }
    ): Promise<{ data: MessengerConversation[]; paging?: { cursors: { after: string } } }> {
        let url = `/${pageId}/conversations?fields=id,updated_time,link,message_count,unread_count,participants`;

        if (options?.limit) {
            url += `&limit=${options.limit}`;
        }
        if (options?.after) {
            url += `&after=${options.after}`;
        }

        return this.get<{ data: MessengerConversation[]; paging?: { cursors: { after: string } } }>(
            url
        );
    }

    /**
     * Get messages in a conversation
     */
    async getMessages(
        conversationId: string,
        options?: { limit?: number; after?: string }
    ): Promise<{ data: MessengerMessage[]; paging?: { cursors: { after: string } } }> {
        let url = `/${conversationId}/messages?fields=id,created_time,from,to,message,attachments,shares,sticker`;

        if (options?.limit) {
            url += `&limit=${options.limit}`;
        }
        if (options?.after) {
            url += `&after=${options.after}`;
        }

        return this.get<{ data: MessengerMessage[]; paging?: { cursors: { after: string } } }>(url);
    }

    // ==========================================================================
    // Page Operations
    // ==========================================================================

    /**
     * Get page info
     */
    async getPageInfo(pageId: string): Promise<{
        id: string;
        name: string;
        username?: string;
        about?: string;
        category?: string;
        picture?: { data: { url: string } };
    }> {
        return this.get<{
            id: string;
            name: string;
            username?: string;
            about?: string;
            category?: string;
            picture?: { data: { url: string } };
        }>(`/${pageId}?fields=id,name,username,about,category,picture`);
    }

    /**
     * Get connected Facebook Pages
     */
    async getConnectedPages(): Promise<{ data: FacebookPage[] }> {
        return this.get<{ data: FacebookPage[] }>("/me/accounts?fields=id,name,access_token");
    }

    /**
     * Discover the connected Page ID
     * Useful after OAuth to find the user's page
     */
    async discoverPage(): Promise<{ pageId: string; pageName: string } | null> {
        try {
            const pages = await this.getConnectedPages();

            if (pages.data.length > 0) {
                return {
                    pageId: pages.data[0].id,
                    pageName: pages.data[0].name
                };
            }

            return null;
        } catch (error) {
            console.error("[FacebookClient] Failed to discover page:", error);
            return null;
        }
    }

    /**
     * Get user profile (basic info)
     * Note: Requires pages_messaging permission
     */
    async getUserProfile(userId: string): Promise<{
        id: string;
        first_name?: string;
        last_name?: string;
        profile_pic?: string;
    }> {
        return this.get<{
            id: string;
            first_name?: string;
            last_name?: string;
            profile_pic?: string;
        }>(`/${userId}?fields=id,first_name,last_name,profile_pic`);
    }

    // ==========================================================================
    // Page Posts - Create Operations
    // ==========================================================================

    /**
     * Create a text or link post on a page
     * @param pageId The page ID
     * @param request Post content (message and/or link)
     * @returns The created post ID
     */
    async createPost(pageId: string, request: FacebookCreatePostRequest): Promise<{ id: string }> {
        return this.post<{ id: string }>(`/${pageId}/feed`, request);
    }

    /**
     * Create a scheduled post
     * @param pageId The page ID
     * @param message Post message
     * @param scheduledTime Unix timestamp (10 min to 6 months from now)
     * @param link Optional link to share
     */
    async createScheduledPost(
        pageId: string,
        message: string,
        scheduledTime: number | string,
        link?: string
    ): Promise<{ id: string }> {
        return this.createPost(pageId, {
            message,
            link,
            published: false,
            scheduled_publish_time: scheduledTime
        });
    }

    /**
     * Create a photo post on a page
     * @param pageId The page ID
     * @param request Photo post content
     * @returns The created photo ID
     */
    async createPhotoPost(
        pageId: string,
        request: FacebookCreatePhotoRequest
    ): Promise<{ id: string; post_id?: string }> {
        return this.post<{ id: string; post_id?: string }>(`/${pageId}/photos`, request);
    }

    /**
     * Upload a photo without publishing (for multi-photo posts)
     * @param pageId The page ID
     * @param photoUrl URL of the photo to upload
     * @returns The photo ID to use in attached_media
     */
    async uploadUnpublishedPhoto(pageId: string, photoUrl: string): Promise<{ id: string }> {
        return this.createPhotoPost(pageId, {
            url: photoUrl,
            published: false,
            temporary: true
        });
    }

    /**
     * Create a multi-photo post
     * @param pageId The page ID
     * @param photoUrls Array of photo URLs
     * @param message Optional message
     * @param options Additional options (scheduling)
     */
    async createMultiPhotoPost(
        pageId: string,
        photoUrls: string[],
        message?: string,
        options?: { scheduledTime?: number | string }
    ): Promise<{ id: string }> {
        // Step 1: Upload each photo as unpublished
        const uploadedPhotos: string[] = [];
        for (const url of photoUrls) {
            const photo = await this.uploadUnpublishedPhoto(pageId, url);
            uploadedPhotos.push(photo.id);
        }

        // Step 2: Create the multi-photo post
        const request: FacebookCreateMultiPhotoPostRequest = {
            message,
            attached_media: uploadedPhotos.map((id) => ({ media_fbid: id })),
            published: options?.scheduledTime ? false : true,
            scheduled_publish_time: options?.scheduledTime
        };

        return this.post<{ id: string }>(`/${pageId}/feed`, request);
    }

    /**
     * Create a video post on a page (non-resumable upload via URL)
     * Note: For videos > 1GB, use resumable upload
     * @param pageId The page ID
     * @param request Video post content
     * @returns The created video ID
     */
    async createVideoPost(
        pageId: string,
        request: FacebookCreateVideoRequest
    ): Promise<{ id: string }> {
        // Videos use a different domain
        const videoApiUrl = `https://graph-video.facebook.com/v21.0/${pageId}/videos`;

        // Build request body
        const body: Record<string, unknown> = {};
        if (request.file_url) body.file_url = request.file_url;
        if (request.title) body.title = request.title;
        if (request.description) body.description = request.description;
        if (request.thumb) body.thumb = request.thumb;
        if (request.published !== undefined) body.published = request.published;
        if (request.scheduled_publish_time) {
            body.scheduled_publish_time = request.scheduled_publish_time;
        }

        // Make direct request to video API
        const response = await fetch(videoApiUrl, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${this.accessToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const error = await response.json();
            if (isMetaGraphAPIError(error)) {
                throw this.createMetaError(error);
            }
            throw new Error(`Video upload failed: ${response.statusText}`);
        }

        return response.json() as Promise<{ id: string }>;
    }

    // ==========================================================================
    // Page Posts - Read Operations
    // ==========================================================================

    /**
     * Get posts from a page feed
     * @param pageId The page ID
     * @param options Pagination and field options
     */
    async getPosts(
        pageId: string,
        options?: {
            limit?: number;
            after?: string;
            before?: string;
            fields?: string[];
        }
    ): Promise<FacebookPaginatedResponse<FacebookPagePost>> {
        const defaultFields = [
            "id",
            "message",
            "story",
            "created_time",
            "updated_time",
            "permalink_url",
            "full_picture",
            "type",
            "status_type",
            "is_published",
            "shares",
            "likes.summary(true)",
            "comments.summary(true)",
            "reactions.summary(true)"
        ];

        const fields = options?.fields || defaultFields;
        let url = `/${pageId}/posts?fields=${fields.join(",")}`;

        if (options?.limit) url += `&limit=${options.limit}`;
        if (options?.after) url += `&after=${options.after}`;
        if (options?.before) url += `&before=${options.before}`;

        return this.get<FacebookPaginatedResponse<FacebookPagePost>>(url);
    }

    /**
     * Get scheduled (unpublished) posts from a page
     * @param pageId The page ID
     * @param options Pagination options
     */
    async getScheduledPosts(
        pageId: string,
        options?: { limit?: number; after?: string }
    ): Promise<FacebookPaginatedResponse<FacebookPagePost>> {
        let url = `/${pageId}/scheduled_posts?fields=id,message,created_time,scheduled_publish_time,is_published`;

        if (options?.limit) url += `&limit=${options.limit}`;
        if (options?.after) url += `&after=${options.after}`;

        return this.get<FacebookPaginatedResponse<FacebookPagePost>>(url);
    }

    /**
     * Get promotable posts (includes unpublished)
     * @param pageId The page ID
     * @param options Pagination and filter options
     */
    async getPromotablePosts(
        pageId: string,
        options?: {
            limit?: number;
            after?: string;
            isPublished?: boolean;
        }
    ): Promise<FacebookPaginatedResponse<FacebookPagePost>> {
        let url = `/${pageId}/promotable_posts?fields=id,message,created_time,scheduled_publish_time,is_published,permalink_url`;

        if (options?.limit) url += `&limit=${options.limit}`;
        if (options?.after) url += `&after=${options.after}`;
        if (options?.isPublished !== undefined) {
            url += `&is_published=${options.isPublished}`;
        }

        return this.get<FacebookPaginatedResponse<FacebookPagePost>>(url);
    }

    /**
     * Get a single post by ID
     * @param postId The post ID (format: pageId_postId)
     * @param fields Fields to retrieve
     */
    async getPost(postId: string, fields?: string[]): Promise<FacebookPagePost> {
        const defaultFields = [
            "id",
            "message",
            "story",
            "created_time",
            "updated_time",
            "permalink_url",
            "full_picture",
            "type",
            "status_type",
            "is_published",
            "is_hidden",
            "shares",
            "likes.summary(true)",
            "comments.summary(true)",
            "reactions.summary(true)",
            "attachments"
        ];

        const fieldsParam = (fields || defaultFields).join(",");
        return this.get<FacebookPagePost>(`/${postId}?fields=${fieldsParam}`);
    }

    /**
     * Get photos from a page
     * @param pageId The page ID
     * @param options Pagination options
     */
    async getPhotos(
        pageId: string,
        options?: { limit?: number; after?: string }
    ): Promise<FacebookPaginatedResponse<FacebookPhoto>> {
        let url = `/${pageId}/photos?fields=id,created_time,name,picture,source,link,height,width,images`;

        if (options?.limit) url += `&limit=${options.limit}`;
        if (options?.after) url += `&after=${options.after}`;

        return this.get<FacebookPaginatedResponse<FacebookPhoto>>(url);
    }

    /**
     * Get videos from a page
     * @param pageId The page ID
     * @param options Pagination options
     */
    async getVideos(
        pageId: string,
        options?: { limit?: number; after?: string }
    ): Promise<FacebookPaginatedResponse<FacebookVideo>> {
        let url = `/${pageId}/videos?fields=id,created_time,title,description,source,picture,permalink_url,length,status`;

        if (options?.limit) url += `&limit=${options.limit}`;
        if (options?.after) url += `&after=${options.after}`;

        return this.get<FacebookPaginatedResponse<FacebookVideo>>(url);
    }

    /**
     * Get a video by ID
     * @param videoId The video ID
     */
    async getVideo(videoId: string): Promise<FacebookVideo> {
        return this.get<FacebookVideo>(
            `/${videoId}?fields=id,created_time,title,description,source,picture,permalink_url,length,status`
        );
    }

    // ==========================================================================
    // Page Posts - Insights
    // ==========================================================================

    /**
     * Get insights for a post
     * @param postId The post ID
     * @param metrics Array of metrics to retrieve
     */
    async getPostInsights(
        postId: string,
        metrics: FacebookPostInsightMetric[]
    ): Promise<{ data: FacebookPostInsight[] }> {
        const metricsParam = metrics.join(",");
        return this.get<{ data: FacebookPostInsight[] }>(
            `/${postId}/insights?metric=${metricsParam}`
        );
    }

    /**
     * Get common engagement insights for a post
     * @param postId The post ID
     */
    async getPostEngagementInsights(postId: string): Promise<{ data: FacebookPostInsight[] }> {
        return this.getPostInsights(postId, [
            "post_impressions",
            "post_impressions_unique",
            "post_engaged_users",
            "post_clicks",
            "post_reactions_by_type_total"
        ]);
    }

    /**
     * Get video-specific insights for a video post
     * @param postId The video post ID
     */
    async getVideoPostInsights(postId: string): Promise<{ data: FacebookPostInsight[] }> {
        return this.getPostInsights(postId, [
            "post_video_views",
            "post_video_views_organic",
            "post_video_views_paid",
            "post_video_views_10s",
            "post_video_avg_time_watched",
            "post_video_complete_views_organic",
            "post_video_view_time"
        ]);
    }

    /**
     * Get posts with inline insights (single API call)
     * @param pageId The page ID
     * @param metrics Insight metrics to include
     * @param options Pagination options
     */
    async getPostsWithInsights(
        pageId: string,
        metrics: FacebookPostInsightMetric[],
        options?: { limit?: number; after?: string }
    ): Promise<
        FacebookPaginatedResponse<FacebookPagePost & { insights?: { data: FacebookPostInsight[] } }>
    > {
        const metricsParam = metrics.join(",");
        let url = `/${pageId}/posts?fields=id,message,created_time,permalink_url,insights.metric(${metricsParam})`;

        if (options?.limit) url += `&limit=${options.limit}`;
        if (options?.after) url += `&after=${options.after}`;

        return this.get<
            FacebookPaginatedResponse<
                FacebookPagePost & { insights?: { data: FacebookPostInsight[] } }
            >
        >(url);
    }

    // ==========================================================================
    // Page Posts - Update & Delete Operations
    // ==========================================================================

    /**
     * Update a post
     * @param postId The post ID
     * @param request Update data
     */
    async updatePost(
        postId: string,
        request: FacebookUpdatePostRequest
    ): Promise<{ success: boolean }> {
        return this.post<{ success: boolean }>(`/${postId}`, request);
    }

    /**
     * Hide or unhide a post
     * @param postId The post ID
     * @param isHidden Whether to hide the post
     */
    async setPostVisibility(postId: string, isHidden: boolean): Promise<{ success: boolean }> {
        return this.updatePost(postId, { is_hidden: isHidden });
    }

    /**
     * Delete a post
     * @param postId The post ID
     */
    async deletePost(postId: string): Promise<{ success: boolean }> {
        return this.delete<{ success: boolean }>(`/${postId}`);
    }

    /**
     * Delete a photo
     * @param photoId The photo ID
     */
    async deletePhoto(photoId: string): Promise<{ success: boolean }> {
        return this.delete<{ success: boolean }>(`/${photoId}`);
    }

    /**
     * Delete a video
     * @param videoId The video ID
     */
    async deleteVideo(videoId: string): Promise<{ success: boolean }> {
        return this.delete<{ success: boolean }>(`/${videoId}`);
    }

    // ==========================================================================
    // Page Posts - Comments
    // ==========================================================================

    /**
     * Get comments on a post
     * @param postId The post ID
     * @param options Pagination and filter options
     */
    async getPostComments(
        postId: string,
        options?: {
            limit?: number;
            after?: string;
            filter?: "toplevel" | "stream";
        }
    ): Promise<
        FacebookPaginatedResponse<{
            id: string;
            message: string;
            created_time: string;
            from?: { id: string; name: string };
            like_count?: number;
            comment_count?: number;
        }>
    > {
        let url = `/${postId}/comments?fields=id,message,created_time,from,like_count,comment_count`;

        if (options?.limit) url += `&limit=${options.limit}`;
        if (options?.after) url += `&after=${options.after}`;
        if (options?.filter) url += `&filter=${options.filter}`;

        return this.get(url);
    }

    /**
     * Reply to a comment
     * @param commentId The comment ID to reply to
     * @param message The reply message
     */
    async replyToComment(commentId: string, message: string): Promise<{ id: string }> {
        return this.post<{ id: string }>(`/${commentId}/comments`, { message });
    }

    /**
     * Delete a comment
     * @param commentId The comment ID
     */
    async deleteComment(commentId: string): Promise<{ success: boolean }> {
        return this.delete<{ success: boolean }>(`/${commentId}`);
    }

    /**
     * Hide or unhide a comment
     * @param commentId The comment ID
     * @param isHidden Whether to hide the comment
     */
    async setCommentVisibility(
        commentId: string,
        isHidden: boolean
    ): Promise<{ success: boolean }> {
        return this.post<{ success: boolean }>(`/${commentId}`, { is_hidden: isHidden });
    }
}
