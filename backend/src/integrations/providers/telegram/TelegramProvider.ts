import { BaseProvider } from "../../core/BaseProvider";
import { TelegramClient } from "./client/TelegramClient";
import { TelegramMCPAdapter } from "./mcp/TelegramMCPAdapter";
import {
    // Messaging
    sendMessageOperation,
    executeSendMessage,
    sendPhotoOperation,
    executeSendPhoto,
    sendDocumentOperation,
    executeSendDocument,
    forwardMessageOperation,
    executeForwardMessage,
    editMessageTextOperation,
    executeEditMessageText,
    deleteMessageOperation,
    executeDeleteMessage,
    // Data
    getMeOperation,
    executeGetMe,
    getChatOperation,
    executeGetChat
} from "./operations";
import { messageTrigger, editedMessageTrigger, callbackQueryTrigger } from "./triggers";
import type { ConnectionWithData, ApiKeyData } from "../../../storage/models/Connection";
import type {
    AuthConfig,
    ExecutionContext,
    MCPTool,
    OperationResult,
    APIKeyConfig,
    ProviderCapabilities,
    WebhookRequestData,
    WebhookVerificationResult
} from "../../core/types";

/**
 * Telegram Provider - implements Bot Token (API Key) authentication
 *
 * Telegram bots authenticate using a Bot Token obtained from @BotFather.
 * The token is embedded in the API URL path:
 * https://api.telegram.org/bot{token}/{method}
 *
 * Rate limit: ~30 messages per second (conservative estimate)
 */
export class TelegramProvider extends BaseProvider {
    readonly name = "telegram";
    readonly displayName = "Telegram";
    readonly authMethod = "api_key" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true,
        rateLimit: {
            tokensPerMinute: 1800, // ~30/sec
            burstSize: 30
        }
    };

    private mcpAdapter: TelegramMCPAdapter;
    private clientPool: Map<string, TelegramClient> = new Map();

    constructor() {
        super();

        // Register messaging operations
        this.registerOperation(sendMessageOperation);
        this.registerOperation(sendPhotoOperation);
        this.registerOperation(sendDocumentOperation);
        this.registerOperation(forwardMessageOperation);
        this.registerOperation(editMessageTextOperation);
        this.registerOperation(deleteMessageOperation);

        // Register data operations
        this.registerOperation(getMeOperation);
        this.registerOperation(getChatOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new TelegramMCPAdapter(this.operations);

        // Configure webhook settings
        // Telegram uses a secret token in the X-Telegram-Bot-Api-Secret-Token header
        this.setWebhookConfig({
            setupType: "manual",
            signatureType: "bearer_token",
            signatureHeader: "X-Telegram-Bot-Api-Secret-Token"
        });

        // Register triggers
        this.registerTrigger(messageTrigger);
        this.registerTrigger(editedMessageTrigger);
        this.registerTrigger(callbackQueryTrigger);
    }

    /**
     * Verify Telegram webhook signature using bearer token
     * Telegram sends a secret token in the X-Telegram-Bot-Api-Secret-Token header
     */
    override verifyWebhookSignature(
        secret: string,
        request: WebhookRequestData
    ): WebhookVerificationResult {
        const token = this.getHeader(request.headers, "X-Telegram-Bot-Api-Secret-Token");

        if (!token) {
            return { valid: false, error: "Missing X-Telegram-Bot-Api-Secret-Token header" };
        }

        return {
            valid: this.timingSafeEqual(token, secret)
        };
    }

    /**
     * Extract event type from Telegram webhook
     */
    override extractEventType(request: WebhookRequestData): string | undefined {
        try {
            const body = typeof request.body === "string" ? JSON.parse(request.body) : request.body;

            // Check for different update types
            if (body.message) {
                return "message";
            }
            if (body.edited_message) {
                return "edited_message";
            }
            if (body.callback_query) {
                return "callback_query";
            }
            if (body.channel_post) {
                return "channel_post";
            }
            if (body.edited_channel_post) {
                return "edited_channel_post";
            }
            if (body.inline_query) {
                return "inline_query";
            }

            return undefined;
        } catch {
            return undefined;
        }
    }

    /**
     * Get API Key configuration
     * Note: Telegram uses the bot token in the URL path, not a header.
     * This is provided for interface compliance.
     */
    getAuthConfig(): AuthConfig {
        const config: APIKeyConfig = {
            headerName: "Authorization",
            headerTemplate: "Bearer {{api_key}}"
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
            case "sendMessage":
                return await executeSendMessage(client, validatedParams as never);
            case "sendPhoto":
                return await executeSendPhoto(client, validatedParams as never);
            case "sendDocument":
                return await executeSendDocument(client, validatedParams as never);
            case "forwardMessage":
                return await executeForwardMessage(client, validatedParams as never);
            case "editMessageText":
                return await executeEditMessageText(client, validatedParams as never);
            case "deleteMessage":
                return await executeDeleteMessage(client, validatedParams as never);

            // Data
            case "getMe":
                return await executeGetMe(client, validatedParams as never);
            case "getChat":
                return await executeGetChat(client, validatedParams as never);

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
     * Get or create Telegram client (with connection pooling)
     *
     * For Telegram, we use the api_key field as the Bot Token
     */
    private getOrCreateClient(connection: ConnectionWithData): TelegramClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Create new client
        const data = connection.data as ApiKeyData;
        const client = new TelegramClient({
            botToken: data.api_key
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
