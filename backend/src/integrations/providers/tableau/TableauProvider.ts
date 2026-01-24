import { BaseProvider } from "../../core/BaseProvider";
import { TableauClient } from "./client/TableauClient";
import { TableauMCPAdapter } from "./mcp/TableauMCPAdapter";
import {
    signInOperation,
    executeSignIn,
    listSitesOperation,
    executeListSites,
    listWorkbooksOperation,
    executeListWorkbooks,
    getWorkbookOperation,
    executeGetWorkbook,
    listViewsOperation,
    executeListViews,
    getViewOperation,
    executeGetView,
    queryViewDataOperation,
    executeQueryViewData,
    queryViewImageOperation,
    executeQueryViewImage,
    listDataSourcesOperation,
    executeListDataSources,
    getDataSourceOperation,
    executeGetDataSource,
    refreshDataSourceOperation,
    executeRefreshDataSource,
    listProjectsOperation,
    executeListProjects,
    downloadWorkbookOperation,
    executeDownloadWorkbook
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

/**
 * Extended connection data for Tableau
 * Includes server URL and site in addition to standard API key fields
 */
interface TableauConnectionData extends ApiKeyData {
    server_url?: string;
    site?: string;
}

/**
 * Tableau Provider - implements Personal Access Token authentication
 *
 * Tableau uses Personal Access Tokens (PAT) for authentication:
 * - api_key field = PAT Name
 * - api_secret field = PAT Secret
 * - server_url = Tableau Server/Cloud URL
 * - site = Site content URL (optional, empty for default)
 *
 * Rate limits:
 * - 60 requests per minute per user (conservative estimate)
 */
export class TableauProvider extends BaseProvider {
    readonly name = "tableau";
    readonly displayName = "Tableau";
    readonly authMethod = "api_key" as const;
    readonly capabilities: ProviderCapabilities = {
        rateLimit: {
            tokensPerMinute: 60
        }
    };

    private mcpAdapter: TableauMCPAdapter;
    private clientPool: Map<string, TableauClient> = new Map();

    constructor() {
        super();

        // Register operations
        this.registerOperation(signInOperation);
        this.registerOperation(listSitesOperation);
        this.registerOperation(listWorkbooksOperation);
        this.registerOperation(getWorkbookOperation);
        this.registerOperation(listViewsOperation);
        this.registerOperation(getViewOperation);
        this.registerOperation(queryViewDataOperation);
        this.registerOperation(queryViewImageOperation);
        this.registerOperation(listDataSourcesOperation);
        this.registerOperation(getDataSourceOperation);
        this.registerOperation(refreshDataSourceOperation);
        this.registerOperation(listProjectsOperation);
        this.registerOperation(downloadWorkbookOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new TableauMCPAdapter(this.operations);
    }

    /**
     * Get API Key configuration
     * Note: Tableau uses PAT which is exchanged for a session token.
     * The TableauClient handles the actual authentication.
     */
    getAuthConfig(): AuthConfig {
        const config: APIKeyConfig = {
            headerName: "X-Tableau-Auth",
            headerTemplate: "{{api_key}}"
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
            case "signIn":
                return await executeSignIn(client, validatedParams as never);
            case "listSites":
                return await executeListSites(client, validatedParams as never);
            case "listWorkbooks":
                return await executeListWorkbooks(client, validatedParams as never);
            case "getWorkbook":
                return await executeGetWorkbook(client, validatedParams as never);
            case "listViews":
                return await executeListViews(client, validatedParams as never);
            case "getView":
                return await executeGetView(client, validatedParams as never);
            case "queryViewData":
                return await executeQueryViewData(client, validatedParams as never);
            case "queryViewImage":
                return await executeQueryViewImage(client, validatedParams as never);
            case "listDataSources":
                return await executeListDataSources(client, validatedParams as never);
            case "getDataSource":
                return await executeGetDataSource(client, validatedParams as never);
            case "refreshDataSource":
                return await executeRefreshDataSource(client, validatedParams as never);
            case "listProjects":
                return await executeListProjects(client, validatedParams as never);
            case "downloadWorkbook":
                return await executeDownloadWorkbook(client, validatedParams as never);
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
     * Get or create Tableau client (with connection pooling)
     *
     * For Tableau, we use:
     * - api_key field as the PAT Name
     * - api_secret field as the PAT Secret
     * - server_url from connection data for the Tableau Server URL
     * - site from connection data for the site content URL
     */
    private getOrCreateClient(connection: ConnectionWithData): TableauClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Create new client
        const data = connection.data as TableauConnectionData;

        if (!data.server_url) {
            throw new Error(
                "Tableau server URL is required. Please provide it when creating the connection."
            );
        }

        const client = new TableauClient({
            serverUrl: data.server_url,
            site: data.site || "",
            tokenName: data.api_key,
            tokenSecret: data.api_secret || ""
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
