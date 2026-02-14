/**
 * Crisp MCP (Model Context Protocol) Adapter
 *
 * Exposes Crisp operations as MCP tools for AI agent integration
 */

import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import {
    // Conversations
    executeListConversations,
    executeGetConversation,
    executeCreateConversation,
    executeChangeConversationState,
    executeGetMessages,
    executeSendMessage,
    executeSearchConversations,
    executeAddNote,
    // People
    executeListPeople,
    executeGetPerson,
    executeCreatePerson,
    executeUpdatePerson,
    // Operators
    executeListOperators,
    executeGetOperatorAvailability,
    executeAssignConversation,
    executeUnassignConversation
} from "../operations";
import type { OperationDefinition, MCPTool, OperationResult } from "../../../core/types";
import type { CrispClient } from "../client/CrispClient";

export class CrispMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    /**
     * Convert all operations to MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `crisp_${op.id}`,
            description: op.description,
            inputSchema: toJSONSchema(op.inputSchema)
        }));
    }

    /**
     * Execute an MCP tool
     */
    async executeTool(
        toolName: string,
        params: Record<string, unknown>,
        client: CrispClient
    ): Promise<OperationResult> {
        // Extract operation ID from tool name
        const operationId = toolName.replace(/^crisp_/, "");

        // Route to appropriate executor
        switch (operationId) {
            // Conversations
            case "listConversations":
                return executeListConversations(client, params as never);
            case "getConversation":
                return executeGetConversation(client, params as never);
            case "createConversation":
                return executeCreateConversation(client, params as never);
            case "changeConversationState":
                return executeChangeConversationState(client, params as never);
            case "getMessages":
                return executeGetMessages(client, params as never);
            case "sendMessage":
                return executeSendMessage(client, params as never);
            case "searchConversations":
                return executeSearchConversations(client, params as never);
            case "addNote":
                return executeAddNote(client, params as never);

            // People
            case "listPeople":
                return executeListPeople(client, params as never);
            case "getPerson":
                return executeGetPerson(client, params as never);
            case "createPerson":
                return executeCreatePerson(client, params as never);
            case "updatePerson":
                return executeUpdatePerson(client, params as never);

            // Operators
            case "listOperators":
                return executeListOperators(client, params as never);
            case "getOperatorAvailability":
                return executeGetOperatorAvailability(client, params as never);
            case "assignConversation":
                return executeAssignConversation(client, params as never);
            case "unassignConversation":
                return executeUnassignConversation(client, params as never);

            default:
                return {
                    success: false,
                    error: {
                        type: "validation",
                        message: `Unknown Crisp operation: ${operationId}`,
                        retryable: false
                    }
                };
        }
    }
}
