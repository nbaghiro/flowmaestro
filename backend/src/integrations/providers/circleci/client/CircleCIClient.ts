/**
 * CircleCI HTTP Client
 *
 * Handles all HTTP communication with CircleCI API v2.
 * Uses Circle-Token header authentication.
 *
 * Base URL: https://circleci.com/api/v2
 *
 * Rate limit: 300 requests/minute
 */

import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, type BaseAPIClientConfig } from "../../../core/BaseAPIClient";

export interface CircleCIClientConfig {
    apiToken: string;
}

// ============================================
// CircleCI API Types
// ============================================

export interface CircleCIPipeline {
    id: string;
    errors: Array<{
        type: string;
        message: string;
    }>;
    project_slug: string;
    updated_at?: string;
    number: number;
    trigger_parameters?: Record<string, unknown>;
    state: "created" | "errored" | "setup-pending" | "setup" | "pending";
    created_at: string;
    trigger: {
        type: string;
        received_at: string;
        actor: {
            login: string;
            avatar_url?: string;
        };
    };
    vcs?: {
        provider_name: string;
        origin_repository_url: string;
        target_repository_url: string;
        revision: string;
        branch?: string;
        tag?: string;
        commit?: {
            subject: string;
            body?: string;
        };
    };
}

export interface CircleCIWorkflow {
    pipeline_id: string;
    canceled_by?: string;
    id: string;
    name: string;
    project_slug: string;
    errored_by?: string;
    tag?: string;
    status:
        | "success"
        | "running"
        | "not_run"
        | "failed"
        | "error"
        | "failing"
        | "on_hold"
        | "canceled"
        | "unauthorized";
    started_by: string;
    pipeline_number: number;
    created_at: string;
    stopped_at?: string;
}

export interface CircleCIJob {
    canceled_by?: string;
    dependencies: string[];
    job_number?: number;
    id: string;
    started_at?: string;
    name: string;
    approved_by?: string;
    project_slug: string;
    status:
        | "success"
        | "running"
        | "not_run"
        | "failed"
        | "retried"
        | "queued"
        | "not_running"
        | "infrastructure_fail"
        | "timedout"
        | "on_hold"
        | "terminated-unknown"
        | "blocked"
        | "canceled"
        | "unauthorized";
    type: "build" | "approval";
    stopped_at?: string;
    approval_request_id?: string;
}

export interface CircleCIArtifact {
    path: string;
    node_index: number;
    url: string;
}

export interface CircleCIProject {
    slug: string;
    name: string;
    organization_name: string;
    vcs_info?: {
        vcs_url: string;
        provider: string;
        default_branch: string;
    };
}

export interface CircleCIUser {
    id: string;
    login: string;
    name?: string;
}

interface CircleCIErrorResponse {
    message?: string;
}

interface PaginatedResponse<T> {
    items: T[];
    next_page_token?: string;
}

export class CircleCIClient extends BaseAPIClient {
    constructor(config: CircleCIClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://circleci.com/api/v2",
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

        // Add authorization header using Circle-Token
        this.client.addRequestInterceptor((requestConfig) => {
            if (!requestConfig.headers) {
                requestConfig.headers = {};
            }
            requestConfig.headers["Circle-Token"] = config.apiToken;
            requestConfig.headers["Content-Type"] = "application/json";
            requestConfig.headers["Accept"] = "application/json";
            return requestConfig;
        });
    }

    /**
     * Handle CircleCI-specific errors
     */
    protected override async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const data = error.response.data as CircleCIErrorResponse;

            if (data?.message) {
                throw new Error(`CircleCI API error: ${data.message}`);
            }

            if (error.response.status === 401) {
                throw new Error("CircleCI authentication failed. Please check your API token.");
            }

            if (error.response.status === 403) {
                throw new Error(
                    "CircleCI permission denied. Your token may not have access to this resource."
                );
            }

            if (error.response.status === 404) {
                throw new Error("Resource not found in CircleCI.");
            }

            if (error.response.status === 429) {
                throw new Error("CircleCI rate limit exceeded. Please try again later.");
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
    async getCurrentUser(): Promise<CircleCIUser> {
        return this.get<CircleCIUser>("/me");
    }

    // ============================================
    // Project Operations
    // ============================================

    /**
     * Get a project by slug
     * Slug format: gh/owner/repo or bb/owner/repo
     */
    async getProject(projectSlug: string): Promise<CircleCIProject> {
        return this.get<CircleCIProject>(`/project/${projectSlug}`);
    }

    // ============================================
    // Pipeline Operations
    // ============================================

    /**
     * List pipelines for a project
     */
    async listPipelines(
        projectSlug: string,
        params?: { branch?: string; pageToken?: string }
    ): Promise<CircleCIPipeline[]> {
        const queryParams: Record<string, unknown> = {};
        if (params?.branch) {
            queryParams.branch = params.branch;
        }
        if (params?.pageToken) {
            queryParams["page-token"] = params.pageToken;
        }

        const response = await this.get<PaginatedResponse<CircleCIPipeline>>(
            `/project/${projectSlug}/pipeline`,
            queryParams
        );
        return response.items || [];
    }

    /**
     * Get a specific pipeline
     */
    async getPipeline(pipelineId: string): Promise<CircleCIPipeline> {
        return this.get<CircleCIPipeline>(`/pipeline/${pipelineId}`);
    }

    /**
     * Trigger a new pipeline
     */
    async triggerPipeline(
        projectSlug: string,
        params: {
            branch?: string;
            tag?: string;
            parameters?: Record<string, unknown>;
        }
    ): Promise<CircleCIPipeline> {
        return this.post<CircleCIPipeline>(`/project/${projectSlug}/pipeline`, params);
    }

    // ============================================
    // Workflow Operations
    // ============================================

    /**
     * List workflows for a pipeline
     */
    async listWorkflows(
        pipelineId: string,
        params?: { pageToken?: string }
    ): Promise<CircleCIWorkflow[]> {
        const queryParams: Record<string, unknown> = {};
        if (params?.pageToken) {
            queryParams["page-token"] = params.pageToken;
        }

        const response = await this.get<PaginatedResponse<CircleCIWorkflow>>(
            `/pipeline/${pipelineId}/workflow`,
            queryParams
        );
        return response.items || [];
    }

    /**
     * Get a specific workflow
     */
    async getWorkflow(workflowId: string): Promise<CircleCIWorkflow> {
        return this.get<CircleCIWorkflow>(`/workflow/${workflowId}`);
    }

    /**
     * Cancel a workflow
     */
    async cancelWorkflow(workflowId: string): Promise<{ message: string }> {
        return this.post<{ message: string }>(`/workflow/${workflowId}/cancel`, {});
    }

    /**
     * Rerun a workflow
     */
    async rerunWorkflow(
        workflowId: string,
        params?: {
            enable_ssh?: boolean;
            from_failed?: boolean;
            jobs?: string[];
            sparse_tree?: boolean;
        }
    ): Promise<{ workflow_id: string }> {
        return this.post<{ workflow_id: string }>(`/workflow/${workflowId}/rerun`, params || {});
    }

    // ============================================
    // Job Operations
    // ============================================

    /**
     * List jobs in a workflow
     */
    async listJobs(workflowId: string, params?: { pageToken?: string }): Promise<CircleCIJob[]> {
        const queryParams: Record<string, unknown> = {};
        if (params?.pageToken) {
            queryParams["page-token"] = params.pageToken;
        }

        const response = await this.get<PaginatedResponse<CircleCIJob>>(
            `/workflow/${workflowId}/job`,
            queryParams
        );
        return response.items || [];
    }

    /**
     * Get job artifacts
     */
    async getJobArtifacts(projectSlug: string, jobNumber: number): Promise<CircleCIArtifact[]> {
        const response = await this.get<PaginatedResponse<CircleCIArtifact>>(
            `/project/${projectSlug}/${jobNumber}/artifacts`
        );
        return response.items || [];
    }
}
