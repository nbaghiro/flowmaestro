import { z } from "zod";
import { toJSONSchema } from "../../../../core/schema-utils";
import { GitLabClient } from "../../client/GitLabClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";

/**
 * Delete Project operation schema
 */
export const deleteProjectSchema = z.object({
    project_id: z
        .string()
        .describe("Project ID (numeric) or URL-encoded path (e.g., 'namespace%2Fproject')")
});

export type DeleteProjectParams = z.infer<typeof deleteProjectSchema>;

/**
 * Delete Project operation definition
 */
export const deleteProjectOperation: OperationDefinition = {
    id: "deleteProject",
    name: "Delete Project",
    description: "Delete a GitLab project (requires Owner permissions)",
    category: "projects",
    actionType: "write",
    inputSchema: deleteProjectSchema,
    inputSchemaJSON: toJSONSchema(deleteProjectSchema),
    retryable: false,
    timeout: 30000
};

/**
 * Execute delete project operation
 */
export async function executeDeleteProject(
    client: GitLabClient,
    params: DeleteProjectParams
): Promise<OperationResult> {
    try {
        const projectId = client.encodeProjectPath(params.project_id);
        await client.delete(`/projects/${projectId}`);

        return {
            success: true,
            data: {
                deleted: true,
                project_id: params.project_id
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
