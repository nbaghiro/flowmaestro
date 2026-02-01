import { z } from "zod";
import { GitLabClient } from "../../client/GitLabClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GitLabProject } from "../types";

/**
 * Get Project operation schema
 */
export const getProjectSchema = z.object({
    project_id: z
        .string()
        .describe("Project ID (numeric) or URL-encoded path (e.g., 'namespace%2Fproject')")
});

export type GetProjectParams = z.infer<typeof getProjectSchema>;

/**
 * Get Project operation definition
 */
export const getProjectOperation: OperationDefinition = {
    id: "getProject",
    name: "Get Project",
    description: "Get details of a specific GitLab project",
    category: "projects",
    inputSchema: getProjectSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute get project operation
 */
export async function executeGetProject(
    client: GitLabClient,
    params: GetProjectParams
): Promise<OperationResult> {
    try {
        const projectId = client.encodeProjectPath(params.project_id);
        const project = await client.get<GitLabProject>(`/projects/${projectId}`);

        return {
            success: true,
            data: {
                id: project.id,
                name: project.name,
                path: project.path,
                path_with_namespace: project.path_with_namespace,
                name_with_namespace: project.name_with_namespace,
                description: project.description,
                visibility: project.visibility,
                web_url: project.web_url,
                http_url_to_repo: project.http_url_to_repo,
                ssh_url_to_repo: project.ssh_url_to_repo,
                default_branch: project.default_branch,
                created_at: project.created_at,
                last_activity_at: project.last_activity_at,
                star_count: project.star_count,
                forks_count: project.forks_count,
                open_issues_count: project.open_issues_count,
                archived: project.archived,
                issues_enabled: project.issues_enabled,
                merge_requests_enabled: project.merge_requests_enabled,
                wiki_enabled: project.wiki_enabled,
                jobs_enabled: project.jobs_enabled,
                namespace: project.namespace
                    ? {
                          id: project.namespace.id,
                          name: project.namespace.name,
                          path: project.namespace.path,
                          kind: project.namespace.kind,
                          full_path: project.namespace.full_path
                      }
                    : null
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get project",
                retryable: true
            }
        };
    }
}
