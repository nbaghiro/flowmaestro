/**
 * Freshdesk HTTP Client
 *
 * Handles all HTTP communication with Freshdesk API
 * Base URL: https://{subdomain}.freshdesk.com/api/v2
 */

import { BaseAPIClient, type BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type { FreshdeskErrorResponse } from "../types";

export interface FreshdeskClientConfig {
    apiKey: string;
    subdomain: string;
    connectionId?: string;
}

export class FreshdeskClient extends BaseAPIClient {
    private subdomain: string;

    constructor(config: FreshdeskClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: `https://${config.subdomain}.freshdesk.com/api/v2`,
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

        this.subdomain = config.subdomain;

        // Freshdesk uses Basic auth with API key as username and "X" as password
        const base64Auth = Buffer.from(`${config.apiKey}:X`).toString("base64");

        // Add authorization header to all requests
        this.client.addRequestInterceptor((requestConfig) => {
            if (!requestConfig.headers) {
                requestConfig.headers = {};
            }
            requestConfig.headers["Authorization"] = `Basic ${base64Auth}`;
            requestConfig.headers["Content-Type"] = "application/json";
            requestConfig.headers["Accept"] = "application/json";
            return requestConfig;
        });
    }

    /**
     * Get the subdomain for this client
     */
    getSubdomain(): string {
        return this.subdomain;
    }

    /**
     * Override request to handle Freshdesk-specific error formats
     */
    protected override async handleError(error: unknown): Promise<never> {
        // Check if it's a fetch error with response data
        if (error && typeof error === "object" && "response" in error) {
            const errorWithResponse = error as {
                response?: { status?: number; data?: FreshdeskErrorResponse };
            };
            const response = errorWithResponse.response;

            if (response?.data?.errors) {
                const errorMessages = response.data.errors
                    .map((e) => `${e.field ? e.field + ": " : ""}${e.message}`)
                    .join("; ");
                throw new Error(`Freshdesk API error: ${errorMessages}`);
            }

            if (response?.data?.description) {
                throw new Error(`Freshdesk API error: ${response.data.description}`);
            }

            if (response?.status === 401) {
                throw new Error("Freshdesk authentication failed. Please check your API key.");
            }

            if (response?.status === 403) {
                throw new Error(
                    "Freshdesk permission denied. Your plan may not support this feature."
                );
            }

            if (response?.status === 404) {
                throw new Error("Resource not found in Freshdesk.");
            }

            if (response?.status === 429) {
                throw new Error("Freshdesk rate limit exceeded. Please try again later.");
            }
        }

        throw error;
    }

    // ============================================
    // Ticket Operations
    // ============================================

    /**
     * Create a new ticket
     */
    async createTicket(data: Record<string, unknown>): Promise<unknown> {
        return this.post("/tickets", data);
    }

    /**
     * Get a specific ticket
     */
    async getTicket(ticketId: number, include?: string): Promise<unknown> {
        const params: Record<string, string> = {};
        if (include) params.include = include;

        return this.get(`/tickets/${ticketId}`, params);
    }

    /**
     * Update a ticket
     */
    async updateTicket(ticketId: number, data: Record<string, unknown>): Promise<unknown> {
        return this.put(`/tickets/${ticketId}`, data);
    }

    /**
     * Delete a ticket (moves to trash)
     */
    async deleteTicket(ticketId: number): Promise<void> {
        await this.delete(`/tickets/${ticketId}`);
    }

    /**
     * List tickets with optional filters
     */
    async listTickets(params?: {
        filter?: string;
        requester_id?: number;
        email?: string;
        company_id?: number;
        updated_since?: string;
        per_page?: number;
        page?: number;
    }): Promise<unknown[]> {
        const queryParams: Record<string, string> = {};
        if (params?.filter) queryParams.filter = params.filter;
        if (params?.requester_id) queryParams.requester_id = params.requester_id.toString();
        if (params?.email) queryParams.email = params.email;
        if (params?.company_id) queryParams.company_id = params.company_id.toString();
        if (params?.updated_since) queryParams.updated_since = params.updated_since;
        if (params?.per_page) queryParams.per_page = params.per_page.toString();
        if (params?.page) queryParams.page = params.page.toString();

        return this.get("/tickets", queryParams);
    }

    /**
     * Search tickets
     */
    async searchTickets(query: string): Promise<unknown> {
        return this.get("/search/tickets", { query: `"${query}"` });
    }

    /**
     * Add a reply to a ticket
     */
    async addTicketReply(ticketId: number, data: Record<string, unknown>): Promise<unknown> {
        return this.post(`/tickets/${ticketId}/reply`, data);
    }

    /**
     * Add a note to a ticket
     */
    async addTicketNote(ticketId: number, data: Record<string, unknown>): Promise<unknown> {
        return this.post(`/tickets/${ticketId}/notes`, data);
    }

    // ============================================
    // Contact Operations
    // ============================================

    /**
     * Create a new contact
     */
    async createContact(data: Record<string, unknown>): Promise<unknown> {
        return this.post("/contacts", data);
    }

    /**
     * Get a specific contact
     */
    async getContact(contactId: number): Promise<unknown> {
        return this.get(`/contacts/${contactId}`);
    }

    /**
     * Update a contact
     */
    async updateContact(contactId: number, data: Record<string, unknown>): Promise<unknown> {
        return this.put(`/contacts/${contactId}`, data);
    }

    /**
     * List contacts with optional filters
     */
    async listContacts(params?: {
        email?: string;
        phone?: string;
        company_id?: number;
        per_page?: number;
        page?: number;
    }): Promise<unknown[]> {
        const queryParams: Record<string, string> = {};
        if (params?.email) queryParams.email = params.email;
        if (params?.phone) queryParams.phone = params.phone;
        if (params?.company_id) queryParams.company_id = params.company_id.toString();
        if (params?.per_page) queryParams.per_page = params.per_page.toString();
        if (params?.page) queryParams.page = params.page.toString();

        return this.get("/contacts", queryParams);
    }

    /**
     * Search contacts
     */
    async searchContacts(query: string): Promise<unknown> {
        return this.get("/search/contacts", { query: `"${query}"` });
    }

    // ============================================
    // Company Operations
    // ============================================

    /**
     * Create a new company
     */
    async createCompany(data: Record<string, unknown>): Promise<unknown> {
        return this.post("/companies", data);
    }

    /**
     * Get a specific company
     */
    async getCompany(companyId: number): Promise<unknown> {
        return this.get(`/companies/${companyId}`);
    }

    /**
     * Update a company
     */
    async updateCompany(companyId: number, data: Record<string, unknown>): Promise<unknown> {
        return this.put(`/companies/${companyId}`, data);
    }

    /**
     * List companies
     */
    async listCompanies(params?: { per_page?: number; page?: number }): Promise<unknown[]> {
        const queryParams: Record<string, string> = {};
        if (params?.per_page) queryParams.per_page = params.per_page.toString();
        if (params?.page) queryParams.page = params.page.toString();

        return this.get("/companies", queryParams);
    }

    // ============================================
    // Agent Operations
    // ============================================

    /**
     * List agents
     */
    async listAgents(params?: { email?: string; per_page?: number }): Promise<unknown[]> {
        const queryParams: Record<string, string> = {};
        if (params?.email) queryParams.email = params.email;
        if (params?.per_page) queryParams.per_page = params.per_page.toString();

        return this.get("/agents", queryParams);
    }

    /**
     * Get a specific agent
     */
    async getAgent(agentId: number): Promise<unknown> {
        return this.get(`/agents/${agentId}`);
    }

    /**
     * Get the currently authenticated agent
     */
    async getCurrentAgent(): Promise<unknown> {
        return this.get("/agents/me");
    }
}
