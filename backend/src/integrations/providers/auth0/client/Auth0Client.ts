import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type { OAuth2TokenData } from "../../../../storage/models/Connection";
import type { RequestConfig } from "../../../core/types";

export interface Auth0ClientConfig {
    accessToken: string;
    domain: string;
    connectionId?: string;
    onTokenRefresh?: (tokens: OAuth2TokenData) => Promise<void>;
}

/**
 * Auth0 API response format
 */
interface Auth0Response {
    error?: string;
    error_description?: string;
    statusCode?: number;
    message?: string;
    [key: string]: unknown;
}

/**
 * Auth0 User
 */
export interface Auth0User {
    user_id: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    nickname?: string;
    picture?: string;
    created_at: string;
    updated_at: string;
    identities?: Array<{
        connection: string;
        provider: string;
        user_id: string;
        isSocial: boolean;
    }>;
    app_metadata?: Record<string, unknown>;
    user_metadata?: Record<string, unknown>;
    blocked?: boolean;
}

/**
 * Auth0 Role
 */
export interface Auth0Role {
    id: string;
    name: string;
    description?: string;
}

/**
 * Auth0 Connection
 */
export interface Auth0Connection {
    id: string;
    name: string;
    strategy: string;
    enabled_clients?: string[];
}

/**
 * Auth0 Management API Client with connection pooling and error handling
 */
export class Auth0Client extends BaseAPIClient {
    private accessToken: string;

    constructor(config: Auth0ClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: `https://${config.domain}/api/v2`,
            timeout: 30000,
            retryConfig: {
                maxRetries: 3,
                retryableStatuses: [429, 500, 502, 503],
                backoffStrategy: "exponential"
            },
            connectionPool: {
                maxSockets: 50,
                maxFreeSockets: 10,
                keepAlive: true
            }
        };

        super(clientConfig);

        this.accessToken = config.accessToken;

        // Add request interceptor for auth header
        this.client.addRequestInterceptor((reqConfig) => {
            if (!reqConfig.headers) {
                reqConfig.headers = {};
            }
            reqConfig.headers["Authorization"] = `Bearer ${this.accessToken}`;
            reqConfig.headers["Content-Type"] = "application/json";
            return reqConfig;
        });
    }

    /**
     * Override request to handle Auth0-specific response format
     */
    async request<T = unknown>(config: RequestConfig): Promise<T> {
        const response = await super.request<Auth0Response>(config);

        // Auth0 error responses contain 'error' or 'statusCode' fields
        if ("error" in response && response.error) {
            throw new Error(response.error_description || response.error);
        }

        if ("statusCode" in response && response.statusCode && response.statusCode >= 400) {
            throw new Error(response.message || `Auth0 API error: ${response.statusCode}`);
        }

        return response as T;
    }

    /**
     * Handle Auth0-specific errors
     */
    protected async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const data = error.response.data as Auth0Response;

            // Map common Auth0 errors
            if (data.error === "invalid_token" || data.statusCode === 401) {
                throw new Error("Auth0 authentication failed. Please reconnect.");
            }

            if (data.statusCode === 403) {
                throw new Error("Insufficient permissions to perform this action.");
            }

            if (data.statusCode === 404) {
                throw new Error("Resource not found.");
            }

            if (data.error_description) {
                throw new Error(`Auth0 API error: ${data.error_description}`);
            }

            if (data.message) {
                throw new Error(`Auth0 API error: ${data.message}`);
            }

            // Handle rate limiting
            if (error.response.status === 429) {
                const retryAfter = error.response.headers["retry-after"];
                throw new Error(`Rate limited. Retry after ${retryAfter || "unknown"} seconds.`);
            }
        }

        throw error;
    }

    // ============================================================================
    // User Management
    // ============================================================================

    /**
     * Get a user by ID
     */
    async getUser(userId: string): Promise<Auth0User> {
        return this.get<Auth0User>(`/users/${encodeURIComponent(userId)}`);
    }

    /**
     * List users with optional filters
     */
    async listUsers(params?: {
        page?: number;
        per_page?: number;
        include_totals?: boolean;
        search_engine?: string;
        q?: string;
    }): Promise<{
        users: Auth0User[];
        total?: number;
        start?: number;
        limit?: number;
    }> {
        const response = await this.get<Auth0User[] | { users: Auth0User[]; total: number; start: number; limit: number }>("/users", params);

        // Auth0 returns either an array or an object with include_totals
        if (Array.isArray(response)) {
            return { users: response };
        }
        return response;
    }

    /**
     * Create a new user
     */
    async createUser(userData: {
        email: string;
        connection: string;
        password?: string;
        email_verified?: boolean;
        name?: string;
        nickname?: string;
        picture?: string;
        app_metadata?: Record<string, unknown>;
        user_metadata?: Record<string, unknown>;
    }): Promise<Auth0User> {
        return this.post<Auth0User>("/users", userData);
    }

    /**
     * Update a user
     */
    async updateUser(
        userId: string,
        userData: {
            email?: string;
            email_verified?: boolean;
            name?: string;
            nickname?: string;
            picture?: string;
            password?: string;
            blocked?: boolean;
            app_metadata?: Record<string, unknown>;
            user_metadata?: Record<string, unknown>;
        }
    ): Promise<Auth0User> {
        return this.patch<Auth0User>(`/users/${encodeURIComponent(userId)}`, userData);
    }

    /**
     * Delete a user
     */
    async deleteUser(userId: string): Promise<void> {
        await this.delete(`/users/${encodeURIComponent(userId)}`);
    }

    // ============================================================================
    // Role Management
    // ============================================================================

    /**
     * List all roles
     */
    async listRoles(params?: {
        page?: number;
        per_page?: number;
        include_totals?: boolean;
    }): Promise<{
        roles: Auth0Role[];
        total?: number;
    }> {
        const response = await this.get<Auth0Role[] | { roles: Auth0Role[]; total: number }>("/roles", params);

        if (Array.isArray(response)) {
            return { roles: response };
        }
        return response;
    }

    /**
     * Get user roles
     */
    async getUserRoles(userId: string): Promise<Auth0Role[]> {
        return this.get<Auth0Role[]>(`/users/${encodeURIComponent(userId)}/roles`);
    }

    /**
     * Assign roles to a user
     */
    async assignRoles(userId: string, roleIds: string[]): Promise<void> {
        await this.post(`/users/${encodeURIComponent(userId)}/roles`, { roles: roleIds });
    }

    /**
     * Remove roles from a user
     */
    async removeRoles(userId: string, roleIds: string[]): Promise<void> {
        await this.delete(`/users/${encodeURIComponent(userId)}/roles`);
        // Note: Auth0 DELETE /users/{id}/roles expects body with roles array
        // The BaseAPIClient.delete doesn't support body, so we use request directly
        await this.request({
            method: "DELETE",
            url: `/users/${encodeURIComponent(userId)}/roles`,
            data: { roles: roleIds }
        });
    }

    // ============================================================================
    // Connection Management
    // ============================================================================

    /**
     * List all connections
     */
    async listConnections(params?: {
        page?: number;
        per_page?: number;
        include_totals?: boolean;
        strategy?: string;
    }): Promise<{
        connections: Auth0Connection[];
        total?: number;
    }> {
        const response = await this.get<Auth0Connection[] | { connections: Auth0Connection[]; total: number }>("/connections", params);

        if (Array.isArray(response)) {
            return { connections: response };
        }
        return response;
    }
}
