import { BaseProvider } from "../../core/BaseProvider";
import { AmplitudeClient } from "./client/AmplitudeClient";
import { AmplitudeMCPAdapter } from "./mcp/AmplitudeMCPAdapter";
import {
    trackEventOperation,
    executeTrackEvent,
    trackEventsOperation,
    executeTrackEvents,
    identifyUserOperation,
    executeIdentifyUser
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
 * Amplitude Provider - implements API Key + Secret Key authentication
 *
 * Amplitude uses Basic Auth with API Key and Secret Key:
 * - api_key field = Amplitude API Key
 * - api_secret field = Amplitude Secret Key
 * Authorization: Basic base64(api_key:secret_key)
 *
 * Rate limits:
 * - HTTP API: 30 requests/second per project
 * - Batch API: Recommended for high-volume tracking
 */
export class AmplitudeProvider extends BaseProvider {
    readonly name = "amplitude";
    readonly displayName = "Amplitude";
    readonly authMethod = "api_key" as const;
    readonly capabilities: ProviderCapabilities = {
        rateLimit: {
            tokensPerMinute: 600 // Conservative: ~10 req/sec
        }
    };

    private mcpAdapter: AmplitudeMCPAdapter;
    private clientPool: Map<string, AmplitudeClient> = new Map();

    constructor() {
        super();

        // Register operations
        this.registerOperation(trackEventOperation);
        this.registerOperation(trackEventsOperation);
        this.registerOperation(identifyUserOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new AmplitudeMCPAdapter(this.operations);
    }

    /**
     * Get API Key configuration
     * Note: Amplitude uses Basic Auth, not Bearer token.
     * The AmplitudeClient handles the actual authentication.
     */
    getAuthConfig(): AuthConfig {
        const config: APIKeyConfig = {
            headerName: "Authorization",
            headerTemplate: "Basic {{api_key}}"
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
            case "trackEvents":
                return await executeTrackEvents(client, validatedParams as never);
            case "identifyUser":
                return await executeIdentifyUser(client, validatedParams as never);
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
     * Get or create Amplitude client (with connection pooling)
     *
     * For Amplitude, we use:
     * - api_key field as the Amplitude API Key
     * - api_secret field as the Amplitude Secret Key
     */
    private getOrCreateClient(connection: ConnectionWithData): AmplitudeClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Create new client
        const data = connection.data as ApiKeyData;
        const client = new AmplitudeClient({
            apiKey: data.api_key,
            secretKey: data.api_secret || ""
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
