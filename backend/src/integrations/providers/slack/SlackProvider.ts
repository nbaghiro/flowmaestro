import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { BaseProvider } from "../../core/BaseProvider";
import { SlackClient } from "./client/SlackClient";
import { SlackMCPAdapter } from "./mcp/SlackMCPAdapter";
import {
    sendMessageOperation,
    executeSendMessage,
    listChannelsOperation,
    executeListChannels
} from "./operations";
import type { ConnectionWithData, OAuth2TokenData } from "../../../storage/models/Connection";
import type {
    AuthConfig,
    ExecutionContext,
    MCPTool,
    OperationResult,
    OAuthConfig,
    ProviderCapabilities,
    TestResult
} from "../../core/types";

/**
 * Slack Provider - implements OAuth2 authentication with multiple operations
 */
export class SlackProvider extends BaseProvider {
    readonly name = "slack";
    readonly displayName = "Slack";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true,
        rateLimit: {
            tokensPerMinute: 60,
            burstSize: 10
        }
    };

    private mcpAdapter: SlackMCPAdapter;
    private clientPool: Map<string, SlackClient> = new Map();

    constructor() {
        super();

        // Register operations
        this.registerOperation(sendMessageOperation);
        this.registerOperation(listChannelsOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new SlackMCPAdapter(this.operations);
    }

    /**
     * Get OAuth configuration
     */
    getAuthConfig(): AuthConfig {
        const config: OAuthConfig = {
            authUrl: "https://slack.com/oauth/v2/authorize",
            tokenUrl: "https://slack.com/api/oauth.v2.access",
            scopes: [
                "chat:write",
                "channels:read",
                "channels:history",
                "files:write",
                "users:read",
                "users:read.email"
            ],
            clientId: appConfig.oauth.slack.clientId,
            clientSecret: appConfig.oauth.slack.clientSecret,
            redirectUri: getOAuthRedirectUri("slack"),
            refreshable: true
        };

        return config;
    }

    /**
     * Test connection
     */
    async testConnection(connection: ConnectionWithData): Promise<TestResult> {
        try {
            const client = this.getOrCreateClient(connection);
            const response = await client.get("/auth.test");

            return {
                success: true,
                message: "Successfully connected to Slack",
                tested_at: new Date().toISOString(),
                details: {
                    teamId: (response as { team_id?: string }).team_id,
                    teamName: (response as { team?: string }).team,
                    userId: (response as { user_id?: string }).user_id
                }
            };
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : "Failed to connect to Slack",
                tested_at: new Date().toISOString()
            };
        }
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
            case "sendMessage":
                return await executeSendMessage(client, validatedParams as never);
            case "listChannels":
                return await executeListChannels(client, validatedParams as never);
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
     * Get or create Slack client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): SlackClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Create new client
        const tokens = connection.data as OAuth2TokenData;
        const client = new SlackClient({
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
