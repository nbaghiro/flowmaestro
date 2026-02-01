import { DELETE_COLUMN } from "../../graphql/mutations";
import { deleteColumnInputSchema, type DeleteColumnInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { MondayClient } from "../../client/MondayClient";

export const deleteColumnOperation: OperationDefinition = {
    id: "deleteColumn",
    name: "Delete Column",
    description: "Delete a column from a Monday.com board. This action cannot be undone.",
    category: "columns",
    inputSchema: deleteColumnInputSchema,
    retryable: false,
    timeout: 10000
};

interface DeleteColumnResponse {
    delete_column: {
        id: string;
    };
}

export async function executeDeleteColumn(
    client: MondayClient,
    params: DeleteColumnInput
): Promise<OperationResult> {
    try {
        const response = await client.mutation<DeleteColumnResponse>(DELETE_COLUMN, {
            board_id: params.board_id,
            column_id: params.column_id
        });

        return {
            success: true,
            data: {
                deleted: true,
                column_id: response.delete_column.id
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete column",
                retryable: false
            }
        };
    }
}
