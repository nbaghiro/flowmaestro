import crypto from "crypto";
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
    ProviderCapabilities,
    WebhookRequestData,
    WebhookVerificationResult
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

        // Configure webhook settings
        this.setWebhookConfig({
            setupType: "manual", // Discord interactions endpoint configured in developer portal
            signatureType: "ed25519",
            signatureHeader: "X-Signature-Ed25519",
            timestampHeader: "X-Signature-Timestamp"
        });

        // Register trigger events
        this.registerTrigger({
            id: "message_create",
            name: "Message Received",
            description: "Triggered when a message is sent in a channel",
            requiredScopes: ["identify", "guilds"],
            configFields: [
                {
                    name: "guildId",
                    label: "Server",
                    type: "select",
                    required: true,
                    description: "Select the Discord server to monitor",
                    dynamicOptions: {
                        operation: "listGuilds",
                        labelField: "name",
                        valueField: "id"
                    }
                },
                {
                    name: "channelId",
                    label: "Channel",
                    type: "select",
                    required: false,
                    description: "Filter by specific channel (leave empty for all channels)",
                    dynamicOptions: {
                        operation: "listChannels",
                        labelField: "name",
                        valueField: "id"
                    }
                }
            ],
            tags: ["messages", "chat"]
        });

        this.registerTrigger({
            id: "interaction_create",
            name: "Slash Command",
            description: "Triggered when a slash command is invoked",
            requiredScopes: ["identify", "guilds"],
            configFields: [
                {
                    name: "commandName",
                    label: "Command Name",
                    type: "text",
                    required: true,
                    description: "The slash command name to listen for",
                    placeholder: "/mycommand"
                }
            ],
            tags: ["commands", "interactive"]
        });

        this.registerTrigger({
            id: "member_join",
            name: "Member Joined",
            description: "Triggered when a new member joins the server",
            requiredScopes: ["identify", "guilds"],
            configFields: [
                {
                    name: "guildId",
                    label: "Server",
                    type: "select",
                    required: true,
                    description: "Select the Discord server to monitor",
                    dynamicOptions: {
                        operation: "listGuilds",
                        labelField: "name",
                        valueField: "id"
                    }
                }
            ],
            tags: ["members", "join"]
        });

        this.registerTrigger({
            id: "member_leave",
            name: "Member Left",
            description: "Triggered when a member leaves the server",
            requiredScopes: ["identify", "guilds"],
            configFields: [
                {
                    name: "guildId",
                    label: "Server",
                    type: "select",
                    required: true,
                    description: "Select the Discord server to monitor",
                    dynamicOptions: {
                        operation: "listGuilds",
                        labelField: "name",
                        valueField: "id"
                    }
                }
            ],
            tags: ["members", "leave"]
        });

        this.registerTrigger({
            id: "reaction_add",
            name: "Reaction Added",
            description: "Triggered when a reaction is added to a message",
            requiredScopes: ["identify", "guilds"],
            configFields: [
                {
                    name: "guildId",
                    label: "Server",
                    type: "select",
                    required: true,
                    description: "Select the Discord server to monitor",
                    dynamicOptions: {
                        operation: "listGuilds",
                        labelField: "name",
                        valueField: "id"
                    }
                },
                {
                    name: "emoji",
                    label: "Emoji",
                    type: "text",
                    required: false,
                    description: "Filter by specific emoji (leave empty for all)",
                    placeholder: "👍"
                }
            ],
            tags: ["reactions", "engagement"]
        });
    }

    /**
     * Discord Ed25519 signature verification
     */
    override verifyWebhookSignature(
        secret: string,
        request: WebhookRequestData
    ): WebhookVerificationResult {
        const signature = this.getHeader(request.headers, "X-Signature-Ed25519");
        const timestamp = this.getHeader(request.headers, "X-Signature-Timestamp");

        if (!signature || !timestamp) {
            return { valid: false, error: "Missing Discord signature headers" };
        }

        const body = this.getBodyString(request);
        const message = timestamp + body;

        try {
            // Discord uses Ed25519 signatures
            const isValid = crypto.verify(
                null,
                Buffer.from(message),
                {
                    key: Buffer.from(secret, "hex"),
                    format: "der",
                    type: "spki"
                },
                Buffer.from(signature, "hex")
            );

            return { valid: isValid };
        } catch {
            return { valid: false, error: "Ed25519 verification failed" };
        }
    }

    /**
     * Extract event type from Discord webhook
     */
    override extractEventType(request: WebhookRequestData): string | undefined {
        try {
            const body = typeof request.body === "string" ? JSON.parse(request.body) : request.body;

            // Discord sends type field: 1 = PING, 2 = APPLICATION_COMMAND, etc.
            if (body.type === 1) {
                return "ping";
            }
            if (body.type === 2) {
                return "interaction_create";
            }
            if (body.t) {
                // Gateway event type
                return body.t.toLowerCase();
            }

            return undefined;
        } catch {
            return undefined;
        }
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
