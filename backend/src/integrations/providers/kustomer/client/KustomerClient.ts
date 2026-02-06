/**
 * Kustomer HTTP Client
 *
 * Handles all HTTP communication with Kustomer API
 * Base URL: https://{orgName}.api.kustomerapp.com/v1
 */

import { BaseAPIClient, type BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type { KustomerErrorResponse } from "../types";

export interface KustomerClientConfig {
    apiKey: string;
    orgName: string;
    connectionId?: string;
}

export class KustomerClient extends BaseAPIClient {
    private orgName: string;

    constructor(config: KustomerClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: `https://${config.orgName}.api.kustomerapp.com/v1`,
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

        this.orgName = config.orgName;

        // Kustomer uses Bearer token authentication
        this.client.addRequestInterceptor((requestConfig) => {
            if (!requestConfig.headers) {
                requestConfig.headers = {};
            }
            requestConfig.headers["Authorization"] = `Bearer ${config.apiKey}`;
            requestConfig.headers["Content-Type"] = "application/json";
            requestConfig.headers["Accept"] = "application/json";
            return requestConfig;
        });
    }

    /**
     * Get the organization name for this client
     */
    getOrgName(): string {
        return this.orgName;
    }

    /**
     * Override to handle Kustomer-specific error formats
     */
    protected override async handleError(error: unknown): Promise<never> {
        if (error && typeof error === "object" && "response" in error) {
            const errorWithResponse = error as {
                response?: { status?: number; data?: KustomerErrorResponse };
            };
            const response = errorWithResponse.response;

            if (response?.data?.errors && response.data.errors.length > 0) {
                const kustomerError = response.data.errors[0];
                const errorMessage =
                    kustomerError.detail ||
                    kustomerError.title ||
                    `Kustomer API error: ${kustomerError.code}`;
                throw new Error(errorMessage);
            }

            if (response?.status === 401) {
                throw new Error("Kustomer authentication failed. Please check your API key.");
            }

            if (response?.status === 403) {
                throw new Error(
                    "Kustomer permission denied. Your API key may not have access to this resource."
                );
            }

            if (response?.status === 404) {
                throw new Error("Resource not found in Kustomer.");
            }

            if (response?.status === 429) {
                throw new Error("Kustomer rate limit exceeded. Please try again later.");
            }
        }

        throw error;
    }

    // ============================================
    // Customer Operations
    // ============================================

    /**
     * List customers with pagination
     */
    async listCustomers(params?: { page?: number; pageSize?: number }): Promise<unknown> {
        const queryParams: Record<string, string> = {};
        if (params?.page) queryParams.page = params.page.toString();
        if (params?.pageSize) queryParams.pageSize = Math.min(params.pageSize, 100).toString();

        return this.get("/customers", queryParams);
    }

    /**
     * Get a specific customer by ID
     */
    async getCustomer(customerId: string): Promise<unknown> {
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
    async updateCustomer(customerId: string, data: Record<string, unknown>): Promise<unknown> {
        return this.put(`/customers/${customerId}`, data);
    }

    /**
     * Delete a customer
     */
    async deleteCustomer(customerId: string): Promise<void> {
        await this.delete(`/customers/${customerId}`);
    }

    /**
     * Search customers with query criteria
     */
    async searchCustomers(
        query: Record<string, unknown>,
        params?: { page?: number; pageSize?: number }
    ): Promise<unknown> {
        const queryParams: Record<string, string> = {};
        if (params?.page) queryParams.page = params.page.toString();
        if (params?.pageSize) queryParams.pageSize = Math.min(params.pageSize, 100).toString();

        // Kustomer search uses POST with query in body
        return this.post("/customers/search", query);
    }

    // ============================================
    // Conversation Operations
    // ============================================

    /**
     * List conversations with pagination
     */
    async listConversations(params?: {
        page?: number;
        pageSize?: number;
        status?: string;
    }): Promise<unknown> {
        const queryParams: Record<string, string> = {};
        if (params?.page) queryParams.page = params.page.toString();
        if (params?.pageSize) queryParams.pageSize = Math.min(params.pageSize, 100).toString();
        if (params?.status) queryParams.status = params.status;

        return this.get("/conversations", queryParams);
    }

    /**
     * Get a specific conversation by ID
     */
    async getConversation(conversationId: string): Promise<unknown> {
        return this.get(`/conversations/${conversationId}`);
    }

    /**
     * Create a new conversation
     */
    async createConversation(data: Record<string, unknown>): Promise<unknown> {
        return this.post("/conversations", data);
    }

    /**
     * Update an existing conversation
     */
    async updateConversation(
        conversationId: string,
        data: Record<string, unknown>
    ): Promise<unknown> {
        return this.put(`/conversations/${conversationId}`, data);
    }

    /**
     * Add tags to a conversation
     */
    async addConversationTags(conversationId: string, tags: string[]): Promise<unknown> {
        return this.post(`/conversations/${conversationId}/tags`, { tags });
    }

    /**
     * Remove tags from a conversation
     */
    async removeConversationTags(conversationId: string, tags: string[]): Promise<void> {
        // Kustomer uses DELETE with body for removing tags
        await this.request({
            method: "DELETE",
            url: `/conversations/${conversationId}/tags`,
            data: { tags }
        });
    }

    // ============================================
    // Message Operations
    // ============================================

    /**
     * List messages in a conversation
     */
    async listMessages(
        conversationId: string,
        params?: { page?: number; pageSize?: number }
    ): Promise<unknown> {
        const queryParams: Record<string, string> = {};
        if (params?.page) queryParams.page = params.page.toString();
        if (params?.pageSize) queryParams.pageSize = Math.min(params.pageSize, 100).toString();

        return this.get(`/conversations/${conversationId}/messages`, queryParams);
    }

    /**
     * Create a message in a conversation
     */
    async createMessage(conversationId: string, data: Record<string, unknown>): Promise<unknown> {
        return this.post(`/conversations/${conversationId}/messages`, data);
    }

    /**
     * Create a message for a customer (by customer ID)
     */
    async createMessageByCustomer(
        customerId: string,
        data: Record<string, unknown>
    ): Promise<unknown> {
        return this.post(`/customers/${customerId}/messages`, data);
    }
}
