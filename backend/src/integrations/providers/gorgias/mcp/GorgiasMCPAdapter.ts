/**
 * Gorgias MCP Adapter
 *
 * Converts Gorgias operations into MCP tools for AI agents
 */

import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import {
    executeListTickets,
    executeGetTicket,
    executeCreateTicket,
    executeUpdateTicket,
    executeSearchTickets,
    executeListCustomers,
    executeGetCustomer,
    executeCreateCustomer,
    executeUpdateCustomer,
    executeListMessages,
    executeCreateMessage,
    executeCreateInternalNote
} from "../operations";
import type { MCPTool, OperationDefinition, OperationResult } from "../../../core/types";
import type { GorgiasClient } from "../client/GorgiasClient";

export class GorgiasMCPAdapter {
    private operations: Map<string, OperationDefinition>;

    constructor(operations: Map<string, OperationDefinition>) {
        this.operations = operations;
    }

    /**
     * Get MCP tools from registered operations
     */
    getTools(): MCPTool[] {
        const tools: MCPTool[] = [];

        // Convert each operation to an MCP tool
        for (const [id, operation] of this.operations.entries()) {
            tools.push({
                name: `gorgias_${id}`,
                description: operation.description,
                inputSchema: toJSONSchema(operation.inputSchema)
            });
        }

        return tools;
    }

    /**
     * Execute MCP tool
     */
    async executeTool(
        toolName: string,
        params: Record<string, unknown>,
        client: GorgiasClient
    ): Promise<OperationResult> {
        // Remove "gorgias_" prefix to get operation ID
        const operationId = toolName.replace("gorgias_", "");

        const operation = this.operations.get(operationId);
        if (!operation) {
            return {
                success: false,
                error: {
                    type: "validation",
                    message: `Unknown MCP tool: ${toolName}`,
                    retryable: false
                }
            };
        }

        // Validate parameters using the operation's schema
        try {
            operation.inputSchema.parse(params);
        } catch (error) {
            return {
                success: false,
                error: {
                    type: "validation",
                    message:
                        error instanceof Error ? error.message : "Invalid parameters for MCP tool",
                    retryable: false
                }
            };
        }

        // Route to appropriate executor
        switch (operationId) {
            // Ticket operations
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

            // Customer operations
            case "listCustomers":
                return executeListCustomers(client, params as never);
            case "getCustomer":
                return executeGetCustomer(client, params as never);
            case "createCustomer":
                return executeCreateCustomer(client, params as never);
            case "updateCustomer":
                return executeUpdateCustomer(client, params as never);

            // Message operations
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
                        message: `Operation not implemented in MCP adapter: ${operationId}`,
                        retryable: false
                    }
                };
        }
    }
}
