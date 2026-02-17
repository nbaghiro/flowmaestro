/**
 * Constant Contact HTTP Client
 *
 * Handles all HTTP communication with Constant Contact API.
 * Uses OAuth2 authentication with Bearer token.
 *
 * Base URL: https://api.cc.email/v3
 *
 * Rate Limits: 4 requests/second, 10,000 requests/day
 */

import { BaseAPIClient, type BaseAPIClientConfig } from "../../../core/BaseAPIClient";

export interface ConstantContactClientConfig {
    accessToken: string;
    connectionId?: string;
}

// ============================================
// Constant Contact API Types
// ============================================

export interface ConstantContactContact {
    contact_id: string;
    email_address: {
        address: string;
        permission_to_send: string;
        created_at: string;
        updated_at: string;
        confirm_status: string;
    };
    first_name?: string;
    last_name?: string;
    job_title?: string;
    company_name?: string;
    phone_numbers?: Array<{
        phone_number: string;
        kind: string;
    }>;
    custom_fields?: Array<{
        custom_field_id: string;
        value: string;
    }>;
    create_source: string;
    created_at: string;
    updated_at: string;
}

export interface ConstantContactList {
    list_id: string;
    name: string;
    description?: string;
    favorite: boolean;
    membership_count: number;
    created_at: string;
    updated_at: string;
}

export interface ConstantContactCampaign {
    campaign_id: string;
    name: string;
    type: string;
    type_code: number;
    current_status: string;
    created_at: string;
    updated_at?: string;
    last_sent_date?: string;
}

export interface ConstantContactTag {
    tag_id: string;
    name: string;
    contacts_count?: number;
    created_at: string;
    updated_at: string;
}

interface ConstantContactErrorResponse {
    error_key?: string;
    error_message?: string;
    errors?: Array<{
        error_key?: string;
        error_message?: string;
    }>;
}

export class ConstantContactClient extends BaseAPIClient {
    constructor(config: ConstantContactClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://api.cc.email/v3",
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
                maxSockets: 5,
                maxFreeSockets: 2,
                keepAliveMsecs: 60000
            }
        };

        super(clientConfig);

        // Add Bearer token for authentication
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
     * Override request to handle Constant Contact-specific error formats
     */
    protected override async handleError(error: unknown): Promise<never> {
        if (error && typeof error === "object" && "response" in error) {
            const errorWithResponse = error as {
                response?: { status?: number; data?: ConstantContactErrorResponse };
            };
            const response = errorWithResponse.response;

            if (response?.data) {
                const ccError = response.data;
                const errorMessage =
                    ccError.error_message ||
                    ccError.errors?.[0]?.error_message ||
                    "Unknown Constant Contact error";
                throw new Error(`Constant Contact API error: ${errorMessage}`);
            }

            if (response?.status === 401) {
                throw new Error(
                    "Constant Contact authentication failed. Please reconnect your account."
                );
            }

            if (response?.status === 403) {
                throw new Error(
                    "Constant Contact permission denied. Your account may not have access to this resource."
                );
            }

            if (response?.status === 404) {
                throw new Error("Resource not found in Constant Contact.");
            }

            if (response?.status === 429) {
                throw new Error("Constant Contact rate limit exceeded. Please try again later.");
            }
        }

        throw error;
    }

    // ============================================
    // Contact Operations
    // ============================================

    /**
     * Get all contacts
     */
    async getContacts(params?: {
        limit?: number;
        cursor?: string;
        status?: string;
        email?: string;
        listId?: string;
    }): Promise<{
        contacts: ConstantContactContact[];
        _links?: { next?: { href: string } };
    }> {
        const queryParams: Record<string, unknown> = {};
        if (params?.limit) queryParams.limit = params.limit;
        if (params?.cursor) queryParams.cursor = params.cursor;
        if (params?.status) queryParams.status = params.status;
        if (params?.email) queryParams.email = params.email;
        if (params?.listId) queryParams.list_memberships = params.listId;

        return this.get("/contacts", queryParams);
    }

    /**
     * Get a single contact by ID
     */
    async getContact(contactId: string): Promise<ConstantContactContact> {
        return this.get(`/contacts/${contactId}`);
    }

    /**
     * Create a new contact
     */
    async createContact(contact: {
        email_address: {
            address: string;
            permission_to_send: string;
        };
        first_name?: string;
        last_name?: string;
        job_title?: string;
        company_name?: string;
        phone_numbers?: Array<{
            phone_number: string;
            kind: string;
        }>;
        list_memberships?: string[];
        custom_fields?: Array<{
            custom_field_id: string;
            value: string;
        }>;
    }): Promise<ConstantContactContact> {
        return this.post("/contacts", contact);
    }

    /**
     * Update a contact
     */
    async updateContact(
        contactId: string,
        contact: {
            email_address?: {
                address: string;
                permission_to_send?: string;
            };
            first_name?: string;
            last_name?: string;
            job_title?: string;
            company_name?: string;
            phone_numbers?: Array<{
                phone_number: string;
                kind: string;
            }>;
            custom_fields?: Array<{
                custom_field_id: string;
                value: string;
            }>;
        }
    ): Promise<ConstantContactContact> {
        return this.put(`/contacts/${contactId}`, contact);
    }

    /**
     * Delete a contact
     */
    async deleteContact(contactId: string): Promise<void> {
        await this.delete(`/contacts/${contactId}`);
    }

    // ============================================
    // List Operations
    // ============================================

    /**
     * Get all lists
     */
    async getLists(params?: { limit?: number; cursor?: string }): Promise<{
        lists: ConstantContactList[];
        _links?: { next?: { href: string } };
    }> {
        const queryParams: Record<string, unknown> = {};
        if (params?.limit) queryParams.limit = params.limit;
        if (params?.cursor) queryParams.cursor = params.cursor;

        return this.get("/contact_lists", queryParams);
    }

    /**
     * Get a single list by ID
     */
    async getList(listId: string): Promise<ConstantContactList> {
        return this.get(`/contact_lists/${listId}`);
    }

    /**
     * Create a new list
     */
    async createList(list: {
        name: string;
        description?: string;
        favorite?: boolean;
    }): Promise<ConstantContactList> {
        return this.post("/contact_lists", list);
    }

    /**
     * Add contacts to a list
     */
    async addContactsToList(
        listId: string,
        contactIds: string[]
    ): Promise<{
        activity_id: string;
    }> {
        return this.post("/activities/add_list_memberships", {
            source: {
                contact_ids: contactIds
            },
            list_ids: [listId]
        });
    }

    /**
     * Remove contacts from a list
     */
    async removeContactsFromList(
        listId: string,
        contactIds: string[]
    ): Promise<{
        activity_id: string;
    }> {
        return this.post("/activities/remove_list_memberships", {
            source: {
                contact_ids: contactIds
            },
            list_ids: [listId]
        });
    }

    // ============================================
    // Campaign Operations
    // ============================================

    /**
     * Get all campaigns
     */
    async getCampaigns(params?: { limit?: number; cursor?: string }): Promise<{
        campaigns: ConstantContactCampaign[];
        _links?: { next?: { href: string } };
    }> {
        const queryParams: Record<string, unknown> = {};
        if (params?.limit) queryParams.limit = params.limit;
        if (params?.cursor) queryParams.cursor = params.cursor;

        return this.get("/emails", queryParams);
    }

    /**
     * Get a single campaign by ID
     */
    async getCampaign(campaignId: string): Promise<ConstantContactCampaign> {
        return this.get(`/emails/${campaignId}`);
    }

    /**
     * Schedule a campaign
     */
    async scheduleCampaign(
        campaignId: string,
        scheduledDate: string
    ): Promise<{
        campaign_activity_id: string;
    }> {
        return this.post(`/emails/activities/${campaignId}/schedules`, {
            scheduled_date: scheduledDate
        });
    }

    // ============================================
    // Tag Operations
    // ============================================

    /**
     * Get all tags
     */
    async getTags(params?: { limit?: number; cursor?: string }): Promise<{
        tags: ConstantContactTag[];
        _links?: { next?: { href: string } };
    }> {
        const queryParams: Record<string, unknown> = {};
        if (params?.limit) queryParams.limit = params.limit;
        if (params?.cursor) queryParams.cursor = params.cursor;

        return this.get("/contact_tags", queryParams);
    }

    /**
     * Add tags to contacts
     */
    async addTagsToContacts(
        tagIds: string[],
        contactIds: string[]
    ): Promise<{
        activity_id: string;
    }> {
        return this.post("/activities/contacts_taggings_add", {
            source: {
                contact_ids: contactIds
            },
            tag_ids: tagIds
        });
    }

    /**
     * Remove tags from contacts
     */
    async removeTagsFromContacts(
        tagIds: string[],
        contactIds: string[]
    ): Promise<{
        activity_id: string;
    }> {
        return this.post("/activities/contacts_taggings_remove", {
            source: {
                contact_ids: contactIds
            },
            tag_ids: tagIds
        });
    }
}
