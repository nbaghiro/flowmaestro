import { LIST_ITEMS, LIST_ITEMS_IN_GROUP } from "../../graphql/queries";
import { listItemsInputSchema, type ListItemsInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { MondayClient } from "../../client/MondayClient";

export const listItemsOperation: OperationDefinition = {
    id: "listItems",
    name: "List Items",
    description: "List items from a Monday.com board with optional group filtering and pagination.",
    category: "items",
    inputSchema: listItemsInputSchema,
    retryable: true,
    timeout: 30000
};

interface ListItemsResponse {
    boards: Array<{
        items_page?: {
            cursor: string | null;
            items: Array<{
                id: string;
                name: string;
                state: string;
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
                created_at: string;
                updated_at: string | null;
            }>;
        };
        groups?: Array<{
            items_page?: {
                cursor: string | null;
                items: Array<{
                    id: string;
                    name: string;
                    state: string;
                    column_values: Array<{
                        id: string;
                        type: string;
                        text: string | null;
                        value: string | null;
                    }>;
                    created_at: string;
                    updated_at: string | null;
                }>;
            };
        }>;
    }>;
}

export async function executeListItems(
    client: MondayClient,
    params: ListItemsInput
): Promise<OperationResult> {
    try {
        let response: ListItemsResponse;
        let items: unknown[];
        let cursor: string | null = null;

        if (params.group_id) {
            // List items in specific group
            response = await client.query<ListItemsResponse>(LIST_ITEMS_IN_GROUP, {
                board_id: params.board_id,
                group_id: params.group_id,
                limit: params.limit,
                cursor: params.cursor
            });

            const group = response.boards?.[0]?.groups?.[0];
            items = group?.items_page?.items || [];
            cursor = group?.items_page?.cursor || null;
        } else {
            // List all items on board
            response = await client.query<ListItemsResponse>(LIST_ITEMS, {
                board_id: params.board_id,
                limit: params.limit,
                cursor: params.cursor
            });

            const itemsPage = response.boards?.[0]?.items_page;
            items = itemsPage?.items || [];
            cursor = itemsPage?.cursor || null;
        }

        return {
            success: true,
            data: {
                items,
                count: items.length,
                cursor,
                board_id: params.board_id
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list items",
                retryable: true
            }
        };
    }
}
