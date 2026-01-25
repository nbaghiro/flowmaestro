/**
 * Intercom Integration Provider
 *
 * Customer messaging and engagement platform with OAuth2 authentication.
 * Supports contacts, conversations, companies, tags, and notes management.
 */

import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { BaseProvider } from "../../core/BaseProvider";
import { IntercomClient } from "./client/IntercomClient";
import { IntercomMCPAdapter } from "./mcp/IntercomMCPAdapter";
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
    searchContactsOperation,
    executeSearchContacts,
    // Conversations
    listConversationsOperation,
    executeListConversations,
    getConversationOperation,
    executeGetConversation,
    replyToConversationOperation,
    executeReplyToConversation,
    closeConversationOperation,
    executeCloseConversation,
    assignConversationOperation,
    executeAssignConversation,
    // Companies
    listCompaniesOperation,
    executeListCompanies,
    getCompanyOperation,
    executeGetCompany,
    createOrUpdateCompanyOperation,
    executeCreateOrUpdateCompany,
    // Tags
    listTagsOperation,
    executeListTags,
    tagContactOperation,
    executeTagContact,
    tagConversationOperation,
    executeTagConversation,
    // Notes
    createNoteOperation,
    executeCreateNote,
    listNotesOperation,
    executeListNotes
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

export class IntercomProvider extends BaseProvider {
    readonly name = "intercom";
    readonly displayName = "Intercom";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true,
        rateLimit: {
            tokensPerMinute: 1000,
            burstSize: 100
        }
    };

    private clientPool: Map<string, IntercomClient> = new Map();
    private mcpAdapter: IntercomMCPAdapter;

    constructor() {
        super();

        // Register all operations
        // Contacts
        this.registerOperation(listContactsOperation);
        this.registerOperation(getContactOperation);
        this.registerOperation(createContactOperation);
        this.registerOperation(updateContactOperation);
        this.registerOperation(searchContactsOperation);

        // Conversations
        this.registerOperation(listConversationsOperation);
        this.registerOperation(getConversationOperation);
        this.registerOperation(replyToConversationOperation);
        this.registerOperation(closeConversationOperation);
        this.registerOperation(assignConversationOperation);

        // Companies
        this.registerOperation(listCompaniesOperation);
        this.registerOperation(getCompanyOperation);
        this.registerOperation(createOrUpdateCompanyOperation);

        // Tags
        this.registerOperation(listTagsOperation);
        this.registerOperation(tagContactOperation);
        this.registerOperation(tagConversationOperation);

        // Notes
        this.registerOperation(createNoteOperation);
        this.registerOperation(listNotesOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new IntercomMCPAdapter(this.operations);
    }

    /**
     * Get OAuth2 authentication configuration
     */
    getAuthConfig(): AuthConfig {
        const config: OAuthConfig = {
            authUrl: "https://app.intercom.com/oauth",
            tokenUrl: "https://api.intercom.io/auth/eagle/token",
            scopes: [],
            clientId: appConfig.oauth.intercom?.clientId || "",
            clientSecret: appConfig.oauth.intercom?.clientSecret || "",
            redirectUri: getOAuthRedirectUri("intercom"),
            refreshable: false
        };

        return config;
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
            // Contacts
            case "listContacts":
                return executeListContacts(client, params as never);
            case "getContact":
                return executeGetContact(client, params as never);
            case "createContact":
                return executeCreateContact(client, params as never);
            case "updateContact":
                return executeUpdateContact(client, params as never);
            case "searchContacts":
                return executeSearchContacts(client, params as never);

            // Conversations
            case "listConversations":
                return executeListConversations(client, params as never);
            case "getConversation":
                return executeGetConversation(client, params as never);
            case "replyToConversation":
                return executeReplyToConversation(client, params as never);
            case "closeConversation":
                return executeCloseConversation(client, params as never);
            case "assignConversation":
                return executeAssignConversation(client, params as never);

            // Companies
            case "listCompanies":
                return executeListCompanies(client, params as never);
            case "getCompany":
                return executeGetCompany(client, params as never);
            case "createOrUpdateCompany":
                return executeCreateOrUpdateCompany(client, params as never);

            // Tags
            case "listTags":
                return executeListTags(client, params as never);
            case "tagContact":
                return executeTagContact(client, params as never);
            case "tagConversation":
                return executeTagConversation(client, params as never);

            // Notes
            case "createNote":
                return executeCreateNote(client, params as never);
            case "listNotes":
                return executeListNotes(client, params as never);

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
    private getOrCreateClient(connection: ConnectionWithData): IntercomClient {
        const poolKey = connection.id;

        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        const tokens = connection.data as OAuth2TokenData;
        const client = new IntercomClient({
            accessToken: tokens.access_token,
            connectionId: connection.id
        });

        this.clientPool.set(poolKey, client);
        return client;
    }

    /**
     * Clear cached client (called after token refresh)
     */
    clearClient(connectionId: string): void {
        this.clientPool.delete(connectionId);
    }
}
