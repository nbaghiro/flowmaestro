/**
 * Medium Integration Provider
 *
 * Publishing platform with API Key (Integration Token) authentication.
 * Supports user info, publications, posts, and image uploads.
 *
 * Rate limit: 60 requests/minute
 */

import { BaseProvider } from "../../core/BaseProvider";
import { MediumClient } from "./client/MediumClient";
import { MediumMCPAdapter } from "./mcp/MediumMCPAdapter";
import {
    // User Operations
    getMeOperation,
    executeGetMe,
    // Publication Operations
    getPublicationsOperation,
    executeGetPublications,
    getPublicationContributorsOperation,
    executeGetPublicationContributors,
    // Post Operations
    createPostOperation,
    executeCreatePost,
    createPublicationPostOperation,
    executeCreatePublicationPost,
    // Image Operations
    uploadImageOperation,
    executeUploadImage
} from "./operations";
import type { ConnectionWithData, ApiKeyData } from "../../../storage/models/Connection";
import type {
    AuthConfig,
    ExecutionContext,
    MCPTool,
    OperationResult,
    ProviderCapabilities
} from "../../core/types";

export class MediumProvider extends BaseProvider {
    readonly name = "medium";
    readonly displayName = "Medium";
    readonly authMethod = "api_key" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: false,
        rateLimit: {
            tokensPerMinute: 60,
            burstSize: 10
        }
    };

    private clientPool: Map<string, MediumClient> = new Map();
    private mcpAdapter: MediumMCPAdapter;

    constructor() {
        super();

        // Register User Operations (1 operation)
        this.registerOperation(getMeOperation);

        // Register Publication Operations (2 operations)
        this.registerOperation(getPublicationsOperation);
        this.registerOperation(getPublicationContributorsOperation);

        // Register Post Operations (2 operations)
        this.registerOperation(createPostOperation);
        this.registerOperation(createPublicationPostOperation);

        // Register Image Operations (1 operation)
        this.registerOperation(uploadImageOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new MediumMCPAdapter(this.operations);
    }

    /**
     * Get API Key configuration
     */
    getAuthConfig(): AuthConfig {
        return {
            headerName: "Authorization",
            headerTemplate: "Bearer {{api_key}}"
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
            // User Operations
            case "getMe":
                return executeGetMe(client, params as never);

            // Publication Operations
            case "getPublications":
                return executeGetPublications(client, params as never);
            case "getPublicationContributors":
                return executeGetPublicationContributors(client, params as never);

            // Post Operations
            case "createPost":
                return executeCreatePost(client, params as never);
            case "createPublicationPost":
                return executeCreatePublicationPost(client, params as never);

            // Image Operations
            case "uploadImage":
                return executeUploadImage(client, params as never);

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
    private getOrCreateClient(connection: ConnectionWithData): MediumClient {
        const poolKey = connection.id;

        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Get API key from connection data
        const data = connection.data as ApiKeyData;

        if (!data.api_key) {
            throw new Error("Medium Integration Token is required");
        }

        const client = new MediumClient({
            apiKey: data.api_key,
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
