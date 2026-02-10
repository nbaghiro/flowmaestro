import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AzureDevOpsClient } from "../../client/AzureDevOpsClient";

/**
 * Update Work Item operation schema
 */
export const updateWorkItemSchema = z.object({
    project: z.string().describe("Project name or ID"),
    workItemId: z.number().int().describe("Work item ID"),
    title: z.string().optional().describe("New title"),
    description: z.string().optional().describe("New description"),
    assignedTo: z.string().optional().describe("New assignee email or name"),
    state: z.string().optional().describe("New state"),
    priority: z.number().int().min(1).max(4).optional().describe("New priority (1-4)"),
    tags: z.string().optional().describe("New comma-separated tags"),
    additionalFields: z.record(z.unknown()).optional().describe("Additional field updates")
});

export type UpdateWorkItemParams = z.infer<typeof updateWorkItemSchema>;

/**
 * Update Work Item operation definition
 */
export const updateWorkItemOperation: OperationDefinition = {
    id: "work_items_update",
    name: "Update Work Item",
    description: "Update work item fields",
    category: "work-items",
    inputSchema: updateWorkItemSchema,
    retryable: false,
    timeout: 30000
};

/**
 * Execute update work item operation
 */
export async function executeUpdateWorkItem(
    client: AzureDevOpsClient,
    params: UpdateWorkItemParams
): Promise<OperationResult> {
    try {
        const patchDocument: Array<{
            op: string;
            path: string;
            value: unknown;
        }> = [];

        if (params.title) {
            patchDocument.push({
                op: "replace",
                path: "/fields/System.Title",
                value: params.title
            });
        }

        if (params.description !== undefined) {
            patchDocument.push({
                op: "replace",
                path: "/fields/System.Description",
                value: params.description
            });
        }

        if (params.assignedTo) {
            patchDocument.push({
                op: "replace",
                path: "/fields/System.AssignedTo",
                value: params.assignedTo
            });
        }

        if (params.state) {
            patchDocument.push({
                op: "replace",
                path: "/fields/System.State",
                value: params.state
            });
        }

        if (params.priority) {
            patchDocument.push({
                op: "replace",
                path: "/fields/Microsoft.VSTS.Common.Priority",
                value: params.priority
            });
        }

        if (params.tags !== undefined) {
            patchDocument.push({
                op: "replace",
                path: "/fields/System.Tags",
                value: params.tags
            });
        }

        // Add additional field updates
        if (params.additionalFields) {
            Object.entries(params.additionalFields).forEach(([key, value]) => {
                patchDocument.push({
                    op: "replace",
                    path: `/fields/${key}`,
                    value
                });
            });
        }

        const response = await client.request<{
            id: number;
            rev: number;
            fields: Record<string, unknown>;
            url: string;
        }>({
            method: "PATCH",
            url: `/${params.project}/_apis/wit/workitems/${params.workItemId}`,
            data: patchDocument,
            headers: {
                "Content-Type": "application/json-patch+json"
            }
        });

        return {
            success: true,
            data: {
                id: response.id,
                revision: response.rev,
                fields: response.fields,
                url: response.url,
                project: params.project
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update work item",
                retryable: false
            }
        };
    }
}
