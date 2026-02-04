/**
 * Ghost Integration Provider
 *
 * Open source publishing platform with Admin API Key authentication.
 * Supports posts, tags, members, and site info via the Ghost Admin API.
 *
 * The Admin API key uses a unique auth pattern: the key is in {id}:{secret} format
 * and a short-lived JWT is generated per-request.
 *
 * Rate limit: ~50 requests/second recommended
 */

import { BaseProvider } from "../../core/BaseProvider";
import { GhostClient } from "./client/GhostClient";
import { GhostMCPAdapter } from "./mcp/GhostMCPAdapter";
import {
    // Post Operations
    listPostsOperation,
    executeListPosts,
    getPostOperation,
    executeGetPost,
    createPostOperation,
    executeCreatePost,
    updatePostOperation,
    executeUpdatePost,
    deletePostOperation,
    executeDeletePost,
    // Tag Operations
    listTagsOperation,
    executeListTags,
    // Member Operations
    listMembersOperation,
    executeListMembers,
    // Site Operations
    getSiteInfoOperation,
    executeGetSiteInfo
} from "./operations";
import type { ConnectionWithData, ApiKeyData } from "../../../storage/models/Connection";
import type {
    AuthConfig,
    ExecutionContext,
    MCPTool,
    OperationResult,
    ProviderCapabilities
} from "../../core/types";

export class GhostProvider extends BaseProvider {
    readonly name = "ghost";
    readonly displayName = "Ghost";
    readonly authMethod = "api_key" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true,
        rateLimit: {
            tokensPerMinute: 3000,
            burstSize: 50
        }
    };

    private clientPool: Map<string, GhostClient> = new Map();
    private mcpAdapter: GhostMCPAdapter;

    constructor() {
        super();

        // Register Post Operations (5 operations)
        this.registerOperation(listPostsOperation);
        this.registerOperation(getPostOperation);
        this.registerOperation(createPostOperation);
        this.registerOperation(updatePostOperation);
        this.registerOperation(deletePostOperation);

        // Register Tag Operations (1 operation)
        this.registerOperation(listTagsOperation);

        // Register Member Operations (1 operation)
        this.registerOperation(listMembersOperation);

        // Register Site Operations (1 operation)
        this.registerOperation(getSiteInfoOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new GhostMCPAdapter(this.operations);
    }

    /**
     * Get API Key configuration
     * Ghost uses a custom JWT auth scheme, but we declare api_key as the base method
     */
    getAuthConfig(): AuthConfig {
        return {
            headerName: "Authorization",
            headerTemplate: "Ghost {{api_key}}"
        };
    }

    /**
     * Execute an operation
     */
    async executeOperation(
        operationId: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData,
        _context: ExecutionContext
    ): Promise<OperationResult> {
        const client = this.getOrCreateClient(connection);

        switch (operationId) {
            // Post Operations
            case "listPosts":
                return executeListPosts(client, params as never);
            case "getPost":
                return executeGetPost(client, params as never);
            case "createPost":
                return executeCreatePost(client, params as never);
            case "updatePost":
                return executeUpdatePost(client, params as never);
            case "deletePost":
                return executeDeletePost(client, params as never);

            // Tag Operations
            case "listTags":
                return executeListTags(client, params as never);

            // Member Operations
            case "listMembers":
                return executeListMembers(client, params as never);

            // Site Operations
            case "getSiteInfo":
                return executeGetSiteInfo(client, params as never);

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
     * Get MCP tools for AI agent integration
     */
    getMCPTools(): MCPTool[] {
        return this.mcpAdapter.getTools();
    }

    /**
     * Execute an MCP tool
     */
    async executeMCPTool(
        toolName: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData
    ): Promise<unknown> {
        const client = this.getOrCreateClient(connection);
        const result = await this.mcpAdapter.executeTool(toolName, params, client);

        if (result.success) {
            return result.data;
        } else {
            throw new Error(result.error?.message || "MCP tool execution failed");
        }
    }

    /**
     * Get or create a client for a connection (with caching)
     */
    private getOrCreateClient(connection: ConnectionWithData): GhostClient {
        const poolKey = connection.id;

        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        const data = connection.data as ApiKeyData;

        if (!data.api_key) {
            throw new Error("Ghost Admin API Key is required");
        }

        if (!data.api_secret) {
            throw new Error("Ghost Site URL is required");
        }

        const client = new GhostClient({
            adminApiKey: data.api_key,
            siteUrl: data.api_secret,
            connectionId: connection.id
        });

        this.clientPool.set(poolKey, client);
        return client;
    }

    /**
     * Clear cached client
     */
    clearClient(connectionId: string): void {
        this.clientPool.delete(connectionId);
    }
}
