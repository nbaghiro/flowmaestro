import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AzureDevOpsClient } from "../../client/AzureDevOpsClient";

/**
 * Get Work Item operation schema
 */
export const getWorkItemSchema = z.object({
    project: z.string().describe("Project name or ID"),
    workItemId: z.number().int().describe("Work item ID")
});

export type GetWorkItemParams = z.infer<typeof getWorkItemSchema>;

/**
 * Get Work Item operation definition
 */
export const getWorkItemOperation: OperationDefinition = {
    id: "work_items_get",
    name: "Get Work Item",
    description: "Get detailed information about a specific work item",
    category: "work-items",
    inputSchema: getWorkItemSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute get work item operation
 */
export async function executeGetWorkItem(
    client: AzureDevOpsClient,
    params: GetWorkItemParams
): Promise<OperationResult> {
    try {
        const response = await client.get<{
            id: number;
            rev: number;
            fields: Record<string, unknown>;
            relations?: Array<{
                rel: string;
                url: string;
                attributes: Record<string, unknown>;
            }>;
            url: string;
        }>(`/${params.project}/_apis/wit/workitems/${params.workItemId}`);

        return {
            success: true,
            data: {
                id: response.id,
                revision: response.rev,
                type: response.fields["System.WorkItemType"],
                title: response.fields["System.Title"],
                state: response.fields["System.State"],
                assignedTo: response.fields["System.AssignedTo"],
                description: response.fields["System.Description"],
                createdBy: response.fields["System.CreatedBy"],
                createdDate: response.fields["System.CreatedDate"],
                changedDate: response.fields["System.ChangedDate"],
                tags: response.fields["System.Tags"],
                priority: response.fields["Microsoft.VSTS.Common.Priority"],
                fields: response.fields,
                relations: response.relations,
                url: response.url,
                project: params.project
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get work item",
                retryable: true
            }
        };
    }
}
