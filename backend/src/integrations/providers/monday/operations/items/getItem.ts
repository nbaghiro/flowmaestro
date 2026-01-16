import { toJSONSchema } from "../../../../core/schema-utils";
import { GET_ITEM } from "../../graphql/queries";
import { getItemInputSchema, type GetItemInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { MondayClient } from "../../client/MondayClient";

export const getItemOperation: OperationDefinition = {
    id: "getItem",
    name: "Get Item",
    description: "Retrieve a specific item from Monday.com by its ID, including column values.",
    category: "items",
    inputSchema: getItemInputSchema,
    inputSchemaJSON: toJSONSchema(getItemInputSchema),
    retryable: true,
    timeout: 10000
};

interface GetItemResponse {
    items: Array<{
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
        column_values: Array<{
            id: string;
            type: string;
            text: string | null;
            value: string | null;
        }>;
        creator: {
            id: string;
            name: string;
            email: string;
        } | null;
        created_at: string;
        updated_at: string | null;
    }>;
}

export async function executeGetItem(
    client: MondayClient,
    params: GetItemInput
): Promise<OperationResult> {
    try {
        const response = await client.query<GetItemResponse>(GET_ITEM, {
            item_id: params.item_id
        });

        if (!response.items || response.items.length === 0) {
            return {
                success: false,
                error: {
                    type: "not_found",
                    message: `Item with ID ${params.item_id} not found`,
                    retryable: false
                }
            };
        }

        return {
            success: true,
            data: response.items[0]
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get item",
                retryable: true
            }
        };
    }
}
