import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { BaseProvider } from "../../core/BaseProvider";
import { DriftClient } from "./client/DriftClient";
import { DriftMCPAdapter } from "./mcp/DriftMCPAdapter";
import {
    // Contacts
    listContactsOperation,
    executeListContacts,
    getContactOperation,
    executeGetContact,
    createContactOperation,
    executeCreateContact,
    updateContactOperation,
    executeUpdateContact,
    deleteContactOperation,
    executeDeleteContact,
    // Conversations
    listConversationsOperation,
    executeListConversations,
    getConversationOperation,
    executeGetConversation,
    createConversationOperation,
    executeCreateConversation,
    getConversationMessagesOperation,
    executeGetConversationMessages,
    sendMessageOperation,
    executeSendMessage,
    // Users
    listUsersOperation,
    executeListUsers,
    getUserOperation,
    executeGetUser,
    // Accounts
    listAccountsOperation,
    executeListAccounts,
    getAccountOperation,
    executeGetAccount
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
 * Drift Provider - implements OAuth2 authentication with conversational marketing operations
 *
 * Features:
 * - Contacts (list, get, create, update, delete)
 * - Conversations (list, get, create, messages, send message)
 * - Users (list, get)
 * - Accounts (list, get)
 */
export class DriftProvider extends BaseProvider {
    readonly name = "drift";
    readonly displayName = "Drift";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true,
        rateLimit: {
            tokensPerMinute: 600,
            burstSize: 10
        }
    };

    private mcpAdapter: DriftMCPAdapter;
    private clientPool: Map<string, DriftClient> = new Map();

    constructor() {
        super();

        // Register contact operations
        this.registerOperation(listContactsOperation);
        this.registerOperation(getContactOperation);
        this.registerOperation(createContactOperation);
        this.registerOperation(updateContactOperation);
        this.registerOperation(deleteContactOperation);

        // Register conversation operations
        this.registerOperation(listConversationsOperation);
        this.registerOperation(getConversationOperation);
        this.registerOperation(createConversationOperation);
        this.registerOperation(getConversationMessagesOperation);
        this.registerOperation(sendMessageOperation);

        // Register user operations
        this.registerOperation(listUsersOperation);
        this.registerOperation(getUserOperation);

        // Register account operations
        this.registerOperation(listAccountsOperation);
        this.registerOperation(getAccountOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new DriftMCPAdapter(this.operations);

        // Configure webhook settings
        this.setWebhookConfig({
            setupType: "manual",
            signatureType: "hmac_sha256",
            signatureHeader: "x-drift-signature"
        });

        // Register triggers
        this.registerTrigger({
            id: "new_conversation",
            name: "New Conversation",
            description: "Triggered when a new conversation is started",
            requiredScopes: ["conversation_read"],
            configFields: [],
            tags: ["conversations"]
        });

        this.registerTrigger({
            id: "new_message",
            name: "New Message",
            description: "Triggered when a new message is received in a conversation",
            requiredScopes: ["conversation_read"],
            configFields: [],
            tags: ["conversations", "messages"]
        });

        this.registerTrigger({
            id: "new_contact",
            name: "New Contact",
            description: "Triggered when a new contact is created",
            requiredScopes: ["contact_read"],
            configFields: [],
            tags: ["contacts"]
        });

        this.registerTrigger({
            id: "contact_identified",
            name: "Contact Identified",
            description: "Triggered when a contact is identified (email captured)",
            requiredScopes: ["contact_read"],
            configFields: [],
            tags: ["contacts"]
        });
    }

    override verifyWebhookSignature(
        _secret: string,
        request: WebhookRequestData
    ): { valid: boolean; error?: string } {
        const signature = this.getHeader(request.headers, "x-drift-signature");

        if (!signature) {
            return {
                valid: false,
                error: "Missing Drift webhook signature header"
            };
        }

        return { valid: true };
    }

    override extractEventType(request: WebhookRequestData): string | undefined {
        try {
            const body = this.getBodyString(request);
            const payload = JSON.parse(body) as { type?: string };
            return payload.type;
        } catch {
            return undefined;
        }
    }

    getAuthConfig(): AuthConfig {
        const oauthConfig: OAuthConfig = {
            authUrl: "https://dev.drift.com/authorize",
            tokenUrl: "https://driftapi.com/oauth2/token",
            scopes: [
                "contact_read",
                "contact_write",
                "conversation_read",
                "conversation_write",
                "user_read",
                "user_write"
            ],
            clientId: appConfig.oauth.drift.clientId,
            clientSecret: appConfig.oauth.drift.clientSecret,
            redirectUri: getOAuthRedirectUri("drift"),
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
            // Contacts
            case "listContacts":
                return await executeListContacts(client, validatedParams as never);
            case "getContact":
                return await executeGetContact(client, validatedParams as never);
            case "createContact":
                return await executeCreateContact(client, validatedParams as never);
            case "updateContact":
                return await executeUpdateContact(client, validatedParams as never);
            case "deleteContact":
                return await executeDeleteContact(client, validatedParams as never);

            // Conversations
            case "listConversations":
                return await executeListConversations(client, validatedParams as never);
            case "getConversation":
                return await executeGetConversation(client, validatedParams as never);
            case "createConversation":
                return await executeCreateConversation(client, validatedParams as never);
            case "getConversationMessages":
                return await executeGetConversationMessages(client, validatedParams as never);
            case "sendMessage":
                return await executeSendMessage(client, validatedParams as never);

            // Users
            case "listUsers":
                return await executeListUsers(client, validatedParams as never);
            case "getUser":
                return await executeGetUser(client, validatedParams as never);

            // Accounts
            case "listAccounts":
                return await executeListAccounts(client, validatedParams as never);
            case "getAccount":
                return await executeGetAccount(client, validatedParams as never);

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

    private getOrCreateClient(connection: ConnectionWithData): DriftClient {
        const poolKey = connection.id;

        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        const tokens = connection.data as OAuth2TokenData;
        const client = new DriftClient({
            accessToken: tokens.access_token
        });

        this.clientPool.set(poolKey, client);
        return client;
    }

    clearClient(connectionId: string): void {
        this.clientPool.delete(connectionId);
    }
}
