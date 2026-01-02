import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { BaseProvider } from "../../core/BaseProvider";
import { DiscordClient } from "./client/DiscordClient";
import {
    sendMessageOperation,
    executeSendMessage,
    listGuildsOperation,
    executeListGuilds,
    listChannelsOperation,
    executeListChannels,
    createWebhookOperation,
    executeCreateWebhook,
    executeWebhookOperation,
    executeExecuteWebhook
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
 * Discord Provider - implements OAuth2 authentication with bot operations
 *
 * Uses a hybrid authentication approach:
 * - OAuth2: For user authentication and listing user's guilds
 * - Bot Token: For server operations (sending messages, managing webhooks)
 */
export class DiscordProvider extends BaseProvider {
    readonly name = "discord";
    readonly displayName = "Discord";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true,
        rateLimit: {
            tokensPerMinute: 50,
            burstSize: 10
        }
    };

    private clientPool: Map<string, DiscordClient> = new Map();

    constructor() {
        super();

        // Register operations
        this.registerOperation(sendMessageOperation);
        this.registerOperation(listGuildsOperation);
        this.registerOperation(listChannelsOperation);
        this.registerOperation(createWebhookOperation);
        this.registerOperation(executeWebhookOperation);
    }

    /**
     * Get OAuth configuration
     */
    getAuthConfig(): AuthConfig {
        const config: OAuthConfig = {
            authUrl: "https://discord.com/oauth2/authorize",
            tokenUrl: "https://discord.com/api/oauth2/token",
            scopes: ["identify", "email", "guilds"],
            clientId: appConfig.oauth.discord.clientId,
            clientSecret: appConfig.oauth.discord.clientSecret,
            redirectUri: getOAuthRedirectUri("discord"),
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
            case "sendMessage":
                return await executeSendMessage(client, validatedParams as never);
            case "listGuilds":
                return await executeListGuilds(client, validatedParams as never);
            case "listChannels":
                return await executeListChannels(client, validatedParams as never);
            case "createWebhook":
                return await executeCreateWebhook(client, validatedParams as never);
            case "executeWebhook":
                return await executeExecuteWebhook(client, validatedParams as never);
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
     * Discord doesn't have MCP adapter yet, return empty array
     */
    getMCPTools(): MCPTool[] {
        return [];
    }

    /**
     * Execute MCP tool
     */
    async executeMCPTool(
        _toolName: string,
        _params: Record<string, unknown>,
        _connection: ConnectionWithData
    ): Promise<unknown> {
        throw new Error("Discord MCP tools not yet implemented");
    }

    /**
     * Get or create Discord client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): DiscordClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Create new client with both OAuth2 token and bot token
        const tokens = connection.data as OAuth2TokenData;
        const client = new DiscordClient({
            accessToken: tokens.access_token,
            botToken: appConfig.oauth.discord.botToken,
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
