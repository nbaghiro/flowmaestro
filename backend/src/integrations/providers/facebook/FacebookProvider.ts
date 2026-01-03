import crypto from "crypto";
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
    ProviderCapabilities,
    WebhookRequestData,
    WebhookVerificationResult
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

        // Configure webhook settings (Meta Webhooks)
        this.setWebhookConfig({
            setupType: "manual", // Configured in Meta Developer Console
            signatureType: "hmac_sha256",
            signatureHeader: "X-Hub-Signature-256"
        });

        // Register trigger events
        this.registerTrigger({
            id: "message_received",
            name: "Message Received",
            description: "Triggered when a new Facebook Messenger message is received",
            requiredScopes: ["pages_messaging"],
            configFields: [],
            tags: ["messages", "incoming"]
        });

        this.registerTrigger({
            id: "message_delivered",
            name: "Message Delivered",
            description: "Triggered when a sent message is delivered",
            requiredScopes: ["pages_messaging"],
            configFields: [],
            tags: ["messages", "status"]
        });

        this.registerTrigger({
            id: "message_read",
            name: "Message Read",
            description: "Triggered when a sent message is read",
            requiredScopes: ["pages_messaging"],
            configFields: [],
            tags: ["messages", "status"]
        });

        this.registerTrigger({
            id: "page_post",
            name: "Page Post",
            description: "Triggered when a post is made to your page",
            requiredScopes: ["pages_read_user_content"],
            configFields: [],
            tags: ["posts", "page"]
        });

        this.registerTrigger({
            id: "page_comment",
            name: "Comment on Post",
            description: "Triggered when someone comments on a page post",
            requiredScopes: ["pages_read_engagement"],
            configFields: [],
            tags: ["comments", "engagement"]
        });

        this.registerTrigger({
            id: "page_mention",
            name: "Page Mentioned",
            description: "Triggered when your page is mentioned in a post",
            requiredScopes: ["pages_read_engagement"],
            configFields: [],
            tags: ["mentions", "engagement"]
        });

        this.registerTrigger({
            id: "postback",
            name: "Postback",
            description: "Triggered when a user clicks a postback button in Messenger",
            requiredScopes: ["pages_messaging"],
            configFields: [],
            tags: ["buttons", "interactive"]
        });
    }

    /**
     * Meta/Facebook HMAC-SHA256 verification
     */
    override verifyWebhookSignature(
        secret: string,
        request: WebhookRequestData
    ): WebhookVerificationResult {
        const signature = this.getHeader(request.headers, "X-Hub-Signature-256");

        if (!signature) {
            return { valid: false, error: "Missing X-Hub-Signature-256 header" };
        }

        const body = this.getBodyString(request);

        // Meta uses sha256=<signature> format
        let actualSignature = signature;
        if (actualSignature.startsWith("sha256=")) {
            actualSignature = actualSignature.substring(7);
        }

        const hmac = crypto.createHmac("sha256", secret);
        hmac.update(body, "utf-8");
        const computed = hmac.digest("hex");

        return {
            valid: this.timingSafeEqual(actualSignature.toLowerCase(), computed.toLowerCase())
        };
    }

    /**
     * Extract event type from Facebook webhook
     */
    override extractEventType(request: WebhookRequestData): string | undefined {
        try {
            const body = typeof request.body === "string" ? JSON.parse(request.body) : request.body;

            // Facebook webhook payload structure
            const entry = body.entry?.[0];

            // Messaging events
            if (entry?.messaging?.[0]) {
                const messaging = entry.messaging[0];

                if (messaging.message) {
                    return "message_received";
                }
                if (messaging.delivery) {
                    return "message_delivered";
                }
                if (messaging.read) {
                    return "message_read";
                }
                if (messaging.postback) {
                    return "postback";
                }
            }

            // Page events
            const changes = entry?.changes?.[0];
            if (changes) {
                const field = changes.field;
                if (field === "feed") {
                    const value = changes.value;
                    if (value?.item === "post") {
                        return "page_post";
                    }
                    if (value?.item === "comment") {
                        return "page_comment";
                    }
                }
                if (field === "mention") {
                    return "page_mention";
                }
            }

            return undefined;
        } catch {
            return undefined;
        }
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
