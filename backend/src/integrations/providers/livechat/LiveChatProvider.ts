import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { BaseProvider } from "../../core/BaseProvider";
import { LiveChatClient } from "./client/LiveChatClient";
import { LiveChatMCPAdapter } from "./mcp/LiveChatMCPAdapter";
import {
    // Chats
    listChatsOperation,
    executeListChats,
    getChatOperation,
    executeGetChat,
    listArchivesOperation,
    executeListArchives,
    startChatOperation,
    executeStartChat,
    sendEventOperation,
    executeSendEvent,
    transferChatOperation,
    executeTransferChat,
    deactivateChatOperation,
    executeDeactivateChat,
    // Customers
    getCustomerOperation,
    executeGetCustomer,
    updateCustomerOperation,
    executeUpdateCustomer,
    banCustomerOperation,
    executeBanCustomer,
    // Agents
    listAgentsOperation,
    executeListAgents,
    setRoutingStatusOperation,
    executeSetRoutingStatus,
    // Tags
    tagThreadOperation,
    executeTagThread,
    untagThreadOperation,
    executeUntagThread
} from "./operations";
import type { ConnectionWithData, OAuth2TokenData } from "../../../storage/models/Connection";
import type {
    AuthConfig,
    ExecutionContext,
    MCPTool,
    OperationResult,
    OAuthConfig,
    ProviderCapabilities,
    WebhookRequestData
} from "../../core/types";

/**
 * LiveChat Provider - implements OAuth2 authentication with chat operations
 *
 * Features:
 * - Chats (list, get, archives, start, send event, transfer, deactivate)
 * - Customers (get, update, ban)
 * - Agents (list, set routing status)
 * - Tags (tag thread, untag thread)
 */
export class LiveChatProvider extends BaseProvider {
    readonly name = "livechat";
    readonly displayName = "LiveChat";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true,
        rateLimit: {
            tokensPerMinute: 180,
            burstSize: 10
        }
    };

    private mcpAdapter: LiveChatMCPAdapter;
    private clientPool: Map<string, LiveChatClient> = new Map();

    constructor() {
        super();

        // Register chat operations
        this.registerOperation(listChatsOperation);
        this.registerOperation(getChatOperation);
        this.registerOperation(listArchivesOperation);
        this.registerOperation(startChatOperation);
        this.registerOperation(sendEventOperation);
        this.registerOperation(transferChatOperation);
        this.registerOperation(deactivateChatOperation);

        // Register customer operations
        this.registerOperation(getCustomerOperation);
        this.registerOperation(updateCustomerOperation);
        this.registerOperation(banCustomerOperation);

        // Register agent operations
        this.registerOperation(listAgentsOperation);
        this.registerOperation(setRoutingStatusOperation);

        // Register tag operations
        this.registerOperation(tagThreadOperation);
        this.registerOperation(untagThreadOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new LiveChatMCPAdapter(this.operations);

        // Configure webhook settings
        this.setWebhookConfig({
            setupType: "manual",
            signatureType: "hmac_sha256",
            signatureHeader: "x-livechat-signature"
        });

        // Register triggers
        this.registerTrigger({
            id: "incoming_chat",
            name: "Incoming Chat",
            description: "Triggered when a new chat starts",
            requiredScopes: ["chats--all:ro"],
            configFields: [],
            tags: ["chats"]
        });

        this.registerTrigger({
            id: "incoming_event",
            name: "Incoming Event",
            description: "Triggered when a new message event is received in a chat",
            requiredScopes: ["chats--all:ro"],
            configFields: [],
            tags: ["chats", "messages"]
        });

        this.registerTrigger({
            id: "chat_deactivated",
            name: "Chat Deactivated",
            description: "Triggered when a chat is closed",
            requiredScopes: ["chats--all:ro"],
            configFields: [],
            tags: ["chats"]
        });
    }

    override verifyWebhookSignature(
        _secret: string,
        request: WebhookRequestData
    ): { valid: boolean; error?: string } {
        const signature = this.getHeader(request.headers, "x-livechat-signature");

        if (!signature) {
            return {
                valid: false,
                error: "Missing LiveChat webhook signature header"
            };
        }

        return { valid: true };
    }

    override extractEventType(request: WebhookRequestData): string | undefined {
        try {
            const body = this.getBodyString(request);
            const payload = JSON.parse(body) as { action?: string };
            return payload.action;
        } catch {
            return undefined;
        }
    }

    getAuthConfig(): AuthConfig {
        const oauthConfig: OAuthConfig = {
            authUrl: "https://accounts.livechat.com/",
            tokenUrl: "https://accounts.livechat.com/v2/token",
            scopes: [
                "chats--all:ro",
                "chats--access:rw",
                "chats--all:rw",
                "agents--all:ro",
                "agents--my:ro",
                "customers:ro",
                "customers:rw",
                "tags--all:ro",
                "tags--all:rw",
                "groups--all:ro"
            ],
            clientId: appConfig.oauth.livechat.clientId,
            clientSecret: appConfig.oauth.livechat.clientSecret,
            redirectUri: getOAuthRedirectUri("livechat"),
            refreshable: true
        };

        return oauthConfig;
    }

    async executeOperation(
        operationId: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData,
        _context: ExecutionContext
    ): Promise<OperationResult> {
        const validatedParams = this.validateParams(operationId, params);
        const client = this.getOrCreateClient(connection);

        switch (operationId) {
            // Chats
            case "listChats":
                return await executeListChats(client, validatedParams as never);
            case "getChat":
                return await executeGetChat(client, validatedParams as never);
            case "listArchives":
                return await executeListArchives(client, validatedParams as never);
            case "startChat":
                return await executeStartChat(client, validatedParams as never);
            case "sendEvent":
                return await executeSendEvent(client, validatedParams as never);
            case "transferChat":
                return await executeTransferChat(client, validatedParams as never);
            case "deactivateChat":
                return await executeDeactivateChat(client, validatedParams as never);

            // Customers
            case "getCustomer":
                return await executeGetCustomer(client, validatedParams as never);
            case "updateCustomer":
                return await executeUpdateCustomer(client, validatedParams as never);
            case "banCustomer":
                return await executeBanCustomer(client, validatedParams as never);

            // Agents
            case "listAgents":
                return await executeListAgents(client, validatedParams as never);
            case "setRoutingStatus":
                return await executeSetRoutingStatus(client, validatedParams as never);

            // Tags
            case "tagThread":
                return await executeTagThread(client, validatedParams as never);
            case "untagThread":
                return await executeUntagThread(client, validatedParams as never);

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

    getMCPTools(): MCPTool[] {
        return this.mcpAdapter.getTools();
    }

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

    private getOrCreateClient(connection: ConnectionWithData): LiveChatClient {
        const poolKey = connection.id;

        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        const tokens = connection.data as OAuth2TokenData;
        const client = new LiveChatClient({
            accessToken: tokens.access_token
        });

        this.clientPool.set(poolKey, client);
        return client;
    }

    clearClient(connectionId: string): void {
        this.clientPool.delete(connectionId);
    }
}
