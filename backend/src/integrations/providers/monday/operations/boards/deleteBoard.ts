import { DELETE_BOARD } from "../../graphql/mutations";
import { deleteBoardInputSchema, type DeleteBoardInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { MondayClient } from "../../client/MondayClient";

export const deleteBoardOperation: OperationDefinition = {
    id: "deleteBoard",
    name: "Delete Board",
    description: "Delete a board from Monday.com. This action cannot be undone.",
    category: "boards",
    inputSchema: deleteBoardInputSchema,
    retryable: false,
    timeout: 10000
};

interface DeleteBoardResponse {
    delete_board: {
        id: string;
    };
}

export async function executeDeleteBoard(
    client: MondayClient,
    params: DeleteBoardInput
): Promise<OperationResult> {
    try {
        const response = await client.mutation<DeleteBoardResponse>(DELETE_BOARD, {
            board_id: params.board_id
        });

        return {
            success: true,
            data: {
                deleted: true,
                board_id: response.delete_board.id
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete board",
                retryable: false
            }
        };
    }
}
