import { z } from "zod";
import { getLogger } from "../../../../../core/logging";
import { toJSONSchema } from "../../../../core/schema-utils";
import { ClickUpClient } from "../../client/ClickUpClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";

const logger = getLogger();

/**
 * Get Task Comments operation schema
 */
export const getTaskCommentsSchema = z.object({
    taskId: z.string().describe("The task ID to get comments from")
});

export type GetTaskCommentsParams = z.infer<typeof getTaskCommentsSchema>;

/**
 * Get Task Comments operation definition
 */
export const getTaskCommentsOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getTaskComments",
            name: "Get Task Comments",
            description: "Get comments on a task",
            category: "comments",
            actionType: "read",
            inputSchema: getTaskCommentsSchema,
            inputSchemaJSON: toJSONSchema(getTaskCommentsSchema),
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "ClickUp", err: error },
            "Failed to create getTaskCommentsOperation"
        );
        throw new Error(
            `Failed to create getTaskComments operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get task comments operation
 */
export async function executeGetTaskComments(
    client: ClickUpClient,
    params: GetTaskCommentsParams
): Promise<OperationResult> {
    try {
        const response = await client.getTaskComments(params.taskId);

        return {
            success: true,
            data: {
                comments: response.comments.map((comment) => ({
                    id: comment.id,
                    commentText: comment.comment_text,
                    user: comment.user
                        ? {
                              id: comment.user.id,
                              username: comment.user.username,
                              email: comment.user.email
                          }
                        : null,
                    date: comment.date,
                    resolved: comment.resolved,
                    assignee: comment.assignee
                        ? {
                              id: comment.assignee.id,
                              username: comment.assignee.username
                          }
                        : null,
                    reactions: comment.reactions?.map((r) => ({
                        reaction: r.reaction,
                        user: r.user?.username
                    }))
                })),
                count: response.comments.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get comments",
                retryable: true
            }
        };
    }
}
