import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { BaseProvider } from "../../core/BaseProvider";
import { HootsuiteClient } from "./client/HootsuiteClient";
import { HootsuiteMCPAdapter } from "./mcp/HootsuiteMCPAdapter";
import {
    listSocialProfilesOperation,
    executeListSocialProfiles,
    scheduleMessageOperation,
    executeScheduleMessage,
    getMessageOperation,
    executeGetMessage,
    deleteMessageOperation,
    executeDeleteMessage,
    uploadMediaOperation,
    executeUploadMedia
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
 * Hootsuite Provider - implements OAuth2 authentication for social media management
 */
export class HootsuiteProvider extends BaseProvider {
    readonly name = "hootsuite";
    readonly displayName = "Hootsuite";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: false,
        rateLimit: {
            tokensPerMinute: 100,
            burstSize: 20
        }
    };

    private mcpAdapter: HootsuiteMCPAdapter;
    private clientPool: Map<string, HootsuiteClient> = new Map();

    constructor() {
        super();

        // Register operations
        this.registerOperation(listSocialProfilesOperation);
        this.registerOperation(scheduleMessageOperation);
        this.registerOperation(getMessageOperation);
        this.registerOperation(deleteMessageOperation);
        this.registerOperation(uploadMediaOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new HootsuiteMCPAdapter(this.operations);
    }

    /**
     * Get OAuth configuration
     */
    getAuthConfig(): AuthConfig {
        const config: OAuthConfig = {
            authUrl: "https://platform.hootsuite.com/oauth2/auth",
            tokenUrl: "https://platform.hootsuite.com/oauth2/token",
            scopes: ["offline"], // Required for refresh token
            clientId: appConfig.oauth.hootsuite.clientId,
            clientSecret: appConfig.oauth.hootsuite.clientSecret,
            redirectUri: getOAuthRedirectUri("hootsuite"),
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
            case "listSocialProfiles":
                return await executeListSocialProfiles(client, validatedParams as never);
            case "scheduleMessage":
                return await executeScheduleMessage(client, validatedParams as never);
            case "getMessage":
                return await executeGetMessage(client, validatedParams as never);
            case "deleteMessage":
                return await executeDeleteMessage(client, validatedParams as never);
            case "uploadMedia":
                return await executeUploadMedia(client, validatedParams as never);
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
     * Get or create Hootsuite client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): HootsuiteClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Create new client
        const tokens = connection.data as OAuth2TokenData;
        const client = new HootsuiteClient({
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
