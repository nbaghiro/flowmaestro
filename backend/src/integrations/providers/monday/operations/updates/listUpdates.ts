import { LIST_UPDATES } from "../../graphql/queries";
import { listUpdatesInputSchema, type ListUpdatesInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { MondayClient } from "../../client/MondayClient";

export const listUpdatesOperation: OperationDefinition = {
    id: "listUpdates",
    name: "List Updates",
    description: "List all updates (comments) on an item.",
    category: "updates",
    inputSchema: listUpdatesInputSchema,
    retryable: true,
    timeout: 15000
};

interface ListUpdatesResponse {
    items: Array<{
        updates: Array<{
            id: string;
            body: string;
            text_body: string;
            created_at: string;
            updated_at: string;
            creator: {
                id: string;
                name: string;
                email: string;
            };
        }>;
    }>;
}

export async function executeListUpdates(
    client: MondayClient,
    params: ListUpdatesInput
): Promise<OperationResult> {
    try {
        const response = await client.query<ListUpdatesResponse>(LIST_UPDATES, {
            item_id: params.item_id,
            limit: params.limit,
            page: params.page
        });

        const updates = response.items?.[0]?.updates || [];

        return {
            success: true,
            data: {
                updates,
                count: updates.length,
                item_id: params.item_id
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list updates",
                retryable: true
            }
        };
    }
}
