import { z } from "zod";
import { BitbucketClient } from "../../client/BitbucketClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { BitbucketRepository } from "../types";

/**
 * Get Repository operation schema
 */
export const getRepositorySchema = z.object({
    workspace: z.string().min(1).describe("Workspace slug or UUID"),
    repo_slug: z.string().min(1).describe("Repository slug")
});

export type GetRepositoryParams = z.infer<typeof getRepositorySchema>;

/**
 * Get Repository operation definition
 */
export const getRepositoryOperation: OperationDefinition = {
    id: "getRepository",
    name: "Get Repository",
    description: "Get details of a specific Bitbucket repository",
    category: "repositories",
    inputSchema: getRepositorySchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute get repository operation
 */
export async function executeGetRepository(
    client: BitbucketClient,
    params: GetRepositoryParams
): Promise<OperationResult> {
    try {
        const repo = await client.get<BitbucketRepository>(
            `/repositories/${params.workspace}/${params.repo_slug}`
        );

        return {
            success: true,
            data: {
                uuid: repo.uuid,
                name: repo.name,
                full_name: repo.full_name,
                description: repo.description,
                is_private: repo.is_private,
                fork_policy: repo.fork_policy,
                language: repo.language,
                created_on: repo.created_on,
                updated_on: repo.updated_on,
                size: repo.size,
                has_issues: repo.has_issues,
                has_wiki: repo.has_wiki,
                mainbranch: repo.mainbranch?.name,
                scm: repo.scm,
                html_url: repo.links.html?.href,
                clone_url: repo.links.self?.href,
                workspace: {
                    uuid: repo.workspace.uuid,
                    slug: repo.workspace.slug,
                    name: repo.workspace.name
                },
                project: repo.project
                    ? {
                          uuid: repo.project.uuid,
                          key: repo.project.key,
                          name: repo.project.name
                      }
                    : null,
                owner: {
                    uuid: repo.owner.uuid,
                    display_name:
                        "display_name" in repo.owner ? repo.owner.display_name : repo.owner.name
                }
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
