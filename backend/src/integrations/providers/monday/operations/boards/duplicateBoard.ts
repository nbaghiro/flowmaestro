import { toJSONSchema } from "../../../../core/schema-utils";
import { DUPLICATE_BOARD } from "../../graphql/mutations";
import { duplicateBoardInputSchema, type DuplicateBoardInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { MondayClient } from "../../client/MondayClient";

export const duplicateBoardOperation: OperationDefinition = {
    id: "duplicateBoard",
    name: "Duplicate Board",
    description:
        "Duplicate a board in Monday.com with structure only, items, or items and updates.",
    category: "boards",
    inputSchema: duplicateBoardInputSchema,
    inputSchemaJSON: toJSONSchema(duplicateBoardInputSchema),
    retryable: true,
    timeout: 30000
};

interface DuplicateBoardResponse {
    duplicate_board: {
        board: {
            id: string;
            name: string;
            state: string;
            workspace_id: string | null;
        };
    };
}

export async function executeDuplicateBoard(
    client: MondayClient,
    params: DuplicateBoardInput
): Promise<OperationResult> {
    try {
        const variables: Record<string, unknown> = {
            board_id: params.board_id,
            duplicate_type: params.duplicate_type
        };

        if (params.board_name !== undefined) {
            variables.board_name = params.board_name;
        }
        if (params.workspace_id !== undefined) {
            variables.workspace_id = params.workspace_id;
        }
        if (params.folder_id !== undefined) {
            variables.folder_id = params.folder_id;
        }
        if (params.keep_subscribers !== undefined) {
            variables.keep_subscribers = params.keep_subscribers;
        }

        const response = await client.mutation<DuplicateBoardResponse>(DUPLICATE_BOARD, variables);

        return {
            success: true,
            data: {
                duplicated: true,
                original_board_id: params.board_id,
                new_board: response.duplicate_board.board
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to duplicate board",
                retryable: true
            }
        };
    }
}
