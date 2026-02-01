import { DUPLICATE_ITEM } from "../../graphql/mutations";
import { duplicateItemInputSchema, type DuplicateItemInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { MondayClient } from "../../client/MondayClient";

export const duplicateItemOperation: OperationDefinition = {
    id: "duplicateItem",
    name: "Duplicate Item",
    description: "Duplicate an item in Monday.com, optionally including updates/comments.",
    category: "items",
    inputSchema: duplicateItemInputSchema,
    retryable: true,
    timeout: 10000
};

interface DuplicateItemResponse {
    duplicate_item: {
        id: string;
        name: string;
        state: string;
    };
}

export async function executeDuplicateItem(
    client: MondayClient,
    params: DuplicateItemInput
): Promise<OperationResult> {
    try {
        const variables: Record<string, unknown> = {
            board_id: params.board_id,
            item_id: params.item_id
        };

        if (params.with_updates !== undefined) {
            variables.with_updates = params.with_updates;
        }

        const response = await client.mutation<DuplicateItemResponse>(DUPLICATE_ITEM, variables);

        return {
            success: true,
            data: {
                duplicated: true,
                original_item_id: params.item_id,
                new_item: response.duplicate_item
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to duplicate item",
                retryable: true
            }
        };
    }
}
