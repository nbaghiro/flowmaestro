import { z } from "zod";
import { toJSONSchema } from "../../../../core/schema-utils";
import { BitbucketClient } from "../../client/BitbucketClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { BitbucketRepository, BitbucketPaginatedResponse } from "../types";

/**
 * List Repositories operation schema
 */
export const listRepositoriesSchema = z.object({
    workspace: z.string().min(1).describe("Workspace slug or UUID"),
    role: z
        .enum(["admin", "contributor", "member", "owner"])
        .optional()
        .describe("Filter by user role in the repository"),
    q: z.string().optional().describe("Query string to filter results (e.g., 'name~\"project\"')"),
    sort: z
        .string()
        .optional()
        .describe("Field to sort by (e.g., '-updated_on' for descending by update date)"),
    pagelen: z.number().int().min(1).max(100).optional().default(20).describe("Results per page"),
    page: z.number().int().min(1).optional().default(1).describe("Page number")
});

export type ListRepositoriesParams = z.infer<typeof listRepositoriesSchema>;

/**
 * List Repositories operation definition
 */
export const listRepositoriesOperation: OperationDefinition = {
    id: "listRepositories",
    name: "List Repositories",
    description: "List repositories in a Bitbucket workspace",
    category: "repositories",
    inputSchema: listRepositoriesSchema,
    inputSchemaJSON: toJSONSchema(listRepositoriesSchema),
    retryable: true,
    timeout: 30000
};

/**
 * Execute list repositories operation
 */
export async function executeListRepositories(
    client: BitbucketClient,
    params: ListRepositoriesParams
): Promise<OperationResult> {
    try {
        const { workspace, ...queryParams } = params;

        const response = await client.get<BitbucketPaginatedResponse<BitbucketRepository>>(
            `/repositories/${workspace}`,
            queryParams
        );

        return {
            success: true,
            data: {
                repositories: response.values.map((repo) => ({
                    uuid: repo.uuid,
                    name: repo.name,
                    full_name: repo.full_name,
                    description: repo.description,
                    is_private: repo.is_private,
                    language: repo.language,
                    created_on: repo.created_on,
                    updated_on: repo.updated_on,
                    size: repo.size,
                    has_issues: repo.has_issues,
                    has_wiki: repo.has_wiki,
                    mainbranch: repo.mainbranch?.name,
                    scm: repo.scm,
                    html_url: repo.links.html?.href,
                    workspace: {
                        slug: repo.workspace.slug,
                        name: repo.workspace.name
                    }
                })),
                count: response.values.length,
                page: response.page,
                pagelen: response.pagelen,
                has_more: !!response.next
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
