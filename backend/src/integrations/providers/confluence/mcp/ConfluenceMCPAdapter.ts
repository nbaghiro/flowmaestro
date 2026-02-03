import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import {
    executeListSpaces,
    executeGetSpace,
    executeListPages,
    executeGetPage,
    executeCreatePage,
    executeUpdatePage,
    executeSearchContent,
    executeGetPageChildren
} from "../operations";
import type { MCPTool, OperationDefinition, OperationResult } from "../../../core/types";
import type { ConfluenceClient } from "../client/ConfluenceClient";

/**
 * Confluence MCP Adapter
 * Wraps Confluence operations as MCP tools for AI agents
 */
export class ConfluenceMCPAdapter {
    private operations: Map<string, OperationDefinition>;

    constructor(operations: Map<string, OperationDefinition>) {
        this.operations = operations;
    }

    /**
     * Get all MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `confluence_${op.id}`,
            description: op.description,
            inputSchema: toJSONSchema(op.inputSchema)
        }));
    }

    /**
     * Execute MCP tool
     */
    async executeTool(
        toolName: string,
        params: Record<string, unknown>,
        client: ConfluenceClient
    ): Promise<OperationResult> {
        const operationId = toolName.replace(/^confluence_/, "");
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

        switch (operationId) {
            case "listSpaces":
                return await executeListSpaces(client, params as never);
            case "getSpace":
                return await executeGetSpace(client, params as never);
            case "listPages":
                return await executeListPages(client, params as never);
            case "getPage":
                return await executeGetPage(client, params as never);
            case "createPage":
                return await executeCreatePage(client, params as never);
            case "updatePage":
                return await executeUpdatePage(client, params as never);
            case "searchContent":
                return await executeSearchContent(client, params as never);
            case "getPageChildren":
                return await executeGetPageChildren(client, params as never);
            default:
                return {
                    success: false,
                    error: {
                        type: "validation",
                        message: `Unimplemented operation: ${operationId}`,
                        retryable: false
                    }
                };
        }
    }
}
