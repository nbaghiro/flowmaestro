import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GhostClient } from "../client/GhostClient";

export const deletePostSchema = z.object({
    id: z.string().min(1).describe("The ID of the post to delete")
});

export type DeletePostParams = z.infer<typeof deletePostSchema>;

export const deletePostOperation: OperationDefinition = {
    id: "deletePost",
    name: "Delete Post",
    description: "Permanently delete a post from a Ghost site",
    category: "data",
    inputSchema: deletePostSchema,
    retryable: false,
    timeout: 30000
};

export async function executeDeletePost(
    client: GhostClient,
    params: DeletePostParams
): Promise<OperationResult> {
    try {
        await client.deletePost(params.id);

        return {
            success: true,
            data: {
                id: params.id,
                deleted: true
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete post",
                retryable: false
            }
        };
    }
}
