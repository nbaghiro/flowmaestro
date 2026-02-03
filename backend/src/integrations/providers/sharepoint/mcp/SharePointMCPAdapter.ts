import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import {
    executeListSites,
    executeGetSite,
    executeListLists,
    executeGetList,
    executeListItems,
    executeCreateItem,
    executeListDriveItems,
    executeSearchContent
} from "../operations";
import type { MCPTool, OperationDefinition, OperationResult } from "../../../core/types";
import type { SharePointClient } from "../client/SharePointClient";

/**
 * SharePoint MCP Adapter
 * Wraps SharePoint operations as MCP tools for AI agents
 */
export class SharePointMCPAdapter {
    private operations: Map<string, OperationDefinition>;

    constructor(operations: Map<string, OperationDefinition>) {
        this.operations = operations;
    }

    /**
     * Get all MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `sharepoint_${op.id}`,
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
        client: SharePointClient
    ): Promise<OperationResult> {
        const operationId = toolName.replace(/^sharepoint_/, "");
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
            case "listSites":
                return await executeListSites(client, params as never);
            case "getSite":
                return await executeGetSite(client, params as never);
            case "listLists":
                return await executeListLists(client, params as never);
            case "getList":
                return await executeGetList(client, params as never);
            case "listItems":
                return await executeListItems(client, params as never);
            case "createItem":
                return await executeCreateItem(client, params as never);
            case "listDriveItems":
                return await executeListDriveItems(client, params as never);
            case "searchContent":
                return await executeSearchContent(client, params as never);
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
