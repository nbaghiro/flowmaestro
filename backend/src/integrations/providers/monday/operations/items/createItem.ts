import { toJSONSchema } from "../../../../core/schema-utils";
import { CREATE_ITEM } from "../../graphql/mutations";
import { createItemInputSchema, type CreateItemInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { MondayClient } from "../../client/MondayClient";

export const createItemOperation: OperationDefinition = {
    id: "createItem",
    name: "Create Item",
    description: "Create a new item on a Monday.com board with optional column values.",
    category: "items",
    inputSchema: createItemInputSchema,
    inputSchemaJSON: toJSONSchema(createItemInputSchema),
    retryable: true,
    timeout: 10000
};

interface CreateItemResponse {
    create_item: {
        id: string;
        name: string;
        state: string;
        board: {
            id: string;
            name: string;
        };
        group: {
            id: string;
            title: string;
        } | null;
    };
}

export async function executeCreateItem(
    client: MondayClient,
    params: CreateItemInput
): Promise<OperationResult> {
    try {
        const variables: Record<string, unknown> = {
            board_id: params.board_id,
            item_name: params.item_name
        };

        if (params.group_id !== undefined) {
            variables.group_id = params.group_id;
        }
        if (params.column_values !== undefined) {
            variables.column_values = client.stringifyColumnValues(params.column_values);
        }

        const response = await client.mutation<CreateItemResponse>(CREATE_ITEM, variables);

        return {
            success: true,
            data: response.create_item
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create item",
                retryable: true
            }
        };
    }
}
