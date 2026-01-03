import crypto from "crypto";
import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { BaseProvider } from "../../core/BaseProvider";
import { InstagramClient } from "./client/InstagramClient";
import { InstagramMCPAdapter } from "./mcp/InstagramMCPAdapter";
import {
    // Messaging operations
    sendTextMessageOperation,
    executeSendTextMessage,
    sendMediaMessageOperation,
    executeSendMediaMessage,
    sendQuickRepliesOperation,
    executeSendQuickReplies,
    getConversationsOperation,
    executeGetConversations,
    getMessagesOperation,
    executeGetMessages,
    // Publishing operations
    publishPhotoOperation,
    executePublishPhoto,
    publishCarouselOperation,
    executePublishCarousel,
    publishReelOperation,
    executePublishReel,
    publishStoryOperation,
    executePublishStory,
    // Analytics operations
    getMediaInsightsOperation,
    executeGetMediaInsights,
    getAccountInsightsOperation,
    executeGetAccountInsights,
    // Account operations
    getAccountInfoOperation,
    executeGetAccountInfo
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
 * Instagram Provider
 *
 * Implements OAuth2 authentication via Meta's Facebook Login for Business
 * and provides messaging and content publishing operations.
 */
export class InstagramProvider extends BaseProvider {
    readonly name = "instagram";
    readonly displayName = "Instagram";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true,
        rateLimit: {
            tokensPerMinute: 200,
            burstSize: 20
        }
    };

    private mcpAdapter: InstagramMCPAdapter;
    private clientPool: Map<string, InstagramClient> = new Map();

    constructor() {
        super();

        // Register messaging operations
        this.registerOperation(sendTextMessageOperation);
        this.registerOperation(sendMediaMessageOperation);
        this.registerOperation(sendQuickRepliesOperation);
        this.registerOperation(getConversationsOperation);
        this.registerOperation(getMessagesOperation);

        // Register publishing operations
        this.registerOperation(publishPhotoOperation);
        this.registerOperation(publishCarouselOperation);
        this.registerOperation(publishReelOperation);
        this.registerOperation(publishStoryOperation);

        // Register analytics operations
        this.registerOperation(getMediaInsightsOperation);
        this.registerOperation(getAccountInsightsOperation);

        // Register account operations
        this.registerOperation(getAccountInfoOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new InstagramMCPAdapter(this.operations);

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
            description: "Triggered when a new Instagram Direct message is received",
            requiredScopes: ["instagram_manage_messages"],
            configFields: [],
            tags: ["messages", "incoming"]
        });

        this.registerTrigger({
            id: "comment_received",
            name: "Comment Received",
            description: "Triggered when someone comments on your posts",
            requiredScopes: ["instagram_basic", "pages_read_engagement"],
            configFields: [],
            tags: ["comments", "engagement"]
        });

        this.registerTrigger({
            id: "mention",
            name: "Mentioned",
            description: "Triggered when your account is mentioned in a post or story",
            requiredScopes: ["instagram_basic"],
            configFields: [],
            tags: ["mentions", "engagement"]
        });

        this.registerTrigger({
            id: "story_reply",
            name: "Story Reply",
            description: "Triggered when someone replies to your story",
            requiredScopes: ["instagram_manage_messages"],
            configFields: [],
            tags: ["stories", "messages"]
        });

        this.registerTrigger({
            id: "story_mention",
            name: "Story Mention",
            description: "Triggered when your account is mentioned in someone's story",
            requiredScopes: ["instagram_basic"],
            configFields: [],
            tags: ["stories", "mentions"]
        });
    }

    /**
     * Meta/Instagram HMAC-SHA256 verification
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
     * Extract event type from Instagram webhook
     */
    override extractEventType(request: WebhookRequestData): string | undefined {
        try {
            const body = typeof request.body === "string" ? JSON.parse(request.body) : request.body;

            // Instagram webhook payload structure
            const entry = body.entry?.[0];
            const changes = entry?.changes?.[0];
            const field = changes?.field;

            // Map Meta field names to our trigger IDs
            switch (field) {
                case "messages":
                    return "message_received";
                case "comments":
                    return "comment_received";
                case "mentions":
                    return "mention";
                case "story_insights":
                case "story_replies":
                    return "story_reply";
                case "story_mentions":
                    return "story_mention";
                default:
                    return field || undefined;
            }
        } catch {
            return undefined;
        }
    }

    /**
     * Get OAuth configuration for Instagram
     */
    getAuthConfig(): AuthConfig {
        const config: OAuthConfig = {
            authUrl: "https://www.facebook.com/v21.0/dialog/oauth",
            tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
            scopes: [
                "instagram_basic",
                "instagram_manage_messages",
                "instagram_content_publish",
                "pages_messaging",
                "pages_manage_metadata",
                "pages_show_list",
                "pages_read_engagement"
            ],
            clientId: appConfig.oauth.meta.appId,
            clientSecret: appConfig.oauth.meta.appSecret,
            redirectUri: getOAuthRedirectUri("instagram"),
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
            case "sendMediaMessage":
                return await executeSendMediaMessage(client, validatedParams as never);
            case "sendQuickReplies":
                return await executeSendQuickReplies(client, validatedParams as never);
            case "getConversations":
                return await executeGetConversations(client, validatedParams as never);
            case "getMessages":
                return await executeGetMessages(client, validatedParams as never);

            // Publishing
            case "publishPhoto":
                return await executePublishPhoto(client, validatedParams as never);
            case "publishCarousel":
                return await executePublishCarousel(client, validatedParams as never);
            case "publishReel":
                return await executePublishReel(client, validatedParams as never);
            case "publishStory":
                return await executePublishStory(client, validatedParams as never);

            // Analytics
            case "getMediaInsights":
                return await executeGetMediaInsights(client, validatedParams as never);
            case "getAccountInsights":
                return await executeGetAccountInsights(client, validatedParams as never);

            // Account
            case "getAccountInfo":
                return await executeGetAccountInfo(client, validatedParams as never);

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
     * Get or create Instagram client (with connection pooling)
     *
     * For Instagram, we use the Page Access Token (not user token) for API operations.
     * The pageAccessToken and account IDs are stored in connection.metadata.account_info
     * during the OAuth callback.
     */
    private getOrCreateClient(connection: ConnectionWithData): InstagramClient {
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
                  instagramAccountId?: string;
              }
            | undefined;

        // Prefer Page Access Token for Instagram operations
        // Fall back to user token if page token not available (shouldn't happen in normal flow)
        const tokens = connection.data as OAuth2TokenData;
        const accessToken = accountInfo?.pageAccessToken || tokens.access_token;

        // Create new client with Page token and IDs
        const client = new InstagramClient({
            accessToken,
            connectionId: connection.id,
            pageId: accountInfo?.pageId,
            igAccountId: accountInfo?.instagramAccountId
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
