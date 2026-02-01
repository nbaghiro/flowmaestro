import { z } from "zod";
import { GitHubClient } from "../../client/GitHubClient";
import {
    GitHubRepoNameSchema,
    GitHubDescriptionSchema,
    GitHubHomepageSchema,
    GitHubBooleanSchema
} from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GitHubRepository } from "../types";

/**
 * Create Repository operation schema
 */
export const createRepositorySchema = z.object({
    name: GitHubRepoNameSchema,
    description: GitHubDescriptionSchema,
    homepage: GitHubHomepageSchema,
    private: z.boolean().optional().default(false).describe("Create as private repository"),
    has_issues: GitHubBooleanSchema.describe("Enable issues"),
    has_projects: GitHubBooleanSchema.describe("Enable projects"),
    has_wiki: GitHubBooleanSchema.describe("Enable wiki"),
    auto_init: GitHubBooleanSchema.describe("Initialize with README"),
    gitignore_template: z.string().optional().describe("Gitignore template (e.g., 'Node')"),
    license_template: z
        .string()
        .optional()
        .describe("License template (e.g., 'mit', 'apache-2.0')"),
    org: z.string().optional().describe("Create in organization (leave empty for user repo)")
});

export type CreateRepositoryParams = z.infer<typeof createRepositorySchema>;

/**
 * Create Repository operation definition
 */
export const createRepositoryOperation: OperationDefinition = {
    id: "createRepository",
    name: "Create Repository",
    description: "Create a new repository for the authenticated user or organization",
    category: "repositories",
    inputSchema: createRepositorySchema,
    retryable: false, // Don't retry creates to avoid duplicates
    timeout: 30000
};

/**
 * Execute create repository operation
 */
export async function executeCreateRepository(
    client: GitHubClient,
    params: CreateRepositoryParams
): Promise<OperationResult> {
    try {
        const body: Record<string, unknown> = {
            name: params.name,
            description: params.description,
            homepage: params.homepage,
            private: params.private,
            has_issues: params.has_issues ?? true,
            has_projects: params.has_projects ?? true,
            has_wiki: params.has_wiki ?? true,
            auto_init: params.auto_init ?? false
        };

        if (params.gitignore_template) {
            body.gitignore_template = params.gitignore_template;
        }

        if (params.license_template) {
            body.license_template = params.license_template;
        }

        // Determine endpoint (user or org)
        const endpoint = params.org ? `/orgs/${params.org}/repos` : "/user/repos";

        const repo = await client.post<GitHubRepository>(endpoint, body);

        return {
            success: true,
            data: {
                id: repo.id,
                name: repo.name,
                full_name: repo.full_name,
                private: repo.private,
                html_url: repo.html_url,
                clone_url: (repo as unknown as { clone_url: string }).clone_url,
                ssh_url: (repo as unknown as { ssh_url: string }).ssh_url,
                description: repo.description,
                default_branch: repo.default_branch,
                created_at: repo.created_at
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create repository",
                retryable: false
            }
        };
    }
}
