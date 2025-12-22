import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { BaseProvider } from "../../core/BaseProvider";
import { TwitterClient } from "./client/TwitterClient";
import { TwitterMCPAdapter } from "./mcp/TwitterMCPAdapter";
import {
    postTweetOperation,
    executePostTweet,
    deleteTweetOperation,
    executeDeleteTweet,
    getUserOperation,
    executeGetUser,
    getUserTimelineOperation,
    executeGetUserTimeline,
    searchTweetsOperation,
    executeSearchTweets,
    replyToTweetOperation,
    executeReplyToTweet
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
 * X (Twitter) Provider - implements OAuth2 with PKCE authentication
 *
 * Available operations:
 * - postTweet: Create a new tweet
 * - deleteTweet: Delete a tweet by ID
 * - getUser: Get user profile information
 * - getUserTimeline: Get user's recent tweets
 * - searchTweets: Search recent tweets
 * - replyToTweet: Reply to an existing tweet
 *
 * Note: Uses X API v2 with OAuth 2.0 + PKCE authentication
 */
export class TwitterProvider extends BaseProvider {
    readonly name = "twitter";
    readonly displayName = "X (Twitter)";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: false, // Webhooks require enterprise access
        rateLimit: {
            tokensPerMinute: 30, // Conservative for Free tier
            burstSize: 5
        }
    };

    private mcpAdapter: TwitterMCPAdapter;
    private clientPool: Map<string, TwitterClient> = new Map();

    constructor() {
        super();

        // Register operations
        this.registerOperation(postTweetOperation);
        this.registerOperation(deleteTweetOperation);
        this.registerOperation(getUserOperation);
        this.registerOperation(getUserTimelineOperation);
        this.registerOperation(searchTweetsOperation);
        this.registerOperation(replyToTweetOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new TwitterMCPAdapter(this.operations);
    }

    /**
     * Get OAuth configuration
     */
    getAuthConfig(): AuthConfig {
        const config: OAuthConfig = {
            authUrl: "https://x.com/i/oauth2/authorize",
            tokenUrl: "https://api.x.com/2/oauth2/token",
            scopes: ["tweet.read", "tweet.write", "users.read", "offline.access"],
            clientId: appConfig.oauth.twitter.clientId,
            clientSecret: appConfig.oauth.twitter.clientSecret,
            redirectUri: getOAuthRedirectUri("twitter"),
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
            case "postTweet":
                return await executePostTweet(client, validatedParams as never);
            case "deleteTweet":
                return await executeDeleteTweet(client, validatedParams as never);
            case "getUser":
                return await executeGetUser(client, validatedParams as never);
            case "getUserTimeline":
                return await executeGetUserTimeline(client, validatedParams as never);
            case "searchTweets":
                return await executeSearchTweets(client, validatedParams as never);
            case "replyToTweet":
                return await executeReplyToTweet(client, validatedParams as never);
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
     * Get or create Twitter client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): TwitterClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Create new client
        const tokens = connection.data as OAuth2TokenData;
        const client = new TwitterClient({
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
