import { toJSONSchema } from "../../../../core/schema-utils";
import { LIST_BOARDS } from "../../graphql/queries";
import { listBoardsInputSchema, type ListBoardsInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { MondayClient } from "../../client/MondayClient";

export const listBoardsOperation: OperationDefinition = {
    id: "listBoards",
    name: "List Boards",
    description: "List boards in Monday.com with optional filtering by workspace, type, and state.",
    category: "boards",
    inputSchema: listBoardsInputSchema,
    inputSchemaJSON: toJSONSchema(listBoardsInputSchema),
    retryable: true,
    timeout: 30000
};

interface ListBoardsResponse {
    boards: Array<{
        id: string;
        name: string;
        description: string | null;
        state: string;
        board_kind: string;
        board_folder_id: string | null;
        workspace_id: string | null;
        permissions: string;
    }>;
}

export async function executeListBoards(
    client: MondayClient,
    params: ListBoardsInput
): Promise<OperationResult> {
    try {
        const variables: Record<string, unknown> = {
            limit: params.limit
        };

        if (params.workspace_ids !== undefined && params.workspace_ids.length > 0) {
            variables.workspace_ids = params.workspace_ids;
        }
        if (params.board_kind !== undefined) {
            variables.board_kind = params.board_kind;
        }
        if (params.state !== undefined) {
            variables.state = params.state;
        }
        if (params.page !== undefined) {
            variables.page = params.page;
        }

        const response = await client.query<ListBoardsResponse>(LIST_BOARDS, variables);

        return {
            success: true,
            data: {
                boards: response.boards,
                count: response.boards.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list boards",
                retryable: true
            }
        };
    }
}
