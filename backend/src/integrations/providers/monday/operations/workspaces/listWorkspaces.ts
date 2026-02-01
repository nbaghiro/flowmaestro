import { LIST_WORKSPACES } from "../../graphql/queries";
import { listWorkspacesInputSchema, type ListWorkspacesInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { MondayClient } from "../../client/MondayClient";

export const listWorkspacesOperation: OperationDefinition = {
    id: "listWorkspaces",
    name: "List Workspaces",
    description: "List all workspaces in the Monday.com account.",
    category: "workspaces",
    inputSchema: listWorkspacesInputSchema,
    retryable: true,
    timeout: 15000
};

interface ListWorkspacesResponse {
    workspaces: Array<{
        id: string;
        name: string;
        kind: string;
        description: string | null;
        state: string;
    }>;
}

export async function executeListWorkspaces(
    client: MondayClient,
    params: ListWorkspacesInput
): Promise<OperationResult> {
    try {
        const response = await client.query<ListWorkspacesResponse>(LIST_WORKSPACES, {
            limit: params.limit,
            page: params.page
        });

        const workspaces = response.workspaces || [];

        return {
            success: true,
            data: {
                workspaces,
                count: workspaces.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list workspaces",
                retryable: true
            }
        };
    }
}
