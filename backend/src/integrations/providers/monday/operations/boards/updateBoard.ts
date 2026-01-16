import { toJSONSchema } from "../../../../core/schema-utils";
import { UPDATE_BOARD } from "../../graphql/mutations";
import { updateBoardInputSchema, type UpdateBoardInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { MondayClient } from "../../client/MondayClient";

export const updateBoardOperation: OperationDefinition = {
    id: "updateBoard",
    name: "Update Board",
    description: "Update a board's name, description, or communication settings in Monday.com.",
    category: "boards",
    inputSchema: updateBoardInputSchema,
    inputSchemaJSON: toJSONSchema(updateBoardInputSchema),
    retryable: true,
    timeout: 10000
};

interface UpdateBoardResponse {
    update_board: string;
}

export async function executeUpdateBoard(
    client: MondayClient,
    params: UpdateBoardInput
): Promise<OperationResult> {
    try {
        const response = await client.mutation<UpdateBoardResponse>(UPDATE_BOARD, {
            board_id: params.board_id,
            board_attribute: params.board_attribute,
            new_value: params.new_value
        });

        return {
            success: true,
            data: {
                board_id: params.board_id,
                updated: true,
                attribute: params.board_attribute,
                new_value: params.new_value,
                result: response.update_board
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update board",
                retryable: true
            }
        };
    }
}
