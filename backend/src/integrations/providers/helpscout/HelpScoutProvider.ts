import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { BaseProvider } from "../../core/BaseProvider";
import { HelpScoutClient } from "./client/HelpScoutClient";
import { HelpScoutMCPAdapter } from "./mcp/HelpScoutMCPAdapter";
import {
    // Conversations
    listConversationsOperation,
    executeListConversations,
    getConversationOperation,
    executeGetConversation,
    createConversationOperation,
    executeCreateConversation,
    updateConversationOperation,
    executeUpdateConversation,
    deleteConversationOperation,
    executeDeleteConversation,
    replyToConversationOperation,
    executeReplyToConversation,
    addNoteToConversationOperation,
    executeAddNoteToConversation,
    updateConversationTagsOperation,
    executeUpdateConversationTags,
    // Customers
    listCustomersOperation,
    executeListCustomers,
    getCustomerOperation,
    executeGetCustomer,
    createCustomerOperation,
    executeCreateCustomer,
    updateCustomerOperation,
    executeUpdateCustomer,
    searchCustomersOperation,
    executeSearchCustomers,
    // Mailboxes
    listMailboxesOperation,
    executeListMailboxes,
    getMailboxOperation,
    executeGetMailbox,
    // Users
    listUsersOperation,
    executeListUsers
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
 * Help Scout Provider - implements OAuth2 authentication with customer support operations
 *
 * Features:
 * - Conversations (list, get, create, update, delete, reply, note, tags)
 * - Customers (list, get, create, update, search)
 * - Mailboxes (list, get)
 * - Users (list)
 */
export class HelpScoutProvider extends BaseProvider {
    readonly name = "helpscout";
    readonly displayName = "Help Scout";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true,
        rateLimit: {
            tokensPerMinute: 400,
            burstSize: 10
        }
    };

    private mcpAdapter: HelpScoutMCPAdapter;
    private clientPool: Map<string, HelpScoutClient> = new Map();

    constructor() {
        super();

        // Register conversation operations
        this.registerOperation(listConversationsOperation);
        this.registerOperation(getConversationOperation);
        this.registerOperation(createConversationOperation);
        this.registerOperation(updateConversationOperation);
        this.registerOperation(deleteConversationOperation);
        this.registerOperation(replyToConversationOperation);
        this.registerOperation(addNoteToConversationOperation);
        this.registerOperation(updateConversationTagsOperation);

        // Register customer operations
        this.registerOperation(listCustomersOperation);
        this.registerOperation(getCustomerOperation);
        this.registerOperation(createCustomerOperation);
        this.registerOperation(updateCustomerOperation);
        this.registerOperation(searchCustomersOperation);

        // Register mailbox operations
        this.registerOperation(listMailboxesOperation);
        this.registerOperation(getMailboxOperation);

        // Register user operations
        this.registerOperation(listUsersOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new HelpScoutMCPAdapter(this.operations);

        // Configure webhook settings
        this.setWebhookConfig({
            setupType: "manual",
            signatureType: "hmac_sha256",
            signatureHeader: "x-helpscout-signature"
        });

        // Register triggers
        this.registerTrigger({
            id: "convo.created",
            name: "Conversation Created",
            description: "Triggered when a new conversation is created",
            requiredScopes: [],
            configFields: [],
            tags: ["conversations"]
        });

        this.registerTrigger({
            id: "convo.customer.reply.created",
            name: "Customer Reply",
            description: "Triggered when a customer replies to a conversation",
            requiredScopes: [],
            configFields: [],
            tags: ["conversations", "replies"]
        });

        this.registerTrigger({
            id: "convo.assigned",
            name: "Conversation Assigned",
            description: "Triggered when a conversation is assigned to a user",
            requiredScopes: [],
            configFields: [],
            tags: ["conversations"]
        });

        this.registerTrigger({
            id: "customer.created",
            name: "Customer Created",
            description: "Triggered when a new customer is created",
            requiredScopes: [],
            configFields: [],
            tags: ["customers"]
        });
    }

    override verifyWebhookSignature(
        _secret: string,
        request: WebhookRequestData
    ): { valid: boolean; error?: string } {
        const signature = this.getHeader(request.headers, "x-helpscout-signature");

        if (!signature) {
            return {
                valid: false,
                error: "Missing Help Scout webhook signature header"
            };
        }

        return { valid: true };
    }

    override extractEventType(request: WebhookRequestData): string | undefined {
        try {
            const body = this.getBodyString(request);
            const payload = JSON.parse(body) as { event?: string };
            return payload.event;
        } catch {
            return undefined;
        }
    }

    getAuthConfig(): AuthConfig {
        const oauthConfig: OAuthConfig = {
            authUrl: "https://secure.helpscout.net/authentication/authorizeClientApplication",
            tokenUrl: "https://api.helpscout.net/v2/oauth2/token",
            scopes: [],
            clientId: appConfig.oauth.helpscout.clientId,
            clientSecret: appConfig.oauth.helpscout.clientSecret,
            redirectUri: getOAuthRedirectUri("helpscout"),
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
            // Conversations
            case "listConversations":
                return await executeListConversations(client, validatedParams as never);
            case "getConversation":
                return await executeGetConversation(client, validatedParams as never);
            case "createConversation":
                return await executeCreateConversation(client, validatedParams as never);
            case "updateConversation":
                return await executeUpdateConversation(client, validatedParams as never);
            case "deleteConversation":
                return await executeDeleteConversation(client, validatedParams as never);
            case "replyToConversation":
                return await executeReplyToConversation(client, validatedParams as never);
            case "addNoteToConversation":
                return await executeAddNoteToConversation(client, validatedParams as never);
            case "updateConversationTags":
                return await executeUpdateConversationTags(client, validatedParams as never);

            // Customers
            case "listCustomers":
                return await executeListCustomers(client, validatedParams as never);
            case "getCustomer":
                return await executeGetCustomer(client, validatedParams as never);
            case "createCustomer":
                return await executeCreateCustomer(client, validatedParams as never);
            case "updateCustomer":
                return await executeUpdateCustomer(client, validatedParams as never);
            case "searchCustomers":
                return await executeSearchCustomers(client, validatedParams as never);

            // Mailboxes
            case "listMailboxes":
                return await executeListMailboxes(client, validatedParams as never);
            case "getMailbox":
                return await executeGetMailbox(client, validatedParams as never);

            // Users
            case "listUsers":
                return await executeListUsers(client, validatedParams as never);

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

    private getOrCreateClient(connection: ConnectionWithData): HelpScoutClient {
        const poolKey = connection.id;

        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        const tokens = connection.data as OAuth2TokenData;
        const client = new HelpScoutClient({
            accessToken: tokens.access_token
        });

        this.clientPool.set(poolKey, client);
        return client;
    }

    clearClient(connectionId: string): void {
        this.clientPool.delete(connectionId);
    }
}
