import { z } from "zod";
import { getLogger } from "../../../../../core/logging";
import { toJSONSchema } from "../../../../core/schema-utils";
import { ClickUpClient } from "../../client/ClickUpClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";

const logger = getLogger();

/**
 * Create Task Comment operation schema
 */
export const createTaskCommentSchema = z.object({
    taskId: z.string().describe("The task ID to comment on"),
    commentText: z.string().min(1).describe("The comment content"),
    assignee: z.number().optional().describe("User ID to notify")
});

export type CreateTaskCommentParams = z.infer<typeof createTaskCommentSchema>;

/**
 * Create Task Comment operation definition
 */
export const createTaskCommentOperation: OperationDefinition = (() => {
    try {
        return {
            id: "createTaskComment",
            name: "Create Task Comment",
            description: "Add a comment to a task",
            category: "comments",
            actionType: "write",
            inputSchema: createTaskCommentSchema,
            inputSchemaJSON: toJSONSchema(createTaskCommentSchema),
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "ClickUp", err: error },
            "Failed to create createTaskCommentOperation"
        );
        throw new Error(
            `Failed to create createTaskComment operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute create task comment operation
 */
export async function executeCreateTaskComment(
    client: ClickUpClient,
    params: CreateTaskCommentParams
): Promise<OperationResult> {
    try {
        const commentData: {
            comment_text: string;
            assignee?: number;
            notify_all?: boolean;
        } = {
            comment_text: params.commentText
        };

        if (params.assignee) {
            commentData.assignee = params.assignee;
        }

        const comment = await client.createTaskComment(params.taskId, commentData);

        return {
            success: true,
            data: {
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
                    : null
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create comment",
                retryable: true
            }
        };
    }
}
