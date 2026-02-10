import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AzureDevOpsClient } from "../../client/AzureDevOpsClient";

/**
 * Add Comment operation schema
 */
export const addCommentSchema = z.object({
    project: z.string().describe("Project name or ID"),
    workItemId: z.number().int().describe("Work item ID"),
    text: z.string().min(1).describe("Comment text")
});

export type AddCommentParams = z.infer<typeof addCommentSchema>;

/**
 * Add Comment operation definition
 */
export const addCommentOperation: OperationDefinition = {
    id: "work_items_addComment",
    name: "Add Comment",
    description: "Add a comment to a work item",
    category: "work-items",
    inputSchema: addCommentSchema,
    retryable: false,
    timeout: 30000
};

/**
 * Execute add comment operation
 */
export async function executeAddComment(
    client: AzureDevOpsClient,
    params: AddCommentParams
): Promise<OperationResult> {
    try {
        const response = await client.post<{
            id: number;
            text: string;
            createdBy: {
                displayName: string;
            };
            createdDate: string;
            url: string;
        }>(`/${params.project}/_apis/wit/workitems/${params.workItemId}/comments`, {
            text: params.text
        });

        return {
            success: true,
            data: {
                commentId: response.id,
                text: response.text,
                createdBy: response.createdBy.displayName,
                createdDate: response.createdDate,
                workItemId: params.workItemId,
                url: response.url,
                project: params.project
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to add comment",
                retryable: false
            }
        };
    }
}
