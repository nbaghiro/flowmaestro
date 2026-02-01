import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import {
    // Board Operations
    executeCreateBoard,
    executeGetBoard,
    executeUpdateBoard,
    executeDeleteBoard,
    executeListBoards,
    executeArchiveBoard,
    executeDuplicateBoard,
    // Item Operations
    executeCreateItem,
    executeGetItem,
    executeUpdateItem,
    executeDeleteItem,
    executeListItems,
    executeArchiveItem,
    executeDuplicateItem,
    executeMoveItemToGroup,
    executeMoveItemToBoard,
    // Group Operations
    executeCreateGroup,
    executeUpdateGroup,
    executeDeleteGroup,
    executeListGroups,
    executeArchiveGroup,
    executeDuplicateGroup,
    // Column Operations
    executeCreateColumn,
    executeDeleteColumn,
    executeListColumns,
    executeChangeColumnValue,
    executeChangeSimpleColumnValue,
    // User Operations
    executeGetCurrentUser,
    executeGetUser,
    executeListUsers,
    // Workspace Operations
    executeListWorkspaces,
    executeGetWorkspace,
    // Team Operations
    executeListTeams,
    // Tag Operations
    executeListTags,
    // Update Operations
    executeCreateUpdate,
    executeListUpdates,
    executeDeleteUpdate
} from "../operations";
import type { MCPTool, OperationDefinition, OperationResult } from "../../../core/types";
import type { MondayClient } from "../client/MondayClient";

/**
 * Monday.com MCP Adapter
 * Wraps Monday.com operations as MCP tools for AI agents
 */
export class MondayMCPAdapter {
    private operations: Map<string, OperationDefinition>;

    constructor(operations: Map<string, OperationDefinition>) {
        this.operations = operations;
    }

    /**
     * Get all MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `monday_${op.id}`,
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
        client: MondayClient
    ): Promise<OperationResult> {
        const operationId = toolName.replace(/^monday_/, "");
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

        // Execute the appropriate operation
        switch (operationId) {
            // Board Operations
            case "createBoard":
                return await executeCreateBoard(client, params as never);
            case "getBoard":
                return await executeGetBoard(client, params as never);
            case "updateBoard":
                return await executeUpdateBoard(client, params as never);
            case "deleteBoard":
                return await executeDeleteBoard(client, params as never);
            case "listBoards":
                return await executeListBoards(client, params as never);
            case "archiveBoard":
                return await executeArchiveBoard(client, params as never);
            case "duplicateBoard":
                return await executeDuplicateBoard(client, params as never);

            // Item Operations
            case "createItem":
                return await executeCreateItem(client, params as never);
            case "getItem":
                return await executeGetItem(client, params as never);
            case "updateItem":
                return await executeUpdateItem(client, params as never);
            case "deleteItem":
                return await executeDeleteItem(client, params as never);
            case "listItems":
                return await executeListItems(client, params as never);
            case "archiveItem":
                return await executeArchiveItem(client, params as never);
            case "duplicateItem":
                return await executeDuplicateItem(client, params as never);
            case "moveItemToGroup":
                return await executeMoveItemToGroup(client, params as never);
            case "moveItemToBoard":
                return await executeMoveItemToBoard(client, params as never);

            // Group Operations
            case "createGroup":
                return await executeCreateGroup(client, params as never);
            case "updateGroup":
                return await executeUpdateGroup(client, params as never);
            case "deleteGroup":
                return await executeDeleteGroup(client, params as never);
            case "listGroups":
                return await executeListGroups(client, params as never);
            case "archiveGroup":
                return await executeArchiveGroup(client, params as never);
            case "duplicateGroup":
                return await executeDuplicateGroup(client, params as never);

            // Column Operations
            case "createColumn":
                return await executeCreateColumn(client, params as never);
            case "deleteColumn":
                return await executeDeleteColumn(client, params as never);
            case "listColumns":
                return await executeListColumns(client, params as never);
            case "changeColumnValue":
                return await executeChangeColumnValue(client, params as never);
            case "changeSimpleColumnValue":
                return await executeChangeSimpleColumnValue(client, params as never);

            // User Operations
            case "getCurrentUser":
                return await executeGetCurrentUser(client, params as never);
            case "getUser":
                return await executeGetUser(client, params as never);
            case "listUsers":
                return await executeListUsers(client, params as never);

            // Workspace Operations
            case "listWorkspaces":
                return await executeListWorkspaces(client, params as never);
            case "getWorkspace":
                return await executeGetWorkspace(client, params as never);

            // Team Operations
            case "listTeams":
                return await executeListTeams(client, params as never);

            // Tag Operations
            case "listTags":
                return await executeListTags(client, params as never);

            // Update Operations
            case "createUpdate":
                return await executeCreateUpdate(client, params as never);
            case "listUpdates":
                return await executeListUpdates(client, params as never);
            case "deleteUpdate":
                return await executeDeleteUpdate(client, params as never);

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
