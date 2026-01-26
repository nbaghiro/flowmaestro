import { z } from "zod";
import { toJSONSchema } from "../../../../core/schema-utils";
import { BitbucketClient } from "../../client/BitbucketClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { BitbucketRepository } from "../types";

/**
 * Create Repository operation schema
 */
export const createRepositorySchema = z.object({
    workspace: z.string().min(1).describe("Workspace slug or UUID"),
    repo_slug: z.string().min(1).describe("Repository slug (URL-friendly name)"),
    name: z.string().optional().describe("Repository display name (defaults to repo_slug)"),
    description: z.string().optional().describe("Repository description"),
    is_private: z.boolean().optional().default(true).describe("Make the repository private"),
    has_issues: z.boolean().optional().default(true).describe("Enable issue tracker"),
    has_wiki: z.boolean().optional().default(true).describe("Enable wiki"),
    fork_policy: z
        .enum(["allow_forks", "no_public_forks", "no_forks"])
        .optional()
        .default("allow_forks")
        .describe("Fork policy"),
    project_key: z.string().optional().describe("Project key to add the repository to"),
    language: z.string().optional().describe("Primary programming language")
});

export type CreateRepositoryParams = z.infer<typeof createRepositorySchema>;

/**
 * Create Repository operation definition
 */
export const createRepositoryOperation: OperationDefinition = {
    id: "createRepository",
    name: "Create Repository",
    description: "Create a new repository in a Bitbucket workspace",
    category: "repositories",
    actionType: "write",
    inputSchema: createRepositorySchema,
    inputSchemaJSON: toJSONSchema(createRepositorySchema),
    retryable: false,
    timeout: 30000
};

/**
 * Execute create repository operation
 */
export async function executeCreateRepository(
    client: BitbucketClient,
    params: CreateRepositoryParams
): Promise<OperationResult> {
    try {
        const { workspace, repo_slug, project_key, ...repoData } = params;

        const requestBody: Record<string, unknown> = {
            scm: "git",
            ...repoData
        };

        // Add project if specified
        if (project_key) {
            requestBody.project = { key: project_key };
        }

        const repo = await client.post<BitbucketRepository>(
            `/repositories/${workspace}/${repo_slug}`,
            requestBody
        );

        return {
            success: true,
            data: {
                uuid: repo.uuid,
                name: repo.name,
                full_name: repo.full_name,
                description: repo.description,
                is_private: repo.is_private,
                created_on: repo.created_on,
                html_url: repo.links.html?.href,
                workspace: {
                    slug: repo.workspace.slug,
                    name: repo.workspace.name
                }
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
