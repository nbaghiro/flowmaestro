/**
 * Contentful Integration Provider
 *
 * Headless CMS platform with API Key (Personal Access Token) authentication.
 * Supports spaces, content types, entries, and assets via the Content Management API.
 *
 * Rate limit: 10 requests/second (paid), 7/second (free)
 */

import { BaseProvider } from "../../core/BaseProvider";
import { ContentfulClient } from "./client/ContentfulClient";
import { ContentfulMCPAdapter } from "./mcp/ContentfulMCPAdapter";
import {
    // Space Operations
    listSpacesOperation,
    executeListSpaces,
    // Content Type Operations
    listContentTypesOperation,
    executeListContentTypes,
    // Entry Operations
    listEntriesOperation,
    executeListEntries,
    getEntryOperation,
    executeGetEntry,
    createEntryOperation,
    executeCreateEntry,
    updateEntryOperation,
    executeUpdateEntry,
    publishEntryOperation,
    executePublishEntry,
    // Asset Operations
    listAssetsOperation,
    executeListAssets
} from "./operations";
import type { ConnectionWithData, ApiKeyData } from "../../../storage/models/Connection";
import type {
    AuthConfig,
    ExecutionContext,
    MCPTool,
    OperationResult,
    ProviderCapabilities
} from "../../core/types";

export class ContentfulProvider extends BaseProvider {
    readonly name = "contentful";
    readonly displayName = "Contentful";
    readonly authMethod = "api_key" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true,
        rateLimit: {
            tokensPerMinute: 600,
            burstSize: 10
        }
    };

    private clientPool: Map<string, ContentfulClient> = new Map();
    private mcpAdapter: ContentfulMCPAdapter;

    constructor() {
        super();

        // Register Space Operations (1 operation)
        this.registerOperation(listSpacesOperation);

        // Register Content Type Operations (1 operation)
        this.registerOperation(listContentTypesOperation);

        // Register Entry Operations (5 operations)
        this.registerOperation(listEntriesOperation);
        this.registerOperation(getEntryOperation);
        this.registerOperation(createEntryOperation);
        this.registerOperation(updateEntryOperation);
        this.registerOperation(publishEntryOperation);

        // Register Asset Operations (1 operation)
        this.registerOperation(listAssetsOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new ContentfulMCPAdapter(this.operations);
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
            // Space Operations
            case "listSpaces":
                return executeListSpaces(client, params as never);

            // Content Type Operations
            case "listContentTypes":
                return executeListContentTypes(client, params as never);

            // Entry Operations
            case "listEntries":
                return executeListEntries(client, params as never);
            case "getEntry":
                return executeGetEntry(client, params as never);
            case "createEntry":
                return executeCreateEntry(client, params as never);
            case "updateEntry":
                return executeUpdateEntry(client, params as never);
            case "publishEntry":
                return executePublishEntry(client, params as never);

            // Asset Operations
            case "listAssets":
                return executeListAssets(client, params as never);

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
    private getOrCreateClient(connection: ConnectionWithData): ContentfulClient {
        const poolKey = connection.id;

        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        const data = connection.data as ApiKeyData;

        if (!data.api_key) {
            throw new Error("Contentful Personal Access Token is required");
        }

        if (!data.api_secret) {
            throw new Error("Contentful Space ID is required");
        }

        const client = new ContentfulClient({
            accessToken: data.api_key,
            spaceId: data.api_secret,
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
