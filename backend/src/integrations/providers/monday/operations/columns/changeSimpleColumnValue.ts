import { toJSONSchema } from "../../../../core/schema-utils";
import { CHANGE_SIMPLE_COLUMN_VALUE } from "../../graphql/mutations";
import {
    changeSimpleColumnValueInputSchema,
    type ChangeSimpleColumnValueInput
} from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { MondayClient } from "../../client/MondayClient";

export const changeSimpleColumnValueOperation: OperationDefinition = {
    id: "changeSimpleColumnValue",
    name: "Change Simple Column Value",
    description: "Change a column value for an item using a simple string value.",
    category: "columns",
    inputSchema: changeSimpleColumnValueInputSchema,
    inputSchemaJSON: toJSONSchema(changeSimpleColumnValueInputSchema),
    retryable: true,
    timeout: 10000
};

interface ChangeSimpleColumnValueResponse {
    change_simple_column_value: {
        id: string;
        name: string;
    };
}

export async function executeChangeSimpleColumnValue(
    client: MondayClient,
    params: ChangeSimpleColumnValueInput
): Promise<OperationResult> {
    try {
        const response = await client.mutation<ChangeSimpleColumnValueResponse>(
            CHANGE_SIMPLE_COLUMN_VALUE,
            {
                board_id: params.board_id,
                item_id: params.item_id,
                column_id: params.column_id,
                value: params.value
            }
        );

        return {
            success: true,
            data: {
                updated: true,
                item: response.change_simple_column_value
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
