/**
 * Vercel HTTP Client
 *
 * Handles all HTTP communication with Vercel API.
 * Uses Bearer token authentication.
 *
 * Base URL: https://api.vercel.com
 *
 * Rate limit: 100 requests/minute (per-endpoint limits vary)
 */

import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, type BaseAPIClientConfig } from "../../../core/BaseAPIClient";

export interface VercelClientConfig {
    accessToken: string;
    teamId?: string; // Optional team ID for team-scoped requests
}

// ============================================
// Vercel API Types
// ============================================

export interface VercelProject {
    id: string;
    name: string;
    accountId: string;
    createdAt: number;
    updatedAt: number;
    framework?: string;
    devCommand?: string;
    installCommand?: string;
    buildCommand?: string;
    outputDirectory?: string;
    rootDirectory?: string;
    nodeVersion?: string;
    publicSource?: boolean;
    autoExposeSystemEnvs?: boolean;
    link?: {
        type: string;
        repo?: string;
        repoId?: number;
        org?: string;
        gitCredentialId?: string;
        sourceless?: boolean;
        createdAt?: number;
        updatedAt?: number;
    };
    latestDeployments?: VercelDeployment[];
}

export interface VercelDeployment {
    uid: string;
    name: string;
    url: string;
    created: number;
    state: "BUILDING" | "ERROR" | "INITIALIZING" | "QUEUED" | "READY" | "CANCELED";
    readyState: "BUILDING" | "ERROR" | "INITIALIZING" | "QUEUED" | "READY" | "CANCELED";
    type: "LAMBDAS";
    creator: {
        uid: string;
        email?: string;
        username?: string;
    };
    meta?: Record<string, string>;
    target?: "production" | "staging" | null;
    aliasError?: {
        code: string;
        message: string;
    };
    aliasAssigned?: number;
    isRollbackCandidate?: boolean;
    createdAt?: number;
    buildingAt?: number;
    ready?: number;
    source?: string;
    inspectorUrl?: string;
    projectId?: string;
}

export interface VercelDomain {
    name: string;
    apexName: string;
    projectId: string;
    redirect?: string;
    redirectStatusCode?: 301 | 302 | 307 | 308;
    gitBranch?: string;
    updatedAt?: number;
    createdAt?: number;
    verified: boolean;
    verification?: Array<{
        type: string;
        domain: string;
        value: string;
        reason: string;
    }>;
}

export interface VercelEnvironmentVariable {
    id: string;
    key: string;
    value: string;
    type: "system" | "encrypted" | "plain" | "sensitive" | "secret";
    target: Array<"production" | "preview" | "development">;
    configurationId?: string;
    createdAt?: number;
    updatedAt?: number;
    createdBy?: string;
    updatedBy?: string;
    gitBranch?: string;
    decrypted?: boolean;
}

export interface VercelTeam {
    id: string;
    slug: string;
    name: string;
    createdAt: number;
    updatedAt: number;
}

export interface VercelUser {
    id: string;
    email: string;
    name?: string;
    username: string;
    avatar?: string;
}

interface VercelErrorResponse {
    error?: {
        code: string;
        message: string;
    };
}

interface PaginatedResponse<T> {
    projects?: T[];
    deployments?: T[];
    domains?: T[];
    envs?: T[];
    pagination?: {
        count: number;
        next?: number;
        prev?: number;
    };
}

export class VercelClient extends BaseAPIClient {
    private teamId?: string;

    constructor(config: VercelClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://api.vercel.com",
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

        this.teamId = config.teamId;

        // Add authorization header using Bearer token
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
     * Add team ID to query params if configured
     */
    private addTeamId(params: Record<string, unknown>): Record<string, unknown> {
        if (this.teamId) {
            return { ...params, teamId: this.teamId };
        }
        return params;
    }

    /**
     * Handle Vercel-specific errors
     */
    protected override async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const data = error.response.data as VercelErrorResponse;

            if (data?.error?.message) {
                throw new Error(`Vercel API error: ${data.error.message}`);
            }

            if (error.response.status === 401) {
                throw new Error("Vercel authentication failed. Please check your access token.");
            }

            if (error.response.status === 403) {
                throw new Error(
                    "Vercel permission denied. Your token may not have access to this resource."
                );
            }

            if (error.response.status === 404) {
                throw new Error("Resource not found in Vercel.");
            }

            if (error.response.status === 429) {
                throw new Error("Vercel rate limit exceeded. Please try again later.");
            }
        }

        throw error;
    }

    // ============================================
    // User Operations
    // ============================================

    /**
     * Get current authenticated user
     */
    async getCurrentUser(): Promise<VercelUser> {
        const response = await this.get<{ user: VercelUser }>("/v2/user");
        return response.user;
    }

    // ============================================
    // Project Operations
    // ============================================

    /**
     * List all projects
     */
    async listProjects(params?: { limit?: number; from?: number }): Promise<VercelProject[]> {
        const queryParams = this.addTeamId(params || {});
        const response = await this.get<PaginatedResponse<VercelProject>>(
            "/v9/projects",
            queryParams
        );
        return response.projects || [];
    }

    /**
     * Get a specific project by ID or name
     */
    async getProject(idOrName: string): Promise<VercelProject> {
        const queryParams = this.addTeamId({});
        return this.get<VercelProject>(`/v9/projects/${encodeURIComponent(idOrName)}`, queryParams);
    }

    // ============================================
    // Deployment Operations
    // ============================================

    /**
     * List deployments for a project
     */
    async listDeployments(params?: {
        projectId?: string;
        limit?: number;
        from?: number;
        target?: "production" | "staging";
        state?: string;
    }): Promise<VercelDeployment[]> {
        const queryParams = this.addTeamId(params || {});
        const response = await this.get<PaginatedResponse<VercelDeployment>>(
            "/v6/deployments",
            queryParams
        );
        return response.deployments || [];
    }

    /**
     * Get a specific deployment
     */
    async getDeployment(idOrUrl: string): Promise<VercelDeployment> {
        const queryParams = this.addTeamId({});
        return this.get<VercelDeployment>(
            `/v13/deployments/${encodeURIComponent(idOrUrl)}`,
            queryParams
        );
    }

    /**
     * Create a new deployment (trigger redeploy)
     */
    async createDeployment(params: {
        name: string;
        target?: "production" | "staging";
        gitSource?: {
            type: "github" | "gitlab" | "bitbucket";
            ref: string;
            repoId: string | number;
        };
    }): Promise<VercelDeployment> {
        const queryParams = this.addTeamId({});
        return this.post<VercelDeployment>(
            `/v13/deployments?${new URLSearchParams(queryParams as Record<string, string>).toString()}`,
            params
        );
    }

    /**
     * Cancel a deployment
     */
    async cancelDeployment(deploymentId: string): Promise<VercelDeployment> {
        const queryParams = this.addTeamId({});
        return this.patch<VercelDeployment>(
            `/v12/deployments/${deploymentId}/cancel?${new URLSearchParams(queryParams as Record<string, string>).toString()}`,
            {}
        );
    }

    // ============================================
    // Domain Operations
    // ============================================

    /**
     * List domains for a project
     */
    async listDomains(projectId: string, params?: { limit?: number }): Promise<VercelDomain[]> {
        const queryParams = this.addTeamId(params || {});
        const response = await this.get<PaginatedResponse<VercelDomain>>(
            `/v9/projects/${encodeURIComponent(projectId)}/domains`,
            queryParams
        );
        return response.domains || [];
    }

    /**
     * Add a domain to a project
     */
    async addDomain(
        projectId: string,
        params: {
            name: string;
            redirect?: string;
            redirectStatusCode?: 301 | 302 | 307 | 308;
            gitBranch?: string;
        }
    ): Promise<VercelDomain> {
        const queryParams = this.addTeamId({});
        return this.post<VercelDomain>(
            `/v10/projects/${encodeURIComponent(projectId)}/domains?${new URLSearchParams(queryParams as Record<string, string>).toString()}`,
            params
        );
    }

    /**
     * Remove a domain from a project
     */
    async removeDomain(projectId: string, domain: string): Promise<void> {
        const queryParams = this.addTeamId({});
        await this.delete<void>(
            `/v9/projects/${encodeURIComponent(projectId)}/domains/${encodeURIComponent(domain)}?${new URLSearchParams(queryParams as Record<string, string>).toString()}`
        );
    }

    // ============================================
    // Environment Variable Operations
    // ============================================

    /**
     * Get environment variables for a project
     */
    async getEnvironmentVariables(
        projectId: string,
        params?: { decrypt?: boolean }
    ): Promise<VercelEnvironmentVariable[]> {
        const queryParams = this.addTeamId(params || {});
        const response = await this.get<PaginatedResponse<VercelEnvironmentVariable>>(
            `/v9/projects/${encodeURIComponent(projectId)}/env`,
            queryParams
        );
        return response.envs || [];
    }

    /**
     * Create an environment variable
     */
    async createEnvironmentVariable(
        projectId: string,
        params: {
            key: string;
            value: string;
            type?: "plain" | "encrypted" | "secret" | "sensitive";
            target: Array<"production" | "preview" | "development">;
            gitBranch?: string;
        }
    ): Promise<VercelEnvironmentVariable> {
        const queryParams = this.addTeamId({});
        return this.post<VercelEnvironmentVariable>(
            `/v10/projects/${encodeURIComponent(projectId)}/env?${new URLSearchParams(queryParams as Record<string, string>).toString()}`,
            params
        );
    }

    /**
     * Update an environment variable
     */
    async updateEnvironmentVariable(
        projectId: string,
        envId: string,
        params: {
            key?: string;
            value?: string;
            type?: "plain" | "encrypted" | "secret" | "sensitive";
            target?: Array<"production" | "preview" | "development">;
            gitBranch?: string;
        }
    ): Promise<VercelEnvironmentVariable> {
        const queryParams = this.addTeamId({});
        return this.patch<VercelEnvironmentVariable>(
            `/v9/projects/${encodeURIComponent(projectId)}/env/${envId}?${new URLSearchParams(queryParams as Record<string, string>).toString()}`,
            params
        );
    }

    /**
     * Delete an environment variable
     */
    async deleteEnvironmentVariable(projectId: string, envId: string): Promise<void> {
        const queryParams = this.addTeamId({});
        await this.delete<void>(
            `/v9/projects/${encodeURIComponent(projectId)}/env/${envId}?${new URLSearchParams(queryParams as Record<string, string>).toString()}`
        );
    }

    // ============================================
    // Team Operations
    // ============================================

    /**
     * List teams
     */
    async listTeams(): Promise<VercelTeam[]> {
        const response = await this.get<{ teams: VercelTeam[] }>("/v2/teams");
        return response.teams || [];
    }
}
