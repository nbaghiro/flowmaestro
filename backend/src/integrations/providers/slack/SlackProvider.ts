import crypto from "crypto";
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
    WebhookRequestData,
    WebhookVerificationResult
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

        // Configure webhook settings
        this.setWebhookConfig({
            setupType: "manual",
            signatureType: "timestamp_signature",
            signatureHeader: "X-Slack-Signature",
            timestampHeader: "X-Slack-Request-Timestamp",
            timestampMaxAge: 300 // 5 minutes
        });

        // Register trigger events
        this.registerTrigger({
            id: "message",
            name: "Message",
            description: "Triggered when a new message is posted in a channel",
            requiredScopes: ["channels:history", "channels:read"],
            configFields: [
                {
                    name: "channel",
                    label: "Channel",
                    type: "select",
                    required: false,
                    description: "Filter by specific channel (leave empty for all channels)",
                    dynamicOptions: {
                        operation: "listChannels",
                        labelField: "name",
                        valueField: "id"
                    }
                },
                {
                    name: "includeBot",
                    label: "Include Bot Messages",
                    type: "boolean",
                    required: false,
                    defaultValue: false,
                    description: "Include messages from bots"
                }
            ],
            tags: ["messages", "chat"]
        });

        this.registerTrigger({
            id: "reaction_added",
            name: "Reaction Added",
            description: "Triggered when a reaction is added to a message",
            requiredScopes: ["reactions:read"],
            configFields: [
                {
                    name: "emoji",
                    label: "Emoji",
                    type: "text",
                    required: false,
                    description: "Filter by specific emoji (e.g., thumbsup)",
                    placeholder: "thumbsup"
                }
            ],
            tags: ["reactions", "engagement"]
        });

        this.registerTrigger({
            id: "app_mention",
            name: "App Mention",
            description: "Triggered when your app is mentioned in a message",
            requiredScopes: ["app_mentions:read"],
            configFields: [],
            tags: ["mentions", "bot"]
        });

        this.registerTrigger({
            id: "slash_command",
            name: "Slash Command",
            description: "Triggered when a custom slash command is invoked",
            requiredScopes: ["commands"],
            configFields: [
                {
                    name: "command",
                    label: "Command",
                    type: "text",
                    required: true,
                    description: "The slash command (e.g., /mycommand)",
                    placeholder: "/mycommand"
                }
            ],
            tags: ["commands", "interactive"]
        });

        this.registerTrigger({
            id: "channel_created",
            name: "Channel Created",
            description: "Triggered when a new channel is created",
            requiredScopes: ["channels:read"],
            configFields: [],
            tags: ["channels", "admin"]
        });

        this.registerTrigger({
            id: "member_joined_channel",
            name: "Member Joined Channel",
            description: "Triggered when a user joins a channel",
            requiredScopes: ["channels:read"],
            configFields: [
                {
                    name: "channel",
                    label: "Channel",
                    type: "select",
                    required: false,
                    description: "Filter by specific channel",
                    dynamicOptions: {
                        operation: "listChannels",
                        labelField: "name",
                        valueField: "id"
                    }
                }
            ],
            tags: ["members", "channels"]
        });
    }

    /**
     * Slack-specific timestamp signature verification
     */
    protected verifyTimestampSignature(
        request: WebhookRequestData,
        body: string,
        secret: string
    ): WebhookVerificationResult {
        const timestamp = this.getHeader(request.headers, "X-Slack-Request-Timestamp");
        const signature = this.getHeader(request.headers, "X-Slack-Signature");

        if (!timestamp || !signature) {
            return { valid: false, error: "Missing Slack timestamp or signature" };
        }

        // Check timestamp is not too old (5 minutes)
        const now = Math.floor(Date.now() / 1000);
        if (Math.abs(now - parseInt(timestamp)) > 300) {
            return { valid: false, error: "Slack timestamp too old" };
        }

        // Compute expected signature
        const baseString = `v0:${timestamp}:${body}`;
        const hmac = crypto.createHmac("sha256", secret);
        hmac.update(baseString, "utf-8");
        const computed = `v0=${hmac.digest("hex")}`;

        return {
            valid: this.timingSafeEqual(signature, computed)
        };
    }

    /**
     * Extract event type from Slack webhook
     */
    extractEventType(request: WebhookRequestData): string | undefined {
        try {
            const body = typeof request.body === "string" ? JSON.parse(request.body) : request.body;

            // Events API callback
            if (body.type === "event_callback" && body.event) {
                return body.event.type;
            }

            // Slash command
            if (body.command) {
                return "slash_command";
            }

            // Interactive component
            if (body.type === "block_actions" || body.type === "view_submission") {
                return body.type;
            }

            return body.type;
        } catch {
            return undefined;
        }
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
