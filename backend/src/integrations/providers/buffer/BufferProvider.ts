import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { BaseProvider } from "../../core/BaseProvider";
import { BufferClient } from "./client/BufferClient";
import { BufferMCPAdapter } from "./mcp/BufferMCPAdapter";
import {
    listProfilesOperation,
    executeListProfiles,
    getProfileOperation,
    executeGetProfile,
    createUpdateOperation,
    executeCreateUpdate,
    getUpdateOperation,
    executeGetUpdate,
    getPendingUpdatesOperation,
    executeGetPendingUpdates,
    deleteUpdateOperation,
    executeDeleteUpdate
} from "./operations";
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
 * Buffer Provider - implements OAuth2 authentication for social media management
 */
export class BufferProvider extends BaseProvider {
    readonly name = "buffer";
    readonly displayName = "Buffer";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: false,
        rateLimit: {
            tokensPerMinute: 60,
            burstSize: 10
        }
    };

    private mcpAdapter: BufferMCPAdapter;
    private clientPool: Map<string, BufferClient> = new Map();

    constructor() {
        super();

        // Register operations
        this.registerOperation(listProfilesOperation);
        this.registerOperation(getProfileOperation);
        this.registerOperation(createUpdateOperation);
        this.registerOperation(getUpdateOperation);
        this.registerOperation(getPendingUpdatesOperation);
        this.registerOperation(deleteUpdateOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new BufferMCPAdapter(this.operations);
    }

    /**
     * Get OAuth configuration
     */
    getAuthConfig(): AuthConfig {
        const config: OAuthConfig = {
            authUrl: "https://bufferapp.com/oauth2/authorize",
            tokenUrl: "https://api.bufferapp.com/1/oauth2/token.json",
            scopes: [], // Buffer uses implicit full access, no scopes needed
            clientId: appConfig.oauth.buffer.clientId,
            clientSecret: appConfig.oauth.buffer.clientSecret,
            redirectUri: getOAuthRedirectUri("buffer"),
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
        // Validate parameters
        const validatedParams = this.validateParams(operationId, params);

        // Get or create client
        const client = this.getOrCreateClient(connection);

        // Execute operation
        switch (operationId) {
            case "listProfiles":
                return await executeListProfiles(client, validatedParams as never);
            case "getProfile":
                return await executeGetProfile(client, validatedParams as never);
            case "createUpdate":
                return await executeCreateUpdate(client, validatedParams as never);
            case "getUpdate":
                return await executeGetUpdate(client, validatedParams as never);
            case "getPendingUpdates":
                return await executeGetPendingUpdates(client, validatedParams as never);
            case "deleteUpdate":
                return await executeDeleteUpdate(client, validatedParams as never);
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
     * Get or create Buffer client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): BufferClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Create new client
        const tokens = connection.data as OAuth2TokenData;
        const client = new BufferClient({
            accessToken: tokens.access_token,
            connectionId: connection.id
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
