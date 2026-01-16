import { toJSONSchema } from "../../../../core/schema-utils";
import { GET_BOARD } from "../../graphql/queries";
import { getBoardInputSchema, type GetBoardInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { MondayClient } from "../../client/MondayClient";

export const getBoardOperation: OperationDefinition = {
    id: "getBoard",
    name: "Get Board",
    description:
        "Retrieve a specific board from Monday.com by its ID, including columns and groups.",
    category: "boards",
    inputSchema: getBoardInputSchema,
    inputSchemaJSON: toJSONSchema(getBoardInputSchema),
    retryable: true,
    timeout: 10000
};

interface GetBoardResponse {
    boards: Array<{
        id: string;
        name: string;
        description: string | null;
        state: string;
        board_kind: string;
        board_folder_id: string | null;
        workspace_id: string | null;
        permissions: string;
        columns: Array<{
            id: string;
            title: string;
            type: string;
            settings_str: string;
        }>;
        groups: Array<{
            id: string;
            title: string;
            color: string;
            position: string;
        }>;
        owners: Array<{
            id: string;
            name: string;
            email: string;
        }>;
    }>;
}

export async function executeGetBoard(
    client: MondayClient,
    params: GetBoardInput
): Promise<OperationResult> {
    try {
        const response = await client.query<GetBoardResponse>(GET_BOARD, {
            board_id: params.board_id
        });

        if (!response.boards || response.boards.length === 0) {
            return {
                success: false,
                error: {
                    type: "not_found",
                    message: `Board with ID ${params.board_id} not found`,
                    retryable: false
                }
            };
        }

        return {
            success: true,
            data: response.boards[0]
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get board",
                retryable: true
            }
        };
    }
}
