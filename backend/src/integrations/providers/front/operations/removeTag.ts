import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { FrontClient } from "../client/FrontClient";

export const removeTagSchema = z.object({
    conversationId: z.string().describe("The conversation ID to remove the tag from"),
    tagId: z.string().describe("The tag ID to remove")
});

export type RemoveTagParams = z.infer<typeof removeTagSchema>;

export const removeTagOperation: OperationDefinition = {
    id: "removeTag",
    name: "Remove Tag",
    description: "Remove a tag from a conversation",
    category: "data",
    inputSchema: removeTagSchema,
    retryable: false,
    timeout: 30000
};

export async function executeRemoveTag(
    client: FrontClient,
    params: RemoveTagParams
): Promise<OperationResult> {
    try {
        await client.removeTag(params.conversationId, params.tagId);

        return {
            success: true,
            data: {
                untagged: true,
                conversationId: params.conversationId,
                tagId: params.tagId
            }
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to remove tag";
        const isNotFound = errorMessage.includes("not found") || errorMessage.includes("404");

        return {
            success: false,
            error: {
                type: isNotFound ? "not_found" : "server_error",
                message: errorMessage,
                retryable: !isNotFound
            }
        };
    }
}
