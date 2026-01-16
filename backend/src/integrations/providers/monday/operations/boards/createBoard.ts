import { toJSONSchema } from "../../../../core/schema-utils";
import { CREATE_BOARD } from "../../graphql/mutations";
import { createBoardInputSchema, type CreateBoardInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { MondayClient } from "../../client/MondayClient";

export const createBoardOperation: OperationDefinition = {
    id: "createBoard",
    name: "Create Board",
    description:
        "Create a new board in Monday.com with specified visibility and optional template.",
    category: "boards",
    inputSchema: createBoardInputSchema,
    inputSchemaJSON: toJSONSchema(createBoardInputSchema),
    retryable: true,
    timeout: 10000
};

interface CreateBoardResponse {
    create_board: {
        id: string;
        name: string;
        description: string | null;
        state: string;
        board_kind: string;
        workspace_id: string | null;
    };
}

export async function executeCreateBoard(
    client: MondayClient,
    params: CreateBoardInput
): Promise<OperationResult> {
    try {
        const variables: Record<string, unknown> = {
            board_name: params.board_name,
            board_kind: params.board_kind
        };

        if (params.description !== undefined) {
            variables.description = params.description;
        }
        if (params.workspace_id !== undefined) {
            variables.workspace_id = params.workspace_id;
        }
        if (params.folder_id !== undefined) {
            variables.folder_id = params.folder_id;
        }
        if (params.template_id !== undefined) {
            variables.template_id = params.template_id;
        }

        const response = await client.mutation<CreateBoardResponse>(CREATE_BOARD, variables);

        return {
            success: true,
            data: response.create_board
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create board",
                retryable: true
            }
        };
    }
}
