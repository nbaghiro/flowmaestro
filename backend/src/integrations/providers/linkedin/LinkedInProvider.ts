import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { BaseProvider } from "../../core/BaseProvider";
import { LinkedInClient } from "./client/LinkedInClient";
import { LinkedInMCPAdapter } from "./mcp/LinkedInMCPAdapter";
import {
    createPostOperation,
    executeCreatePost,
    createArticlePostOperation,
    executeCreateArticlePost,
    deletePostOperation,
    executeDeletePost,
    getPostOperation,
    executeGetPost,
    getProfileOperation,
    executeGetProfile,
    getOrganizationsOperation,
    executeGetOrganizations,
    addCommentOperation,
    executeAddComment,
    getCommentsOperation,
    executeGetComments,
    addReactionOperation,
    executeAddReaction
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
 * LinkedIn Provider - implements OAuth2 authentication with OpenID Connect
 *
 * Available operations:
 * - createPost: Create a new text post
 * - createArticlePost: Create a post with an article link
 * - deletePost: Delete a post by ID
 * - getPost: Get post details
 * - getProfile: Get authenticated user profile
 * - getOrganizations: Get organizations user can post to
 * - addComment: Add a comment to a post
 * - getComments: Get comments on a post
 * - addReaction: Add a reaction (like, celebrate, etc.) to a post
 *
 * Note: Uses LinkedIn REST API with versioned headers
 */
export class LinkedInProvider extends BaseProvider {
    readonly name = "linkedin";
    readonly displayName = "LinkedIn";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: false,
        rateLimit: {
            tokensPerMinute: 60, // LinkedIn rate limits vary by endpoint
            burstSize: 10
        }
    };

    private mcpAdapter: LinkedInMCPAdapter;
    private clientPool: Map<string, LinkedInClient> = new Map();

    constructor() {
        super();

        // Register operations
        this.registerOperation(createPostOperation);
        this.registerOperation(createArticlePostOperation);
        this.registerOperation(deletePostOperation);
        this.registerOperation(getPostOperation);
        this.registerOperation(getProfileOperation);
        this.registerOperation(getOrganizationsOperation);
        this.registerOperation(addCommentOperation);
        this.registerOperation(getCommentsOperation);
        this.registerOperation(addReactionOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new LinkedInMCPAdapter(this.operations);
    }

    /**
     * Get OAuth configuration
     */
    getAuthConfig(): AuthConfig {
        const config: OAuthConfig = {
            authUrl: "https://www.linkedin.com/oauth/v2/authorization",
            tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
            scopes: ["openid", "profile", "email", "w_member_social"],
            clientId: appConfig.oauth.linkedin.clientId,
            clientSecret: appConfig.oauth.linkedin.clientSecret,
            redirectUri: getOAuthRedirectUri("linkedin"),
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
            case "createPost":
                return await executeCreatePost(client, validatedParams as never);
            case "createArticlePost":
                return await executeCreateArticlePost(client, validatedParams as never);
            case "deletePost":
                return await executeDeletePost(client, validatedParams as never);
            case "getPost":
                return await executeGetPost(client, validatedParams as never);
            case "getProfile":
                return await executeGetProfile(client, validatedParams as never);
            case "getOrganizations":
                return await executeGetOrganizations(client, validatedParams as never);
            case "addComment":
                return await executeAddComment(client, validatedParams as never);
            case "getComments":
                return await executeGetComments(client, validatedParams as never);
            case "addReaction":
                return await executeAddReaction(client, validatedParams as never);
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
     * Get or create LinkedIn client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): LinkedInClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Create new client
        const tokens = connection.data as OAuth2TokenData;
        const client = new LinkedInClient({
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
