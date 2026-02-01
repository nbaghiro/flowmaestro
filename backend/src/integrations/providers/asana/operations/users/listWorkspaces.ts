import { listWorkspacesInputSchema, type ListWorkspacesInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AsanaClient } from "../../client/AsanaClient";

export const listWorkspacesOperation: OperationDefinition = {
    id: "listWorkspaces",
    name: "List Workspaces",
    description: "List all workspaces the authenticated user has access to.",
    category: "users",
    inputSchema: listWorkspacesInputSchema,
    retryable: true,
    timeout: 30000
};

export async function executeListWorkspaces(
    client: AsanaClient,
    params: ListWorkspacesInput
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {};

        if (params.opt_fields && params.opt_fields.length > 0) {
            queryParams.opt_fields = client.buildOptFields(params.opt_fields);
        }

        const workspaces = await client.getPaginated<Record<string, unknown>>(
            "/workspaces",
            queryParams,
            params.limit
        );

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
