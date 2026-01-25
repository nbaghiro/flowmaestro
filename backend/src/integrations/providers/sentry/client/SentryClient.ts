/**
 * Sentry HTTP Client
 *
 * Handles all HTTP communication with Sentry API.
 * Uses Bearer token authentication with Auth Token.
 *
 * Base URL: https://{region}/api/0 (configurable per region)
 *
 * Rate limit: 600 requests/minute
 */

import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, type BaseAPIClientConfig } from "../../../core/BaseAPIClient";

export interface SentryClientConfig {
    authToken: string;
    region?: string; // e.g., "sentry.io", "us.sentry.io", "de.sentry.io"
}

// ============================================
// Sentry API Types
// ============================================

export interface SentryOrganization {
    id: string;
    slug: string;
    name: string;
    dateCreated: string;
    status?: {
        id: string;
        name: string;
    };
}

export interface SentryProject {
    id: string;
    slug: string;
    name: string;
    platform?: string;
    dateCreated: string;
    firstEvent?: string;
    firstTransactionEvent?: boolean;
    hasSessions?: boolean;
    hasProfiles?: boolean;
    hasReplays?: boolean;
    hasMonitors?: boolean;
    organization?: {
        id: string;
        slug: string;
        name: string;
    };
}

export interface SentryIssue {
    id: string;
    shortId: string;
    title: string;
    culprit?: string;
    permalink?: string;
    logger?: string;
    level?: string;
    status?: string;
    statusDetails?: Record<string, unknown>;
    isPublic?: boolean;
    platform?: string;
    project?: {
        id: string;
        name: string;
        slug: string;
    };
    type?: string;
    metadata?: {
        value?: string;
        type?: string;
        filename?: string;
        function?: string;
    };
    numComments?: number;
    assignedTo?: {
        type: string;
        id?: string;
        name?: string;
        email?: string;
    };
    isBookmarked?: boolean;
    isSubscribed?: boolean;
    hasSeen?: boolean;
    annotations?: string[];
    isUnhandled?: boolean;
    count: string;
    userCount?: number;
    firstSeen?: string;
    lastSeen?: string;
    stats?: {
        "24h"?: Array<[number, number]>;
        "30d"?: Array<[number, number]>;
    };
}

export interface SentryEvent {
    id: string;
    eventID: string;
    context?: Record<string, unknown>;
    contexts?: Record<string, unknown>;
    dateCreated: string;
    dateReceived?: string;
    dist?: string;
    entries?: Array<{
        type: string;
        data: unknown;
    }>;
    errors?: Array<{
        type: string;
        message?: string;
    }>;
    fingerprints?: string[];
    groupID?: string;
    message?: string;
    metadata?: Record<string, unknown>;
    platform?: string;
    sdk?: {
        name: string;
        version: string;
    };
    tags?: Array<{
        key: string;
        value: string;
    }>;
    title?: string;
    type?: string;
    user?: {
        id?: string;
        email?: string;
        username?: string;
        ip_address?: string;
    };
}

export interface SentryRelease {
    version: string;
    shortVersion?: string;
    ref?: string;
    url?: string;
    dateCreated?: string;
    dateReleased?: string;
    firstEvent?: string;
    lastEvent?: string;
    newGroups?: number;
    projects?: Array<{
        id: string;
        slug: string;
        name: string;
    }>;
}

export interface SentryAlertRule {
    id: string;
    name: string;
    dateCreated?: string;
    dateModified?: string;
    status?: string;
    environment?: string;
    actionMatch?: string;
    filterMatch?: string;
    frequency?: number;
    conditions?: Array<{
        id: string;
        name?: string;
        interval?: string;
        value?: number;
    }>;
    actions?: Array<{
        id: string;
        name?: string;
        targetType?: string;
        targetIdentifier?: string;
    }>;
    filters?: Array<{
        id: string;
        name?: string;
    }>;
}

interface SentryErrorResponse {
    detail?: string;
    message?: string;
}

export class SentryClient extends BaseAPIClient {
    constructor(config: SentryClientConfig) {
        const region = config.region || "sentry.io";
        const baseURL = `https://${region}/api/0`;

        const clientConfig: BaseAPIClientConfig = {
            baseURL,
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

        // Add authorization header using Bearer token
        this.client.addRequestInterceptor((requestConfig) => {
            if (!requestConfig.headers) {
                requestConfig.headers = {};
            }
            requestConfig.headers["Authorization"] = `Bearer ${config.authToken}`;
            requestConfig.headers["Content-Type"] = "application/json";
            requestConfig.headers["Accept"] = "application/json";
            return requestConfig;
        });
    }

    /**
     * Handle Sentry-specific errors
     */
    protected override async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const data = error.response.data as SentryErrorResponse;

            if (data?.detail) {
                throw new Error(`Sentry API error: ${data.detail}`);
            }

            if (data?.message) {
                throw new Error(`Sentry API error: ${data.message}`);
            }

            if (error.response.status === 401) {
                throw new Error("Sentry authentication failed. Please check your Auth Token.");
            }

            if (error.response.status === 403) {
                throw new Error(
                    "Sentry permission denied. Your token may not have access to this resource."
                );
            }

            if (error.response.status === 404) {
                throw new Error("Resource not found in Sentry.");
            }

            if (error.response.status === 429) {
                throw new Error("Sentry rate limit exceeded. Please try again later.");
            }
        }

        throw error;
    }

    // ============================================
    // Organization Operations
    // ============================================

    /**
     * List all organizations accessible to the token
     */
    async listOrganizations(): Promise<SentryOrganization[]> {
        return this.get("/organizations/");
    }

    // ============================================
    // Project Operations
    // ============================================

    /**
     * List projects in an organization
     */
    async listProjects(organizationSlug: string, cursor?: string): Promise<SentryProject[]> {
        const params: Record<string, unknown> = {};
        if (cursor) {
            params.cursor = cursor;
        }
        return this.get(`/organizations/${organizationSlug}/projects/`, params);
    }

    /**
     * Get a specific project
     */
    async getProject(organizationSlug: string, projectSlug: string): Promise<SentryProject> {
        return this.get(`/projects/${organizationSlug}/${projectSlug}/`);
    }

    // ============================================
    // Issue Operations
    // ============================================

    /**
     * List issues for an organization
     */
    async listIssues(params: {
        organizationSlug: string;
        projectSlug?: string;
        query?: string;
        statsPeriod?: string;
        sort?: "date" | "new" | "freq" | "user";
        cursor?: string;
    }): Promise<SentryIssue[]> {
        const queryParams: Record<string, unknown> = {};

        if (params.projectSlug) {
            queryParams.project = params.projectSlug;
        }
        if (params.query) {
            queryParams.query = params.query;
        }
        if (params.statsPeriod) {
            queryParams.statsPeriod = params.statsPeriod;
        }
        if (params.sort) {
            queryParams.sort = params.sort;
        }
        if (params.cursor) {
            queryParams.cursor = params.cursor;
        }

        return this.get(`/organizations/${params.organizationSlug}/issues/`, queryParams);
    }

    /**
     * Get a specific issue
     */
    async getIssue(issueId: string): Promise<SentryIssue> {
        return this.get(`/issues/${issueId}/`);
    }

    /**
     * Update an issue
     */
    async updateIssue(
        issueId: string,
        updates: {
            status?: "resolved" | "unresolved" | "ignored";
            assignedTo?: string;
            hasSeen?: boolean;
            isBookmarked?: boolean;
        }
    ): Promise<SentryIssue> {
        return this.put(`/issues/${issueId}/`, updates);
    }

    // ============================================
    // Event Operations
    // ============================================

    /**
     * List events for an issue
     */
    async listIssueEvents(
        issueId: string,
        params?: { full?: boolean; cursor?: string }
    ): Promise<SentryEvent[]> {
        const queryParams: Record<string, unknown> = {};
        if (params?.full) {
            queryParams.full = "true";
        }
        if (params?.cursor) {
            queryParams.cursor = params.cursor;
        }
        return this.get(`/issues/${issueId}/events/`, queryParams);
    }

    // ============================================
    // Release Operations
    // ============================================

    /**
     * List releases for an organization
     */
    async listReleases(
        organizationSlug: string,
        params?: { projectSlug?: string; query?: string }
    ): Promise<SentryRelease[]> {
        const queryParams: Record<string, unknown> = {};
        if (params?.projectSlug) {
            queryParams.project = params.projectSlug;
        }
        if (params?.query) {
            queryParams.query = params.query;
        }
        return this.get(`/organizations/${organizationSlug}/releases/`, queryParams);
    }

    /**
     * Create a new release
     */
    async createRelease(
        organizationSlug: string,
        release: {
            version: string;
            projects: string[];
            dateReleased?: string;
            ref?: string;
            url?: string;
        }
    ): Promise<SentryRelease> {
        return this.post(`/organizations/${organizationSlug}/releases/`, release);
    }

    // ============================================
    // Alert Rule Operations
    // ============================================

    /**
     * List alert rules for a project
     */
    async listAlertRules(
        organizationSlug: string,
        projectSlug: string
    ): Promise<SentryAlertRule[]> {
        return this.get(`/projects/${organizationSlug}/${projectSlug}/rules/`);
    }
}
