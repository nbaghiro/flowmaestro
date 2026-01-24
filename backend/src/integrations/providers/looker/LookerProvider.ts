import { BaseProvider } from "../../core/BaseProvider";
import { LookerClient } from "./client/LookerClient";
import { LookerMCPAdapter } from "./mcp/LookerMCPAdapter";
import {
    listDashboardsOperation,
    executeListDashboards,
    getDashboardOperation,
    executeGetDashboard,
    listLooksOperation,
    executeListLooks,
    getLookOperation,
    executeGetLook,
    runLookOperation,
    executeRunLook,
    runQueryOperation,
    executeRunQuery,
    createQueryOperation,
    executeCreateQuery,
    listExploresOperation,
    executeListExplores,
    runExploreOperation,
    executeRunExplore,
    listFoldersOperation,
    executeListFolders,
    searchContentOperation,
    executeSearchContent
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
 * Extended connection data for Looker
 * Includes instance URL in addition to standard API key fields
 */
interface LookerConnectionData extends ApiKeyData {
    instance_url?: string;
}

/**
 * Looker Provider - implements API Key (Client ID + Secret) authentication
 *
 * Looker uses client credentials to obtain a bearer token:
 * - api_key field = Looker Client ID
 * - api_secret field = Looker Client Secret
 * - instance_url = Looker instance URL (e.g., https://company.cloud.looker.com)
 *
 * Rate limits:
 * - 120 requests per minute per project (conservative estimate)
 */
export class LookerProvider extends BaseProvider {
    readonly name = "looker";
    readonly displayName = "Looker";
    readonly authMethod = "api_key" as const;
    readonly capabilities: ProviderCapabilities = {
        rateLimit: {
            tokensPerMinute: 120
        }
    };

    private mcpAdapter: LookerMCPAdapter;
    private clientPool: Map<string, LookerClient> = new Map();

    constructor() {
        super();

        // Register operations
        this.registerOperation(listDashboardsOperation);
        this.registerOperation(getDashboardOperation);
        this.registerOperation(listLooksOperation);
        this.registerOperation(getLookOperation);
        this.registerOperation(runLookOperation);
        this.registerOperation(runQueryOperation);
        this.registerOperation(createQueryOperation);
        this.registerOperation(listExploresOperation);
        this.registerOperation(runExploreOperation);
        this.registerOperation(listFoldersOperation);
        this.registerOperation(searchContentOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new LookerMCPAdapter(this.operations);
    }

    /**
     * Get API Key configuration
     * Note: Looker uses OAuth2 client credentials internally.
     * The LookerClient handles the actual authentication.
     */
    getAuthConfig(): AuthConfig {
        const config: APIKeyConfig = {
            headerName: "Authorization",
            headerTemplate: "Bearer {{api_key}}"
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
            case "listDashboards":
                return await executeListDashboards(client, validatedParams as never);
            case "getDashboard":
                return await executeGetDashboard(client, validatedParams as never);
            case "listLooks":
                return await executeListLooks(client, validatedParams as never);
            case "getLook":
                return await executeGetLook(client, validatedParams as never);
            case "runLook":
                return await executeRunLook(client, validatedParams as never);
            case "runQuery":
                return await executeRunQuery(client, validatedParams as never);
            case "createQuery":
                return await executeCreateQuery(client, validatedParams as never);
            case "listExplores":
                return await executeListExplores(client, validatedParams as never);
            case "runExplore":
                return await executeRunExplore(client, validatedParams as never);
            case "listFolders":
                return await executeListFolders(client, validatedParams as never);
            case "searchContent":
                return await executeSearchContent(client, validatedParams as never);
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
     * Get or create Looker client (with connection pooling)
     *
     * For Looker, we use:
     * - api_key field as the Looker Client ID
     * - api_secret field as the Looker Client Secret
     * - instance_url from connection data for the Looker instance URL
     */
    private getOrCreateClient(connection: ConnectionWithData): LookerClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Create new client
        const data = connection.data as LookerConnectionData;

        if (!data.instance_url) {
            throw new Error(
                "Looker instance URL is required. Please provide it when creating the connection."
            );
        }

        const client = new LookerClient({
            instanceUrl: data.instance_url,
            clientId: data.api_key,
            clientSecret: data.api_secret || ""
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
