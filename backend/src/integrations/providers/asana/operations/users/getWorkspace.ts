import { getWorkspaceInputSchema, type GetWorkspaceInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AsanaClient } from "../../client/AsanaClient";

export const getWorkspaceOperation: OperationDefinition = {
    id: "getWorkspace",
    name: "Get Workspace",
    description: "Retrieve a specific workspace from Asana by its GID.",
    category: "users",
    inputSchema: getWorkspaceInputSchema,
    retryable: true,
    timeout: 10000
};

export async function executeGetWorkspace(
    client: AsanaClient,
    params: GetWorkspaceInput
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {};

        if (params.opt_fields && params.opt_fields.length > 0) {
            queryParams.opt_fields = client.buildOptFields(params.opt_fields);
        }

        const response = await client.getAsana<Record<string, unknown>>(
            `/workspaces/${params.workspace_gid}`,
            queryParams
        );

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get workspace",
                retryable: true
            }
        };
    }
}
