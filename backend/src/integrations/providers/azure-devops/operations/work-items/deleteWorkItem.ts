import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AzureDevOpsClient } from "../../client/AzureDevOpsClient";

/**
 * Delete Work Item operation schema
 */
export const deleteWorkItemSchema = z.object({
    project: z.string().describe("Project name or ID"),
    workItemId: z.number().int().describe("Work item ID")
});

export type DeleteWorkItemParams = z.infer<typeof deleteWorkItemSchema>;

/**
 * Delete Work Item operation definition
 */
export const deleteWorkItemOperation: OperationDefinition = {
    id: "work_items_delete",
    name: "Delete Work Item",
    description: "Delete a work item",
    category: "work-items",
    inputSchema: deleteWorkItemSchema,
    retryable: false,
    timeout: 30000
};

/**
 * Execute delete work item operation
 */
export async function executeDeleteWorkItem(
    client: AzureDevOpsClient,
    params: DeleteWorkItemParams
): Promise<OperationResult> {
    try {
        await client.delete(`/${params.project}/_apis/wit/workitems/${params.workItemId}`);

        return {
            success: true,
            data: {
                workItemId: params.workItemId,
                message: "Work item deleted successfully",
                deletedAt: new Date().toISOString(),
                project: params.project
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete work item",
                retryable: false
            }
        };
    }
}
