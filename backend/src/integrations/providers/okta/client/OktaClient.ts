import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type { OAuth2TokenData } from "../../../../storage/models/Connection";

export interface OktaClientConfig {
    accessToken: string;
    domain: string; // e.g., "dev-12345.okta.com"
    connectionId?: string;
    onTokenRefresh?: (tokens: OAuth2TokenData) => Promise<void>;
}

/**
 * Okta API error response format
 */
interface OktaErrorResponse {
    errorCode?: string;
    errorSummary?: string;
    errorLink?: string;
    errorId?: string;
    errorCauses?: Array<{ errorSummary: string }>;
}

/**
 * Okta user profile (response)
 */
export interface OktaUserProfile {
    login: string;
    email: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    mobilePhone?: string;
    secondEmail?: string;
    [key: string]: unknown;
}

/**
 * Okta user profile for creation (input)
 */
export interface OktaCreateUserProfile {
    login: string;
    email: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    mobilePhone?: string;
    secondEmail?: string;
}

/**
 * Okta user object
 */
export interface OktaUser {
    id: string;
    status: string;
    created: string;
    activated?: string;
    statusChanged?: string;
    lastLogin?: string;
    lastUpdated: string;
    passwordChanged?: string;
    type: { id: string };
    profile: OktaUserProfile;
    credentials?: {
        password?: Record<string, unknown>;
        recovery_question?: { question: string };
        provider?: { type: string; name: string };
    };
    _links?: Record<string, unknown>;
}

/**
 * Okta group object
 */
export interface OktaGroup {
    id: string;
    created: string;
    lastUpdated: string;
    lastMembershipUpdated: string;
    objectClass: string[];
    type: string;
    profile: {
        name: string;
        description?: string;
    };
    _links?: Record<string, unknown>;
}

/**
 * Okta application object
 */
export interface OktaApplication {
    id: string;
    name: string;
    label: string;
    status: string;
    created: string;
    lastUpdated: string;
    signOnMode: string;
    accessibility?: {
        selfService?: boolean;
        errorRedirectUrl?: string;
        loginRedirectUrl?: string;
    };
    visibility?: {
        autoSubmitToolbar?: boolean;
        hide?: {
            iOS?: boolean;
            web?: boolean;
        };
    };
    features?: string[];
    _links?: Record<string, unknown>;
}

/**
 * Okta API Client with connection pooling and error handling
 */
export class OktaClient extends BaseAPIClient {
    private accessToken: string;

    constructor(config: OktaClientConfig) {
        const baseURL = `https://${config.domain}/api/v1`;

        const clientConfig: BaseAPIClientConfig = {
            baseURL,
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
        this.client.addRequestInterceptor((requestConfig) => {
            if (!requestConfig.headers) {
                requestConfig.headers = {};
            }
            requestConfig.headers["Authorization"] = `SSWS ${this.accessToken}`;
            requestConfig.headers["Content-Type"] = "application/json";
            requestConfig.headers["Accept"] = "application/json";
            return requestConfig;
        });
    }

    /**
     * Handle Okta-specific errors
     */
    protected async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const data = error.response.data as OktaErrorResponse;

            // Map common Okta errors
            if (data.errorCode === "E0000011") {
                throw new Error("Invalid token provided. Please reconnect.");
            }

            if (data.errorCode === "E0000007") {
                throw new Error("Resource not found.");
            }

            if (data.errorCode === "E0000001") {
                throw new Error("API validation failed: " + (data.errorSummary || "Unknown error"));
            }

            if (data.errorCode === "E0000006") {
                throw new Error("You do not have permission to perform this action.");
            }

            if (data.errorSummary) {
                throw new Error(`Okta API error: ${data.errorSummary}`);
            }

            // Handle rate limiting
            if (error.response.status === 429) {
                const retryAfter = error.response.headers["x-rate-limit-reset"];
                throw new Error(`Rate limited. Retry after ${retryAfter || "unknown"} seconds.`);
            }
        }

        throw error;
    }

    // ========================================================================
    // USER OPERATIONS
    // ========================================================================

    /**
     * List all users
     */
    async listUsers(params?: {
        q?: string;
        filter?: string;
        limit?: number;
        after?: string;
    }): Promise<OktaUser[]> {
        return this.get<OktaUser[]>("/users", params);
    }

    /**
     * Get a single user by ID
     */
    async getUser(userId: string): Promise<OktaUser> {
        return this.get<OktaUser>(`/users/${userId}`);
    }

    /**
     * Create a new user
     */
    async createUser(params: {
        profile: OktaCreateUserProfile;
        credentials?: {
            password?: { value: string };
            recovery_question?: { question: string; answer: string };
        };
        activate?: boolean;
    }): Promise<OktaUser> {
        const queryParams = params.activate !== undefined ? { activate: params.activate } : {};
        return this.request<OktaUser>({
            method: "POST",
            url: "/users",
            params: queryParams,
            data: {
                profile: params.profile,
                credentials: params.credentials
            }
        });
    }

    /**
     * Update a user's profile
     */
    async updateUser(userId: string, profile: Partial<OktaUserProfile>): Promise<OktaUser> {
        return this.post<OktaUser>(`/users/${userId}`, { profile });
    }

    /**
     * Deactivate a user
     */
    async deactivateUser(userId: string): Promise<void> {
        await this.post<void>(`/users/${userId}/lifecycle/deactivate`);
    }

    /**
     * Activate a user
     */
    async activateUser(userId: string, _sendEmail = true): Promise<void> {
        await this.post<void>(`/users/${userId}/lifecycle/activate`, undefined);
    }

    /**
     * Suspend a user
     */
    async suspendUser(userId: string): Promise<void> {
        await this.post<void>(`/users/${userId}/lifecycle/suspend`);
    }

    /**
     * Unsuspend a user
     */
    async unsuspendUser(userId: string): Promise<void> {
        await this.post<void>(`/users/${userId}/lifecycle/unsuspend`);
    }

    /**
     * Delete a user (must be deactivated first)
     */
    async deleteUser(userId: string): Promise<void> {
        await this.delete<void>(`/users/${userId}`);
    }

    /**
     * Get groups for a user
     */
    async getUserGroups(userId: string): Promise<OktaGroup[]> {
        return this.get<OktaGroup[]>(`/users/${userId}/groups`);
    }

    // ========================================================================
    // GROUP OPERATIONS
    // ========================================================================

    /**
     * List all groups
     */
    async listGroups(params?: {
        q?: string;
        filter?: string;
        limit?: number;
        after?: string;
    }): Promise<OktaGroup[]> {
        return this.get<OktaGroup[]>("/groups", params);
    }

    /**
     * Get a single group by ID
     */
    async getGroup(groupId: string): Promise<OktaGroup> {
        return this.get<OktaGroup>(`/groups/${groupId}`);
    }

    /**
     * Create a new group
     */
    async createGroup(params: { name: string; description?: string }): Promise<OktaGroup> {
        return this.post<OktaGroup>("/groups", {
            profile: {
                name: params.name,
                description: params.description
            }
        });
    }

    /**
     * Update a group
     */
    async updateGroup(
        groupId: string,
        params: { name?: string; description?: string }
    ): Promise<OktaGroup> {
        return this.put<OktaGroup>(`/groups/${groupId}`, {
            profile: params
        });
    }

    /**
     * Delete a group
     */
    async deleteGroup(groupId: string): Promise<void> {
        await this.delete<void>(`/groups/${groupId}`);
    }

    /**
     * List users in a group
     */
    async listGroupMembers(
        groupId: string,
        params?: { limit?: number; after?: string }
    ): Promise<OktaUser[]> {
        return this.get<OktaUser[]>(`/groups/${groupId}/users`, params);
    }

    /**
     * Add a user to a group
     */
    async addUserToGroup(groupId: string, userId: string): Promise<void> {
        await this.put<void>(`/groups/${groupId}/users/${userId}`);
    }

    /**
     * Remove a user from a group
     */
    async removeUserFromGroup(groupId: string, userId: string): Promise<void> {
        await this.delete<void>(`/groups/${groupId}/users/${userId}`);
    }

    // ========================================================================
    // APPLICATION OPERATIONS
    // ========================================================================

    /**
     * List all applications
     */
    async listApplications(params?: {
        q?: string;
        filter?: string;
        limit?: number;
        after?: string;
    }): Promise<OktaApplication[]> {
        return this.get<OktaApplication[]>("/apps", params);
    }

    /**
     * Get a single application by ID
     */
    async getApplication(appId: string): Promise<OktaApplication> {
        return this.get<OktaApplication>(`/apps/${appId}`);
    }

    /**
     * Assign a user to an application
     */
    async assignUserToApplication(appId: string, userId: string): Promise<void> {
        await this.put<void>(`/apps/${appId}/users/${userId}`);
    }

    /**
     * Remove a user from an application
     */
    async removeUserFromApplication(appId: string, userId: string): Promise<void> {
        await this.delete<void>(`/apps/${appId}/users/${userId}`);
    }

    /**
     * Assign a group to an application
     */
    async assignGroupToApplication(appId: string, groupId: string): Promise<void> {
        await this.put<void>(`/apps/${appId}/groups/${groupId}`);
    }

    /**
     * Remove a group from an application
     */
    async removeGroupFromApplication(appId: string, groupId: string): Promise<void> {
        await this.delete<void>(`/apps/${appId}/groups/${groupId}`);
    }
}
