import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { BaseProvider } from "../../core/BaseProvider";
import { FacebookClient } from "./client/FacebookClient";
import { FacebookMCPAdapter } from "./mcp/FacebookMCPAdapter";
import {
    // Messaging operations
    sendTextMessageOperation,
    executeSendTextMessage,
    sendButtonTemplateOperation,
    executeSendButtonTemplate,
    sendGenericTemplateOperation,
    executeSendGenericTemplate,
    sendMediaTemplateOperation,
    executeSendMediaTemplate,
    sendQuickRepliesOperation,
    executeSendQuickReplies,
    sendTypingIndicatorOperation,
    executeSendTypingIndicator,
    markAsSeenOperation,
    executeMarkAsSeen,
    getConversationsOperation,
    executeGetConversations,
    getMessagesOperation,
    executeGetMessages,
    // Page operations
    getPageInfoOperation,
    executeGetPageInfo
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
 * Facebook Provider
 *
 * Implements OAuth2 authentication via Meta's Facebook Login for Business
 * and provides messaging operations for Facebook Messenger.
 */
export class FacebookProvider extends BaseProvider {
    readonly name = "facebook";
    readonly displayName = "Facebook";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true,
        rateLimit: {
            tokensPerMinute: 200,
            burstSize: 20
        }
    };

    private mcpAdapter: FacebookMCPAdapter;
    private clientPool: Map<string, FacebookClient> = new Map();

    constructor() {
        super();

        // Register messaging operations
        this.registerOperation(sendTextMessageOperation);
        this.registerOperation(sendButtonTemplateOperation);
        this.registerOperation(sendGenericTemplateOperation);
        this.registerOperation(sendMediaTemplateOperation);
        this.registerOperation(sendQuickRepliesOperation);
        this.registerOperation(sendTypingIndicatorOperation);
        this.registerOperation(markAsSeenOperation);
        this.registerOperation(getConversationsOperation);
        this.registerOperation(getMessagesOperation);

        // Register page operations
        this.registerOperation(getPageInfoOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new FacebookMCPAdapter(this.operations);
    }

    /**
     * Get OAuth configuration for Facebook
     */
    getAuthConfig(): AuthConfig {
        const config: OAuthConfig = {
            authUrl: "https://www.facebook.com/v21.0/dialog/oauth",
            tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
            scopes: [
                "pages_messaging",
                "pages_manage_metadata",
                "pages_show_list",
                "pages_read_engagement",
                "pages_read_user_content"
            ],
            clientId: appConfig.oauth.meta.appId,
            clientSecret: appConfig.oauth.meta.appSecret,
            redirectUri: getOAuthRedirectUri("facebook"),
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
            // Messaging
            case "sendTextMessage":
                return await executeSendTextMessage(client, validatedParams as never);
            case "sendButtonTemplate":
                return await executeSendButtonTemplate(client, validatedParams as never);
            case "sendGenericTemplate":
                return await executeSendGenericTemplate(client, validatedParams as never);
            case "sendMediaTemplate":
                return await executeSendMediaTemplate(client, validatedParams as never);
            case "sendQuickReplies":
                return await executeSendQuickReplies(client, validatedParams as never);
            case "sendTypingIndicator":
                return await executeSendTypingIndicator(client, validatedParams as never);
            case "markAsSeen":
                return await executeMarkAsSeen(client, validatedParams as never);
            case "getConversations":
                return await executeGetConversations(client, validatedParams as never);
            case "getMessages":
                return await executeGetMessages(client, validatedParams as never);

            // Page
            case "getPageInfo":
                return await executeGetPageInfo(client, validatedParams as never);

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
     * Get or create Facebook client (with connection pooling)
     *
     * For Facebook, we use the Page Access Token (not user token) for API operations.
     * The pageAccessToken and pageId are stored in connection.metadata.account_info
     * during the OAuth callback.
     */
    private getOrCreateClient(connection: ConnectionWithData): FacebookClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Get account info from metadata (populated during OAuth callback)
        const accountInfo = connection.metadata?.account_info as
            | {
                  pageAccessToken?: string;
                  pageId?: string;
              }
            | undefined;

        // Prefer Page Access Token for Facebook operations
        // Fall back to user token if page token not available (shouldn't happen in normal flow)
        const tokens = connection.data as OAuth2TokenData;
        const accessToken = accountInfo?.pageAccessToken || tokens.access_token;

        // Create new client with Page token and ID
        const client = new FacebookClient({
            accessToken,
            connectionId: connection.id,
            pageId: accountInfo?.pageId
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
