import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import {
    // Contact Operations
    executeGetContacts,
    executeGetContact,
    executeCreateContact,
    executeUpdateContact,
    executeDeleteContact,
    // List Operations
    executeGetLists,
    executeGetList,
    executeCreateList,
    executeAddToList,
    executeRemoveFromList,
    // Campaign Operations
    executeGetCampaigns,
    executeGetCampaign,
    executeScheduleCampaign,
    // Tag Operations
    executeAddTagsToContacts,
    executeRemoveTagsFromContacts
} from "../operations";
import type { MCPTool, OperationDefinition, OperationResult } from "../../../core/types";
import type { ConstantContactClient } from "../client/ConstantContactClient";

/**
 * Constant Contact MCP Adapter
 *
 * Converts Constant Contact operations into MCP tools for AI agents
 */
export class ConstantContactMCPAdapter {
    private operations: Map<string, OperationDefinition>;

    constructor(operations: Map<string, OperationDefinition>) {
        this.operations = operations;
    }

    /**
     * Get MCP tools from registered operations
     */
    getTools(): MCPTool[] {
        const tools: MCPTool[] = [];

        for (const [id, operation] of this.operations.entries()) {
            tools.push({
                name: `constantcontact_${id}`,
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
        client: ConstantContactClient
    ): Promise<OperationResult> {
        const operationId = toolName.replace("constantcontact_", "");

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
                    message: error instanceof Error ? error.message : "Invalid parameters",
                    retryable: false
                }
            };
        }

        // Route to appropriate operation executor
        switch (operationId) {
            // Contact Operations
            case "getContacts":
                return executeGetContacts(client, params as never);
            case "getContact":
                return executeGetContact(client, params as never);
            case "createContact":
                return executeCreateContact(client, params as never);
            case "updateContact":
                return executeUpdateContact(client, params as never);
            case "deleteContact":
                return executeDeleteContact(client, params as never);

            // List Operations
            case "getLists":
                return executeGetLists(client, params as never);
            case "getList":
                return executeGetList(client, params as never);
            case "createList":
                return executeCreateList(client, params as never);
            case "addToList":
                return executeAddToList(client, params as never);
            case "removeFromList":
                return executeRemoveFromList(client, params as never);

            // Campaign Operations
            case "getCampaigns":
                return executeGetCampaigns(client, params as never);
            case "getCampaign":
                return executeGetCampaign(client, params as never);
            case "scheduleCampaign":
                return executeScheduleCampaign(client, params as never);

            // Tag Operations
            case "addTagsToContacts":
                return executeAddTagsToContacts(client, params as never);
            case "removeTagsFromContacts":
                return executeRemoveTagsFromContacts(client, params as never);

            default:
                return {
                    success: false,
                    error: {
                        type: "validation",
                        message: `Operation not implemented: ${operationId}`,
                        retryable: false
                    }
                };
        }
    }
}
