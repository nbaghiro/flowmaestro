import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AzureDevOpsClient } from "../../client/AzureDevOpsClient";

/**
 * List Comments operation schema
 */
export const listCommentsSchema = z.object({
    project: z.string().describe("Project name or ID"),
    workItemId: z.number().int().describe("Work item ID"),
    top: z.number().int().min(1).max(200).optional().describe("Maximum number of comments")
});

export type ListCommentsParams = z.infer<typeof listCommentsSchema>;

/**
 * List Comments operation definition
 */
export const listCommentsOperation: OperationDefinition = {
    id: "work_items_listComments",
    name: "List Comments",
    description: "List all comments on a work item",
    category: "work-items",
    inputSchema: listCommentsSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute list comments operation
 */
export async function executeListComments(
    client: AzureDevOpsClient,
    params: ListCommentsParams
): Promise<OperationResult> {
    try {
        const queryParams = params.top ? `?$top=${params.top}` : "";

        const response = await client.get<{
            comments: Array<{
                id: number;
                text: string;
                createdBy: {
                    displayName: string;
                };
                createdDate: string;
                modifiedBy?: {
                    displayName: string;
                };
                modifiedDate?: string;
                url: string;
            }>;
            count: number;
        }>(`/${params.project}/_apis/wit/workitems/${params.workItemId}/comments${queryParams}`);

        return {
            success: true,
            data: {
                comments: response.comments || [],
                count: response.count,
                workItemId: params.workItemId,
                project: params.project
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list comments",
                retryable: true
            }
        };
    }
}
