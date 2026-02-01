import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import type { MCPTool, OperationDefinition } from "../../../core/types";
import type { HubspotClient } from "../client/HubspotClient";

/**
 * HubSpot MCP Adapter
 *
 * Converts HubSpot operations into MCP tools for AI agents
 */
export class HubspotMCPAdapter {
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
                name: `hubspot_${id}`,
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
        _client: HubspotClient
    ): Promise<unknown> {
        // Remove "hubspot_" prefix to get operation ID
        const operationId = toolName.replace("hubspot_", "");

        const operation = this.operations.get(operationId);
        if (!operation) {
            throw new Error(`Unknown MCP tool: ${toolName}`);
        }

        // Validate parameters using the operation's schema
        operation.inputSchema.parse(params);

        // Execute the operation
        // Note: This is a simplified version - in reality, we'd need to import
        // and call the specific executor function for each operation
        throw new Error(
            `MCP tool execution not yet implemented for ${toolName}. Use direct operation execution instead.`
        );
    }
}
