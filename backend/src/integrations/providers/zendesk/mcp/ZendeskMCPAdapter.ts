import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import type { MCPTool, OperationDefinition } from "../../../core/types";
import type { ZendeskClient } from "../client/ZendeskClient";

/**
 * Zendesk MCP Adapter
 *
 * Converts Zendesk operations into MCP tools for AI agents
 */
export class ZendeskMCPAdapter {
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
                name: `zendesk_${id}`,
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
        _client: ZendeskClient
    ): Promise<unknown> {
        // Remove "zendesk_" prefix to get operation ID
        const operationId = toolName.replace("zendesk_", "");

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
