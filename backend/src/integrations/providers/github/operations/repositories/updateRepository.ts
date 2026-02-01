import { z } from "zod";
import { GitHubClient } from "../../client/GitHubClient";
import {
    GitHubOwnerSchema,
    GitHubRepoNameSchema,
    GitHubDescriptionSchema,
    GitHubHomepageSchema,
    GitHubBooleanSchema
} from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GitHubRepository } from "../types";

/**
 * Update Repository operation schema
 */
export const updateRepositorySchema = z.object({
    owner: GitHubOwnerSchema,
    repo: GitHubRepoNameSchema,
    name: z.string().min(1).optional().describe("New repository name"),
    description: GitHubDescriptionSchema,
    homepage: GitHubHomepageSchema,
    private: z.boolean().optional().describe("Make repository private/public"),
    has_issues: GitHubBooleanSchema.describe("Enable issues"),
    has_projects: GitHubBooleanSchema.describe("Enable projects"),
    has_wiki: GitHubBooleanSchema.describe("Enable wiki"),
    default_branch: z.string().optional().describe("Update default branch"),
    archived: GitHubBooleanSchema.describe("Archive repository")
});

export type UpdateRepositoryParams = z.infer<typeof updateRepositorySchema>;

/**
 * Update Repository operation definition
 */
export const updateRepositoryOperation: OperationDefinition = {
    id: "updateRepository",
    name: "Update Repository",
    description: "Update repository settings",
    category: "repositories",
    inputSchema: updateRepositorySchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute update repository operation
 */
export async function executeUpdateRepository(
    client: GitHubClient,
    params: UpdateRepositoryParams
): Promise<OperationResult> {
    try {
        const body: Record<string, unknown> = {};

        // Only include fields that are provided
        if (params.name !== undefined) body.name = params.name;
        if (params.description !== undefined) body.description = params.description;
        if (params.homepage !== undefined) body.homepage = params.homepage;
        if (params.private !== undefined) body.private = params.private;
        if (params.has_issues !== undefined) body.has_issues = params.has_issues;
        if (params.has_projects !== undefined) body.has_projects = params.has_projects;
        if (params.has_wiki !== undefined) body.has_wiki = params.has_wiki;
        if (params.default_branch !== undefined) body.default_branch = params.default_branch;
        if (params.archived !== undefined) body.archived = params.archived;

        const repo = await client.patch<GitHubRepository>(
            `/repos/${params.owner}/${params.repo}`,
            body
        );

        return {
            success: true,
            data: {
                id: repo.id,
                name: repo.name,
                full_name: repo.full_name,
                private: repo.private,
                html_url: repo.html_url,
                description: repo.description,
                homepage: repo.homepage,
                default_branch: repo.default_branch,
                archived: repo.archived,
                updated_at: repo.updated_at
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update repository",
                retryable: true
            }
        };
    }
}
