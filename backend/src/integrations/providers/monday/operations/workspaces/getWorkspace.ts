import { GET_WORKSPACE } from "../../graphql/queries";
import { getWorkspaceInputSchema, type GetWorkspaceInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { MondayClient } from "../../client/MondayClient";

export const getWorkspaceOperation: OperationDefinition = {
    id: "getWorkspace",
    name: "Get Workspace",
    description: "Get a specific Monday.com workspace by ID.",
    category: "workspaces",
    inputSchema: getWorkspaceInputSchema,
    retryable: true,
    timeout: 10000
};

interface GetWorkspaceResponse {
    workspaces: Array<{
        id: string;
        name: string;
        kind: string;
        description: string | null;
        state: string;
        owners_subscribers: Array<{
            id: string;
            name: string;
            email: string;
        }>;
    }>;
}

export async function executeGetWorkspace(
    client: MondayClient,
    params: GetWorkspaceInput
): Promise<OperationResult> {
    try {
        const response = await client.query<GetWorkspaceResponse>(GET_WORKSPACE, {
            workspace_id: params.workspace_id
        });

        const workspace = response.workspaces?.[0];

        if (!workspace) {
            return {
                success: false,
                error: {
                    type: "not_found",
                    message: `Workspace with ID ${params.workspace_id} not found`,
                    retryable: false
                }
            };
        }

        return {
            success: true,
            data: {
                workspace
            }
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
