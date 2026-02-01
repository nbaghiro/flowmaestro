import { z } from "zod";
import { GitHubClient } from "../../client/GitHubClient";
import {
    GitHubPerPageSchema,
    GitHubPageSchema,
    GitHubSortSchema,
    GitHubDirectionSchema
} from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GitHubRepository } from "../types";

/**
 * List Repositories operation schema
 */
export const listRepositoriesSchema = z.object({
    visibility: z.enum(["all", "public", "private"]).optional().default("all"),
    affiliation: z
        .enum(["owner", "collaborator", "organization_member"])
        .optional()
        .default("owner"),
    sort: GitHubSortSchema,
    direction: GitHubDirectionSchema,
    per_page: GitHubPerPageSchema,
    page: GitHubPageSchema
});

export type ListRepositoriesParams = z.infer<typeof listRepositoriesSchema>;

/**
 * List Repositories operation definition
 */
export const listRepositoriesOperation: OperationDefinition = {
    id: "listRepositories",
    name: "List Repositories",
    description: "List repositories for the authenticated user",
    category: "repositories",
    inputSchema: listRepositoriesSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute list repositories operation
 */
export async function executeListRepositories(
    client: GitHubClient,
    params: ListRepositoriesParams
): Promise<OperationResult> {
    try {
        const repositories = await client.get<GitHubRepository[]>("/user/repos", {
            visibility: params.visibility,
            affiliation: params.affiliation,
            sort: params.sort,
            direction: params.direction,
            per_page: params.per_page,
            page: params.page
        });

        return {
            success: true,
            data: {
                repositories: repositories.map((repo) => ({
                    id: repo.id,
                    name: repo.name,
                    full_name: repo.full_name,
                    private: repo.private,
                    html_url: repo.html_url,
                    description: repo.description,
                    created_at: repo.created_at,
                    updated_at: repo.updated_at,
                    stargazers_count: repo.stargazers_count,
                    forks_count: repo.forks_count,
                    language: repo.language,
                    default_branch: repo.default_branch
                })),
                count: repositories.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list repositories",
                retryable: true
            }
        };
    }
}
