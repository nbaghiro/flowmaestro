/**
 * GitBook Integration Provider
 *
 * Documentation platform with Personal Access Token authentication.
 * Provides read-only access to organizations, spaces, and pages.
 */

import { BaseProvider } from "../../core/BaseProvider";
import { GitBookClient } from "./client/GitBookClient";
import { GitBookMCPAdapter } from "./mcp/GitBookMCPAdapter";
import {
    // Organization Operations
    listOrganizationsOperation,
    executeListOrganizations,
    getOrganizationOperation,
    executeGetOrganization,
    // Space Operations
    listSpacesOperation,
    executeListSpaces,
    getSpaceOperation,
    executeGetSpace,
    searchSpaceContentOperation,
    executeSearchSpaceContent,
    // Page Operations
    listPagesOperation,
    executeListPages,
    getPageOperation,
    executeGetPage
} from "./operations";
import type { ConnectionWithData, ApiKeyData } from "../../../storage/models/Connection";
import type {
    AuthConfig,
    ExecutionContext,
    MCPTool,
    OperationResult,
    APIKeyConfig,
    ProviderCapabilities
} from "../../core/types";

export class GitBookProvider extends BaseProvider {
    readonly name = "gitbook";
    readonly displayName = "GitBook";
    readonly authMethod = "api_key" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: false,
        rateLimit: {
            // Conservative defaults (rate limits not explicitly documented)
            tokensPerMinute: 300,
            burstSize: 50
        }
    };

    private clientPool: Map<string, GitBookClient> = new Map();
    private mcpAdapter: GitBookMCPAdapter;

    constructor() {
        super();

        // Register Organization Operations (2)
        this.registerOperation(listOrganizationsOperation);
        this.registerOperation(getOrganizationOperation);

        // Register Space Operations (3)
        this.registerOperation(listSpacesOperation);
        this.registerOperation(getSpaceOperation);
        this.registerOperation(searchSpaceContentOperation);

        // Register Page Operations (2)
        this.registerOperation(listPagesOperation);
        this.registerOperation(getPageOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new GitBookMCPAdapter(this.operations);
    }

    /**
     * Get API Key configuration
     *
     * GitBook uses Personal Access Tokens for authentication.
     * Users create tokens at https://app.gitbook.com/account/developer
     */
    getAuthConfig(): AuthConfig {
        const config: APIKeyConfig = {
            headerName: "Authorization",
            headerTemplate: "Bearer {{api_key}}"
        };

        return config;
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
            // Organization Operations
            case "listOrganizations":
                return executeListOrganizations(client, params as never);
            case "getOrganization":
                return executeGetOrganization(client, params as never);

            // Space Operations
            case "listSpaces":
                return executeListSpaces(client, params as never);
            case "getSpace":
                return executeGetSpace(client, params as never);
            case "searchSpaceContent":
                return executeSearchSpaceContent(client, params as never);

            // Page Operations
            case "listPages":
                return executeListPages(client, params as never);
            case "getPage":
                return executeGetPage(client, params as never);

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
    private getOrCreateClient(connection: ConnectionWithData): GitBookClient {
        const poolKey = connection.id;

        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Get API key from connection data
        const connectionData = connection.data as ApiKeyData;

        if (!connectionData.api_key) {
            throw new Error("No API key found in connection data");
        }

        const client = new GitBookClient({
            apiKey: connectionData.api_key,
            connectionId: connection.id
        });

        this.clientPool.set(poolKey, client);
        return client;
    }

    /**
     * Clear cached client (e.g., after token update)
     */
    clearClientCache(connectionId: string): void {
        this.clientPool.delete(connectionId);
    }
}
