import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import { TrelloClient } from "../client/TrelloClient";

// Import all execute functions
import { executeCreateBoard } from "../operations/boards/createBoard";
import { executeGetBoard } from "../operations/boards/getBoard";
import { executeListBoards } from "../operations/boards/listBoards";
import { executeUpdateBoard } from "../operations/boards/updateBoard";
import { executeCreateCard } from "../operations/cards/createCard";
import { executeDeleteCard } from "../operations/cards/deleteCard";
import { executeGetCard } from "../operations/cards/getCard";
import { executeGetCards } from "../operations/cards/getCards";
import { executeMoveCard } from "../operations/cards/moveCard";
import { executeUpdateCard } from "../operations/cards/updateCard";
import { executeAddComment } from "../operations/comments/addComment";
import { executeArchiveList } from "../operations/lists/archiveList";
import { executeCreateList } from "../operations/lists/createList";
import { executeGetList } from "../operations/lists/getList";
import { executeGetLists } from "../operations/lists/getLists";
import { executeUpdateList } from "../operations/lists/updateList";
import { executeGetBoardMembers } from "../operations/members/getBoardMembers";
import { executeGetMe } from "../operations/members/getMe";
import type { MCPTool, OperationDefinition } from "../../../core/types";

/**
 * Trello MCP Adapter - wraps operations as MCP tools
 */
export class TrelloMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    /**
     * Get all MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `trello_${op.id}`,
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
        client: TrelloClient
    ): Promise<unknown> {
        // Remove "trello_" prefix to get operation ID
        const operationId = toolName.replace(/^trello_/, "");

        // Route to operation executor
        switch (operationId) {
            // Boards
            case "listBoards":
                return await executeListBoards(client, params as never);
            case "getBoard":
                return await executeGetBoard(client, params as never);
            case "createBoard":
                return await executeCreateBoard(client, params as never);
            case "updateBoard":
                return await executeUpdateBoard(client, params as never);

            // Lists
            case "getLists":
                return await executeGetLists(client, params as never);
            case "getList":
                return await executeGetList(client, params as never);
            case "createList":
                return await executeCreateList(client, params as never);
            case "updateList":
                return await executeUpdateList(client, params as never);
            case "archiveList":
                return await executeArchiveList(client, params as never);

            // Cards
            case "getCards":
                return await executeGetCards(client, params as never);
            case "getCard":
                return await executeGetCard(client, params as never);
            case "createCard":
                return await executeCreateCard(client, params as never);
            case "updateCard":
                return await executeUpdateCard(client, params as never);
            case "deleteCard":
                return await executeDeleteCard(client, params as never);
            case "moveCard":
                return await executeMoveCard(client, params as never);

            // Comments
            case "addComment":
                return await executeAddComment(client, params as never);

            // Members
            case "getMe":
                return await executeGetMe(client, params as never);
            case "getBoardMembers":
                return await executeGetBoardMembers(client, params as never);

            default:
                throw new Error(`Unknown Trello operation: ${operationId}`);
        }
    }
}
