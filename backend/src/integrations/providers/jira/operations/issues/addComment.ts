import { toJSONSchema } from "../../../../core/schema-utils";
import { addCommentInputSchema, type AddCommentInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { JiraClient } from "../../client/JiraClient";

export const addCommentOperation: OperationDefinition = {
    id: "addComment",
    name: "Add Comment",
    description: "Add a comment to an issue.",
    category: "issues",
    inputSchema: addCommentInputSchema,
    inputSchemaJSON: toJSONSchema(addCommentInputSchema),
    retryable: true,
    timeout: 10000
};

export async function executeAddComment(
    client: JiraClient,
    params: AddCommentInput
): Promise<OperationResult> {
    try {
        // Build request body
        const requestBody = {
            body: params.body
        };

        // Make API request
        const comment = await client.post<{
            id: string;
            self: string;
            created: string;
        }>(`/rest/api/3/issue/${params.issueIdOrKey}/comment`, requestBody);

        return {
            success: true,
            data: {
                id: comment.id,
                self: comment.self,
                created: comment.created
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to add comment",
                retryable: true
            }
        };
    }
}
