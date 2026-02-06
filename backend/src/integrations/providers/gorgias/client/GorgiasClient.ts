/**
 * Gorgias HTTP Client
 *
 * Handles all HTTP communication with Gorgias API
 * Base URL: https://{subdomain}.gorgias.com/api
 *
 * Rate Limits:
 * - 80 requests/20 seconds for OAuth2 (240/min)
 * - Rate limit headers: X-Gorgias-Account-Api-Call-Limit, Retry-After
 */

import { BaseAPIClient, type BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type { GorgiasErrorResponse } from "../types";

export interface GorgiasClientConfig {
    subdomain: string;
    accessToken: string;
    connectionId?: string;
}

export class GorgiasClient extends BaseAPIClient {
    private subdomain: string;

    constructor(config: GorgiasClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: `https://${config.subdomain}.gorgias.com/api`,
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

        // Gorgias uses Bearer token authentication
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
     * Get the subdomain for this client
     */
    getSubdomain(): string {
        return this.subdomain;
    }

    /**
     * Override to handle Gorgias-specific error formats
     */
    protected override async handleError(error: unknown): Promise<never> {
        if (error && typeof error === "object" && "response" in error) {
            const errorWithResponse = error as {
                response?: { status?: number; data?: GorgiasErrorResponse };
            };
            const response = errorWithResponse.response;

            if (response?.data?.message) {
                throw new Error(response.data.message);
            }

            if (response?.data?.errors && response.data.errors.length > 0) {
                const gorgiasError = response.data.errors[0];
                const errorMessage =
                    gorgiasError.message || `Gorgias API error: ${gorgiasError.field}`;
                throw new Error(errorMessage);
            }

            if (response?.status === 401) {
                throw new Error("Gorgias authentication failed. Please check your access token.");
            }

            if (response?.status === 403) {
                throw new Error(
                    "Gorgias permission denied. Your access token may not have the required scopes."
                );
            }

            if (response?.status === 404) {
                throw new Error("Resource not found in Gorgias.");
            }

            if (response?.status === 429) {
                throw new Error("Gorgias rate limit exceeded. Please try again later.");
            }
        }

        throw error;
    }

    // ============================================
    // Ticket Operations
    // ============================================

    /**
     * List tickets with pagination and filters
     */
    async listTickets(params?: {
        limit?: number;
        cursor?: string;
        status?: string;
        customer_id?: number;
    }): Promise<unknown> {
        const queryParams: Record<string, string> = {};
        if (params?.limit) queryParams.limit = Math.min(params.limit, 100).toString();
        if (params?.cursor) queryParams.cursor = params.cursor;
        if (params?.status) queryParams.status = params.status;
        if (params?.customer_id) queryParams.customer_id = params.customer_id.toString();

        return this.get("/tickets", queryParams);
    }

    /**
     * Get a specific ticket by ID
     */
    async getTicket(ticketId: number): Promise<unknown> {
        return this.get(`/tickets/${ticketId}`);
    }

    /**
     * Create a new ticket
     */
    async createTicket(data: Record<string, unknown>): Promise<unknown> {
        return this.post("/tickets", data);
    }

    /**
     * Update an existing ticket
     */
    async updateTicket(ticketId: number, data: Record<string, unknown>): Promise<unknown> {
        return this.put(`/tickets/${ticketId}`, data);
    }

    /**
     * Search tickets with filters
     */
    async searchTickets(params: {
        limit?: number;
        cursor?: string;
        status?: string;
        channel?: string;
        assignee_user_id?: number;
        assignee_team_id?: number;
        customer_id?: number;
        tag_id?: number;
        created_after?: string;
        created_before?: string;
        updated_after?: string;
        updated_before?: string;
    }): Promise<unknown> {
        const queryParams: Record<string, string> = {};

        if (params.limit) queryParams.limit = Math.min(params.limit, 100).toString();
        if (params.cursor) queryParams.cursor = params.cursor;
        if (params.status) queryParams.status = params.status;
        if (params.channel) queryParams.channel = params.channel;
        if (params.assignee_user_id)
            queryParams.assignee_user_id = params.assignee_user_id.toString();
        if (params.assignee_team_id)
            queryParams.assignee_team_id = params.assignee_team_id.toString();
        if (params.customer_id) queryParams.customer_id = params.customer_id.toString();
        if (params.tag_id) queryParams.tag_id = params.tag_id.toString();
        if (params.created_after) queryParams["created_datetime[gte]"] = params.created_after;
        if (params.created_before) queryParams["created_datetime[lte]"] = params.created_before;
        if (params.updated_after) queryParams["updated_datetime[gte]"] = params.updated_after;
        if (params.updated_before) queryParams["updated_datetime[lte]"] = params.updated_before;

        return this.get("/tickets", queryParams);
    }

    // ============================================
    // Customer Operations
    // ============================================

    /**
     * List customers with pagination
     */
    async listCustomers(params?: { limit?: number; cursor?: string }): Promise<unknown> {
        const queryParams: Record<string, string> = {};
        if (params?.limit) queryParams.limit = Math.min(params.limit, 100).toString();
        if (params?.cursor) queryParams.cursor = params.cursor;

        return this.get("/customers", queryParams);
    }

    /**
     * Get a specific customer by ID
     */
    async getCustomer(customerId: number): Promise<unknown> {
        return this.get(`/customers/${customerId}`);
    }

    /**
     * Create a new customer
     */
    async createCustomer(data: Record<string, unknown>): Promise<unknown> {
        return this.post("/customers", data);
    }

    /**
     * Update an existing customer
     */
    async updateCustomer(customerId: number, data: Record<string, unknown>): Promise<unknown> {
        return this.put(`/customers/${customerId}`, data);
    }

    // ============================================
    // Message Operations
    // ============================================

    /**
     * List messages in a ticket
     */
    async listMessages(
        ticketId: number,
        params?: { limit?: number; cursor?: string }
    ): Promise<unknown> {
        const queryParams: Record<string, string> = {};
        if (params?.limit) queryParams.limit = Math.min(params.limit, 100).toString();
        if (params?.cursor) queryParams.cursor = params.cursor;

        return this.get(`/tickets/${ticketId}/messages`, queryParams);
    }

    /**
     * Create a message in a ticket
     */
    async createMessage(ticketId: number, data: Record<string, unknown>): Promise<unknown> {
        return this.post(`/tickets/${ticketId}/messages`, data);
    }
}
