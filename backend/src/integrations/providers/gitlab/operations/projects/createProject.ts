import { z } from "zod";
import { toJSONSchema } from "../../../../core/schema-utils";
import { GitLabClient } from "../../client/GitLabClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GitLabProject } from "../types";

/**
 * Create Project operation schema
 */
export const createProjectSchema = z.object({
    name: z.string().min(1).describe("Project name"),
    path: z.string().optional().describe("Repository path (defaults to name if not provided)"),
    namespace_id: z.number().int().optional().describe("Namespace ID to create the project in"),
    description: z.string().optional().describe("Project description"),
    visibility: z
        .enum(["private", "internal", "public"])
        .optional()
        .default("private")
        .describe("Project visibility level"),
    initialize_with_readme: z
        .boolean()
        .optional()
        .default(false)
        .describe("Initialize repository with a README"),
    default_branch: z.string().optional().describe("Default branch name (defaults to 'main')"),
    issues_enabled: z.boolean().optional().default(true).describe("Enable issues"),
    merge_requests_enabled: z.boolean().optional().default(true).describe("Enable merge requests"),
    wiki_enabled: z.boolean().optional().default(true).describe("Enable wiki"),
    jobs_enabled: z.boolean().optional().default(true).describe("Enable CI/CD jobs")
});

export type CreateProjectParams = z.infer<typeof createProjectSchema>;

/**
 * Create Project operation definition
 */
export const createProjectOperation: OperationDefinition = {
    id: "createProject",
    name: "Create Project",
    description: "Create a new GitLab project",
    category: "projects",
    actionType: "write",
    inputSchema: createProjectSchema,
    inputSchemaJSON: toJSONSchema(createProjectSchema),
    retryable: false,
    timeout: 30000
};

/**
 * Execute create project operation
 */
export async function executeCreateProject(
    client: GitLabClient,
    params: CreateProjectParams
): Promise<OperationResult> {
    try {
        const project = await client.post<GitLabProject>("/projects", {
            name: params.name,
            path: params.path,
            namespace_id: params.namespace_id,
            description: params.description,
            visibility: params.visibility,
            initialize_with_readme: params.initialize_with_readme,
            default_branch: params.default_branch,
            issues_enabled: params.issues_enabled,
            merge_requests_enabled: params.merge_requests_enabled,
            wiki_enabled: params.wiki_enabled,
            jobs_enabled: params.jobs_enabled
        });

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
                http_url_to_repo: project.http_url_to_repo,
                ssh_url_to_repo: project.ssh_url_to_repo,
                default_branch: project.default_branch,
                created_at: project.created_at
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create project",
                retryable: false
            }
        };
    }
}
