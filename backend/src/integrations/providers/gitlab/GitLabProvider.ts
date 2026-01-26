import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { BaseProvider } from "../../core/BaseProvider";
import { GitLabClient } from "./client/GitLabClient";
import { GitLabMCPAdapter } from "./mcp/GitLabMCPAdapter";
import {
    // Project operations
    listProjectsOperation,
    executeListProjects,
    getProjectOperation,
    executeGetProject,
    createProjectOperation,
    executeCreateProject,
    updateProjectOperation,
    executeUpdateProject,
    deleteProjectOperation,
    executeDeleteProject,
    // Issue operations
    listIssuesOperation,
    executeListIssues,
    getIssueOperation,
    executeGetIssue,
    createIssueOperation,
    executeCreateIssue,
    updateIssueOperation,
    executeUpdateIssue,
    // Merge request operations
    listMergeRequestsOperation,
    executeListMergeRequests,
    getMergeRequestOperation,
    executeGetMergeRequest,
    createMergeRequestOperation,
    executeCreateMergeRequest,
    mergeMergeRequestOperation,
    executeMergeMergeRequest,
    // Pipeline operations
    listPipelinesOperation,
    executeListPipelines,
    triggerPipelineOperation,
    executeTriggerPipeline
} from "./operations";
import type { ConnectionWithData, OAuth2TokenData } from "../../../storage/models/Connection";
import type {
    AuthConfig,
    ExecutionContext,
    MCPTool,
    OperationResult,
    OAuthConfig,
    ProviderCapabilities
} from "../../core/types";

/**
 * GitLab Provider - implements OAuth2 authentication with comprehensive GitLab API operations
 */
export class GitLabProvider extends BaseProvider {
    readonly name = "gitlab";
    readonly displayName = "GitLab";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true,
        rateLimit: {
            tokensPerMinute: 7200 / 60, // 7,200 requests per hour = 120/min
            burstSize: 100
        }
    };

    private mcpAdapter: GitLabMCPAdapter;
    private clientPool: Map<string, GitLabClient> = new Map();

    constructor() {
        super();

        // Register project operations
        this.registerOperation(listProjectsOperation);
        this.registerOperation(getProjectOperation);
        this.registerOperation(createProjectOperation);
        this.registerOperation(updateProjectOperation);
        this.registerOperation(deleteProjectOperation);

        // Register issue operations
        this.registerOperation(listIssuesOperation);
        this.registerOperation(getIssueOperation);
        this.registerOperation(createIssueOperation);
        this.registerOperation(updateIssueOperation);

        // Register merge request operations
        this.registerOperation(listMergeRequestsOperation);
        this.registerOperation(getMergeRequestOperation);
        this.registerOperation(createMergeRequestOperation);
        this.registerOperation(mergeMergeRequestOperation);

        // Register pipeline operations
        this.registerOperation(listPipelinesOperation);
        this.registerOperation(triggerPipelineOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new GitLabMCPAdapter(this.operations);

        // Configure webhook settings
        this.setWebhookConfig({
            setupType: "manual",
            signatureType: "bearer_token",
            signatureHeader: "X-Gitlab-Token",
            eventHeader: "X-Gitlab-Event"
        });

        // Register trigger events
        this.registerTrigger({
            id: "push",
            name: "Push",
            description: "Triggered when commits are pushed to a repository branch",
            requiredScopes: ["api"],
            configFields: [
                {
                    name: "project",
                    label: "Project",
                    type: "select",
                    required: true,
                    description: "Select the project to monitor",
                    dynamicOptions: {
                        operation: "listProjects",
                        labelField: "path_with_namespace",
                        valueField: "id"
                    }
                },
                {
                    name: "branch",
                    label: "Branch",
                    type: "text",
                    required: false,
                    description: "Filter by branch name (leave empty for all branches)",
                    placeholder: "main"
                }
            ],
            tags: ["code", "commits"]
        });

        this.registerTrigger({
            id: "merge_request",
            name: "Merge Request",
            description: "Triggered when a merge request is opened, merged, or updated",
            requiredScopes: ["api"],
            configFields: [
                {
                    name: "project",
                    label: "Project",
                    type: "select",
                    required: true,
                    description: "Select the project to monitor",
                    dynamicOptions: {
                        operation: "listProjects",
                        labelField: "path_with_namespace",
                        valueField: "id"
                    }
                },
                {
                    name: "action",
                    label: "Action",
                    type: "select",
                    required: false,
                    description: "Filter by MR action",
                    options: [
                        { value: "open", label: "Opened" },
                        { value: "close", label: "Closed" },
                        { value: "merge", label: "Merged" },
                        { value: "update", label: "Updated" },
                        { value: "approved", label: "Approved" }
                    ]
                }
            ],
            tags: ["code", "review"]
        });

        this.registerTrigger({
            id: "issue",
            name: "Issue",
            description: "Triggered when an issue is opened, closed, or updated",
            requiredScopes: ["api"],
            configFields: [
                {
                    name: "project",
                    label: "Project",
                    type: "select",
                    required: true,
                    description: "Select the project to monitor",
                    dynamicOptions: {
                        operation: "listProjects",
                        labelField: "path_with_namespace",
                        valueField: "id"
                    }
                },
                {
                    name: "action",
                    label: "Action",
                    type: "select",
                    required: false,
                    description: "Filter by issue action",
                    options: [
                        { value: "open", label: "Opened" },
                        { value: "close", label: "Closed" },
                        { value: "reopen", label: "Reopened" },
                        { value: "update", label: "Updated" }
                    ]
                }
            ],
            tags: ["issues", "tracking"]
        });

        this.registerTrigger({
            id: "pipeline",
            name: "Pipeline",
            description: "Triggered when a pipeline status changes",
            requiredScopes: ["api"],
            configFields: [
                {
                    name: "project",
                    label: "Project",
                    type: "select",
                    required: true,
                    description: "Select the project to monitor",
                    dynamicOptions: {
                        operation: "listProjects",
                        labelField: "path_with_namespace",
                        valueField: "id"
                    }
                },
                {
                    name: "status",
                    label: "Status",
                    type: "select",
                    required: false,
                    description: "Filter by pipeline status",
                    options: [
                        { value: "success", label: "Success" },
                        { value: "failed", label: "Failed" },
                        { value: "canceled", label: "Canceled" },
                        { value: "running", label: "Running" }
                    ]
                }
            ],
            tags: ["ci", "automation"]
        });
    }

    /**
     * Get OAuth configuration
     */
    getAuthConfig(): AuthConfig {
        const config: OAuthConfig = {
            authUrl: "https://gitlab.com/oauth/authorize",
            tokenUrl: "https://gitlab.com/oauth/token",
            scopes: ["api", "read_user", "read_repository", "write_repository"],
            clientId: appConfig.oauth.gitlab.clientId,
            clientSecret: appConfig.oauth.gitlab.clientSecret,
            redirectUri: getOAuthRedirectUri("gitlab"),
            refreshable: true
        };

        return config;
    }

    /**
     * Execute operation via direct API
     */
    async executeOperation(
        operationId: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData,
        _context: ExecutionContext
    ): Promise<OperationResult> {
        // Validate parameters
        const validatedParams = this.validateParams(operationId, params);

        // Get or create client
        const client = this.getOrCreateClient(connection);

        // Execute operation based on ID
        switch (operationId) {
            // Project operations
            case "listProjects":
                return await executeListProjects(client, validatedParams as never);
            case "getProject":
                return await executeGetProject(client, validatedParams as never);
            case "createProject":
                return await executeCreateProject(client, validatedParams as never);
            case "updateProject":
                return await executeUpdateProject(client, validatedParams as never);
            case "deleteProject":
                return await executeDeleteProject(client, validatedParams as never);

            // Issue operations
            case "listIssues":
                return await executeListIssues(client, validatedParams as never);
            case "getIssue":
                return await executeGetIssue(client, validatedParams as never);
            case "createIssue":
                return await executeCreateIssue(client, validatedParams as never);
            case "updateIssue":
                return await executeUpdateIssue(client, validatedParams as never);

            // Merge request operations
            case "listMergeRequests":
                return await executeListMergeRequests(client, validatedParams as never);
            case "getMergeRequest":
                return await executeGetMergeRequest(client, validatedParams as never);
            case "createMergeRequest":
                return await executeCreateMergeRequest(client, validatedParams as never);
            case "mergeMergeRequest":
                return await executeMergeMergeRequest(client, validatedParams as never);

            // Pipeline operations
            case "listPipelines":
                return await executeListPipelines(client, validatedParams as never);
            case "triggerPipeline":
                return await executeTriggerPipeline(client, validatedParams as never);

            default:
                return {
                    success: false,
                    error: {
                        type: "validation",
                        message: `Unknown operation: ${operationId}`,
                        retryable: false
                    }
                };
        }
    }

    /**
     * Get MCP tools
     */
    getMCPTools(): MCPTool[] {
        return this.mcpAdapter.getTools();
    }

    /**
     * Execute MCP tool
     */
    async executeMCPTool(
        toolName: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData
    ): Promise<unknown> {
        const client = this.getOrCreateClient(connection);
        const result = await this.mcpAdapter.executeTool(toolName, params, client);

        if ((result as { success?: boolean }).success) {
            return (result as { data?: unknown }).data;
        } else {
            throw new Error(
                (result as { error?: { message?: string } }).error?.message ||
                    "MCP tool execution failed"
            );
        }
    }

    /**
     * Get or create GitLab client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): GitLabClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Create new client
        const tokens = connection.data as OAuth2TokenData;

        // Check for custom instance URL in connection metadata
        const providerConfig = connection.metadata?.provider_config as
            | { instanceUrl?: string }
            | undefined;

        const client = new GitLabClient({
            accessToken: tokens.access_token,
            connectionId: connection.id,
            instanceUrl: providerConfig?.instanceUrl
        });

        // Cache client
        this.clientPool.set(poolKey, client);

        return client;
    }

    /**
     * Clear client from pool (e.g., when connection is deleted)
     */
    clearClient(connectionId: string): void {
        this.clientPool.delete(connectionId);
    }
}
