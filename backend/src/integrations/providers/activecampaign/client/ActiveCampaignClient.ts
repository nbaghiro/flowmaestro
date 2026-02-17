/**
 * ActiveCampaign HTTP Client
 *
 * Handles all HTTP communication with ActiveCampaign API.
 * Uses API Key authentication with account-specific subdomain.
 *
 * Base URL: https://{account}.api-us1.com/api/3
 */

import { BaseAPIClient, type BaseAPIClientConfig } from "../../../core/BaseAPIClient";

export interface ActiveCampaignClientConfig {
    apiKey: string;
    accountName: string; // e.g., "yourcompany" from yourcompany.activehosted.com
    connectionId?: string;
}

// ============================================
// ActiveCampaign API Types
// ============================================

export interface ActiveCampaignContact {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    cdate?: string; // Created date
    udate?: string; // Updated date
    deleted?: string;
    links?: {
        contactLists?: string;
        contactTags?: string;
    };
}

export interface ActiveCampaignList {
    id: string;
    name: string;
    stringid: string;
    sender_name: string;
    sender_addr: string;
    sender_url: string;
    sender_reminder: string;
    cdate: string;
    udate: string;
    subscriber_count?: number;
}

export interface ActiveCampaignTag {
    id: string;
    tag: string;
    tagType?: string;
    description?: string;
    subscriber_count?: string;
    cdate?: string;
}

export interface ActiveCampaignContactTag {
    id: string;
    contact: string;
    tag: string;
    cdate: string;
}

export interface ActiveCampaignAutomation {
    id: string;
    name: string;
    status: string; // "0" = inactive, "1" = active
    entered?: number;
    exited?: number;
    cdate?: string;
    mdate?: string;
}

export interface ActiveCampaignCampaign {
    id: string;
    name: string;
    type: string;
    status: string;
    sdate?: string;
    ldate?: string;
    send_amt?: number;
    opens?: number;
    unique_opens?: number;
    clicks?: number;
    unique_clicks?: number;
    unsubscribes?: number;
    bounce_soft?: number;
    bounce_hard?: number;
}

export interface ActiveCampaignCustomField {
    id: string;
    title: string;
    descript?: string;
    type: string;
    perstag?: string;
    defval?: string;
    cdate?: string;
    udate?: string;
}

interface ActiveCampaignErrorResponse {
    errors?: Array<{
        title?: string;
        detail?: string;
        code?: string;
        source?: {
            pointer?: string;
        };
    }>;
    message?: string;
}

export class ActiveCampaignClient extends BaseAPIClient {
    constructor(config: ActiveCampaignClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: `https://${config.accountName}.api-us1.com/api/3`,
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

        // Add API-Token header for authentication
        this.client.addRequestInterceptor((requestConfig) => {
            if (!requestConfig.headers) {
                requestConfig.headers = {};
            }
            requestConfig.headers["Api-Token"] = config.apiKey;
            requestConfig.headers["Content-Type"] = "application/json";
            requestConfig.headers["Accept"] = "application/json";
            return requestConfig;
        });
    }

    /**
     * Override request to handle ActiveCampaign-specific error formats
     */
    protected override async handleError(error: unknown): Promise<never> {
        if (error && typeof error === "object" && "response" in error) {
            const errorWithResponse = error as {
                response?: { status?: number; data?: ActiveCampaignErrorResponse };
            };
            const response = errorWithResponse.response;

            if (response?.data) {
                const acError = response.data;
                const errorMessage =
                    acError.errors?.[0]?.title ||
                    acError.errors?.[0]?.detail ||
                    acError.message ||
                    "Unknown ActiveCampaign error";
                throw new Error(`ActiveCampaign API error: ${errorMessage}`);
            }

            if (response?.status === 401) {
                throw new Error("ActiveCampaign authentication failed. Please check your API key.");
            }

            if (response?.status === 403) {
                throw new Error(
                    "ActiveCampaign permission denied. Your account may not have access to this resource."
                );
            }

            if (response?.status === 404) {
                throw new Error("Resource not found in ActiveCampaign.");
            }

            if (response?.status === 429) {
                throw new Error("ActiveCampaign rate limit exceeded. Please try again later.");
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
        offset?: number;
        email?: string;
        listid?: string;
    }): Promise<{
        contacts: ActiveCampaignContact[];
        meta: { total: string };
    }> {
        return this.get("/contacts", params);
    }

    /**
     * Get a single contact by ID
     */
    async getContact(contactId: string): Promise<{
        contact: ActiveCampaignContact;
    }> {
        return this.get(`/contacts/${contactId}`);
    }

    /**
     * Create a new contact
     */
    async createContact(contact: {
        email: string;
        firstName?: string;
        lastName?: string;
        phone?: string;
        fieldValues?: Array<{ field: string; value: string }>;
    }): Promise<{
        contact: ActiveCampaignContact;
    }> {
        return this.post("/contacts", { contact });
    }

    /**
     * Update a contact
     */
    async updateContact(
        contactId: string,
        contact: {
            email?: string;
            firstName?: string;
            lastName?: string;
            phone?: string;
            fieldValues?: Array<{ field: string; value: string }>;
        }
    ): Promise<{
        contact: ActiveCampaignContact;
    }> {
        return this.put(`/contacts/${contactId}`, { contact });
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
    async getLists(params?: { limit?: number; offset?: number }): Promise<{
        lists: ActiveCampaignList[];
        meta: { total: string };
    }> {
        return this.get("/lists", params);
    }

    /**
     * Get a single list by ID
     */
    async getList(listId: string): Promise<{
        list: ActiveCampaignList;
    }> {
        return this.get(`/lists/${listId}`);
    }

    /**
     * Create a new list
     */
    async createList(list: {
        name: string;
        stringid: string;
        sender_url: string;
        sender_reminder: string;
        subscription_notify?: string;
        unsubscription_notify?: string;
    }): Promise<{
        list: ActiveCampaignList;
    }> {
        return this.post("/lists", { list });
    }

    /**
     * Add a contact to a list
     */
    async addContactToList(
        contactId: string,
        listId: string,
        status: number = 1
    ): Promise<{
        contactList: { contact: string; list: string; status: string };
    }> {
        return this.post("/contactLists", {
            contactList: {
                contact: contactId,
                list: listId,
                status
            }
        });
    }

    /**
     * Remove a contact from a list
     */
    async removeContactFromList(contactId: string, listId: string): Promise<void> {
        // Set status to 2 to unsubscribe
        await this.post("/contactLists", {
            contactList: {
                contact: contactId,
                list: listId,
                status: 2
            }
        });
    }

    // ============================================
    // Tag Operations
    // ============================================

    /**
     * Get all tags
     */
    async getTags(params?: { limit?: number; offset?: number; search?: string }): Promise<{
        tags: ActiveCampaignTag[];
        meta: { total: string };
    }> {
        return this.get("/tags", params);
    }

    /**
     * Add a tag to a contact
     */
    async addTagToContact(
        contactId: string,
        tagId: string
    ): Promise<{
        contactTag: ActiveCampaignContactTag;
    }> {
        return this.post("/contactTags", {
            contactTag: {
                contact: contactId,
                tag: tagId
            }
        });
    }

    /**
     * Remove a tag from a contact
     */
    async removeTagFromContact(contactTagId: string): Promise<void> {
        await this.delete(`/contactTags/${contactTagId}`);
    }

    /**
     * Get tags for a contact
     */
    async getContactTags(contactId: string): Promise<{
        contactTags: ActiveCampaignContactTag[];
    }> {
        return this.get(`/contacts/${contactId}/contactTags`);
    }

    // ============================================
    // Automation Operations
    // ============================================

    /**
     * Get all automations
     */
    async getAutomations(params?: { limit?: number; offset?: number }): Promise<{
        automations: ActiveCampaignAutomation[];
        meta: { total: string };
    }> {
        return this.get("/automations", params);
    }

    /**
     * Add a contact to an automation
     */
    async addContactToAutomation(
        contactId: string,
        automationId: string
    ): Promise<{
        contactAutomation: { contact: string; automation: string };
    }> {
        return this.post("/contactAutomations", {
            contactAutomation: {
                contact: contactId,
                automation: automationId
            }
        });
    }

    // ============================================
    // Campaign Operations
    // ============================================

    /**
     * Get all campaigns
     */
    async getCampaigns(params?: { limit?: number; offset?: number }): Promise<{
        campaigns: ActiveCampaignCampaign[];
        meta: { total: string };
    }> {
        return this.get("/campaigns", params);
    }

    /**
     * Get campaign stats
     */
    async getCampaignStats(campaignId: string): Promise<{
        campaign: ActiveCampaignCampaign;
    }> {
        return this.get(`/campaigns/${campaignId}`);
    }

    // ============================================
    // Custom Field Operations
    // ============================================

    /**
     * Get all custom fields
     */
    async getCustomFields(params?: { limit?: number; offset?: number }): Promise<{
        fields: ActiveCampaignCustomField[];
        meta: { total: string };
    }> {
        return this.get("/fields", params);
    }
}
