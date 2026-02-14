/**
 * Crisp HTTP Client
 *
 * Handles all HTTP communication with Crisp API
 * Base URL: https://api.crisp.chat/v1/
 *
 * Authentication: Basic Auth with identifier:key + X-Crisp-Tier header
 */

import { BaseAPIClient, type BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type {
    CrispConversation,
    CrispMessage,
    CrispPerson,
    CrispOperator,
    CrispApiResponse
} from "../types";

export interface CrispClientConfig {
    apiKey: string; // Format: "identifier:key"
    websiteId: string;
    connectionId?: string;
}

export class CrispClient extends BaseAPIClient {
    private websiteId: string;

    constructor(config: CrispClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://api.crisp.chat/v1",
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

        this.websiteId = config.websiteId;

        // Parse API key (format: identifier:key)
        const [identifier, key] = config.apiKey.split(":");
        if (!identifier || !key) {
            throw new Error("Invalid API key format. Expected: identifier:key");
        }

        const base64Auth = Buffer.from(`${identifier}:${key}`).toString("base64");

        // Add authorization headers to all requests
        this.client.addRequestInterceptor((requestConfig) => {
            if (!requestConfig.headers) {
                requestConfig.headers = {};
            }
            requestConfig.headers["Authorization"] = `Basic ${base64Auth}`;
            requestConfig.headers["X-Crisp-Tier"] = "plugin";
            requestConfig.headers["Content-Type"] = "application/json";
            requestConfig.headers["Accept"] = "application/json";
            return requestConfig;
        });
    }

    /**
     * Get the website ID for this client
     */
    getWebsiteId(): string {
        return this.websiteId;
    }

    /**
     * Override request to handle Crisp-specific error formats
     */
    protected override async handleError(error: unknown): Promise<never> {
        if (error && typeof error === "object" && "response" in error) {
            const errorWithResponse = error as {
                response?: {
                    status?: number;
                    data?: { error?: boolean; reason?: string; data?: Record<string, unknown> };
                };
            };
            const response = errorWithResponse.response;

            if (response?.data?.error && response?.data?.reason) {
                throw new Error(`Crisp API error: ${response.data.reason}`);
            }

            if (response?.status === 401) {
                throw new Error("Crisp authentication failed. Please check your API credentials.");
            }

            if (response?.status === 403) {
                throw new Error(
                    "Crisp permission denied. Your credentials may not have access to this resource."
                );
            }

            if (response?.status === 404) {
                throw new Error("Resource not found in Crisp.");
            }

            if (response?.status === 429) {
                throw new Error("Crisp rate limit exceeded. Please try again later.");
            }
        }

        throw error;
    }

    // ============================================
    // Conversation Operations
    // ============================================

    /**
     * List conversations for a website
     */
    async listConversations(pageNumber: number = 1): Promise<CrispConversation[]> {
        const response = await this.get<CrispApiResponse<CrispConversation[]>>(
            `/website/${this.websiteId}/conversations/${pageNumber}`
        );
        return response.data;
    }

    /**
     * Get a specific conversation
     */
    async getConversation(sessionId: string): Promise<CrispConversation> {
        const response = await this.get<CrispApiResponse<CrispConversation>>(
            `/website/${this.websiteId}/conversation/${sessionId}`
        );
        return response.data;
    }

    /**
     * Create a new conversation
     */
    async createConversation(): Promise<{ session_id: string }> {
        const response = await this.post<CrispApiResponse<{ session_id: string }>>(
            `/website/${this.websiteId}/conversation`
        );
        return response.data;
    }

    /**
     * Update conversation state
     */
    async updateConversationState(
        sessionId: string,
        state: "pending" | "unresolved" | "resolved"
    ): Promise<void> {
        await this.patch(`/website/${this.websiteId}/conversation/${sessionId}/state`, { state });
    }

    /**
     * Get messages in a conversation
     */
    async getMessages(sessionId: string): Promise<CrispMessage[]> {
        const response = await this.get<CrispApiResponse<CrispMessage[]>>(
            `/website/${this.websiteId}/conversation/${sessionId}/messages`
        );
        return response.data;
    }

    /**
     * Send a message in a conversation
     */
    async sendMessage(
        sessionId: string,
        data: {
            type: string;
            content: string | Record<string, unknown>;
            from: "operator";
            origin: "chat";
            user?: { nickname?: string; avatar?: string };
        }
    ): Promise<{ fingerprint: number }> {
        const response = await this.post<CrispApiResponse<{ fingerprint: number }>>(
            `/website/${this.websiteId}/conversation/${sessionId}/message`,
            data
        );
        return response.data;
    }

    /**
     * Search conversations
     */
    async searchConversations(query: string, pageNumber: number = 1): Promise<CrispConversation[]> {
        const response = await this.get<CrispApiResponse<CrispConversation[]>>(
            `/website/${this.websiteId}/conversations/${pageNumber}`,
            { search_query: query }
        );
        return response.data;
    }

    // ============================================
    // People Operations
    // ============================================

    /**
     * List people profiles
     */
    async listPeople(pageNumber: number = 1): Promise<CrispPerson[]> {
        const response = await this.get<CrispApiResponse<CrispPerson[]>>(
            `/website/${this.websiteId}/people/profiles/${pageNumber}`
        );
        return response.data;
    }

    /**
     * Get a specific person profile
     */
    async getPerson(peopleId: string): Promise<CrispPerson> {
        const response = await this.get<CrispApiResponse<CrispPerson>>(
            `/website/${this.websiteId}/people/profile/${peopleId}`
        );
        return response.data;
    }

    /**
     * Create a new person profile
     */
    async createPerson(data: Partial<CrispPerson>): Promise<{ people_id: string }> {
        const response = await this.post<CrispApiResponse<{ people_id: string }>>(
            `/website/${this.websiteId}/people/profile`,
            data
        );
        return response.data;
    }

    /**
     * Update a person profile
     */
    async updatePerson(peopleId: string, data: Partial<CrispPerson>): Promise<CrispPerson> {
        const response = await this.patch<CrispApiResponse<CrispPerson>>(
            `/website/${this.websiteId}/people/profile/${peopleId}`,
            data
        );
        return response.data;
    }

    // ============================================
    // Operator Operations
    // ============================================

    /**
     * List operators for a website
     */
    async listOperators(): Promise<CrispOperator[]> {
        const response = await this.get<CrispApiResponse<CrispOperator[]>>(
            `/website/${this.websiteId}/operators/list`
        );
        return response.data;
    }

    /**
     * Get operator availability
     */
    async getOperatorAvailability(operatorId: string): Promise<{ availability: string }> {
        const response = await this.get<CrispApiResponse<{ availability: string }>>(
            `/website/${this.websiteId}/operator/${operatorId}/availability`
        );
        return response.data;
    }

    /**
     * Assign a conversation to an operator
     */
    async assignConversation(sessionId: string, operatorId: string): Promise<void> {
        await this.patch(`/website/${this.websiteId}/conversation/${sessionId}/routing`, {
            assigned: { user_id: operatorId }
        });
    }

    /**
     * Unassign a conversation
     */
    async unassignConversation(sessionId: string): Promise<void> {
        await this.patch(`/website/${this.websiteId}/conversation/${sessionId}/routing`, {
            assigned: null
        });
    }

    // ============================================
    // Notes Operations
    // ============================================

    /**
     * Add a note to a conversation
     */
    async addNote(sessionId: string, content: string): Promise<{ fingerprint: number }> {
        const response = await this.post<CrispApiResponse<{ fingerprint: number }>>(
            `/website/${this.websiteId}/conversation/${sessionId}/message`,
            {
                type: "note",
                content,
                from: "operator",
                origin: "chat"
            }
        );
        return response.data;
    }
}
