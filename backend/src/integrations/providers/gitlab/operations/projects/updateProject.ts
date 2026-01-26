import { z } from "zod";
import { toJSONSchema } from "../../../../core/schema-utils";
import { GitLabClient } from "../../client/GitLabClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GitLabProject } from "../types";

/**
 * Update Project operation schema
 */
export const updateProjectSchema = z.object({
    project_id: z
        .string()
        .describe("Project ID (numeric) or URL-encoded path (e.g., 'namespace%2Fproject')"),
    name: z.string().optional().describe("New project name"),
    description: z.string().optional().describe("New project description"),
    visibility: z
        .enum(["private", "internal", "public"])
        .optional()
        .describe("New visibility level"),
    default_branch: z.string().optional().describe("New default branch name"),
    issues_enabled: z.boolean().optional().describe("Enable or disable issues"),
    merge_requests_enabled: z.boolean().optional().describe("Enable or disable merge requests"),
    wiki_enabled: z.boolean().optional().describe("Enable or disable wiki"),
    jobs_enabled: z.boolean().optional().describe("Enable or disable CI/CD jobs"),
    archived: z.boolean().optional().describe("Archive or unarchive the project")
});

export type UpdateProjectParams = z.infer<typeof updateProjectSchema>;

/**
 * Update Project operation definition
 */
export const updateProjectOperation: OperationDefinition = {
    id: "updateProject",
    name: "Update Project",
    description: "Update an existing GitLab project's settings",
    category: "projects",
    actionType: "write",
    inputSchema: updateProjectSchema,
    inputSchemaJSON: toJSONSchema(updateProjectSchema),
    retryable: false,
    timeout: 30000
};

/**
 * Execute update project operation
 */
export async function executeUpdateProject(
    client: GitLabClient,
    params: UpdateProjectParams
): Promise<OperationResult> {
    try {
        const projectId = client.encodeProjectPath(params.project_id);
        const { project_id: _projectId, ...updateData } = params;

        const project = await client.put<GitLabProject>(`/projects/${projectId}`, updateData);

        return {
            success: true,
            data: {
                id: project.id,
                name: project.name,
                path: project.path,
                path_with_namespace: project.path_with_namespace,
                description: project.description,
                visibility: project.visibility,
                web_url: project.web_url,
                default_branch: project.default_branch,
                archived: project.archived,
                issues_enabled: project.issues_enabled,
                merge_requests_enabled: project.merge_requests_enabled,
                wiki_enabled: project.wiki_enabled,
                jobs_enabled: project.jobs_enabled
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update project",
                retryable: false
            }
        };
    }
}
