import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { FrontClient } from "../client/FrontClient";

export const addTagSchema = z.object({
    conversationId: z.string().describe("The conversation ID to tag"),
    tagId: z.string().describe("The tag ID to add")
});

export type AddTagParams = z.infer<typeof addTagSchema>;

export const addTagOperation: OperationDefinition = {
    id: "addTag",
    name: "Add Tag",
    description: "Add a tag to a conversation",
    category: "data",
    inputSchema: addTagSchema,
    retryable: false,
    timeout: 30000
};

export async function executeAddTag(
    client: FrontClient,
    params: AddTagParams
): Promise<OperationResult> {
    try {
        await client.addTag(params.conversationId, params.tagId);

        return {
            success: true,
            data: {
                tagged: true,
                conversationId: params.conversationId,
                tagId: params.tagId
            }
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to add tag";
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
