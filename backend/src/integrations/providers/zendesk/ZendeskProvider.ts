import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { BaseProvider } from "../../core/BaseProvider";
import { ZendeskClient } from "./client/ZendeskClient";
import { ZendeskMCPAdapter } from "./mcp/ZendeskMCPAdapter";
import {
    // Ticket Operations
    createTicketOperation,
    executeCreateTicket,
    getTicketOperation,
    executeGetTicket,
    updateTicketOperation,
    executeUpdateTicket,
    deleteTicketOperation,
    executeDeleteTicket,
    listTicketsOperation,
    executeListTickets,
    searchTicketsOperation,
    executeSearchTickets,
    addTicketCommentOperation,
    executeAddTicketComment,
    // User Operations
    createUserOperation,
    executeCreateUser,
    getUserOperation,
    executeGetUser,
    updateUserOperation,
    executeUpdateUser,
    listUsersOperation,
    executeListUsers,
    searchUsersOperation,
    executeSearchUsers,
    getCurrentUserOperation,
    executeGetCurrentUser,
    // Help Center Operations
    listArticlesOperation,
    executeListArticles,
    getArticleOperation,
    executeGetArticle,
    createArticleOperation,
    executeCreateArticle,
    updateArticleOperation,
    executeUpdateArticle,
    listSectionsOperation,
    executeListSections,
    listCategoriesOperation,
    executeListCategories,
    searchArticlesOperation,
    executeSearchArticles
} from "./operations";
import type { ZendeskConnectionData, UserResponse } from "./types";
import type { ConnectionWithData } from "../../../storage/models/Connection";
import type {
    AuthConfig,
    ExecutionContext,
    MCPTool,
    OperationResult,
    OAuthConfig,
    ProviderCapabilities,
    TestResult
} from "../../core/types";

/**
 * Zendesk Provider
 *
 * Implements OAuth 2.0 authentication and provides 20 operations for:
 * - Tickets (create, get, update, delete, list, search, addComment)
 * - Users (create, get, update, list, search, getCurrentUser)
 * - Help Center (articles, sections, categories, search)
 *
 * Rate Limits:
 * - 700 requests/minute for Enterprise plans
 * - 200-400 requests/minute for lower tiers
 *
 * Documentation: https://developer.zendesk.com/api-reference/
 */
export class ZendeskProvider extends BaseProvider {
    readonly name = "zendesk";
    readonly displayName = "Zendesk";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true,
        rateLimit: {
            tokensPerMinute: 400, // Conservative default
            burstSize: 50
        }
    };

    private clientPool: Map<string, ZendeskClient> = new Map();
    private mcpAdapter: ZendeskMCPAdapter;

    constructor() {
        super();

        // Register Ticket Operations (7 operations)
        this.registerOperation(createTicketOperation);
        this.registerOperation(getTicketOperation);
        this.registerOperation(updateTicketOperation);
        this.registerOperation(deleteTicketOperation);
        this.registerOperation(listTicketsOperation);
        this.registerOperation(searchTicketsOperation);
        this.registerOperation(addTicketCommentOperation);

        // Register User Operations (6 operations)
        this.registerOperation(createUserOperation);
        this.registerOperation(getUserOperation);
        this.registerOperation(updateUserOperation);
        this.registerOperation(listUsersOperation);
        this.registerOperation(searchUsersOperation);
        this.registerOperation(getCurrentUserOperation);

        // Register Help Center Operations (7 operations)
        this.registerOperation(listArticlesOperation);
        this.registerOperation(getArticleOperation);
        this.registerOperation(createArticleOperation);
        this.registerOperation(updateArticleOperation);
        this.registerOperation(listSectionsOperation);
        this.registerOperation(listCategoriesOperation);
        this.registerOperation(searchArticlesOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new ZendeskMCPAdapter(this.operations);

        console.log(`[ZendeskProvider] Registered ${this.operations.size} operations`);
    }

    /**
     * Get OAuth configuration
     *
     * Note: Zendesk requires subdomain in OAuth URLs. The authUrl and tokenUrl
     * are templates - {subdomain} must be replaced with the actual subdomain
     * before initiating the OAuth flow.
     */
    getAuthConfig(): AuthConfig {
        const config: OAuthConfig = {
            // Template URLs - subdomain must be injected at runtime
            authUrl: "https://{subdomain}.zendesk.com/oauth/authorizations/new",
            tokenUrl: "https://{subdomain}.zendesk.com/oauth/tokens",
            scopes: [
                "read",
                "write",
                "tickets:read",
                "tickets:write",
                "users:read",
                "users:write",
                "hc:read",
                "hc:write"
            ],
            clientId: appConfig.oauth.zendesk.clientId,
            clientSecret: appConfig.oauth.zendesk.clientSecret,
            redirectUri: getOAuthRedirectUri("zendesk"),
            refreshable: true
        };

        return config;
    }

    /**
     * Test connection by calling /users/me endpoint
     */
    async testConnection(connection: ConnectionWithData): Promise<TestResult> {
        try {
            const client = this.getOrCreateClient(connection);
            const response = await client.get<UserResponse>("/users/me.json");

            return {
                success: true,
                message: `Successfully connected as ${response.user.name}`,
                tested_at: new Date().toISOString(),
                details: {
                    userId: response.user.id,
                    email: response.user.email,
                    role: response.user.role,
                    subdomain: client.getSubdomain()
                }
            };
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : "Failed to connect to Zendesk",
                tested_at: new Date().toISOString()
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
        return this.mcpAdapter.executeTool(toolName, params, client);
    }

    /**
     * Execute operation
     */
    async executeOperation(
        operation: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData,
        _context: ExecutionContext
    ): Promise<OperationResult> {
        const client = this.getOrCreateClient(connection);

        // Route to appropriate operation executor
        switch (operation) {
            // Ticket Operations
            case "createTicket":
                return executeCreateTicket(
                    client,
                    params as Parameters<typeof executeCreateTicket>[1]
                );
            case "getTicket":
                return executeGetTicket(client, params as Parameters<typeof executeGetTicket>[1]);
            case "updateTicket":
                return executeUpdateTicket(
                    client,
                    params as Parameters<typeof executeUpdateTicket>[1]
                );
            case "deleteTicket":
                return executeDeleteTicket(
                    client,
                    params as Parameters<typeof executeDeleteTicket>[1]
                );
            case "listTickets":
                return executeListTickets(
                    client,
                    params as Parameters<typeof executeListTickets>[1]
                );
            case "searchTickets":
                return executeSearchTickets(
                    client,
                    params as Parameters<typeof executeSearchTickets>[1]
                );
            case "addTicketComment":
                return executeAddTicketComment(
                    client,
                    params as Parameters<typeof executeAddTicketComment>[1]
                );

            // User Operations
            case "createUser":
                return executeCreateUser(client, params as Parameters<typeof executeCreateUser>[1]);
            case "getUser":
                return executeGetUser(client, params as Parameters<typeof executeGetUser>[1]);
            case "updateUser":
                return executeUpdateUser(client, params as Parameters<typeof executeUpdateUser>[1]);
            case "listUsers":
                return executeListUsers(client, params as Parameters<typeof executeListUsers>[1]);
            case "searchUsers":
                return executeSearchUsers(
                    client,
                    params as Parameters<typeof executeSearchUsers>[1]
                );
            case "getCurrentUser":
                return executeGetCurrentUser(
                    client,
                    params as Parameters<typeof executeGetCurrentUser>[1]
                );

            // Help Center Operations
            case "listArticles":
                return executeListArticles(
                    client,
                    params as Parameters<typeof executeListArticles>[1]
                );
            case "getArticle":
                return executeGetArticle(client, params as Parameters<typeof executeGetArticle>[1]);
            case "createArticle":
                return executeCreateArticle(
                    client,
                    params as Parameters<typeof executeCreateArticle>[1]
                );
            case "updateArticle":
                return executeUpdateArticle(
                    client,
                    params as Parameters<typeof executeUpdateArticle>[1]
                );
            case "listSections":
                return executeListSections(
                    client,
                    params as Parameters<typeof executeListSections>[1]
                );
            case "listCategories":
                return executeListCategories(
                    client,
                    params as Parameters<typeof executeListCategories>[1]
                );
            case "searchArticles":
                return executeSearchArticles(
                    client,
                    params as Parameters<typeof executeSearchArticles>[1]
                );

            default:
                return {
                    success: false,
                    error: {
                        type: "validation",
                        message: `Unknown operation: ${operation}`,
                        retryable: false
                    }
                };
        }
    }

    /**
     * Get or create HTTP client for connection
     */
    private getOrCreateClient(connection: ConnectionWithData): ZendeskClient {
        const cacheKey = connection.id;

        let client = this.clientPool.get(cacheKey);

        if (!client) {
            // Extract OAuth data and subdomain from connection
            const connectionData = connection.data as ZendeskConnectionData;

            if (!connectionData.access_token) {
                throw new Error("No access token found in connection data");
            }

            // Get subdomain from connection metadata or data
            const subdomain =
                connectionData.subdomain ||
                (connection.metadata as Record<string, unknown>)?.subdomain;

            if (!subdomain || typeof subdomain !== "string") {
                throw new Error("No Zendesk subdomain found in connection data");
            }

            client = new ZendeskClient({
                subdomain,
                accessToken: connectionData.access_token,
                connectionId: connection.id
            });

            this.clientPool.set(cacheKey, client);
            console.log(
                `[ZendeskProvider] Created new client for connection ${connection.id} (subdomain: ${subdomain})`
            );
        }

        return client;
    }

    /**
     * Clear cached client (e.g., after token refresh)
     */
    clearClientCache(connectionId: string): void {
        this.clientPool.delete(connectionId);
        console.log(`[ZendeskProvider] Cleared client cache for connection ${connectionId}`);
    }
}
