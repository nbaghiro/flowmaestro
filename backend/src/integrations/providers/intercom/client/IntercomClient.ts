/**
 * Intercom HTTP Client
 *
 * Handles all HTTP communication with Intercom API
 * Base URL: https://api.intercom.io
 */

import { BaseAPIClient, type BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type { IntercomErrorResponse } from "../types";

export interface IntercomClientConfig {
    accessToken: string;
    connectionId?: string;
}

export class IntercomClient extends BaseAPIClient {
    private accessToken: string;

    constructor(config: IntercomClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://api.intercom.io",
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

        this.accessToken = config.accessToken;

        // Add authorization header to all requests
        this.client.addRequestInterceptor((requestConfig) => {
            if (!requestConfig.headers) {
                requestConfig.headers = {};
            }
            requestConfig.headers["Authorization"] = `Bearer ${this.accessToken}`;
            requestConfig.headers["Content-Type"] = "application/json";
            requestConfig.headers["Accept"] = "application/json";
            // Intercom API version header
            requestConfig.headers["Intercom-Version"] = "2.11";
            return requestConfig;
        });
    }

    /**
     * Override request to handle Intercom-specific error formats
     */
    protected override async handleError(error: unknown): Promise<never> {
        // Check if it's a fetch error with response data
        if (error && typeof error === "object" && "response" in error) {
            const errorWithResponse = error as {
                response?: { status?: number; data?: IntercomErrorResponse };
            };
            const response = errorWithResponse.response;

            if (response?.data?.errors) {
                const errorMessages = response.data.errors.map((e) => e.message).join("; ");
                throw new Error(`Intercom API error: ${errorMessages}`);
            }

            if (response?.status === 401) {
                throw new Error("Intercom authentication failed. Please reconnect your account.");
            }

            if (response?.status === 403) {
                throw new Error("Intercom permission denied. Check your OAuth scopes.");
            }

            if (response?.status === 404) {
                throw new Error("Resource not found in Intercom.");
            }

            if (response?.status === 429) {
                throw new Error("Intercom rate limit exceeded. Please try again later.");
            }
        }

        throw error;
    }

    /**
     * Search contacts using Intercom's search API
     */
    async searchContacts(query: Record<string, unknown>): Promise<unknown> {
        return this.post("/contacts/search", { query });
    }

    /**
     * Search conversations using Intercom's search API
     */
    async searchConversations(query: Record<string, unknown>): Promise<unknown> {
        return this.post("/conversations/search", { query });
    }

    /**
     * Get a specific contact by ID
     */
    async getContact(contactId: string): Promise<unknown> {
        return this.get(`/contacts/${contactId}`);
    }

    /**
     * List contacts with optional pagination
     */
    async listContacts(params?: { per_page?: number; starting_after?: string }): Promise<unknown> {
        const queryParams: Record<string, string> = {};
        if (params?.per_page) queryParams.per_page = params.per_page.toString();
        if (params?.starting_after) queryParams.starting_after = params.starting_after;

        return this.get("/contacts", queryParams);
    }

    /**
     * Create a new contact
     */
    async createContact(data: Record<string, unknown>): Promise<unknown> {
        return this.post("/contacts", data);
    }

    /**
     * Update an existing contact
     */
    async updateContact(contactId: string, data: Record<string, unknown>): Promise<unknown> {
        return this.put(`/contacts/${contactId}`, data);
    }

    /**
     * Get a specific conversation
     */
    async getConversation(conversationId: string): Promise<unknown> {
        return this.get(`/conversations/${conversationId}`);
    }

    /**
     * List conversations with optional pagination
     */
    async listConversations(params?: {
        per_page?: number;
        starting_after?: string;
    }): Promise<unknown> {
        const queryParams: Record<string, string> = {};
        if (params?.per_page) queryParams.per_page = params.per_page.toString();
        if (params?.starting_after) queryParams.starting_after = params.starting_after;

        return this.get("/conversations", queryParams);
    }

    /**
     * Reply to a conversation
     */
    async replyToConversation(
        conversationId: string,
        data: Record<string, unknown>
    ): Promise<unknown> {
        return this.post(`/conversations/${conversationId}/reply`, data);
    }

    /**
     * Manage conversation (close, open, assign, snooze)
     */
    async manageConversation(
        conversationId: string,
        action: string,
        data: Record<string, unknown>
    ): Promise<unknown> {
        return this.post(`/conversations/${conversationId}/parts`, {
            ...data,
            message_type: action
        });
    }

    /**
     * List companies with optional pagination
     */
    async listCompanies(params?: { per_page?: number; starting_after?: string }): Promise<unknown> {
        const queryParams: Record<string, string> = {};
        if (params?.per_page) queryParams.per_page = params.per_page.toString();
        if (params?.starting_after) queryParams.starting_after = params.starting_after;

        return this.get("/companies", queryParams);
    }

    /**
     * Get a specific company
     */
    async getCompany(companyId: string): Promise<unknown> {
        return this.get(`/companies/${companyId}`);
    }

    /**
     * Create or update a company
     */
    async createOrUpdateCompany(data: Record<string, unknown>): Promise<unknown> {
        return this.post("/companies", data);
    }

    /**
     * List all tags
     */
    async listTags(): Promise<unknown> {
        return this.get("/tags");
    }

    /**
     * Tag a contact
     */
    async tagContact(contactId: string, tagId: string): Promise<unknown> {
        return this.post(`/contacts/${contactId}/tags`, { id: tagId });
    }

    /**
     * Untag a contact
     */
    async untagContact(contactId: string, tagId: string): Promise<unknown> {
        return this.delete(`/contacts/${contactId}/tags/${tagId}`);
    }

    /**
     * Tag a conversation
     */
    async tagConversation(
        conversationId: string,
        tagId: string,
        adminId: string
    ): Promise<unknown> {
        return this.post(`/conversations/${conversationId}/tags`, {
            id: tagId,
            admin_id: adminId
        });
    }

    /**
     * Create a note on a contact
     */
    async createNote(contactId: string, body: string, adminId?: string): Promise<unknown> {
        const data: Record<string, unknown> = {
            body,
            contact_id: contactId
        };
        if (adminId) data.admin_id = adminId;

        return this.post("/notes", data);
    }

    /**
     * List notes for a contact
     */
    async listNotes(contactId: string): Promise<unknown> {
        return this.get(`/contacts/${contactId}/notes`);
    }
}
