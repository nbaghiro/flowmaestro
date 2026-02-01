import { z } from "zod";
import { GitHubClient } from "../../client/GitHubClient";
import { GitHubOwnerSchema, GitHubRepoNameSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";

/**
 * Delete Repository operation schema
 */
export const deleteRepositorySchema = z.object({
    owner: GitHubOwnerSchema,
    repo: GitHubRepoNameSchema
});

export type DeleteRepositoryParams = z.infer<typeof deleteRepositorySchema>;

/**
 * Delete Repository operation definition
 */
export const deleteRepositoryOperation: OperationDefinition = {
    id: "deleteRepository",
    name: "Delete Repository",
    description: "Delete a repository (requires admin permissions)",
    category: "repositories",
    inputSchema: deleteRepositorySchema,
    retryable: false,
    timeout: 15000
};

/**
 * Execute delete repository operation
 */
export async function executeDeleteRepository(
    client: GitHubClient,
    params: DeleteRepositoryParams
): Promise<OperationResult> {
    try {
        await client.delete(`/repos/${params.owner}/${params.repo}`);

        return {
            success: true,
            data: {
                message: `Repository ${params.owner}/${params.repo} deleted successfully`,
                deleted_at: new Date().toISOString()
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete repository",
                retryable: false
            }
        };
    }
}
