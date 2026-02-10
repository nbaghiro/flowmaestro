import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { BaseProvider } from "../../core/BaseProvider";
import { ConfluenceClient } from "./client/ConfluenceClient";
import { ConfluenceMCPAdapter } from "./mcp/ConfluenceMCPAdapter";
import {
    listSpacesOperation,
    executeListSpaces,
    getSpaceOperation,
    executeGetSpace,
    listPagesOperation,
    executeListPages,
    getPageOperation,
    executeGetPage,
    createPageOperation,
    executeCreatePage,
    updatePageOperation,
    executeUpdatePage,
    searchContentOperation,
    executeSearchContent,
    getPageChildrenOperation,
    executeGetPageChildren
} from "./operations";
import type {
    ListSpacesInput,
    GetSpaceInput,
    ListPagesInput,
    GetPageInput,
    CreatePageInput,
    UpdatePageInput,
    SearchContentInput,
    GetPageChildrenInput,
    ConfluenceConnectionMetadata
} from "./operations/types";
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
 * Confluence Cloud Provider
 * Provides integration with Confluence Cloud for wiki and content management
 */
export class ConfluenceProvider extends BaseProvider {
    readonly name = "confluence";
    readonly displayName = "Confluence";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        rateLimit: {
            tokensPerMinute: 100,
            burstSize: 20
        }
    };

    private clientPool: Map<string, ConfluenceClient> = new Map();
    private mcpAdapter: ConfluenceMCPAdapter;

    constructor() {
        super();

        // Register space operations
        this.registerOperation(listSpacesOperation);
        this.registerOperation(getSpaceOperation);

        // Register page operations
        this.registerOperation(listPagesOperation);
        this.registerOperation(getPageOperation);
        this.registerOperation(createPageOperation);
        this.registerOperation(updatePageOperation);
        this.registerOperation(getPageChildrenOperation);

        // Register search operations
        this.registerOperation(searchContentOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new ConfluenceMCPAdapter(this.operations);
    }

    /**
     * Get OAuth configuration
     */
    getAuthConfig(): AuthConfig {
        const config: OAuthConfig = {
            authUrl: "https://auth.atlassian.com/authorize",
            tokenUrl: "https://auth.atlassian.com/oauth/token",
            scopes: [
                "read:confluence-content.all",
                "write:confluence-content",
                "read:confluence-space.summary",
                "write:confluence-space",
                "read:confluence-user",
                "offline_access"
            ],
            clientId: appConfig.oauth.confluence.clientId,
            clientSecret: appConfig.oauth.confluence.clientSecret,
            redirectUri: getOAuthRedirectUri("confluence"),
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
        const validatedParams = this.validateParams(operationId, params);
        const client = this.getOrCreateClient(connection);

        switch (operationId) {
            case "listSpaces":
                return await executeListSpaces(client, validatedParams as ListSpacesInput);
            case "getSpace":
                return await executeGetSpace(client, validatedParams as GetSpaceInput);
            case "listPages":
                return await executeListPages(client, validatedParams as ListPagesInput);
            case "getPage":
                return await executeGetPage(client, validatedParams as GetPageInput);
            case "createPage":
                return await executeCreatePage(client, validatedParams as CreatePageInput);
            case "updatePage":
                return await executeUpdatePage(client, validatedParams as UpdatePageInput);
            case "searchContent":
                return await executeSearchContent(client, validatedParams as SearchContentInput);
            case "getPageChildren":
                return await executeGetPageChildren(
                    client,
                    validatedParams as GetPageChildrenInput
                );
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

        if (result.success) {
            return result.data;
        } else {
            throw new Error(result.error?.message || "MCP tool execution failed");
        }
    }

    /**
     * Get or create Confluence client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): ConfluenceClient {
        const poolKey = connection.id;

        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        const tokens = connection.data as OAuth2TokenData;
        const metadata = connection.metadata as ConfluenceConnectionMetadata;
        if (!metadata?.cloudId) {
            throw new Error("Confluence cloudId not found in connection metadata");
        }

        const client = new ConfluenceClient({
            accessToken: tokens.access_token,
            cloudId: metadata.cloudId,
            connectionId: connection.id
        });

        this.clientPool.set(poolKey, client);

        return client;
    }

    /**
     * Clear client from pool
     */
    clearClient(connectionId: string): void {
        this.clientPool.delete(connectionId);
    }
}
