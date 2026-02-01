import { getTaskCommentsInputSchema, type GetTaskCommentsInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AsanaClient } from "../../client/AsanaClient";

export const getTaskCommentsOperation: OperationDefinition = {
    id: "getTaskComments",
    name: "Get Task Comments",
    description: "Get all comments (stories) on a task in Asana.",
    category: "tasks",
    inputSchema: getTaskCommentsInputSchema,
    retryable: true,
    timeout: 30000
};

export async function executeGetTaskComments(
    client: AsanaClient,
    params: GetTaskCommentsInput
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {};

        if (params.opt_fields && params.opt_fields.length > 0) {
            queryParams.opt_fields = client.buildOptFields(params.opt_fields);
        }

        const stories = await client.getPaginated<Record<string, unknown>>(
            `/tasks/${params.task_gid}/stories`,
            queryParams,
            params.limit
        );

        // Filter to only include comments (not system-generated stories)
        const comments = stories.filter((story) => story.resource_subtype === "comment_added");

        return {
            success: true,
            data: {
                comments,
                count: comments.length,
                task_gid: params.task_gid
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get task comments",
                retryable: true
            }
        };
    }
}
