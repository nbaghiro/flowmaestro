import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { BaseProvider } from "../../core/BaseProvider";
import { GitHubClient } from "./client/GitHubClient";
import { GitHubMCPAdapter } from "./mcp/GitHubMCPAdapter";
import {
    // Repository operations
    listRepositoriesOperation,
    executeListRepositories,
    getRepositoryOperation,
    executeGetRepository,
    createRepositoryOperation,
    executeCreateRepository,
    updateRepositoryOperation,
    executeUpdateRepository,
    deleteRepositoryOperation,
    executeDeleteRepository,
    // Issue operations
    listIssuesOperation,
    executeListIssues,
    getIssueOperation,
    executeGetIssue,
    createIssueOperation,
    executeCreateIssue,
    updateIssueOperation,
    executeUpdateIssue,
    addCommentOperation,
    executeAddComment,
    closeIssueOperation,
    executeCloseIssue,
    reopenIssueOperation,
    executeReopenIssue,
    // Pull request operations
    listPullRequestsOperation,
    executeListPullRequests,
    getPullRequestOperation,
    executeGetPullRequest,
    createPullRequestOperation,
    executeCreatePullRequest,
    updatePullRequestOperation,
    executeUpdatePullRequest,
    mergePullRequestOperation,
    executeMergePullRequest,
    createReviewOperation,
    executeCreateReview,
    addReviewCommentOperation,
    executeAddReviewComment,
    // Workflow operations
    listWorkflowsOperation,
    executeListWorkflows,
    getWorkflowOperation,
    executeGetWorkflow,
    triggerWorkflowOperation,
    executeTriggerWorkflow,
    listWorkflowRunsOperation,
    executeListWorkflowRuns,
    getWorkflowRunOperation,
    executeGetWorkflowRun,
    getWorkflowLogsOperation,
    executeGetWorkflowLogs,
    cancelWorkflowRunOperation,
    executeCancelWorkflowRun
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
 * GitHub Provider - implements OAuth2 authentication with comprehensive GitHub API operations
 */
export class GitHubProvider extends BaseProvider {
    readonly name = "github";
    readonly displayName = "GitHub";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true,
        rateLimit: {
            tokensPerMinute: 5000, // 5,000 requests per hour = ~83/min
            burstSize: 100
        }
    };

    private mcpAdapter: GitHubMCPAdapter;
    private clientPool: Map<string, GitHubClient> = new Map();

    constructor() {
        super();

        // Register repository operations
        this.registerOperation(listRepositoriesOperation);
        this.registerOperation(getRepositoryOperation);
        this.registerOperation(createRepositoryOperation);
        this.registerOperation(updateRepositoryOperation);
        this.registerOperation(deleteRepositoryOperation);

        // Register issue operations
        this.registerOperation(listIssuesOperation);
        this.registerOperation(getIssueOperation);
        this.registerOperation(createIssueOperation);
        this.registerOperation(updateIssueOperation);
        this.registerOperation(addCommentOperation);
        this.registerOperation(closeIssueOperation);
        this.registerOperation(reopenIssueOperation);

        // Register pull request operations
        this.registerOperation(listPullRequestsOperation);
        this.registerOperation(getPullRequestOperation);
        this.registerOperation(createPullRequestOperation);
        this.registerOperation(updatePullRequestOperation);
        this.registerOperation(mergePullRequestOperation);
        this.registerOperation(createReviewOperation);
        this.registerOperation(addReviewCommentOperation);

        // Register workflow operations
        this.registerOperation(listWorkflowsOperation);
        this.registerOperation(getWorkflowOperation);
        this.registerOperation(triggerWorkflowOperation);
        this.registerOperation(listWorkflowRunsOperation);
        this.registerOperation(getWorkflowRunOperation);
        this.registerOperation(getWorkflowLogsOperation);
        this.registerOperation(cancelWorkflowRunOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new GitHubMCPAdapter(this.operations);

        // Configure webhook settings
        this.setWebhookConfig({
            setupType: "manual",
            signatureType: "hmac_sha256",
            signatureHeader: "X-Hub-Signature-256",
            eventHeader: "X-GitHub-Event"
        });

        // Register trigger events
        this.registerTrigger({
            id: "push",
            name: "Push",
            description: "Triggered when commits are pushed to a repository branch",
            requiredScopes: ["repo"],
            configFields: [
                {
                    name: "repository",
                    label: "Repository",
                    type: "select",
                    required: true,
                    description: "Select the repository to monitor",
                    dynamicOptions: {
                        operation: "listRepositories",
                        labelField: "full_name",
                        valueField: "full_name"
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
            id: "pull_request",
            name: "Pull Request",
            description: "Triggered when a pull request is opened, closed, or updated",
            requiredScopes: ["repo"],
            configFields: [
                {
                    name: "repository",
                    label: "Repository",
                    type: "select",
                    required: true,
                    description: "Select the repository to monitor",
                    dynamicOptions: {
                        operation: "listRepositories",
                        labelField: "full_name",
                        valueField: "full_name"
                    }
                },
                {
                    name: "action",
                    label: "Action",
                    type: "select",
                    required: false,
                    description: "Filter by PR action",
                    options: [
                        { value: "opened", label: "Opened" },
                        { value: "closed", label: "Closed" },
                        { value: "merged", label: "Merged" },
                        { value: "synchronize", label: "Updated" },
                        { value: "review_requested", label: "Review Requested" }
                    ]
                }
            ],
            tags: ["code", "review"]
        });

        this.registerTrigger({
            id: "issues",
            name: "Issue",
            description: "Triggered when an issue is opened, closed, or updated",
            requiredScopes: ["repo"],
            configFields: [
                {
                    name: "repository",
                    label: "Repository",
                    type: "select",
                    required: true,
                    description: "Select the repository to monitor",
                    dynamicOptions: {
                        operation: "listRepositories",
                        labelField: "full_name",
                        valueField: "full_name"
                    }
                },
                {
                    name: "action",
                    label: "Action",
                    type: "select",
                    required: false,
                    description: "Filter by issue action",
                    options: [
                        { value: "opened", label: "Opened" },
                        { value: "closed", label: "Closed" },
                        { value: "reopened", label: "Reopened" },
                        { value: "assigned", label: "Assigned" },
                        { value: "labeled", label: "Labeled" }
                    ]
                }
            ],
            tags: ["issues", "tracking"]
        });

        this.registerTrigger({
            id: "release",
            name: "Release",
            description: "Triggered when a release is published",
            requiredScopes: ["repo"],
            configFields: [
                {
                    name: "repository",
                    label: "Repository",
                    type: "select",
                    required: true,
                    description: "Select the repository to monitor",
                    dynamicOptions: {
                        operation: "listRepositories",
                        labelField: "full_name",
                        valueField: "full_name"
                    }
                }
            ],
            tags: ["releases", "deployment"]
        });

        this.registerTrigger({
            id: "workflow_run",
            name: "Workflow Run",
            description: "Triggered when a GitHub Actions workflow run completes",
            requiredScopes: ["repo", "workflow"],
            configFields: [
                {
                    name: "repository",
                    label: "Repository",
                    type: "select",
                    required: true,
                    description: "Select the repository to monitor",
                    dynamicOptions: {
                        operation: "listRepositories",
                        labelField: "full_name",
                        valueField: "full_name"
                    }
                },
                {
                    name: "workflow",
                    label: "Workflow",
                    type: "select",
                    required: false,
                    description: "Filter by specific workflow",
                    dynamicOptions: {
                        operation: "listWorkflows",
                        labelField: "name",
                        valueField: "id"
                    }
                },
                {
                    name: "conclusion",
                    label: "Conclusion",
                    type: "select",
                    required: false,
                    description: "Filter by workflow conclusion",
                    options: [
                        { value: "success", label: "Success" },
                        { value: "failure", label: "Failure" },
                        { value: "cancelled", label: "Cancelled" }
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
            authUrl: "https://github.com/login/oauth/authorize",
            tokenUrl: "https://github.com/login/oauth/access_token",
            scopes: [
                "repo", // Full repository access
                "read:org", // Read organization membership
                "workflow", // Manage GitHub Actions workflows
                "write:discussion" // Write discussions (for some PR operations)
            ],
            clientId: appConfig.oauth.github.clientId,
            clientSecret: appConfig.oauth.github.clientSecret,
            redirectUri: getOAuthRedirectUri("github"),
            refreshable: false // GitHub OAuth apps don't support refresh tokens by default
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
            // Repository operations
            case "listRepositories":
                return await executeListRepositories(client, validatedParams as never);
            case "getRepository":
                return await executeGetRepository(client, validatedParams as never);
            case "createRepository":
                return await executeCreateRepository(client, validatedParams as never);
            case "updateRepository":
                return await executeUpdateRepository(client, validatedParams as never);
            case "deleteRepository":
                return await executeDeleteRepository(client, validatedParams as never);

            // Issue operations
            case "listIssues":
                return await executeListIssues(client, validatedParams as never);
            case "getIssue":
                return await executeGetIssue(client, validatedParams as never);
            case "createIssue":
                return await executeCreateIssue(client, validatedParams as never);
            case "updateIssue":
                return await executeUpdateIssue(client, validatedParams as never);
            case "addComment":
                return await executeAddComment(client, validatedParams as never);
            case "closeIssue":
                return await executeCloseIssue(client, validatedParams as never);
            case "reopenIssue":
                return await executeReopenIssue(client, validatedParams as never);

            // Pull request operations
            case "listPullRequests":
                return await executeListPullRequests(client, validatedParams as never);
            case "getPullRequest":
                return await executeGetPullRequest(client, validatedParams as never);
            case "createPullRequest":
                return await executeCreatePullRequest(client, validatedParams as never);
            case "updatePullRequest":
                return await executeUpdatePullRequest(client, validatedParams as never);
            case "mergePullRequest":
                return await executeMergePullRequest(client, validatedParams as never);
            case "createReview":
                return await executeCreateReview(client, validatedParams as never);
            case "addReviewComment":
                return await executeAddReviewComment(client, validatedParams as never);

            // Workflow operations
            case "listWorkflows":
                return await executeListWorkflows(client, validatedParams as never);
            case "getWorkflow":
                return await executeGetWorkflow(client, validatedParams as never);
            case "triggerWorkflow":
                return await executeTriggerWorkflow(client, validatedParams as never);
            case "listWorkflowRuns":
                return await executeListWorkflowRuns(client, validatedParams as never);
            case "getWorkflowRun":
                return await executeGetWorkflowRun(client, validatedParams as never);
            case "getWorkflowLogs":
                return await executeGetWorkflowLogs(client, validatedParams as never);
            case "cancelWorkflowRun":
                return await executeCancelWorkflowRun(client, validatedParams as never);

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
     * Get or create GitHub client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): GitHubClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Create new client
        const tokens = connection.data as OAuth2TokenData;
        const client = new GitHubClient({
            accessToken: tokens.access_token,
            connectionId: connection.id
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
