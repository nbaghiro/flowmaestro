/**
 * HubSpot Marketing HTTP Client
 *
 * Handles all HTTP communication with HubSpot Marketing APIs.
 * Focuses on marketing automation features: lists, campaigns, emails, forms, workflows.
 *
 * Base URL: https://api.hubapi.com
 */

import { BaseAPIClient, type BaseAPIClientConfig } from "../../../core/BaseAPIClient";

export interface HubspotMarketingClientConfig {
    accessToken: string;
    connectionId?: string;
}

// ============================================
// HubSpot Marketing API Types
// ============================================

export interface HubspotList {
    listId: number;
    name: string;
    listType: "STATIC" | "DYNAMIC";
    createdAt: number;
    updatedAt: number;
    metaData: {
        size: number;
        processing?: string;
        lastProcessingStateChangeAt?: number;
        error?: string;
        lastSizeChangeAt?: number;
    };
    deleteable: boolean;
    filters?: unknown[];
}

export interface HubspotContact {
    id: string;
    properties: Record<string, string | null>;
    createdAt: string;
    updatedAt: string;
    archived: boolean;
}

export interface HubspotCampaign {
    id: string;
    appId: number;
    appName: string;
    contentId: number;
    name: string;
    subject?: string;
    numIncluded?: number;
    numQueued?: number;
    lastUpdatedTime?: number;
    type?: string;
}

export interface HubspotForm {
    guid: string;
    name: string;
    createdAt: number;
    updatedAt: number;
    formType: string;
    cssClass?: string;
    submitText?: string;
    followUpId?: string;
    notifyRecipients?: string;
    leadNurturingCampaignId?: string;
    formFieldGroups?: Array<{
        fields: Array<{
            name: string;
            label: string;
            type: string;
            required: boolean;
        }>;
    }>;
}

export interface HubspotFormSubmission {
    submittedAt: number;
    values: Array<{
        name: string;
        value: string;
    }>;
    pageUrl?: string;
    pageName?: string;
}

export interface HubspotMarketingEmail {
    id: number;
    name: string;
    subject: string;
    state: string;
    createdAt: string;
    updatedAt: string;
    publishedAt?: string;
    type: string;
    campaignId?: number;
    stats?: {
        counters?: {
            sent?: number;
            delivered?: number;
            bounce?: number;
            open?: number;
            click?: number;
            unsubscribed?: number;
        };
        ratios?: {
            openratio?: number;
            clickratio?: number;
            clickthroughratio?: number;
            unsubscribedratio?: number;
        };
    };
}

export interface HubspotWorkflow {
    id: number;
    name: string;
    type: string;
    enabled: boolean;
    insertedAt: number;
    updatedAt: number;
    contactListIds?: {
        enrolled?: number;
        active?: number;
        completed?: number;
    };
}

interface HubspotErrorResponse {
    status?: string;
    message?: string;
    correlationId?: string;
    category?: string;
    errors?: Array<{
        message?: string;
        context?: Record<string, unknown>;
    }>;
}

export class HubspotMarketingClient extends BaseAPIClient {
    constructor(config: HubspotMarketingClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://api.hubapi.com",
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
                maxSockets: 10,
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
     * Override request to handle HubSpot-specific error formats
     */
    protected override async handleError(error: unknown): Promise<never> {
        if (error && typeof error === "object" && "response" in error) {
            const errorWithResponse = error as {
                response?: { status?: number; data?: HubspotErrorResponse };
            };
            const response = errorWithResponse.response;

            if (response?.data) {
                const hubspotError = response.data;
                const errorMessage = hubspotError.message || "Unknown HubSpot error";
                const fieldErrors = hubspotError.errors
                    ?.map((e) => e.message)
                    .filter(Boolean)
                    .join(", ");
                throw new Error(
                    `HubSpot API error: ${errorMessage}${fieldErrors ? ` (${fieldErrors})` : ""}`
                );
            }

            if (response?.status === 401) {
                throw new Error("HubSpot authentication failed. Please reconnect your account.");
            }

            if (response?.status === 403) {
                throw new Error(
                    "HubSpot permission denied. Your account may not have access to this resource."
                );
            }

            if (response?.status === 404) {
                throw new Error("Resource not found in HubSpot.");
            }

            if (response?.status === 429) {
                throw new Error("HubSpot rate limit exceeded. Please try again later.");
            }
        }

        throw error;
    }

    // ============================================
    // List Operations
    // ============================================

    /**
     * Get all lists
     */
    async getLists(params?: { count?: number; offset?: number }): Promise<{
        lists: HubspotList[];
        hasMore: boolean;
        offset: number;
    }> {
        return this.get("/contacts/v1/lists", params);
    }

    /**
     * Get a single list by ID
     */
    async getList(listId: number): Promise<HubspotList> {
        return this.get(`/contacts/v1/lists/${listId}`);
    }

    /**
     * Create a new list
     */
    async createList(data: {
        name: string;
        dynamic: boolean;
        filters?: unknown[];
    }): Promise<HubspotList> {
        return this.post("/contacts/v1/lists", data);
    }

    /**
     * Add contacts to a list
     */
    async addContactsToList(
        listId: number,
        contactIds: string[]
    ): Promise<{ updated: string[]; discarded: string[] }> {
        return this.post(`/contacts/v1/lists/${listId}/add`, {
            vids: contactIds.map((id) => parseInt(id))
        });
    }

    /**
     * Remove contacts from a list
     */
    async removeContactsFromList(
        listId: number,
        contactIds: string[]
    ): Promise<{ updated: string[]; discarded: string[] }> {
        return this.post(`/contacts/v1/lists/${listId}/remove`, {
            vids: contactIds.map((id) => parseInt(id))
        });
    }

    // ============================================
    // Contact Operations (using CRM v3 API)
    // ============================================

    /**
     * Get contacts
     */
    async getContacts(params?: { limit?: number; after?: string; properties?: string[] }): Promise<{
        results: HubspotContact[];
        paging?: { next?: { after: string } };
    }> {
        const queryParams: Record<string, unknown> = {};
        if (params?.limit) queryParams.limit = params.limit;
        if (params?.after) queryParams.after = params.after;
        if (params?.properties) queryParams.properties = params.properties.join(",");
        return this.get("/crm/v3/objects/contacts", queryParams);
    }

    /**
     * Get a single contact by ID
     */
    async getContact(contactId: string, properties?: string[]): Promise<HubspotContact> {
        const queryParams = properties ? { properties: properties.join(",") } : undefined;
        return this.get(`/crm/v3/objects/contacts/${contactId}`, queryParams);
    }

    /**
     * Create a new contact
     */
    async createContact(properties: Record<string, string>): Promise<HubspotContact> {
        return this.post("/crm/v3/objects/contacts", { properties });
    }

    /**
     * Update a contact
     */
    async updateContact(
        contactId: string,
        properties: Record<string, string>
    ): Promise<HubspotContact> {
        return this.patch(`/crm/v3/objects/contacts/${contactId}`, { properties });
    }

    /**
     * Delete a contact
     */
    async deleteContact(contactId: string): Promise<void> {
        await this.delete(`/crm/v3/objects/contacts/${contactId}`);
    }

    /**
     * Search contacts
     */
    async searchContacts(params: {
        query?: string;
        filterGroups?: Array<{
            filters: Array<{
                propertyName: string;
                operator: string;
                value: string;
            }>;
        }>;
        sorts?: Array<{
            propertyName: string;
            direction: "ASCENDING" | "DESCENDING";
        }>;
        properties?: string[];
        limit?: number;
        after?: number;
    }): Promise<{
        results: HubspotContact[];
        total: number;
        paging?: { next?: { after: string } };
    }> {
        return this.post("/crm/v3/objects/contacts/search", params);
    }

    // ============================================
    // Campaign Operations
    // ============================================

    /**
     * Get all campaigns
     */
    async getCampaigns(params?: { limit?: number; offset?: number }): Promise<{
        campaigns: HubspotCampaign[];
        hasMore: boolean;
        offset: number;
    }> {
        return this.get("/email/public/v1/campaigns", params);
    }

    /**
     * Get a single campaign
     */
    async getCampaign(campaignId: string): Promise<HubspotCampaign> {
        return this.get(`/email/public/v1/campaigns/${campaignId}`);
    }

    // ============================================
    // Form Operations
    // ============================================

    /**
     * Get all forms
     */
    async getForms(params?: {
        limit?: number;
        offset?: number;
        formTypes?: string[];
    }): Promise<HubspotForm[]> {
        return this.get("/forms/v2/forms", params);
    }

    /**
     * Get a single form
     */
    async getForm(formId: string): Promise<HubspotForm> {
        return this.get(`/forms/v2/forms/${formId}`);
    }

    /**
     * Get form submissions
     */
    async getFormSubmissions(
        formId: string,
        params?: {
            limit?: number;
            after?: string;
        }
    ): Promise<{
        results: HubspotFormSubmission[];
        paging?: { next?: { after: string } };
    }> {
        return this.get(`/form-integrations/v1/submissions/forms/${formId}`, params);
    }

    // ============================================
    // Marketing Email Operations
    // ============================================

    /**
     * Get marketing emails
     */
    async getMarketingEmails(params?: {
        limit?: number;
        offset?: number;
        state?: string;
    }): Promise<{
        objects: HubspotMarketingEmail[];
        total: number;
    }> {
        return this.get("/marketing-emails/v1/emails", params);
    }

    /**
     * Get a single marketing email
     */
    async getMarketingEmail(emailId: number): Promise<HubspotMarketingEmail> {
        return this.get(`/marketing-emails/v1/emails/${emailId}`);
    }

    /**
     * Get marketing email stats
     */
    async getMarketingEmailStats(emailId: number): Promise<{
        counters: {
            sent?: number;
            delivered?: number;
            bounce?: number;
            open?: number;
            click?: number;
            unsubscribed?: number;
        };
        ratios: {
            openratio?: number;
            clickratio?: number;
            clickthroughratio?: number;
            unsubscribedratio?: number;
        };
    }> {
        return this.get(`/marketing-emails/v1/emails/${emailId}/statistics`);
    }

    // ============================================
    // Workflow Operations
    // ============================================

    /**
     * Get all workflows
     */
    async getWorkflows(): Promise<{
        workflows: HubspotWorkflow[];
    }> {
        return this.get("/automation/v3/workflows");
    }

    /**
     * Get a single workflow
     */
    async getWorkflow(workflowId: number): Promise<HubspotWorkflow> {
        return this.get(`/automation/v3/workflows/${workflowId}`);
    }
}
