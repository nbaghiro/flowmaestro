/**
 * Freshdesk Integration Provider
 *
 * Customer support and ticketing software with API Key authentication.
 * Supports tickets, contacts, companies, and agents management.
 */

import { BaseProvider } from "../../core/BaseProvider";
import { FreshdeskClient } from "./client/FreshdeskClient";
import { FreshdeskMCPAdapter } from "./mcp/FreshdeskMCPAdapter";
import {
    // Tickets
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
    addTicketReplyOperation,
    executeAddTicketReply,
    addTicketNoteOperation,
    executeAddTicketNote,
    // Contacts
    createContactOperation,
    executeCreateContact,
    getContactOperation,
    executeGetContact,
    updateContactOperation,
    executeUpdateContact,
    listContactsOperation,
    executeListContacts,
    searchContactsOperation,
    executeSearchContacts,
    // Companies
    createCompanyOperation,
    executeCreateCompany,
    getCompanyOperation,
    executeGetCompany,
    updateCompanyOperation,
    executeUpdateCompany,
    listCompaniesOperation,
    executeListCompanies,
    // Agents
    listAgentsOperation,
    executeListAgents,
    getAgentOperation,
    executeGetAgent,
    getCurrentAgentOperation,
    executeGetCurrentAgent
} from "./operations";
import type { ConnectionWithData, ApiKeyData } from "../../../storage/models/Connection";
import type {
    AuthConfig,
    ExecutionContext,
    MCPTool,
    OperationResult,
    APIKeyConfig,
    ProviderCapabilities
} from "../../core/types";

export class FreshdeskProvider extends BaseProvider {
    readonly name = "freshdesk";
    readonly displayName = "Freshdesk";
    readonly authMethod = "api_key" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true,
        rateLimit: {
            tokensPerMinute: 200,
            burstSize: 50
        }
    };

    private clientPool: Map<string, FreshdeskClient> = new Map();
    private mcpAdapter: FreshdeskMCPAdapter;

    constructor() {
        super();

        // Register all operations
        // Tickets
        this.registerOperation(createTicketOperation);
        this.registerOperation(getTicketOperation);
        this.registerOperation(updateTicketOperation);
        this.registerOperation(deleteTicketOperation);
        this.registerOperation(listTicketsOperation);
        this.registerOperation(searchTicketsOperation);
        this.registerOperation(addTicketReplyOperation);
        this.registerOperation(addTicketNoteOperation);

        // Contacts
        this.registerOperation(createContactOperation);
        this.registerOperation(getContactOperation);
        this.registerOperation(updateContactOperation);
        this.registerOperation(listContactsOperation);
        this.registerOperation(searchContactsOperation);

        // Companies
        this.registerOperation(createCompanyOperation);
        this.registerOperation(getCompanyOperation);
        this.registerOperation(updateCompanyOperation);
        this.registerOperation(listCompaniesOperation);

        // Agents
        this.registerOperation(listAgentsOperation);
        this.registerOperation(getAgentOperation);
        this.registerOperation(getCurrentAgentOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new FreshdeskMCPAdapter(this.operations);
    }

    /**
     * Get API Key authentication configuration
     */
    getAuthConfig(): AuthConfig {
        const config: APIKeyConfig = {
            headerName: "Authorization",
            headerTemplate: "Basic {{base64(api_key + ':X')}}"
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
            // Tickets
            case "createTicket":
                return executeCreateTicket(client, params as never);
            case "getTicket":
                return executeGetTicket(client, params as never);
            case "updateTicket":
                return executeUpdateTicket(client, params as never);
            case "deleteTicket":
                return executeDeleteTicket(client, params as never);
            case "listTickets":
                return executeListTickets(client, params as never);
            case "searchTickets":
                return executeSearchTickets(client, params as never);
            case "addTicketReply":
                return executeAddTicketReply(client, params as never);
            case "addTicketNote":
                return executeAddTicketNote(client, params as never);

            // Contacts
            case "createContact":
                return executeCreateContact(client, params as never);
            case "getContact":
                return executeGetContact(client, params as never);
            case "updateContact":
                return executeUpdateContact(client, params as never);
            case "listContacts":
                return executeListContacts(client, params as never);
            case "searchContacts":
                return executeSearchContacts(client, params as never);

            // Companies
            case "createCompany":
                return executeCreateCompany(client, params as never);
            case "getCompany":
                return executeGetCompany(client, params as never);
            case "updateCompany":
                return executeUpdateCompany(client, params as never);
            case "listCompanies":
                return executeListCompanies(client, params as never);

            // Agents
            case "listAgents":
                return executeListAgents(client, params as never);
            case "getAgent":
                return executeGetAgent(client, params as never);
            case "getCurrentAgent":
                return executeGetCurrentAgent(client, params as never);

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
    private getOrCreateClient(connection: ConnectionWithData): FreshdeskClient {
        const poolKey = connection.id;

        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Get API key from connection data
        const data = connection.data as ApiKeyData;

        // Get subdomain from metadata
        const metadata = connection.metadata as Record<string, unknown> | undefined;
        const subdomain = metadata?.subdomain as string;

        if (!subdomain) {
            throw new Error("Freshdesk subdomain is required");
        }

        const client = new FreshdeskClient({
            apiKey: data.api_key,
            subdomain,
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
