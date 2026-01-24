import { BaseProvider } from "../../core/BaseProvider";
import { HeapClient } from "./client/HeapClient";
import { HeapMCPAdapter } from "./mcp/HeapMCPAdapter";
import {
    trackEventOperation,
    executeTrackEvent,
    setUserPropertiesOperation,
    executeSetUserProperties,
    setAccountPropertiesOperation,
    executeSetAccountProperties
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
 * Heap Provider - implements App ID authentication
 *
 * Heap uses an App ID passed in the request body:
 * - /api/track: app_id in body
 * - /api/add_user_properties: app_id in body
 * - /api/add_account_properties: app_id in body
 *
 * Rate limits:
 * - 30 requests per 30 seconds per identity
 */
export class HeapProvider extends BaseProvider {
    readonly name = "heap";
    readonly displayName = "Heap";
    readonly authMethod = "api_key" as const;
    readonly capabilities: ProviderCapabilities = {
        rateLimit: {
            tokensPerMinute: 60 // Conservative: ~1 req/sec per identity
        }
    };

    private mcpAdapter: HeapMCPAdapter;
    private clientPool: Map<string, HeapClient> = new Map();

    constructor() {
        super();

        // Register operations
        this.registerOperation(trackEventOperation);
        this.registerOperation(setUserPropertiesOperation);
        this.registerOperation(setAccountPropertiesOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new HeapMCPAdapter(this.operations);
    }

    /**
     * Get API Key configuration
     * Note: Heap doesn't use header auth; App ID is in payload.
     * This is for interface compliance.
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
            case "trackEvent":
                return await executeTrackEvent(client, validatedParams as never);
            case "setUserProperties":
                return await executeSetUserProperties(client, validatedParams as never);
            case "setAccountProperties":
                return await executeSetAccountProperties(client, validatedParams as never);
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
     * Get or create Heap client (with connection pooling)
     *
     * For Heap, we use:
     * - api_key field as the Heap App ID
     */
    private getOrCreateClient(connection: ConnectionWithData): HeapClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Create new client
        const data = connection.data as ApiKeyData;
        const client = new HeapClient({
            appId: data.api_key
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
