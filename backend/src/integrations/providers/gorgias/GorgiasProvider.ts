/**
 * Gorgias Integration Provider
 *
 * E-commerce helpdesk platform with OAuth 2.0 authentication.
 * Uses subdomain-based API endpoints (e.g., acme.gorgias.com).
 */

import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { BaseProvider } from "../../core/BaseProvider";
import { GorgiasClient } from "./client/GorgiasClient";
import { GorgiasMCPAdapter } from "./mcp/GorgiasMCPAdapter";
import {
    // Ticket Operations
    listTicketsOperation,
    executeListTickets,
    getTicketOperation,
    executeGetTicket,
    createTicketOperation,
    executeCreateTicket,
    updateTicketOperation,
    executeUpdateTicket,
    searchTicketsOperation,
    executeSearchTickets,
    // Customer Operations
    listCustomersOperation,
    executeListCustomers,
    getCustomerOperation,
    executeGetCustomer,
    createCustomerOperation,
    executeCreateCustomer,
    updateCustomerOperation,
    executeUpdateCustomer,
    // Message Operations
    listMessagesOperation,
    executeListMessages,
    createMessageOperation,
    executeCreateMessage,
    createInternalNoteOperation,
    executeCreateInternalNote
} from "./operations";
import type { GorgiasConnectionData } from "./types";
import type { ConnectionWithData } from "../../../storage/models/Connection";
import type {
    AuthConfig,
    ExecutionContext,
    MCPTool,
    OperationResult,
    OAuthConfig,
    ProviderCapabilities
} from "../../core/types";

export class GorgiasProvider extends BaseProvider {
    readonly name = "gorgias";
    readonly displayName = "Gorgias";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true,
        rateLimit: {
            // 80 requests/20 seconds = 240/minute
            tokensPerMinute: 240,
            burstSize: 80
        }
    };

    private clientPool: Map<string, GorgiasClient> = new Map();
    private mcpAdapter: GorgiasMCPAdapter;

    constructor() {
        super();

        // Register Ticket Operations (5)
        this.registerOperation(listTicketsOperation);
        this.registerOperation(getTicketOperation);
        this.registerOperation(createTicketOperation);
        this.registerOperation(updateTicketOperation);
        this.registerOperation(searchTicketsOperation);

        // Register Customer Operations (4)
        this.registerOperation(listCustomersOperation);
        this.registerOperation(getCustomerOperation);
        this.registerOperation(createCustomerOperation);
        this.registerOperation(updateCustomerOperation);

        // Register Message Operations (3)
        this.registerOperation(listMessagesOperation);
        this.registerOperation(createMessageOperation);
        this.registerOperation(createInternalNoteOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new GorgiasMCPAdapter(this.operations);
    }

    /**
     * Get OAuth configuration
     *
     * Note: Gorgias requires subdomain in OAuth URLs. The authUrl and tokenUrl
     * are templates - {subdomain} must be replaced with the actual subdomain
     * before initiating the OAuth flow.
     */
    getAuthConfig(): AuthConfig {
        const config: OAuthConfig = {
            // Template URLs - subdomain must be injected at runtime
            authUrl: "https://{subdomain}.gorgias.com/oauth/authorize",
            tokenUrl: "https://{subdomain}.gorgias.com/oauth/token",
            scopes: [
                "openid",
                "offline", // For refresh tokens
                "tickets:read",
                "tickets:write",
                "customers:read",
                "customers:write",
                "users:read"
            ],
            clientId: appConfig.oauth.gorgias.clientId,
            clientSecret: appConfig.oauth.gorgias.clientSecret,
            redirectUri: getOAuthRedirectUri("gorgias"),
            refreshable: true
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
            // Ticket Operations
            case "listTickets":
                return executeListTickets(client, params as never);
            case "getTicket":
                return executeGetTicket(client, params as never);
            case "createTicket":
                return executeCreateTicket(client, params as never);
            case "updateTicket":
                return executeUpdateTicket(client, params as never);
            case "searchTickets":
                return executeSearchTickets(client, params as never);

            // Customer Operations
            case "listCustomers":
                return executeListCustomers(client, params as never);
            case "getCustomer":
                return executeGetCustomer(client, params as never);
            case "createCustomer":
                return executeCreateCustomer(client, params as never);
            case "updateCustomer":
                return executeUpdateCustomer(client, params as never);

            // Message Operations
            case "listMessages":
                return executeListMessages(client, params as never);
            case "createMessage":
                return executeCreateMessage(client, params as never);
            case "createInternalNote":
                return executeCreateInternalNote(client, params as never);

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
    private getOrCreateClient(connection: ConnectionWithData): GorgiasClient {
        const poolKey = connection.id;

        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Get OAuth data and subdomain from connection
        const connectionData = connection.data as GorgiasConnectionData;

        if (!connectionData.access_token) {
            throw new Error("No access token found in connection data");
        }

        // Get subdomain from connection data or metadata
        const subdomain =
            connectionData.subdomain || (connection.metadata as Record<string, unknown>)?.subdomain;

        if (!subdomain || typeof subdomain !== "string") {
            throw new Error("No Gorgias subdomain found in connection data");
        }

        const client = new GorgiasClient({
            subdomain,
            accessToken: connectionData.access_token,
            connectionId: connection.id
        });

        this.clientPool.set(poolKey, client);
        return client;
    }

    /**
     * Clear cached client (e.g., after token refresh)
     */
    clearClientCache(connectionId: string): void {
        this.clientPool.delete(connectionId);
    }
}
