import { z } from "zod";
import { toJSONSchema } from "../../../../core/schema-utils";
import { GitLabClient } from "../../client/GitLabClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GitLabProject } from "../types";

/**
 * List Projects operation schema
 */
export const listProjectsSchema = z.object({
    membership: z
        .boolean()
        .optional()
        .default(true)
        .describe("Limit to projects the user is a member of"),
    owned: z.boolean().optional().describe("Limit to projects explicitly owned by the user"),
    visibility: z
        .enum(["public", "internal", "private"])
        .optional()
        .describe("Filter by project visibility"),
    search: z.string().optional().describe("Search for projects by name"),
    order_by: z
        .enum(["id", "name", "path", "created_at", "updated_at", "last_activity_at"])
        .optional()
        .default("last_activity_at")
        .describe("Order projects by field"),
    sort: z.enum(["asc", "desc"]).optional().default("desc").describe("Sort direction"),
    per_page: z.number().int().min(1).max(100).optional().default(20).describe("Results per page"),
    page: z.number().int().min(1).optional().default(1).describe("Page number")
});

export type ListProjectsParams = z.infer<typeof listProjectsSchema>;

/**
 * List Projects operation definition
 */
export const listProjectsOperation: OperationDefinition = {
    id: "listProjects",
    name: "List Projects",
    description: "List GitLab projects accessible by the authenticated user",
    category: "projects",
    inputSchema: listProjectsSchema,
    inputSchemaJSON: toJSONSchema(listProjectsSchema),
    retryable: true,
    timeout: 30000
};

/**
 * Execute list projects operation
 */
export async function executeListProjects(
    client: GitLabClient,
    params: ListProjectsParams
): Promise<OperationResult> {
    try {
        const projects = await client.get<GitLabProject[]>("/projects", {
            membership: params.membership,
            owned: params.owned,
            visibility: params.visibility,
            search: params.search,
            order_by: params.order_by,
            sort: params.sort,
            per_page: params.per_page,
            page: params.page
        });

        return {
            success: true,
            data: {
                projects: projects.map((project) => ({
                    id: project.id,
                    name: project.name,
                    path: project.path,
                    path_with_namespace: project.path_with_namespace,
                    description: project.description,
                    visibility: project.visibility,
                    web_url: project.web_url,
                    default_branch: project.default_branch,
                    created_at: project.created_at,
                    last_activity_at: project.last_activity_at,
                    star_count: project.star_count,
                    forks_count: project.forks_count,
                    open_issues_count: project.open_issues_count,
                    archived: project.archived
                })),
                count: projects.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list projects",
                retryable: true
            }
        };
    }
}
