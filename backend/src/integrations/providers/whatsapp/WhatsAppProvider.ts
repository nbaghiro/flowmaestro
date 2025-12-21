import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { BaseProvider } from "../../core/BaseProvider";
import { WhatsAppClient } from "./client/WhatsAppClient";
import { WhatsAppMCPAdapter } from "./mcp/WhatsAppMCPAdapter";
import {
    sendTextMessageOperation,
    executeSendTextMessage,
    sendTemplateMessageOperation,
    executeSendTemplateMessage,
    sendMediaMessageOperation,
    executeSendMediaMessage,
    sendReactionOperation,
    executeSendReaction,
    markAsReadOperation,
    executeMarkAsRead,
    getBusinessProfileOperation,
    executeGetBusinessProfile,
    getPhoneNumbersOperation,
    executeGetPhoneNumbers,
    getMessageTemplatesOperation,
    executeGetMessageTemplates
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
 * WhatsApp Business API Provider
 *
 * Implements OAuth2 authentication via Meta's Facebook Login for Business
 * and provides messaging operations for WhatsApp Business API.
 */
export class WhatsAppProvider extends BaseProvider {
    readonly name = "whatsapp";
    readonly displayName = "WhatsApp Business";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true,
        rateLimit: {
            // WhatsApp has tiered rate limits based on phone number quality
            tokensPerMinute: 80,
            burstSize: 10
        }
    };

    private mcpAdapter: WhatsAppMCPAdapter;
    private clientPool: Map<string, WhatsAppClient> = new Map();

    constructor() {
        super();

        // Register messaging operations
        this.registerOperation(sendTextMessageOperation);
        this.registerOperation(sendTemplateMessageOperation);
        this.registerOperation(sendMediaMessageOperation);
        this.registerOperation(sendReactionOperation);
        this.registerOperation(markAsReadOperation);

        // Register account operations
        this.registerOperation(getBusinessProfileOperation);
        this.registerOperation(getPhoneNumbersOperation);
        this.registerOperation(getMessageTemplatesOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new WhatsAppMCPAdapter(this.operations);
    }

    /**
     * Get OAuth configuration for WhatsApp Business
     */
    getAuthConfig(): AuthConfig {
        const config: OAuthConfig = {
            authUrl: "https://www.facebook.com/v21.0/dialog/oauth",
            tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
            scopes: [
                "whatsapp_business_management",
                "whatsapp_business_messaging",
                "business_management"
            ],
            clientId: appConfig.oauth.meta.appId,
            clientSecret: appConfig.oauth.meta.appSecret,
            redirectUri: getOAuthRedirectUri("whatsapp"),
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
            case "sendTextMessage":
                return await executeSendTextMessage(client, validatedParams as never);
            case "sendTemplateMessage":
                return await executeSendTemplateMessage(client, validatedParams as never);
            case "sendMediaMessage":
                return await executeSendMediaMessage(client, validatedParams as never);
            case "sendReaction":
                return await executeSendReaction(client, validatedParams as never);
            case "markAsRead":
                return await executeMarkAsRead(client, validatedParams as never);
            case "getBusinessProfile":
                return await executeGetBusinessProfile(client, validatedParams as never);
            case "getPhoneNumbers":
                return await executeGetPhoneNumbers(client, validatedParams as never);
            case "getMessageTemplates":
                return await executeGetMessageTemplates(client, validatedParams as never);
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
     * Get or create WhatsApp client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): WhatsAppClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Create new client
        const tokens = connection.data as OAuth2TokenData;
        const client = new WhatsAppClient({
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
