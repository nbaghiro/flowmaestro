import { UPDATE_ITEM } from "../../graphql/mutations";
import { updateItemInputSchema, type UpdateItemInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { MondayClient } from "../../client/MondayClient";

export const updateItemOperation: OperationDefinition = {
    id: "updateItem",
    name: "Update Item",
    description: "Update column values of an item in Monday.com.",
    category: "items",
    inputSchema: updateItemInputSchema,
    retryable: true,
    timeout: 10000
};

interface UpdateItemResponse {
    change_multiple_column_values: {
        id: string;
        name: string;
        column_values: Array<{
            id: string;
            type: string;
            text: string | null;
            value: string | null;
        }>;
    };
}

export async function executeUpdateItem(
    client: MondayClient,
    params: UpdateItemInput
): Promise<OperationResult> {
    try {
        const response = await client.mutation<UpdateItemResponse>(UPDATE_ITEM, {
            board_id: params.board_id,
            item_id: params.item_id,
            column_values: client.stringifyColumnValues(params.column_values)
        });

        return {
            success: true,
            data: response.change_multiple_column_values
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update item",
                retryable: true
            }
        };
    }
}
