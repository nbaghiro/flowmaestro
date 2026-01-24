import { BaseProvider } from "../../core/BaseProvider";
import { MixpanelClient } from "./client/MixpanelClient";
import { MixpanelMCPAdapter } from "./mcp/MixpanelMCPAdapter";
import {
    trackEventOperation,
    executeTrackEvent,
    importEventsOperation,
    executeImportEvents,
    setUserProfileOperation,
    executeSetUserProfile,
    setGroupProfileOperation,
    executeSetGroupProfile
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
 * Mixpanel Provider - implements Project Token authentication
 *
 * Mixpanel uses a project token passed in the request payload:
 * - /track: token in properties object (base64 encoded)
 * - /import: token as query parameter
 * - /engage, /groups: $token in payload (base64 encoded)
 *
 * Rate limits:
 * - ~30,000 events per second
 * - Up to 2GB per minute
 */
export class MixpanelProvider extends BaseProvider {
    readonly name = "mixpanel";
    readonly displayName = "Mixpanel";
    readonly authMethod = "api_key" as const;
    readonly capabilities: ProviderCapabilities = {
        rateLimit: {
            tokensPerMinute: 1800 // Very high limit, Mixpanel handles ~30k/sec
        }
    };

    private mcpAdapter: MixpanelMCPAdapter;
    private clientPool: Map<string, MixpanelClient> = new Map();

    constructor() {
        super();

        // Register operations
        this.registerOperation(trackEventOperation);
        this.registerOperation(importEventsOperation);
        this.registerOperation(setUserProfileOperation);
        this.registerOperation(setGroupProfileOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new MixpanelMCPAdapter(this.operations);
    }

    /**
     * Get API Key configuration
     * Note: Mixpanel doesn't use header auth; token is in payload.
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
            case "importEvents":
                return await executeImportEvents(client, validatedParams as never);
            case "setUserProfile":
                return await executeSetUserProfile(client, validatedParams as never);
            case "setGroupProfile":
                return await executeSetGroupProfile(client, validatedParams as never);
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
     * Get or create Mixpanel client (with connection pooling)
     *
     * For Mixpanel, we use:
     * - api_key field as the Mixpanel Project Token
     */
    private getOrCreateClient(connection: ConnectionWithData): MixpanelClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Create new client
        const data = connection.data as ApiKeyData;
        const client = new MixpanelClient({
            projectToken: data.api_key
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
