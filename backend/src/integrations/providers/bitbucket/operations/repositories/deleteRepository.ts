import { z } from "zod";
import { BitbucketClient } from "../../client/BitbucketClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";

/**
 * Delete Repository operation schema
 */
export const deleteRepositorySchema = z.object({
    workspace: z.string().min(1).describe("Workspace slug or UUID"),
    repo_slug: z.string().min(1).describe("Repository slug")
});

export type DeleteRepositoryParams = z.infer<typeof deleteRepositorySchema>;

/**
 * Delete Repository operation definition
 */
export const deleteRepositoryOperation: OperationDefinition = {
    id: "deleteRepository",
    name: "Delete Repository",
    description: "Delete a Bitbucket repository (requires admin permissions)",
    category: "repositories",
    actionType: "write",
    inputSchema: deleteRepositorySchema,
    retryable: false,
    timeout: 30000
};

/**
 * Execute delete repository operation
 */
export async function executeDeleteRepository(
    client: BitbucketClient,
    params: DeleteRepositoryParams
): Promise<OperationResult> {
    try {
        await client.delete(`/repositories/${params.workspace}/${params.repo_slug}`);

        return {
            success: true,
            data: {
                deleted: true,
                workspace: params.workspace,
                repo_slug: params.repo_slug
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
