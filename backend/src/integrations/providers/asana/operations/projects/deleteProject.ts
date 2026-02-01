import { deleteProjectInputSchema, type DeleteProjectInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AsanaClient } from "../../client/AsanaClient";

export const deleteProjectOperation: OperationDefinition = {
    id: "deleteProject",
    name: "Delete Project",
    description: "Delete a project from Asana. This action cannot be undone.",
    category: "projects",
    inputSchema: deleteProjectInputSchema,
    retryable: false,
    timeout: 10000
};

export async function executeDeleteProject(
    client: AsanaClient,
    params: DeleteProjectInput
): Promise<OperationResult> {
    try {
        await client.deleteAsana(`/projects/${params.project_gid}`);

        return {
            success: true,
            data: {
                deleted: true,
                project_gid: params.project_gid
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete project",
                retryable: false
            }
        };
    }
}
