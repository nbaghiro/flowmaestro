/**
 * Front HTTP Client
 *
 * Handles all HTTP communication with Front API.
 * Uses Bearer token authentication (OAuth2).
 *
 * Base URL: https://api2.frontapp.com
 *
 * Rate limit: 100 requests/minute (Professional plan), 5 req/sec per resource for Tier 2
 */

import { BaseAPIClient, type BaseAPIClientConfig } from "../../../core/BaseAPIClient";

export interface FrontClientConfig {
    accessToken: string;
    connectionId?: string;
    onTokenRefresh?: (tokens: { accessToken: string; refreshToken?: string }) => Promise<void>;
}

// ============================================
// Front API Types
// ============================================

export interface FrontConversation {
    _links: {
        self: string;
        related: {
            events?: string;
            followers?: string;
            messages?: string;
            comments?: string;
            inboxes?: string;
        };
    };
    id: string;
    subject: string;
    status: "archived" | "deleted" | "open" | "spam" | "assigned" | "unassigned";
    assignee?: FrontTeammate;
    recipient?: FrontRecipient;
    tags: FrontTag[];
    last_message?: FrontMessage;
    created_at: number;
    is_private: boolean;
    scheduled_reminders?: unknown[];
    metadata?: Record<string, unknown>;
}

export interface FrontMessage {
    _links: {
        self: string;
        related: {
            conversation?: string;
            message_replied_to?: string;
        };
    };
    id: string;
    type: "email" | "tweet" | "sms" | "intercom" | "facebook" | "front_chat" | "custom";
    is_inbound: boolean;
    draft_mode?: string;
    created_at: number;
    blurb: string;
    author?: FrontTeammate;
    recipients: FrontRecipient[];
    body: string;
    text?: string;
    subject?: string;
    attachments: FrontAttachment[];
    metadata?: Record<string, unknown>;
}

export interface FrontTeammate {
    _links: {
        self: string;
        related: {
            inboxes?: string;
            conversations?: string;
        };
    };
    id: string;
    email: string;
    username: string;
    first_name: string;
    last_name: string;
    is_admin: boolean;
    is_available: boolean;
    is_blocked: boolean;
    custom_fields?: Record<string, unknown>;
}

export interface FrontRecipient {
    _links?: {
        related?: {
            contact?: string;
        };
    };
    handle: string;
    role: "from" | "to" | "cc" | "bcc";
}

export interface FrontTag {
    _links: {
        self: string;
        related: {
            conversations?: string;
            owner?: string;
            children?: string;
        };
    };
    id: string;
    name: string;
    highlight?: string;
    is_private: boolean;
    created_at: number;
    updated_at: number;
}

export interface FrontInbox {
    _links: {
        self: string;
        related: {
            channels?: string;
            conversations?: string;
            teammates?: string;
            owner?: string;
        };
    };
    id: string;
    name: string;
    is_private: boolean;
    is_public: boolean;
    custom_fields?: Record<string, unknown>;
}

export interface FrontContact {
    _links: {
        self: string;
        related: {
            notes?: string;
            conversations?: string;
            owner?: string;
        };
    };
    id: string;
    name?: string;
    description?: string;
    avatar_url?: string;
    is_spammer: boolean;
    links: string[];
    handles: Array<{
        handle: string;
        source: string;
    }>;
    groups?: FrontContactGroup[];
    updated_at: number;
    custom_fields?: Record<string, unknown>;
}

export interface FrontContactGroup {
    _links: {
        self: string;
    };
    id: string;
    name: string;
    is_private: boolean;
}

export interface FrontComment {
    _links: {
        self: string;
        related: {
            conversation?: string;
            mentions?: string;
        };
    };
    id: string;
    author?: FrontTeammate;
    body: string;
    posted_at: number;
    attachments: FrontAttachment[];
}

export interface FrontAttachment {
    id?: string;
    filename: string;
    url: string;
    content_type: string;
    size: number;
    metadata?: Record<string, unknown>;
}

export interface FrontPagination {
    _pagination?: {
        next?: string;
        prev?: string;
    };
    _links?: {
        self: string;
    };
}

export interface FrontListResponse<T> extends FrontPagination {
    _results: T[];
}

interface FrontErrorResponse {
    _error?: {
        status: number;
        title: string;
        message: string;
    };
    error?: string;
    message?: string;
}

export class FrontClient extends BaseAPIClient {
    constructor(config: FrontClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://api2.frontapp.com",
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

        // Add authorization header using Bearer token
        this.client.addRequestInterceptor((requestConfig) => {
            if (!requestConfig.headers) {
                requestConfig.headers = {};
            }
            requestConfig.headers["Authorization"] = `Bearer ${config.accessToken}`;
            requestConfig.headers["Content-Type"] = "application/json";
            requestConfig.headers["Accept"] = "application/json";
            return requestConfig;
        });
    }

    /**
     * Override request to handle Front-specific error formats
     */
    protected override async handleError(error: unknown): Promise<never> {
        if (error && typeof error === "object" && "response" in error) {
            const errorWithResponse = error as {
                response?: { status?: number; data?: FrontErrorResponse };
            };
            const response = errorWithResponse.response;

            if (response?.data?._error) {
                const frontError = response.data._error;
                throw new Error(`Front API error: ${frontError.message || frontError.title}`);
            }

            if (response?.data?.error || response?.data?.message) {
                throw new Error(`Front API error: ${response.data.message || response.data.error}`);
            }

            if (response?.status === 401) {
                throw new Error("Front authentication failed. Please reconnect your account.");
            }

            if (response?.status === 403) {
                throw new Error("Front permission denied. Check your OAuth scopes.");
            }

            if (response?.status === 404) {
                throw new Error("Resource not found in Front.");
            }

            if (response?.status === 429) {
                throw new Error("Front rate limit exceeded. Please try again later.");
            }
        }

        throw error;
    }

    // ============================================
    // Conversation Operations
    // ============================================

    /**
     * List conversations with optional filters
     */
    async listConversations(params?: {
        q?: string;
        page_token?: string;
        limit?: number;
        inbox_id?: string;
        tag_id?: string;
        status?: string;
    }): Promise<FrontListResponse<FrontConversation>> {
        return this.get("/conversations", params);
    }

    /**
     * Get a single conversation by ID
     */
    async getConversation(conversationId: string): Promise<FrontConversation> {
        return this.get(`/conversations/${conversationId}`);
    }

    /**
     * Update a conversation (status, assignee, etc.)
     */
    async updateConversation(
        conversationId: string,
        data: {
            status?: "archived" | "open" | "spam" | "deleted";
            assignee_id?: string;
            inbox_id?: string;
        }
    ): Promise<void> {
        await this.patch(`/conversations/${conversationId}`, data);
    }

    // ============================================
    // Message Operations
    // ============================================

    /**
     * Send a reply to a conversation
     */
    async sendReply(
        conversationId: string,
        data: {
            body: string;
            to?: string[];
            cc?: string[];
            bcc?: string[];
            subject?: string;
            author_id?: string;
            channel_id?: string;
            options?: {
                tag_ids?: string[];
                archive?: boolean;
            };
        }
    ): Promise<FrontMessage> {
        return this.post(`/conversations/${conversationId}/messages`, data);
    }

    /**
     * List messages in a conversation
     */
    async listMessages(
        conversationId: string,
        params?: { page_token?: string; limit?: number }
    ): Promise<FrontListResponse<FrontMessage>> {
        return this.get(`/conversations/${conversationId}/messages`, params);
    }

    // ============================================
    // Comment Operations
    // ============================================

    /**
     * Add a comment to a conversation
     */
    async addComment(
        conversationId: string,
        data: {
            body: string;
            author_id?: string;
        }
    ): Promise<FrontComment> {
        return this.post(`/conversations/${conversationId}/comments`, data);
    }

    /**
     * List comments on a conversation
     */
    async listComments(
        conversationId: string,
        params?: { page_token?: string; limit?: number }
    ): Promise<FrontListResponse<FrontComment>> {
        return this.get(`/conversations/${conversationId}/comments`, params);
    }

    // ============================================
    // Tag Operations
    // ============================================

    /**
     * Add a tag to a conversation
     */
    async addTag(conversationId: string, tagId: string): Promise<void> {
        await this.post(`/conversations/${conversationId}/tags`, { tag_ids: [tagId] });
    }

    /**
     * Remove a tag from a conversation
     */
    async removeTag(conversationId: string, tagId: string): Promise<void> {
        await this.request({
            method: "DELETE",
            url: `/conversations/${conversationId}/tags`,
            data: { tag_ids: [tagId] }
        });
    }

    /**
     * List all tags
     */
    async listTags(params?: {
        page_token?: string;
        limit?: number;
    }): Promise<FrontListResponse<FrontTag>> {
        return this.get("/tags", params);
    }

    // ============================================
    // Inbox Operations
    // ============================================

    /**
     * List all inboxes
     */
    async listInboxes(params?: {
        page_token?: string;
        limit?: number;
    }): Promise<FrontListResponse<FrontInbox>> {
        return this.get("/inboxes", params);
    }

    /**
     * Get a single inbox
     */
    async getInbox(inboxId: string): Promise<FrontInbox> {
        return this.get(`/inboxes/${inboxId}`);
    }

    // ============================================
    // Contact Operations
    // ============================================

    /**
     * List all contacts
     */
    async listContacts(params?: {
        q?: string;
        page_token?: string;
        limit?: number;
        sort_by?: string;
        sort_order?: "asc" | "desc";
    }): Promise<FrontListResponse<FrontContact>> {
        return this.get("/contacts", params);
    }

    /**
     * Get a single contact
     */
    async getContact(contactId: string): Promise<FrontContact> {
        return this.get(`/contacts/${contactId}`);
    }

    /**
     * Create a new contact
     */
    async createContact(data: {
        name?: string;
        description?: string;
        handles: Array<{ handle: string; source: string }>;
        group_names?: string[];
        custom_fields?: Record<string, unknown>;
    }): Promise<FrontContact> {
        return this.post("/contacts", data);
    }

    /**
     * Update a contact
     */
    async updateContact(
        contactId: string,
        data: {
            name?: string;
            description?: string;
            avatar?: string;
            is_spammer?: boolean;
            links?: string[];
            group_names?: string[];
            custom_fields?: Record<string, unknown>;
        }
    ): Promise<FrontContact> {
        return this.patch(`/contacts/${contactId}`, data);
    }
}
