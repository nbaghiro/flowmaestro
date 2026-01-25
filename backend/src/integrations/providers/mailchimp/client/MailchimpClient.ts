/**
 * Mailchimp HTTP Client
 *
 * Handles all HTTP communication with Mailchimp API.
 * Mailchimp requires fetching the API endpoint from metadata after OAuth.
 * Member endpoints use MD5 hash of lowercase email as subscriber_hash.
 *
 * Base URL: Varies per account - fetched from OAuth metadata endpoint
 */

import * as crypto from "crypto";
import { BaseAPIClient, type BaseAPIClientConfig } from "../../../core/BaseAPIClient";

export interface MailchimpClientConfig {
    accessToken: string;
    apiEndpoint: string; // e.g., https://us1.api.mailchimp.com
    connectionId?: string;
}

// ============================================
// Mailchimp API Types
// ============================================

export interface MailchimpList {
    id: string;
    name: string;
    contact: {
        company: string;
        address1: string;
        address2?: string;
        city: string;
        state: string;
        zip: string;
        country: string;
        phone?: string;
    };
    permission_reminder: string;
    campaign_defaults: {
        from_name: string;
        from_email: string;
        subject: string;
        language: string;
    };
    email_type_option: boolean;
    date_created: string;
    list_rating: number;
    subscribe_url_short: string;
    subscribe_url_long: string;
    beamer_address: string;
    visibility: "pub" | "prv";
    double_optin: boolean;
    marketing_permissions: boolean;
    stats: {
        member_count: number;
        unsubscribe_count: number;
        cleaned_count: number;
        member_count_since_send: number;
        unsubscribe_count_since_send: number;
        cleaned_count_since_send: number;
        campaign_count: number;
        campaign_last_sent?: string;
        merge_field_count: number;
        avg_sub_rate: number;
        avg_unsub_rate: number;
        target_sub_rate: number;
        open_rate: number;
        click_rate: number;
        last_sub_date?: string;
        last_unsub_date?: string;
    };
}

export interface MailchimpMember {
    id: string;
    email_address: string;
    unique_email_id: string;
    email_type?: string;
    status: "subscribed" | "unsubscribed" | "cleaned" | "pending" | "transactional" | "archived";
    merge_fields?: Record<string, unknown>;
    interests?: Record<string, boolean>;
    stats?: {
        avg_open_rate: number;
        avg_click_rate: number;
    };
    ip_signup?: string;
    timestamp_signup?: string;
    ip_opt?: string;
    timestamp_opt?: string;
    member_rating?: number;
    last_changed?: string;
    language?: string;
    vip?: boolean;
    email_client?: string;
    location?: {
        latitude?: number;
        longitude?: number;
        gmtoff?: number;
        dstoff?: number;
        country_code?: string;
        timezone?: string;
        region?: string;
    };
    source?: string;
    tags_count?: number;
    tags?: Array<{ id: number; name: string }>;
    list_id: string;
    full_name?: string;
}

export interface MailchimpTag {
    id: number;
    name: string;
    member_count?: number;
}

export interface MailchimpSegment {
    id: number;
    name: string;
    member_count: number;
    type: "saved" | "static" | "fuzzy";
    created_at: string;
    updated_at: string;
    options?: {
        match?: "any" | "all";
        conditions?: unknown[];
    };
    list_id: string;
}

export interface MailchimpCampaign {
    id: string;
    type: "regular" | "plaintext" | "absplit" | "rss" | "variate";
    create_time: string;
    archive_url?: string;
    long_archive_url?: string;
    status: "save" | "paused" | "schedule" | "sending" | "sent" | "canceled";
    emails_sent?: number;
    send_time?: string;
    content_type?: string;
    recipients?: {
        list_id?: string;
        list_name?: string;
        segment_text?: string;
        recipient_count?: number;
    };
    settings?: {
        subject_line?: string;
        preview_text?: string;
        title?: string;
        from_name?: string;
        reply_to?: string;
        to_name?: string;
        folder_id?: string;
        template_id?: number;
    };
    tracking?: {
        opens?: boolean;
        html_clicks?: boolean;
        text_clicks?: boolean;
        goal_tracking?: boolean;
        ecomm360?: boolean;
    };
    report_summary?: {
        opens?: number;
        unique_opens?: number;
        open_rate?: number;
        clicks?: number;
        subscriber_clicks?: number;
        click_rate?: number;
    };
}

export interface MailchimpTemplate {
    id: number;
    type: string;
    name: string;
    drag_and_drop: boolean;
    responsive: boolean;
    category?: string;
    date_created: string;
    date_edited?: string;
    created_by?: string;
    edited_by?: string;
    active: boolean;
    folder_id?: string;
    thumbnail?: string;
    share_url?: string;
}

interface MailchimpErrorResponse {
    type?: string;
    title?: string;
    status?: number;
    detail?: string;
    instance?: string;
    errors?: Array<{
        field?: string;
        message?: string;
    }>;
}

export class MailchimpClient extends BaseAPIClient {
    constructor(config: MailchimpClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: `${config.apiEndpoint}/3.0`,
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
                maxSockets: 10, // Mailchimp rate limit: 10 concurrent connections
                maxFreeSockets: 5,
                keepAliveMsecs: 60000
            }
        };

        super(clientConfig);

        // Add authorization header using OAuth access token
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
     * Get MD5 hash of lowercase email for subscriber_hash
     */
    static getSubscriberHash(email: string): string {
        return crypto.createHash("md5").update(email.toLowerCase()).digest("hex");
    }

    /**
     * Override request to handle Mailchimp-specific error formats
     */
    protected override async handleError(error: unknown): Promise<never> {
        if (error && typeof error === "object" && "response" in error) {
            const errorWithResponse = error as {
                response?: { status?: number; data?: MailchimpErrorResponse };
            };
            const response = errorWithResponse.response;

            if (response?.data) {
                const mailchimpError = response.data;
                const errorMessage =
                    mailchimpError.detail || mailchimpError.title || "Unknown Mailchimp error";
                const fieldErrors = mailchimpError.errors
                    ?.map((e) => `${e.field}: ${e.message}`)
                    .join(", ");
                throw new Error(
                    `Mailchimp API error: ${errorMessage}${fieldErrors ? ` (${fieldErrors})` : ""}`
                );
            }

            if (response?.status === 401) {
                throw new Error("Mailchimp authentication failed. Please reconnect your account.");
            }

            if (response?.status === 403) {
                throw new Error(
                    "Mailchimp permission denied. Your account may not have access to this resource."
                );
            }

            if (response?.status === 404) {
                throw new Error("Resource not found in Mailchimp.");
            }

            if (response?.status === 429) {
                throw new Error("Mailchimp rate limit exceeded. Please try again later.");
            }
        }

        throw error;
    }

    // ============================================
    // List (Audience) Operations
    // ============================================

    /**
     * Get all lists (audiences)
     */
    async getLists(params?: {
        count?: number;
        offset?: number;
        sortField?: string;
        sortDir?: "ASC" | "DESC";
    }): Promise<{
        lists: MailchimpList[];
        total_items: number;
    }> {
        return this.get("/lists", params);
    }

    /**
     * Get a single list by ID
     */
    async getList(listId: string): Promise<MailchimpList> {
        return this.get(`/lists/${listId}`);
    }

    /**
     * Create a new list
     */
    async createList(data: {
        name: string;
        contact: {
            company: string;
            address1: string;
            address2?: string;
            city: string;
            state: string;
            zip: string;
            country: string;
            phone?: string;
        };
        permission_reminder: string;
        campaign_defaults: {
            from_name: string;
            from_email: string;
            subject: string;
            language: string;
        };
        email_type_option?: boolean;
        double_optin?: boolean;
        marketing_permissions?: boolean;
    }): Promise<MailchimpList> {
        return this.post("/lists", data);
    }

    /**
     * Update a list
     */
    async updateList(
        listId: string,
        data: {
            name?: string;
            contact?: {
                company?: string;
                address1?: string;
                address2?: string;
                city?: string;
                state?: string;
                zip?: string;
                country?: string;
                phone?: string;
            };
            permission_reminder?: string;
            campaign_defaults?: {
                from_name?: string;
                from_email?: string;
                subject?: string;
                language?: string;
            };
            email_type_option?: boolean;
            double_optin?: boolean;
            marketing_permissions?: boolean;
        }
    ): Promise<MailchimpList> {
        return this.patch(`/lists/${listId}`, data);
    }

    // ============================================
    // Member Operations
    // ============================================

    /**
     * Get members from a list
     */
    async getMembers(
        listId: string,
        params?: {
            count?: number;
            offset?: number;
            status?: string;
            since_last_changed?: string;
        }
    ): Promise<{
        members: MailchimpMember[];
        total_items: number;
    }> {
        return this.get(`/lists/${listId}/members`, params);
    }

    /**
     * Get a single member by email
     */
    async getMember(listId: string, email: string): Promise<MailchimpMember> {
        const subscriberHash = MailchimpClient.getSubscriberHash(email);
        return this.get(`/lists/${listId}/members/${subscriberHash}`);
    }

    /**
     * Add a new member to a list
     */
    async addMember(
        listId: string,
        data: {
            email_address: string;
            status: "subscribed" | "unsubscribed" | "cleaned" | "pending" | "transactional";
            email_type?: "html" | "text";
            merge_fields?: Record<string, unknown>;
            interests?: Record<string, boolean>;
            language?: string;
            vip?: boolean;
            location?: {
                latitude?: number;
                longitude?: number;
            };
            tags?: string[];
        }
    ): Promise<MailchimpMember> {
        return this.post(`/lists/${listId}/members`, data);
    }

    /**
     * Update a member
     */
    async updateMember(
        listId: string,
        email: string,
        data: {
            email_address?: string;
            status?: "subscribed" | "unsubscribed" | "cleaned" | "pending" | "transactional";
            email_type?: "html" | "text";
            merge_fields?: Record<string, unknown>;
            interests?: Record<string, boolean>;
            language?: string;
            vip?: boolean;
            location?: {
                latitude?: number;
                longitude?: number;
            };
        }
    ): Promise<MailchimpMember> {
        const subscriberHash = MailchimpClient.getSubscriberHash(email);
        return this.patch(`/lists/${listId}/members/${subscriberHash}`, data);
    }

    /**
     * Archive a member (soft delete)
     */
    async archiveMember(listId: string, email: string): Promise<void> {
        const subscriberHash = MailchimpClient.getSubscriberHash(email);
        await this.delete(`/lists/${listId}/members/${subscriberHash}`);
    }

    /**
     * Permanently delete a member
     */
    async deleteMemberPermanently(listId: string, email: string): Promise<void> {
        const subscriberHash = MailchimpClient.getSubscriberHash(email);
        await this.post(`/lists/${listId}/members/${subscriberHash}/actions/delete-permanent`, {});
    }

    // ============================================
    // Tag Operations
    // ============================================

    /**
     * Get tags for a list
     */
    async getTags(
        listId: string,
        params?: {
            count?: number;
            offset?: number;
        }
    ): Promise<{
        tags: MailchimpTag[];
        total_items: number;
    }> {
        return this.get(`/lists/${listId}/tag-search`, params);
    }

    /**
     * Add tags to a member
     */
    async addTagsToMember(listId: string, email: string, tags: string[]): Promise<void> {
        const subscriberHash = MailchimpClient.getSubscriberHash(email);
        await this.post(`/lists/${listId}/members/${subscriberHash}/tags`, {
            tags: tags.map((name) => ({ name, status: "active" }))
        });
    }

    /**
     * Remove tags from a member
     */
    async removeTagsFromMember(listId: string, email: string, tags: string[]): Promise<void> {
        const subscriberHash = MailchimpClient.getSubscriberHash(email);
        await this.post(`/lists/${listId}/members/${subscriberHash}/tags`, {
            tags: tags.map((name) => ({ name, status: "inactive" }))
        });
    }

    // ============================================
    // Segment Operations
    // ============================================

    /**
     * Get segments for a list
     */
    async getSegments(
        listId: string,
        params?: {
            count?: number;
            offset?: number;
            type?: string;
        }
    ): Promise<{
        segments: MailchimpSegment[];
        total_items: number;
    }> {
        return this.get(`/lists/${listId}/segments`, params);
    }

    /**
     * Get members in a segment
     */
    async getSegmentMembers(
        listId: string,
        segmentId: number,
        params?: {
            count?: number;
            offset?: number;
        }
    ): Promise<{
        members: MailchimpMember[];
        total_items: number;
    }> {
        return this.get(`/lists/${listId}/segments/${segmentId}/members`, params);
    }

    // ============================================
    // Campaign Operations
    // ============================================

    /**
     * Get all campaigns
     */
    async getCampaigns(params?: {
        count?: number;
        offset?: number;
        type?: string;
        status?: string;
        list_id?: string;
        since_send_time?: string;
        before_send_time?: string;
        since_create_time?: string;
        before_create_time?: string;
        sort_field?: string;
        sort_dir?: "ASC" | "DESC";
    }): Promise<{
        campaigns: MailchimpCampaign[];
        total_items: number;
    }> {
        return this.get("/campaigns", params);
    }

    /**
     * Get a single campaign
     */
    async getCampaign(campaignId: string): Promise<MailchimpCampaign> {
        return this.get(`/campaigns/${campaignId}`);
    }

    /**
     * Create a new campaign
     */
    async createCampaign(data: {
        type: "regular" | "plaintext" | "absplit" | "rss" | "variate";
        recipients?: {
            list_id: string;
            segment_opts?: {
                saved_segment_id?: number;
                match?: "any" | "all";
                conditions?: unknown[];
            };
        };
        settings?: {
            subject_line?: string;
            preview_text?: string;
            title?: string;
            from_name?: string;
            reply_to?: string;
            to_name?: string;
            folder_id?: string;
            template_id?: number;
        };
        tracking?: {
            opens?: boolean;
            html_clicks?: boolean;
            text_clicks?: boolean;
            goal_tracking?: boolean;
            ecomm360?: boolean;
        };
    }): Promise<MailchimpCampaign> {
        return this.post("/campaigns", data);
    }

    /**
     * Update a campaign
     */
    async updateCampaign(
        campaignId: string,
        data: {
            recipients?: {
                list_id: string;
                segment_opts?: {
                    saved_segment_id?: number;
                    match?: "any" | "all";
                    conditions?: unknown[];
                };
            };
            settings?: {
                subject_line?: string;
                preview_text?: string;
                title?: string;
                from_name?: string;
                reply_to?: string;
                to_name?: string;
                folder_id?: string;
                template_id?: number;
            };
            tracking?: {
                opens?: boolean;
                html_clicks?: boolean;
                text_clicks?: boolean;
                goal_tracking?: boolean;
                ecomm360?: boolean;
            };
        }
    ): Promise<MailchimpCampaign> {
        return this.patch(`/campaigns/${campaignId}`, data);
    }

    /**
     * Send a campaign
     */
    async sendCampaign(campaignId: string): Promise<void> {
        await this.post(`/campaigns/${campaignId}/actions/send`, {});
    }

    /**
     * Schedule a campaign
     */
    async scheduleCampaign(
        campaignId: string,
        scheduleTime: string,
        timewarp?: boolean,
        batchDelivery?: { batch_count: number; batch_delay: number }
    ): Promise<void> {
        await this.post(`/campaigns/${campaignId}/actions/schedule`, {
            schedule_time: scheduleTime,
            timewarp,
            batch_delivery: batchDelivery
        });
    }

    /**
     * Unschedule a campaign
     */
    async unscheduleCampaign(campaignId: string): Promise<void> {
        await this.post(`/campaigns/${campaignId}/actions/unschedule`, {});
    }

    // ============================================
    // Template Operations
    // ============================================

    /**
     * Get all templates
     */
    async getTemplates(params?: {
        count?: number;
        offset?: number;
        type?: string;
        category?: string;
        folder_id?: string;
        sort_field?: string;
        sort_dir?: "ASC" | "DESC";
    }): Promise<{
        templates: MailchimpTemplate[];
        total_items: number;
    }> {
        return this.get("/templates", params);
    }

    /**
     * Get a single template
     */
    async getTemplate(templateId: number): Promise<MailchimpTemplate> {
        return this.get(`/templates/${templateId}`);
    }
}
