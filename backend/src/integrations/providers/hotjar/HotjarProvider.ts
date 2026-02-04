import { BaseProvider } from "../../core/BaseProvider";
import { HotjarClient } from "./client/HotjarClient";
import { HotjarMCPAdapter } from "./mcp/HotjarMCPAdapter";
import {
    listSurveysOperation,
    executeListSurveys,
    getSurveyResponsesOperation,
    executeGetSurveyResponses,
    userLookupOperation,
    executeUserLookup
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
 * Hotjar Provider - implements API Key + Secret authentication
 *
 * Hotjar uses Client ID + Client Secret (OAuth client credentials flow):
 * - api_key field = Hotjar Client ID
 * - api_secret field = Hotjar Client Secret
 * The HotjarClient internally exchanges these for a Bearer token.
 *
 * Rate limits:
 * - 3,000 requests/minute (50 req/sec)
 */
export class HotjarProvider extends BaseProvider {
    readonly name = "hotjar";
    readonly displayName = "Hotjar";
    readonly authMethod = "api_key" as const;
    readonly capabilities: ProviderCapabilities = {
        rateLimit: {
            tokensPerMinute: 3000
        }
    };

    private mcpAdapter: HotjarMCPAdapter;
    private clientPool: Map<string, HotjarClient> = new Map();

    constructor() {
        super();

        // Register operations
        this.registerOperation(listSurveysOperation);
        this.registerOperation(getSurveyResponsesOperation);
        this.registerOperation(userLookupOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new HotjarMCPAdapter(this.operations);
    }

    /**
     * Get API Key configuration
     * Note: Hotjar uses Bearer token obtained via client credentials.
     * The HotjarClient handles the actual authentication.
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
            case "listSurveys":
                return await executeListSurveys(client, validatedParams as never);
            case "getSurveyResponses":
                return await executeGetSurveyResponses(client, validatedParams as never);
            case "userLookup":
                return await executeUserLookup(client, validatedParams as never);
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
     * Get or create Hotjar client (with connection pooling)
     *
     * For Hotjar, we use:
     * - api_key field as the Hotjar Client ID
     * - api_secret field as the Hotjar Client Secret
     */
    private getOrCreateClient(connection: ConnectionWithData): HotjarClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Create new client
        const data = connection.data as ApiKeyData;
        const client = new HotjarClient({
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
