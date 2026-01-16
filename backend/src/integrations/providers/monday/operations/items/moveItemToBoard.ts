import { toJSONSchema } from "../../../../core/schema-utils";
import { MOVE_ITEM_TO_BOARD } from "../../graphql/mutations";
import { moveItemToBoardInputSchema, type MoveItemToBoardInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { MondayClient } from "../../client/MondayClient";

export const moveItemToBoardOperation: OperationDefinition = {
    id: "moveItemToBoard",
    name: "Move Item to Board",
    description: "Move an item to a different board in Monday.com.",
    category: "items",
    inputSchema: moveItemToBoardInputSchema,
    inputSchemaJSON: toJSONSchema(moveItemToBoardInputSchema),
    retryable: true,
    timeout: 10000
};

interface MoveItemToBoardResponse {
    move_item_to_board: {
        id: string;
        name: string;
        board: {
            id: string;
            name: string;
        };
        group: {
            id: string;
            title: string;
        };
    };
}

export async function executeMoveItemToBoard(
    client: MondayClient,
    params: MoveItemToBoardInput
): Promise<OperationResult> {
    try {
        const response = await client.mutation<MoveItemToBoardResponse>(MOVE_ITEM_TO_BOARD, {
            item_id: params.item_id,
            board_id: params.board_id,
            group_id: params.group_id
        });

        return {
            success: true,
            data: {
                moved: true,
                item: response.move_item_to_board
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to move item to board",
                retryable: true
            }
        };
    }
}
