import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { BaseProvider } from "../../core/BaseProvider";
import { NotionClient } from "./client/NotionClient";
import { NotionMCPAdapter } from "./mcp/NotionMCPAdapter";
import {
    searchOperation,
    executeSearch,
    createPageOperation,
    executeCreatePage,
    updatePageOperation,
    executeUpdatePage,
    getPageOperation,
    executeGetPage,
    queryDatabaseOperation,
    executeQueryDatabase
} from "./operations";
import type { ConnectionWithData, OAuth2TokenData } from "../../../storage/models/Connection";
import type {
    AuthConfig,
    ExecutionContext,
    MCPTool,
    OperationResult,
    OAuthConfig,
    ProviderCapabilities,
    TestResult
} from "../../core/types";

/**
 * Notion Provider - implements OAuth2 authentication with multiple operations
 */
export class NotionProvider extends BaseProvider {
    readonly name = "notion";
    readonly displayName = "Notion";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        rateLimit: {
            tokensPerMinute: 60
        }
    };

    private mcpAdapter: NotionMCPAdapter;
    private clientPool: Map<string, NotionClient> = new Map();

    constructor() {
        super();

        // Register operations
        this.registerOperation(searchOperation);
        this.registerOperation(createPageOperation);
        this.registerOperation(updatePageOperation);
        this.registerOperation(getPageOperation);
        this.registerOperation(queryDatabaseOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new NotionMCPAdapter(this.operations);
    }

    /**
     * Get OAuth2 configuration
     */
    getAuthConfig(): AuthConfig {
        const config: OAuthConfig = {
            authUrl: "https://api.notion.com/v1/oauth/authorize",
            tokenUrl: "https://api.notion.com/v1/oauth/token",
            scopes: [],
            clientId: appConfig.oauth.notion.clientId,
            clientSecret: appConfig.oauth.notion.clientSecret,
            redirectUri: getOAuthRedirectUri("notion"),
            refreshable: false
        };

        return config;
    }

    /**
     * Test connection
     */
    async testConnection(connection: ConnectionWithData): Promise<TestResult> {
        try {
            const client = this.getOrCreateClient(connection);
            // Search is a good test endpoint as it requires minimal permissions
            const response = await client.search({
                query: "",
                page_size: 1
            });

            return {
                success: true,
                message: "Successfully connected to Notion",
                tested_at: new Date().toISOString(),
                details: {
                    results: (response as { results?: unknown[] }).results?.length || 0
                }
            };
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : "Failed to connect to Notion",
                tested_at: new Date().toISOString()
            };
        }
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
            case "search":
                return await executeSearch(client, validatedParams as never);
            case "createPage":
                return await executeCreatePage(client, validatedParams as never);
            case "updatePage":
                return await executeUpdatePage(client, validatedParams as never);
            case "getPage":
                return await executeGetPage(client, validatedParams as never);
            case "queryDatabase":
                return await executeQueryDatabase(client, validatedParams as never);
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

        if ((result as OperationResult).success) {
            return (result as OperationResult).data;
        } else {
            throw new Error(
                (result as OperationResult).error?.message || "MCP tool execution failed"
            );
        }
    }

    /**
     * Get or create Notion client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): NotionClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Create new client
        const data = connection.data as OAuth2TokenData;
        const client = new NotionClient({
            accessToken: data.access_token
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
