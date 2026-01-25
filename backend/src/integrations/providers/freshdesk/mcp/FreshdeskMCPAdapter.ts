/**
 * Freshdesk MCP (Model Context Protocol) Adapter
 *
 * Exposes Freshdesk operations as MCP tools for AI agent integration
 */

import {
    // Tickets
    executeCreateTicket,
    executeGetTicket,
    executeUpdateTicket,
    executeDeleteTicket,
    executeListTickets,
    executeSearchTickets,
    executeAddTicketReply,
    executeAddTicketNote,
    // Contacts
    executeCreateContact,
    executeGetContact,
    executeUpdateContact,
    executeListContacts,
    executeSearchContacts,
    // Companies
    executeCreateCompany,
    executeGetCompany,
    executeUpdateCompany,
    executeListCompanies,
    // Agents
    executeListAgents,
    executeGetAgent,
    executeGetCurrentAgent
} from "../operations";
import type { OperationDefinition, MCPTool, OperationResult } from "../../../core/types";
import type { FreshdeskClient } from "../client/FreshdeskClient";

export class FreshdeskMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    /**
     * Convert all operations to MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `freshdesk_${op.id}`,
            description: op.description,
            inputSchema: op.inputSchemaJSON
        }));
    }

    /**
     * Execute an MCP tool
     */
    async executeTool(
        toolName: string,
        params: Record<string, unknown>,
        client: FreshdeskClient
    ): Promise<OperationResult> {
        // Extract operation ID from tool name
        const operationId = toolName.replace(/^freshdesk_/, "");

        // Route to appropriate executor
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
                        message: `Unknown Freshdesk operation: ${operationId}`,
                        retryable: false
                    }
                };
        }
    }
}
