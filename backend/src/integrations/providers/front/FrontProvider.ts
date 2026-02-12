/**
 * Front Integration Provider
 *
 * Shared inbox and team collaboration platform with OAuth2 authentication.
 * Supports conversations, comments, tags, inboxes, and contacts.
 *
 * Rate limit: 100 requests/minute (Professional plan)
 */

import { config, getOAuthRedirectUri } from "../../../core/config";
import { BaseProvider } from "../../core/BaseProvider";
import { FrontClient } from "./client/FrontClient";
import { FrontMCPAdapter } from "./mcp/FrontMCPAdapter";
import {
    // Conversation Operations
    listConversationsOperation,
    executeListConversations,
    getConversationOperation,
    executeGetConversation,
    updateConversationOperation,
    executeUpdateConversation,
    // Message Operations
    sendReplyOperation,
    executeSendReply,
    // Comment Operations
    addCommentOperation,
    executeAddComment,
    listCommentsOperation,
    executeListComments,
    // Tag Operations
    addTagOperation,
    executeAddTag,
    removeTagOperation,
    executeRemoveTag,
    // Inbox Operations
    listInboxesOperation,
    executeListInboxes,
    // Contact Operations
    listContactsOperation,
    executeListContacts,
    getContactOperation,
    executeGetContact,
    createContactOperation,
    executeCreateContact
} from "./operations";
import type { ConnectionWithData, OAuth2TokenData } from "../../../storage/models/Connection";
import type {
    AuthConfig,
    ExecutionContext,
    MCPTool,
    OAuthConfig,
    OperationResult,
    ProviderCapabilities
} from "../../core/types";

export class FrontProvider extends BaseProvider {
    readonly name = "front";
    readonly displayName = "Front";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true,
        rateLimit: {
            tokensPerMinute: 100,
            burstSize: 10
        }
    };

    private clientPool: Map<string, FrontClient> = new Map();
    private mcpAdapter: FrontMCPAdapter;

    constructor() {
        super();

        // Register Conversation Operations (3 operations)
        this.registerOperation(listConversationsOperation);
        this.registerOperation(getConversationOperation);
        this.registerOperation(updateConversationOperation);

        // Register Message Operations (1 operation)
        this.registerOperation(sendReplyOperation);

        // Register Comment Operations (2 operations)
        this.registerOperation(addCommentOperation);
        this.registerOperation(listCommentsOperation);

        // Register Tag Operations (2 operations)
        this.registerOperation(addTagOperation);
        this.registerOperation(removeTagOperation);

        // Register Inbox Operations (1 operation)
        this.registerOperation(listInboxesOperation);

        // Register Contact Operations (3 operations)
        this.registerOperation(listContactsOperation);
        this.registerOperation(getContactOperation);
        this.registerOperation(createContactOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new FrontMCPAdapter(this.operations);

        // Configure webhooks
        this.setWebhookConfig({
            setupType: "manual",
            signatureType: "none" // Front uses application webhooks without signatures
        });

        // Register webhook triggers
        this.registerTrigger({
            id: "inbound_message",
            name: "Inbound Message",
            description: "Triggered when a new message is received in an inbox",
            requiredScopes: ["conversation:read"],
            configFields: [
                {
                    name: "inbox_id",
                    label: "Inbox",
                    type: "select",
                    required: false,
                    dynamicOptions: {
                        operation: "listInboxes",
                        labelField: "name",
                        valueField: "id"
                    }
                }
            ],
            tags: ["messages", "inbound"]
        });

        this.registerTrigger({
            id: "outbound_message",
            name: "Outbound Message",
            description: "Triggered when a message is sent from an inbox",
            requiredScopes: ["conversation:read"],
            configFields: [],
            tags: ["messages", "outbound"]
        });

        this.registerTrigger({
            id: "conversation_assigned",
            name: "Conversation Assigned",
            description: "Triggered when a conversation is assigned to a teammate",
            requiredScopes: ["conversation:read"],
            configFields: [],
            tags: ["conversations", "assignment"]
        });

        this.registerTrigger({
            id: "conversation_unassigned",
            name: "Conversation Unassigned",
            description: "Triggered when a conversation assignment is removed",
            requiredScopes: ["conversation:read"],
            configFields: [],
            tags: ["conversations", "assignment"]
        });

        this.registerTrigger({
            id: "conversation_archived",
            name: "Conversation Archived",
            description: "Triggered when a conversation is archived",
            requiredScopes: ["conversation:read"],
            configFields: [],
            tags: ["conversations", "status"]
        });

        this.registerTrigger({
            id: "conversation_reopened",
            name: "Conversation Reopened",
            description: "Triggered when a conversation is reopened",
            requiredScopes: ["conversation:read"],
            configFields: [],
            tags: ["conversations", "status"]
        });

        this.registerTrigger({
            id: "conversation_tagged",
            name: "Conversation Tagged",
            description: "Triggered when a tag is added to a conversation",
            requiredScopes: ["conversation:read", "tag:read"],
            configFields: [],
            tags: ["conversations", "tags"]
        });

        this.registerTrigger({
            id: "comment_added",
            name: "Comment Added",
            description: "Triggered when an internal comment is added to a conversation",
            requiredScopes: ["comment:read"],
            configFields: [],
            tags: ["comments"]
        });
    }

    /**
     * Get OAuth2 configuration
     */
    getAuthConfig(): AuthConfig {
        const oauthConfig: OAuthConfig = {
            authUrl: "https://app.frontapp.com/oauth/authorize",
            tokenUrl: "https://app.frontapp.com/oauth/token",
            scopes: [
                "conversation:read",
                "conversation:write",
                "comment:read",
                "comment:write",
                "contact:read",
                "contact:write",
                "inbox:read",
                "tag:read"
            ],
            clientId: config.oauth.front?.clientId || "",
            clientSecret: config.oauth.front?.clientSecret || "",
            redirectUri: getOAuthRedirectUri("front"),
            refreshable: true
        };
        return oauthConfig;
    }

    /**
     * Execute an operation
     */
    async executeOperation(
        operationId: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData,
        _context: ExecutionContext
    ): Promise<OperationResult> {
        const client = this.getOrCreateClient(connection);

        switch (operationId) {
            // Conversation Operations
            case "listConversations":
                return executeListConversations(client, params as never);
            case "getConversation":
                return executeGetConversation(client, params as never);
            case "updateConversation":
                return executeUpdateConversation(client, params as never);

            // Message Operations
            case "sendReply":
                return executeSendReply(client, params as never);

            // Comment Operations
            case "addComment":
                return executeAddComment(client, params as never);
            case "listComments":
                return executeListComments(client, params as never);

            // Tag Operations
            case "addTag":
                return executeAddTag(client, params as never);
            case "removeTag":
                return executeRemoveTag(client, params as never);

            // Inbox Operations
            case "listInboxes":
                return executeListInboxes(client, params as never);

            // Contact Operations
            case "listContacts":
                return executeListContacts(client, params as never);
            case "getContact":
                return executeGetContact(client, params as never);
            case "createContact":
                return executeCreateContact(client, params as never);

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
     * Get MCP tools for AI agent integration
     */
    getMCPTools(): MCPTool[] {
        return this.mcpAdapter.getTools();
    }

    /**
     * Execute an MCP tool
     */
    async executeMCPTool(
        toolName: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData
    ): Promise<unknown> {
        const client = this.getOrCreateClient(connection);
        const result = await this.mcpAdapter.executeTool(toolName, params, client);

        if (result.success) {
            return result.data;
        } else {
            throw new Error(result.error?.message || "MCP tool execution failed");
        }
    }

    /**
     * Get or create a client for a connection (with caching)
     */
    private getOrCreateClient(connection: ConnectionWithData): FrontClient {
        const poolKey = connection.id;

        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Get access token from connection data
        const data = connection.data as OAuth2TokenData;

        if (!data.access_token) {
            throw new Error("Front access token is required");
        }

        const client = new FrontClient({
            accessToken: data.access_token,
            connectionId: connection.id
        });

        this.clientPool.set(poolKey, client);
        return client;
    }

    /**
     * Clear cached client
     */
    clearClient(connectionId: string): void {
        this.clientPool.delete(connectionId);
    }
}
