import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AzureDevOpsClient } from "../../client/AzureDevOpsClient";

/**
 * Get Work Item History operation schema
 */
export const getWorkItemHistorySchema = z.object({
    project: z.string().describe("Project name or ID"),
    workItemId: z.number().int().describe("Work item ID"),
    top: z.number().int().min(1).max(200).optional().describe("Maximum number of revisions")
});

export type GetWorkItemHistoryParams = z.infer<typeof getWorkItemHistorySchema>;

/**
 * Get Work Item History operation definition
 */
export const getWorkItemHistoryOperation: OperationDefinition = {
    id: "work_items_getHistory",
    name: "Get Work Item History",
    description: "Get revision history for a work item",
    category: "work-items",
    inputSchema: getWorkItemHistorySchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute get work item history operation
 */
export async function executeGetWorkItemHistory(
    client: AzureDevOpsClient,
    params: GetWorkItemHistoryParams
): Promise<OperationResult> {
    try {
        const queryParams = params.top ? `?$top=${params.top}` : "";

        const response = await client.get<{
            count: number;
            value: Array<{
                id: number;
                rev: number;
                fields: Record<string, { oldValue?: unknown; newValue?: unknown }>;
                revisedBy: {
                    displayName: string;
                };
                revisedDate: string;
                url: string;
            }>;
        }>(`/${params.project}/_apis/wit/workitems/${params.workItemId}/revisions${queryParams}`);

        return {
            success: true,
            data: {
                revisions: response.value.map((rev) => ({
                    revision: rev.rev,
                    revisedBy: rev.revisedBy.displayName,
                    revisedDate: rev.revisedDate,
                    changes: Object.entries(rev.fields).map(([field, change]) => ({
                        field,
                        oldValue: change.oldValue,
                        newValue: change.newValue
                    })),
                    url: rev.url
                })),
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
                message: error instanceof Error ? error.message : "Failed to get work item history",
                retryable: true
            }
        };
    }
}
