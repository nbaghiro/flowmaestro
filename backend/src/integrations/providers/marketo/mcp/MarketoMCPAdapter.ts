import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import {
    executeGetLead,
    executeGetLeads,
    executeCreateLead,
    executeUpdateLead,
    executeGetLists,
    executeGetListMembers,
    executeAddToList,
    executeRemoveFromList,
    executeGetCampaigns,
    executeRequestCampaign
} from "../operations";
import type { MCPTool, OperationDefinition, OperationResult } from "../../../core/types";
import type { MarketoClient } from "../client/MarketoClient";

/**
 * Marketo MCP Adapter
 *
 * Converts Marketo operations into MCP tools for AI agents
 */
export class MarketoMCPAdapter {
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
                name: `marketo_${id}`,
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
        client: MarketoClient
    ): Promise<OperationResult> {
        // Remove "marketo_" prefix to get operation ID
        const operationId = toolName.replace("marketo_", "");

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
            case "getLead":
                return executeGetLead(client, params as never);
            case "getLeads":
                return executeGetLeads(client, params as never);
            case "createLead":
                return executeCreateLead(client, params as never);
            case "updateLead":
                return executeUpdateLead(client, params as never);
            case "getLists":
                return executeGetLists(client, params as never);
            case "getListMembers":
                return executeGetListMembers(client, params as never);
            case "addToList":
                return executeAddToList(client, params as never);
            case "removeFromList":
                return executeRemoveFromList(client, params as never);
            case "getCampaigns":
                return executeGetCampaigns(client, params as never);
            case "requestCampaign":
                return executeRequestCampaign(client, params as never);
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
