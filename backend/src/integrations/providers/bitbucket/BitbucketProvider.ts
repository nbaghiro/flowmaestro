import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { BaseProvider } from "../../core/BaseProvider";
import { BitbucketClient } from "./client/BitbucketClient";
import { BitbucketMCPAdapter } from "./mcp/BitbucketMCPAdapter";
import {
    // Repository operations
    listRepositoriesOperation,
    executeListRepositories,
    getRepositoryOperation,
    executeGetRepository,
    createRepositoryOperation,
    executeCreateRepository,
    deleteRepositoryOperation,
    executeDeleteRepository,
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
    // Issue operations
    listIssuesOperation,
    executeListIssues,
    createIssueOperation,
    executeCreateIssue,
    // Pipeline operations
    listPipelinesOperation,
    executeListPipelines,
    getPipelineOperation,
    executeGetPipeline,
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
 * Bitbucket Provider - implements OAuth2 authentication with comprehensive Bitbucket API operations
 */
export class BitbucketProvider extends BaseProvider {
    readonly name = "bitbucket";
    readonly displayName = "Bitbucket";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true,
        rateLimit: {
            tokensPerMinute: 1000 / 60, // 1,000 requests per hour = ~16/min
            burstSize: 50
        }
    };

    private mcpAdapter: BitbucketMCPAdapter;
    private clientPool: Map<string, BitbucketClient> = new Map();

    constructor() {
        super();

        // Register repository operations
        this.registerOperation(listRepositoriesOperation);
        this.registerOperation(getRepositoryOperation);
        this.registerOperation(createRepositoryOperation);
        this.registerOperation(deleteRepositoryOperation);

        // Register pull request operations
        this.registerOperation(listPullRequestsOperation);
        this.registerOperation(getPullRequestOperation);
        this.registerOperation(createPullRequestOperation);
        this.registerOperation(updatePullRequestOperation);
        this.registerOperation(mergePullRequestOperation);

        // Register issue operations
        this.registerOperation(listIssuesOperation);
        this.registerOperation(createIssueOperation);

        // Register pipeline operations
        this.registerOperation(listPipelinesOperation);
        this.registerOperation(getPipelineOperation);
        this.registerOperation(triggerPipelineOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new BitbucketMCPAdapter(this.operations);

        // Configure webhook settings
        this.setWebhookConfig({
            setupType: "manual",
            signatureType: "hmac_sha256",
            signatureHeader: "X-Hub-Signature",
            eventHeader: "X-Event-Key"
        });

        // Register trigger events
        this.registerTrigger({
            id: "repo:push",
            name: "Push",
            description: "Triggered when commits are pushed to a repository branch",
            requiredScopes: ["repository"],
            configFields: [
                {
                    name: "repository",
                    label: "Repository",
                    type: "text",
                    required: true,
                    description: "Repository in format workspace/repo_slug",
                    placeholder: "my-workspace/my-repo"
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
            id: "pullrequest:created",
            name: "Pull Request Created",
            description: "Triggered when a pull request is created",
            requiredScopes: ["pullrequest"],
            configFields: [
                {
                    name: "repository",
                    label: "Repository",
                    type: "text",
                    required: true,
                    description: "Repository in format workspace/repo_slug",
                    placeholder: "my-workspace/my-repo"
                }
            ],
            tags: ["code", "review"]
        });

        this.registerTrigger({
            id: "pullrequest:fulfilled",
            name: "Pull Request Merged",
            description: "Triggered when a pull request is merged",
            requiredScopes: ["pullrequest"],
            configFields: [
                {
                    name: "repository",
                    label: "Repository",
                    type: "text",
                    required: true,
                    description: "Repository in format workspace/repo_slug",
                    placeholder: "my-workspace/my-repo"
                }
            ],
            tags: ["code", "review"]
        });

        this.registerTrigger({
            id: "issue:created",
            name: "Issue Created",
            description: "Triggered when an issue is created",
            requiredScopes: ["repository"],
            configFields: [
                {
                    name: "repository",
                    label: "Repository",
                    type: "text",
                    required: true,
                    description: "Repository in format workspace/repo_slug",
                    placeholder: "my-workspace/my-repo"
                }
            ],
            tags: ["issues", "tracking"]
        });

        this.registerTrigger({
            id: "repo:commit_status_created",
            name: "Build Status Created",
            description: "Triggered when a build status is created (pipeline starts)",
            requiredScopes: ["pipeline"],
            configFields: [
                {
                    name: "repository",
                    label: "Repository",
                    type: "text",
                    required: true,
                    description: "Repository in format workspace/repo_slug",
                    placeholder: "my-workspace/my-repo"
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
            authUrl: "https://bitbucket.org/site/oauth2/authorize",
            tokenUrl: "https://bitbucket.org/site/oauth2/access_token",
            scopes: [
                "repository",
                "repository:write",
                "pullrequest",
                "pullrequest:write",
                "pipeline",
                "pipeline:write",
                "account"
            ],
            clientId: appConfig.oauth.bitbucket.clientId,
            clientSecret: appConfig.oauth.bitbucket.clientSecret,
            redirectUri: getOAuthRedirectUri("bitbucket"),
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
            // Repository operations
            case "listRepositories":
                return await executeListRepositories(client, validatedParams as never);
            case "getRepository":
                return await executeGetRepository(client, validatedParams as never);
            case "createRepository":
                return await executeCreateRepository(client, validatedParams as never);
            case "deleteRepository":
                return await executeDeleteRepository(client, validatedParams as never);

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

            // Issue operations
            case "listIssues":
                return await executeListIssues(client, validatedParams as never);
            case "createIssue":
                return await executeCreateIssue(client, validatedParams as never);

            // Pipeline operations
            case "listPipelines":
                return await executeListPipelines(client, validatedParams as never);
            case "getPipeline":
                return await executeGetPipeline(client, validatedParams as never);
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
     * Get or create Bitbucket client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): BitbucketClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Create new client
        const tokens = connection.data as OAuth2TokenData;

        const client = new BitbucketClient({
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
