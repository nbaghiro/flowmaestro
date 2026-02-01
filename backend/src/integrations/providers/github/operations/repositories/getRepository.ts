import { z } from "zod";
import { GitHubClient } from "../../client/GitHubClient";
import { GitHubOwnerSchema, GitHubRepoNameSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GitHubRepository } from "../types";

/**
 * Get Repository operation schema
 */
export const getRepositorySchema = z.object({
    owner: GitHubOwnerSchema,
    repo: GitHubRepoNameSchema
});

export type GetRepositoryParams = z.infer<typeof getRepositorySchema>;

/**
 * Get Repository operation definition
 */
export const getRepositoryOperation: OperationDefinition = {
    id: "getRepository",
    name: "Get Repository",
    description: "Get details about a specific repository",
    category: "repositories",
    inputSchema: getRepositorySchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute get repository operation
 */
export async function executeGetRepository(
    client: GitHubClient,
    params: GetRepositoryParams
): Promise<OperationResult> {
    try {
        const repo = await client.get<GitHubRepository>(`/repos/${params.owner}/${params.repo}`);

        return {
            success: true,
            data: {
                id: repo.id,
                name: repo.name,
                full_name: repo.full_name,
                private: repo.private,
                owner: {
                    login: repo.owner.login,
                    id: repo.owner.id,
                    html_url: repo.owner.html_url,
                    type: repo.owner.type
                },
                html_url: repo.html_url,
                description: repo.description,
                fork: repo.fork,
                created_at: repo.created_at,
                updated_at: repo.updated_at,
                pushed_at: repo.pushed_at,
                homepage: repo.homepage,
                size: repo.size,
                stargazers_count: repo.stargazers_count,
                watchers_count: repo.watchers_count,
                language: repo.language,
                forks_count: repo.forks_count,
                open_issues_count: repo.open_issues_count,
                default_branch: repo.default_branch,
                topics: repo.topics,
                visibility: repo.visibility
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get repository",
                retryable: true
            }
        };
    }
}
