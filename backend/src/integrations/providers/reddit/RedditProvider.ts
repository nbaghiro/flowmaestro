import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { BaseProvider } from "../../core/BaseProvider";
import { RedditClient } from "./client/RedditClient";
import { RedditMCPAdapter } from "./mcp/RedditMCPAdapter";
import {
    getPostsOperation,
    executeGetPosts,
    getPostOperation,
    executeGetPost,
    submitTextPostOperation,
    executeSubmitTextPost,
    submitLinkPostOperation,
    executeSubmitLinkPost,
    submitCommentOperation,
    executeSubmitComment,
    voteOperation,
    executeVote,
    saveOperation,
    executeSave,
    unsaveOperation,
    executeUnsave,
    getMeOperation,
    executeGetMe
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
 * Reddit Provider - implements OAuth2 authentication
 *
 * Available operations:
 * - getPosts: Get posts from a subreddit
 * - getPost: Get a single post with comments
 * - submitTextPost: Submit a text (self) post
 * - submitLinkPost: Submit a link post
 * - submitComment: Reply to a post or comment
 * - vote: Upvote, downvote, or remove vote
 * - save: Save a post or comment
 * - unsave: Unsave a post or comment
 * - getMe: Get authenticated user info
 *
 * Note: Uses Reddit OAuth 2.0 API with oauth.reddit.com endpoint
 */
export class RedditProvider extends BaseProvider {
    readonly name = "reddit";
    readonly displayName = "Reddit";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: false,
        rateLimit: {
            tokensPerMinute: 60, // Reddit allows 60 requests/minute for OAuth apps
            burstSize: 10
        }
    };

    private mcpAdapter: RedditMCPAdapter;
    private clientPool: Map<string, RedditClient> = new Map();

    constructor() {
        super();

        // Register operations
        this.registerOperation(getPostsOperation);
        this.registerOperation(getPostOperation);
        this.registerOperation(submitTextPostOperation);
        this.registerOperation(submitLinkPostOperation);
        this.registerOperation(submitCommentOperation);
        this.registerOperation(voteOperation);
        this.registerOperation(saveOperation);
        this.registerOperation(unsaveOperation);
        this.registerOperation(getMeOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new RedditMCPAdapter(this.operations);
    }

    /**
     * Get OAuth configuration
     */
    getAuthConfig(): AuthConfig {
        const config: OAuthConfig = {
            authUrl: "https://www.reddit.com/api/v1/authorize",
            tokenUrl: "https://www.reddit.com/api/v1/access_token",
            scopes: ["identity", "read", "submit", "vote", "save", "edit", "history"],
            clientId: appConfig.oauth.reddit.clientId,
            clientSecret: appConfig.oauth.reddit.clientSecret,
            redirectUri: getOAuthRedirectUri("reddit"),
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

        // Execute operation
        switch (operationId) {
            case "getPosts":
                return await executeGetPosts(client, validatedParams as never);
            case "getPost":
                return await executeGetPost(client, validatedParams as never);
            case "submitTextPost":
                return await executeSubmitTextPost(client, validatedParams as never);
            case "submitLinkPost":
                return await executeSubmitLinkPost(client, validatedParams as never);
            case "submitComment":
                return await executeSubmitComment(client, validatedParams as never);
            case "vote":
                return await executeVote(client, validatedParams as never);
            case "save":
                return await executeSave(client, validatedParams as never);
            case "unsave":
                return await executeUnsave(client, validatedParams as never);
            case "getMe":
                return await executeGetMe(client, validatedParams as never);
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
     * Get or create Reddit client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): RedditClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Create new client
        const tokens = connection.data as OAuth2TokenData;
        const client = new RedditClient({
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
