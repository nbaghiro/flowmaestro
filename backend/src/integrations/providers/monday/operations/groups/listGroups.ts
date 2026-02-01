import { LIST_GROUPS } from "../../graphql/queries";
import { listGroupsInputSchema, type ListGroupsInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { MondayClient } from "../../client/MondayClient";

export const listGroupsOperation: OperationDefinition = {
    id: "listGroups",
    name: "List Groups",
    description: "List all groups on a Monday.com board.",
    category: "groups",
    inputSchema: listGroupsInputSchema,
    retryable: true,
    timeout: 10000
};

interface ListGroupsResponse {
    boards: Array<{
        groups: Array<{
            id: string;
            title: string;
            color: string;
            position: string;
            archived: boolean;
        }>;
    }>;
}

export async function executeListGroups(
    client: MondayClient,
    params: ListGroupsInput
): Promise<OperationResult> {
    try {
        const response = await client.query<ListGroupsResponse>(LIST_GROUPS, {
            board_id: params.board_id
        });

        const groups = response.boards?.[0]?.groups || [];

        return {
            success: true,
            data: {
                groups,
                count: groups.length,
                board_id: params.board_id
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list groups",
                retryable: true
            }
        };
    }
}
