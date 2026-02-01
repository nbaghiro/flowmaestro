import { addCommentToTaskInputSchema, type AddCommentToTaskInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AsanaClient } from "../../client/AsanaClient";

export const addCommentToTaskOperation: OperationDefinition = {
    id: "addCommentToTask",
    name: "Add Comment to Task",
    description: "Add a comment (story) to a task in Asana.",
    category: "tasks",
    inputSchema: addCommentToTaskInputSchema,
    retryable: true,
    timeout: 10000
};

export async function executeAddCommentToTask(
    client: AsanaClient,
    params: AddCommentToTaskInput
): Promise<OperationResult> {
    try {
        const commentData: Record<string, unknown> = {
            text: params.text
        };

        if (params.html_text !== undefined) {
            commentData.html_text = params.html_text;
        }
        if (params.is_pinned !== undefined) {
            commentData.is_pinned = params.is_pinned;
        }

        const response = await client.postAsana<{
            gid: string;
            text: string;
            resource_type: string;
            created_at: string;
        }>(`/tasks/${params.task_gid}/stories`, commentData);

        return {
            success: true,
            data: {
                gid: response.gid,
                text: response.text,
                resource_type: response.resource_type,
                created_at: response.created_at,
                task_gid: params.task_gid
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to add comment to task",
                retryable: true
            }
        };
    }
}
