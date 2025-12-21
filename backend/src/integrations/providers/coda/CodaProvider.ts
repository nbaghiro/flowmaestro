import { BaseProvider } from "../../core/BaseProvider";
import { CodaClient } from "./client/CodaClient";
import { CodaMCPAdapter } from "./mcp/CodaMCPAdapter";
import {
    listDocsOperation,
    executeListDocs,
    getTablesOperation,
    executeGetTables,
    addRowOperation,
    executeAddRow
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
 * Coda Provider - implements API Key authentication with multiple operations
 */
export class CodaProvider extends BaseProvider {
    readonly name = "coda";
    readonly displayName = "Coda";
    readonly authMethod = "api_key" as const;
    readonly capabilities: ProviderCapabilities = {
        rateLimit: {
            tokensPerMinute: 100
        }
    };

    private mcpAdapter: CodaMCPAdapter;
    private clientPool: Map<string, CodaClient> = new Map();

    constructor() {
        super();

        // Register operations
        this.registerOperation(listDocsOperation);
        this.registerOperation(getTablesOperation);
        this.registerOperation(addRowOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new CodaMCPAdapter(this.operations);
    }

    /**
     * Get API Key configuration
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
            case "listDocs":
                return await executeListDocs(client, validatedParams as never);
            case "getTables":
                return await executeGetTables(client, validatedParams as never);
            case "addRow":
                return await executeAddRow(client, validatedParams as never);
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
     * Get or create Coda client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): CodaClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Create new client
        const data = connection.data as ApiKeyData;
        const client = new CodaClient({
            apiKey: data.api_key
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
