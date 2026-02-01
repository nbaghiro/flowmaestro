import { DELETE_ITEM } from "../../graphql/mutations";
import { deleteItemInputSchema, type DeleteItemInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { MondayClient } from "../../client/MondayClient";

export const deleteItemOperation: OperationDefinition = {
    id: "deleteItem",
    name: "Delete Item",
    description: "Delete an item from Monday.com. This action cannot be undone.",
    category: "items",
    inputSchema: deleteItemInputSchema,
    retryable: false,
    timeout: 10000
};

interface DeleteItemResponse {
    delete_item: {
        id: string;
    };
}

export async function executeDeleteItem(
    client: MondayClient,
    params: DeleteItemInput
): Promise<OperationResult> {
    try {
        const response = await client.mutation<DeleteItemResponse>(DELETE_ITEM, {
            item_id: params.item_id
        });

        return {
            success: true,
            data: {
                deleted: true,
                item_id: response.delete_item.id
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete item",
                retryable: false
            }
        };
    }
}
