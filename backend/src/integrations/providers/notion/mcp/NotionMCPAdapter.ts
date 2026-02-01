import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import { NotionClient } from "../client/NotionClient";
import { executeCreatePage } from "../operations/createPage";
import { executeGetPage } from "../operations/getPage";
import { executeQueryDatabase } from "../operations/queryDatabase";
import { executeSearch } from "../operations/search";
import { executeUpdatePage } from "../operations/updatePage";
import type { MCPTool, OperationDefinition } from "../../../core/types";

/**
 * Notion MCP Adapter - wraps operations as MCP tools
 */
export class NotionMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    /**
     * Get all MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `notion_${op.id}`,
            description: op.description,
            inputSchema: toJSONSchema(op.inputSchema),
            executeRef: op.id
        }));
    }

    /**
     * Execute MCP tool
     */
    async executeTool(
        toolName: string,
        params: Record<string, unknown>,
        client: NotionClient
    ): Promise<unknown> {
        // Remove "notion_" prefix to get operation ID
        const operationId = toolName.replace(/^notion_/, "");

        // Route to operation executor
        switch (operationId) {
            case "search":
                return await executeSearch(client, params as never);
            case "createPage":
                return await executeCreatePage(client, params as never);
            case "updatePage":
                return await executeUpdatePage(client, params as never);
            case "getPage":
                return await executeGetPage(client, params as never);
            case "queryDatabase":
                return await executeQueryDatabase(client, params as never);
            default:
                throw new Error(`Unknown Notion operation: ${operationId}`);
        }
    }
}
