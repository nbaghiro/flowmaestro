import { CHANGE_COLUMN_VALUE } from "../../graphql/mutations";
import { changeColumnValueInputSchema, type ChangeColumnValueInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { MondayClient } from "../../client/MondayClient";

export const changeColumnValueOperation: OperationDefinition = {
    id: "changeColumnValue",
    name: "Change Column Value",
    description: "Change a column value for an item using JSON format.",
    category: "columns",
    inputSchema: changeColumnValueInputSchema,
    retryable: true,
    timeout: 10000
};

interface ChangeColumnValueResponse {
    change_column_value: {
        id: string;
        name: string;
    };
}

export async function executeChangeColumnValue(
    client: MondayClient,
    params: ChangeColumnValueInput
): Promise<OperationResult> {
    try {
        const response = await client.mutation<ChangeColumnValueResponse>(CHANGE_COLUMN_VALUE, {
            board_id: params.board_id,
            item_id: params.item_id,
            column_id: params.column_id,
            value: params.value
        });

        return {
            success: true,
            data: {
                updated: true,
                item: response.change_column_value
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to change column value",
                retryable: true
            }
        };
    }
}
