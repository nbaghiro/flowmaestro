import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";

export interface YouTubeClientConfig {
    accessToken: string;
    connectionId?: string;
}

interface YouTubeErrorResponse {
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

// YouTube API Response Types
export interface YouTubeThumbnail {
    url: string;
    width: number;
    height: number;
}

export interface YouTubeThumbnails {
    default?: YouTubeThumbnail;
    medium?: YouTubeThumbnail;
    high?: YouTubeThumbnail;
    standard?: YouTubeThumbnail;
    maxres?: YouTubeThumbnail;
}

export interface YouTubeVideoSnippet {
    publishedAt: string;
    channelId: string;
    title: string;
    description: string;
    thumbnails: YouTubeThumbnails;
    channelTitle: string;
    tags?: string[];
    categoryId: string;
    liveBroadcastContent?: string;
    defaultLanguage?: string;
    localized?: {
        title: string;
        description: string;
    };
    defaultAudioLanguage?: string;
}

export interface YouTubeVideoContentDetails {
    duration: string;
    dimension: string;
    definition: string;
    caption: string;
    licensedContent: boolean;
    projection: string;
}

export interface YouTubeVideoStatistics {
    viewCount: string;
    likeCount: string;
    dislikeCount?: string;
    favoriteCount: string;
    commentCount: string;
}

export interface YouTubeVideoStatus {
    uploadStatus: string;
    privacyStatus: string;
    license: string;
    embeddable: boolean;
    publicStatsViewable: boolean;
    madeForKids: boolean;
}

export interface YouTubeVideo {
    kind: string;
    etag: string;
    id: string;
    snippet?: YouTubeVideoSnippet;
    contentDetails?: YouTubeVideoContentDetails;
    statistics?: YouTubeVideoStatistics;
    status?: YouTubeVideoStatus;
}

export interface YouTubeChannelSnippet {
    title: string;
    description: string;
    customUrl?: string;
    publishedAt: string;
    thumbnails: YouTubeThumbnails;
    defaultLanguage?: string;
    localized?: {
        title: string;
        description: string;
    };
    country?: string;
}

export interface YouTubeChannelStatistics {
    viewCount: string;
    subscriberCount: string;
    hiddenSubscriberCount: boolean;
    videoCount: string;
}

export interface YouTubeChannel {
    kind: string;
    etag: string;
    id: string;
    snippet?: YouTubeChannelSnippet;
    statistics?: YouTubeChannelStatistics;
}

export interface YouTubePlaylistSnippet {
    publishedAt: string;
    channelId: string;
    title: string;
    description: string;
    thumbnails: YouTubeThumbnails;
    channelTitle: string;
    defaultLanguage?: string;
    localized?: {
        title: string;
        description: string;
    };
}

export interface YouTubePlaylistStatus {
    privacyStatus: string;
}

export interface YouTubePlaylistContentDetails {
    itemCount: number;
}

export interface YouTubePlaylist {
    kind: string;
    etag: string;
    id: string;
    snippet?: YouTubePlaylistSnippet;
    status?: YouTubePlaylistStatus;
    contentDetails?: YouTubePlaylistContentDetails;
}

export interface YouTubePlaylistItemSnippet {
    publishedAt: string;
    channelId: string;
    title: string;
    description: string;
    thumbnails: YouTubeThumbnails;
    channelTitle: string;
    playlistId: string;
    position: number;
    resourceId: {
        kind: string;
        videoId: string;
    };
    videoOwnerChannelTitle?: string;
    videoOwnerChannelId?: string;
}

export interface YouTubePlaylistItem {
    kind: string;
    etag: string;
    id: string;
    snippet?: YouTubePlaylistItemSnippet;
    contentDetails?: {
        videoId: string;
        videoPublishedAt?: string;
    };
    status?: {
        privacyStatus: string;
    };
}

export interface YouTubeSearchResultId {
    kind: string;
    videoId?: string;
    channelId?: string;
    playlistId?: string;
}

export interface YouTubeSearchResult {
    kind: string;
    etag: string;
    id: YouTubeSearchResultId;
    snippet?: {
        publishedAt: string;
        channelId: string;
        title: string;
        description: string;
        thumbnails: YouTubeThumbnails;
        channelTitle: string;
        liveBroadcastContent?: string;
    };
}

export interface YouTubeCommentSnippet {
    authorDisplayName: string;
    authorProfileImageUrl: string;
    authorChannelUrl: string;
    authorChannelId?: {
        value: string;
    };
    videoId?: string;
    textDisplay: string;
    textOriginal: string;
    parentId?: string;
    canRate: boolean;
    viewerRating: string;
    likeCount: number;
    moderationStatus?: string;
    publishedAt: string;
    updatedAt: string;
}

export interface YouTubeComment {
    kind: string;
    etag: string;
    id: string;
    snippet: YouTubeCommentSnippet;
}

export interface YouTubeCommentThreadSnippet {
    channelId: string;
    videoId: string;
    topLevelComment: YouTubeComment;
    canReply: boolean;
    totalReplyCount: number;
    isPublic: boolean;
}

export interface YouTubeCommentThread {
    kind: string;
    etag: string;
    id: string;
    snippet: YouTubeCommentThreadSnippet;
    replies?: {
        comments: YouTubeComment[];
    };
}

export interface YouTubeSubscriptionSnippet {
    publishedAt: string;
    title: string;
    description: string;
    resourceId: {
        kind: string;
        channelId: string;
    };
    channelId: string;
    thumbnails: YouTubeThumbnails;
}

export interface YouTubeSubscription {
    kind: string;
    etag: string;
    id: string;
    snippet?: YouTubeSubscriptionSnippet;
    contentDetails?: {
        totalItemCount: number;
        newItemCount: number;
        activityType: string;
    };
}

export interface YouTubeListResponse<T> {
    kind: string;
    etag: string;
    nextPageToken?: string;
    prevPageToken?: string;
    pageInfo: {
        totalResults: number;
        resultsPerPage: number;
    };
    items: T[];
}

/**
 * YouTube Data API v3 Client with connection pooling and error handling
 *
 * API Documentation: https://developers.google.com/youtube/v3/docs
 * Base URL: https://www.googleapis.com/youtube/v3
 */
export class YouTubeClient extends BaseAPIClient {
    private accessToken: string;

    constructor(config: YouTubeClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://www.googleapis.com/youtube/v3",
            timeout: 60000, // 60s for video operations
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
     * Handle YouTube API-specific errors
     */
    protected async handleError(
        error: Error & {
            response?: { status?: number; data?: unknown; headers?: Record<string, string> };
        }
    ): Promise<never> {
        if (error.response) {
            const { status, data } = error.response;
            const errorData = data as YouTubeErrorResponse;
            const reason = errorData?.error?.errors?.[0]?.reason;

            if (status === 401) {
                throw new Error(
                    "YouTube authentication failed. Please reconnect your YouTube account."
                );
            }

            if (status === 403) {
                if (reason === "quotaExceeded") {
                    throw new Error(
                        "YouTube API quota exceeded. Daily limit reached, try again tomorrow."
                    );
                }
                if (reason === "rateLimitExceeded") {
                    throw new Error("YouTube rate limit exceeded. Please try again later.");
                }
                if (reason === "commentsDisabled") {
                    throw new Error("Comments are disabled on this video.");
                }
                if (reason === "forbidden") {
                    throw new Error(
                        `Permission denied: ${errorData?.error?.message || "You don't have permission to perform this action."}`
                    );
                }
                throw new Error(
                    `YouTube API error: ${errorData?.error?.message || "Permission denied"}`
                );
            }

            if (status === 404) {
                if (reason === "videoNotFound") {
                    throw new Error("Video not found or is private.");
                }
                if (reason === "playlistNotFound") {
                    throw new Error("Playlist not found or is private.");
                }
                if (reason === "channelNotFound") {
                    throw new Error("Channel not found.");
                }
                if (reason === "commentNotFound") {
                    throw new Error("Comment not found.");
                }
                throw new Error("Resource not found.");
            }

            if (status === 400) {
                throw new Error(`Invalid request: ${errorData?.error?.message || "Bad request"}`);
            }

            if (status === 429) {
                const retryAfter = error.response.headers?.["retry-after"];
                throw new Error(
                    `YouTube rate limit exceeded. Retry after ${retryAfter || "60"} seconds.`
                );
            }

            if (errorData?.error) {
                throw new Error(`YouTube API error: ${errorData.error.message}`);
            }
        }

        throw error;
    }

    // ==================== Search Operations ====================

    /**
     * Search for videos, channels, or playlists
     */
    async search(params: {
        q: string;
        type?: "video" | "channel" | "playlist";
        maxResults?: number;
        pageToken?: string;
        order?: "date" | "rating" | "relevance" | "title" | "viewCount";
        publishedAfter?: string;
        publishedBefore?: string;
        channelId?: string;
        videoDuration?: "any" | "short" | "medium" | "long";
        videoDefinition?: "any" | "high" | "standard";
        regionCode?: string;
        safeSearch?: "moderate" | "none" | "strict";
    }): Promise<YouTubeListResponse<YouTubeSearchResult>> {
        const queryParams: Record<string, string> = {
            part: "snippet",
            q: params.q,
            maxResults: (params.maxResults || 25).toString()
        };

        if (params.type) queryParams.type = params.type;
        if (params.pageToken) queryParams.pageToken = params.pageToken;
        if (params.order) queryParams.order = params.order;
        if (params.publishedAfter) queryParams.publishedAfter = params.publishedAfter;
        if (params.publishedBefore) queryParams.publishedBefore = params.publishedBefore;
        if (params.channelId) queryParams.channelId = params.channelId;
        if (params.videoDuration) queryParams.videoDuration = params.videoDuration;
        if (params.videoDefinition) queryParams.videoDefinition = params.videoDefinition;
        if (params.regionCode) queryParams.regionCode = params.regionCode;
        if (params.safeSearch) queryParams.safeSearch = params.safeSearch;

        return this.get("/search", queryParams);
    }

    // ==================== Video Operations ====================

    /**
     * Get videos by IDs or chart
     */
    async getVideos(params: {
        id?: string | string[];
        chart?: "mostPopular";
        myRating?: "like" | "dislike";
        part?: string[];
        maxResults?: number;
        pageToken?: string;
        regionCode?: string;
        videoCategoryId?: string;
    }): Promise<YouTubeListResponse<YouTubeVideo>> {
        const part = params.part || ["snippet", "contentDetails", "statistics"];
        const queryParams: Record<string, string> = {
            part: part.join(","),
            maxResults: (params.maxResults || 25).toString()
        };

        if (params.id) {
            queryParams.id = Array.isArray(params.id) ? params.id.join(",") : params.id;
        }
        if (params.chart) queryParams.chart = params.chart;
        if (params.myRating) queryParams.myRating = params.myRating;
        if (params.pageToken) queryParams.pageToken = params.pageToken;
        if (params.regionCode) queryParams.regionCode = params.regionCode;
        if (params.videoCategoryId) queryParams.videoCategoryId = params.videoCategoryId;

        return this.get("/videos", queryParams);
    }

    /**
     * Rate a video (like, dislike, or remove rating)
     */
    async rateVideo(videoId: string, rating: "like" | "dislike" | "none"): Promise<void> {
        await this.request({
            method: "POST",
            url: `/videos/rate?id=${encodeURIComponent(videoId)}&rating=${encodeURIComponent(rating)}`
        });
    }

    /**
     * Get rating for videos
     */
    async getVideoRating(
        videoIds: string[]
    ): Promise<{ items: Array<{ videoId: string; rating: string }> }> {
        return this.get("/videos/getRating", { id: videoIds.join(",") });
    }

    // ==================== Channel Operations ====================

    /**
     * Get channels by ID, username, or authenticated user
     */
    async getChannels(params: {
        id?: string | string[];
        forUsername?: string;
        mine?: boolean;
        part?: string[];
        maxResults?: number;
        pageToken?: string;
    }): Promise<YouTubeListResponse<YouTubeChannel>> {
        const part = params.part || ["snippet", "statistics"];
        const queryParams: Record<string, string> = {
            part: part.join(","),
            maxResults: (params.maxResults || 25).toString()
        };

        if (params.id) {
            queryParams.id = Array.isArray(params.id) ? params.id.join(",") : params.id;
        }
        if (params.forUsername) queryParams.forUsername = params.forUsername;
        if (params.mine) queryParams.mine = "true";
        if (params.pageToken) queryParams.pageToken = params.pageToken;

        return this.get("/channels", queryParams);
    }

    // ==================== Playlist Operations ====================

    /**
     * Get playlists
     */
    async getPlaylists(params: {
        id?: string | string[];
        channelId?: string;
        mine?: boolean;
        part?: string[];
        maxResults?: number;
        pageToken?: string;
    }): Promise<YouTubeListResponse<YouTubePlaylist>> {
        const part = params.part || ["snippet", "status", "contentDetails"];
        const queryParams: Record<string, string> = {
            part: part.join(","),
            maxResults: (params.maxResults || 25).toString()
        };

        if (params.id) {
            queryParams.id = Array.isArray(params.id) ? params.id.join(",") : params.id;
        }
        if (params.channelId) queryParams.channelId = params.channelId;
        if (params.mine) queryParams.mine = "true";
        if (params.pageToken) queryParams.pageToken = params.pageToken;

        return this.get("/playlists", queryParams);
    }

    /**
     * Create a new playlist
     */
    async createPlaylist(params: {
        title: string;
        description?: string;
        privacyStatus?: "private" | "public" | "unlisted";
        defaultLanguage?: string;
        tags?: string[];
    }): Promise<YouTubePlaylist> {
        const body = {
            snippet: {
                title: params.title,
                description: params.description || "",
                defaultLanguage: params.defaultLanguage,
                tags: params.tags
            },
            status: {
                privacyStatus: params.privacyStatus || "private"
            }
        };

        return this.request({
            method: "POST",
            url: "/playlists?part=snippet,status",
            data: body
        });
    }

    /**
     * Update a playlist
     */
    async updatePlaylist(
        playlistId: string,
        params: {
            title?: string;
            description?: string;
            privacyStatus?: "private" | "public" | "unlisted";
            defaultLanguage?: string;
        }
    ): Promise<YouTubePlaylist> {
        const body: {
            id: string;
            snippet?: Record<string, unknown>;
            status?: { privacyStatus: string };
        } = { id: playlistId };

        if (params.title || params.description || params.defaultLanguage) {
            body.snippet = {};
            if (params.title) body.snippet.title = params.title;
            if (params.description) body.snippet.description = params.description;
            if (params.defaultLanguage) body.snippet.defaultLanguage = params.defaultLanguage;
        }

        if (params.privacyStatus) {
            body.status = { privacyStatus: params.privacyStatus };
        }

        return this.request({
            method: "PUT",
            url: "/playlists?part=snippet,status",
            data: body
        });
    }

    /**
     * Delete a playlist
     */
    async deletePlaylist(playlistId: string): Promise<void> {
        await this.request({
            method: "DELETE",
            url: `/playlists?id=${encodeURIComponent(playlistId)}`
        });
    }

    // ==================== Playlist Item Operations ====================

    /**
     * Get playlist items
     */
    async getPlaylistItems(params: {
        playlistId: string;
        part?: string[];
        maxResults?: number;
        pageToken?: string;
        videoId?: string;
    }): Promise<YouTubeListResponse<YouTubePlaylistItem>> {
        const part = params.part || ["snippet", "contentDetails", "status"];
        const queryParams: Record<string, string> = {
            part: part.join(","),
            playlistId: params.playlistId,
            maxResults: (params.maxResults || 25).toString()
        };

        if (params.pageToken) queryParams.pageToken = params.pageToken;
        if (params.videoId) queryParams.videoId = params.videoId;

        return this.get("/playlistItems", queryParams);
    }

    /**
     * Add a video to a playlist
     */
    async addToPlaylist(params: {
        playlistId: string;
        videoId: string;
        position?: number;
    }): Promise<YouTubePlaylistItem> {
        const body: {
            snippet: {
                playlistId: string;
                resourceId: { kind: string; videoId: string };
                position?: number;
            };
        } = {
            snippet: {
                playlistId: params.playlistId,
                resourceId: {
                    kind: "youtube#video",
                    videoId: params.videoId
                }
            }
        };

        if (params.position !== undefined) {
            body.snippet.position = params.position;
        }

        return this.request({
            method: "POST",
            url: "/playlistItems?part=snippet",
            data: body
        });
    }

    /**
     * Remove an item from a playlist
     */
    async removeFromPlaylist(playlistItemId: string): Promise<void> {
        await this.request({
            method: "DELETE",
            url: `/playlistItems?id=${encodeURIComponent(playlistItemId)}`
        });
    }

    // ==================== Comment Operations ====================

    /**
     * Get comment threads for a video
     */
    async getCommentThreads(params: {
        videoId?: string;
        channelId?: string;
        allThreadsRelatedToChannelId?: string;
        part?: string[];
        maxResults?: number;
        pageToken?: string;
        order?: "time" | "relevance";
        searchTerms?: string;
        textFormat?: "html" | "plainText";
    }): Promise<YouTubeListResponse<YouTubeCommentThread>> {
        const part = params.part || ["snippet", "replies"];
        const queryParams: Record<string, string> = {
            part: part.join(","),
            maxResults: (params.maxResults || 25).toString()
        };

        if (params.videoId) queryParams.videoId = params.videoId;
        if (params.channelId) queryParams.channelId = params.channelId;
        if (params.allThreadsRelatedToChannelId) {
            queryParams.allThreadsRelatedToChannelId = params.allThreadsRelatedToChannelId;
        }
        if (params.pageToken) queryParams.pageToken = params.pageToken;
        if (params.order) queryParams.order = params.order;
        if (params.searchTerms) queryParams.searchTerms = params.searchTerms;
        if (params.textFormat) queryParams.textFormat = params.textFormat;

        return this.get("/commentThreads", queryParams);
    }

    /**
     * Post a new comment on a video
     */
    async insertComment(params: { videoId: string; text: string }): Promise<YouTubeCommentThread> {
        const body = {
            snippet: {
                videoId: params.videoId,
                topLevelComment: {
                    snippet: {
                        textOriginal: params.text
                    }
                }
            }
        };

        return this.request({
            method: "POST",
            url: "/commentThreads?part=snippet",
            data: body
        });
    }

    /**
     * Reply to an existing comment
     */
    async replyToComment(params: { parentId: string; text: string }): Promise<YouTubeComment> {
        const body = {
            snippet: {
                parentId: params.parentId,
                textOriginal: params.text
            }
        };

        return this.request({
            method: "POST",
            url: "/comments?part=snippet",
            data: body
        });
    }

    /**
     * Delete a comment
     */
    async deleteComment(commentId: string): Promise<void> {
        await this.request({
            method: "DELETE",
            url: `/comments?id=${encodeURIComponent(commentId)}`
        });
    }

    /**
     * Update a comment
     */
    async updateComment(commentId: string, text: string): Promise<YouTubeComment> {
        const body = {
            id: commentId,
            snippet: {
                textOriginal: text
            }
        };

        return this.request({
            method: "PUT",
            url: "/comments?part=snippet",
            data: body
        });
    }

    // ==================== Subscription Operations ====================

    /**
     * Get subscriptions
     */
    async getSubscriptions(params: {
        mine?: boolean;
        channelId?: string;
        forChannelId?: string;
        part?: string[];
        maxResults?: number;
        pageToken?: string;
        order?: "alphabetical" | "relevance" | "unread";
    }): Promise<YouTubeListResponse<YouTubeSubscription>> {
        const part = params.part || ["snippet", "contentDetails"];
        const queryParams: Record<string, string> = {
            part: part.join(","),
            maxResults: (params.maxResults || 25).toString()
        };

        if (params.mine) queryParams.mine = "true";
        if (params.channelId) queryParams.channelId = params.channelId;
        if (params.forChannelId) queryParams.forChannelId = params.forChannelId;
        if (params.pageToken) queryParams.pageToken = params.pageToken;
        if (params.order) queryParams.order = params.order;

        return this.get("/subscriptions", queryParams);
    }

    /**
     * Subscribe to a channel
     */
    async subscribe(channelId: string): Promise<YouTubeSubscription> {
        const body = {
            snippet: {
                resourceId: {
                    kind: "youtube#channel",
                    channelId: channelId
                }
            }
        };

        return this.request({
            method: "POST",
            url: "/subscriptions?part=snippet",
            data: body
        });
    }

    /**
     * Unsubscribe from a channel
     */
    async unsubscribe(subscriptionId: string): Promise<void> {
        await this.request({
            method: "DELETE",
            url: `/subscriptions?id=${encodeURIComponent(subscriptionId)}`
        });
    }
}
