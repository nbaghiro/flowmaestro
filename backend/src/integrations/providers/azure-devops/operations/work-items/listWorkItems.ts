import { z } from "zod";
import { WorkItemTypeSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AzureDevOpsClient } from "../../client/AzureDevOpsClient";

/**
 * List Work Items operation schema
 */
export const listWorkItemsSchema = z.object({
    project: z.string().describe("Project name or ID"),
    wiql: z.string().optional().describe("WIQL query (Work Item Query Language)"),
    type: WorkItemTypeSchema.optional().describe("Filter by work item type"),
    assignedTo: z.string().optional().describe("Filter by assignee"),
    state: z.string().optional().describe("Filter by state"),
    top: z.number().int().min(1).max(200).optional().describe("Maximum number of items")
});

export type ListWorkItemsParams = z.infer<typeof listWorkItemsSchema>;

/**
 * List Work Items operation definition
 */
export const listWorkItemsOperation: OperationDefinition = {
    id: "work_items_list",
    name: "List Work Items",
    description: "Query work items with filters",
    category: "work-items",
    inputSchema: listWorkItemsSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute list work items operation
 */
export async function executeListWorkItems(
    client: AzureDevOpsClient,
    params: ListWorkItemsParams
): Promise<OperationResult> {
    try {
        let wiql = params.wiql;

        // Build WIQL query if not provided
        if (!wiql) {
            const conditions: string[] = ["[System.TeamProject] = @project"];

            if (params.type) {
                conditions.push(`[System.WorkItemType] = '${params.type}'`);
            }
            if (params.assignedTo) {
                conditions.push(`[System.AssignedTo] = '${params.assignedTo}'`);
            }
            if (params.state) {
                conditions.push(`[System.State] = '${params.state}'`);
            }

            wiql = `SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType], [System.AssignedTo] FROM WorkItems WHERE ${conditions.join(" AND ")}`;

            if (params.top) {
                wiql = `${wiql} ORDER BY [System.ChangedDate] DESC`;
            }
        }

        const queryResponse = await client.post<{
            workItems: Array<{ id: number; url: string }>;
        }>(`/${params.project}/_apis/wit/wiql`, {
            query: wiql
        });

        if (!queryResponse.workItems || queryResponse.workItems.length === 0) {
            return {
                success: true,
                data: {
                    workItems: [],
                    count: 0,
                    project: params.project
                }
            };
        }

        // Get work item IDs
        const ids = queryResponse.workItems
            .slice(0, params.top || 200)
            .map((wi) => wi.id)
            .join(",");

        // Fetch full work item details
        const workItemsResponse = await client.get<{
            value: Array<{
                id: number;
                fields: Record<string, unknown>;
                url: string;
            }>;
        }>(`/${params.project}/_apis/wit/workitems?ids=${ids}`);

        return {
            success: true,
            data: {
                workItems: workItemsResponse.value.map((wi) => ({
                    id: wi.id,
                    title: wi.fields["System.Title"],
                    type: wi.fields["System.WorkItemType"],
                    state: wi.fields["System.State"],
                    assignedTo: wi.fields["System.AssignedTo"],
                    createdDate: wi.fields["System.CreatedDate"],
                    changedDate: wi.fields["System.ChangedDate"],
                    url: wi.url
                })),
                count: workItemsResponse.value.length,
                project: params.project
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list work items",
                retryable: true
            }
        };
    }
}
