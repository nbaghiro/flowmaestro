import { z } from "zod";
import { WorkItemTypeSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AzureDevOpsClient } from "../../client/AzureDevOpsClient";

/**
 * Create Work Item operation schema
 */
export const createWorkItemSchema = z.object({
    project: z.string().describe("Project name or ID"),
    type: WorkItemTypeSchema.describe("Work item type"),
    title: z.string().min(1).describe("Work item title"),
    description: z.string().optional().describe("Work item description"),
    assignedTo: z.string().optional().describe("Assignee email or name"),
    priority: z.number().int().min(1).max(4).optional().describe("Priority (1-4)"),
    tags: z.string().optional().describe("Comma-separated tags"),
    additionalFields: z.record(z.unknown()).optional().describe("Additional field values")
});

export type CreateWorkItemParams = z.infer<typeof createWorkItemSchema>;

/**
 * Create Work Item operation definition
 */
export const createWorkItemOperation: OperationDefinition = {
    id: "work_items_create",
    name: "Create Work Item",
    description: "Create a new work item (bug, task, user story, etc.)",
    category: "work-items",
    inputSchema: createWorkItemSchema,
    retryable: false,
    timeout: 30000
};

/**
 * Execute create work item operation
 */
export async function executeCreateWorkItem(
    client: AzureDevOpsClient,
    params: CreateWorkItemParams
): Promise<OperationResult> {
    try {
        const patchDocument: Array<{
            op: string;
            path: string;
            value: unknown;
        }> = [
            {
                op: "add",
                path: "/fields/System.Title",
                value: params.title
            }
        ];

        if (params.description) {
            patchDocument.push({
                op: "add",
                path: "/fields/System.Description",
                value: params.description
            });
        }

        if (params.assignedTo) {
            patchDocument.push({
                op: "add",
                path: "/fields/System.AssignedTo",
                value: params.assignedTo
            });
        }

        if (params.priority) {
            patchDocument.push({
                op: "add",
                path: "/fields/Microsoft.VSTS.Common.Priority",
                value: params.priority
            });
        }

        if (params.tags) {
            patchDocument.push({
                op: "add",
                path: "/fields/System.Tags",
                value: params.tags
            });
        }

        // Add additional fields
        if (params.additionalFields) {
            Object.entries(params.additionalFields).forEach(([key, value]) => {
                patchDocument.push({
                    op: "add",
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
            method: "POST",
            url: `/${params.project}/_apis/wit/workitems/$${params.type}`,
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
                type: params.type,
                title: params.title,
                url: response.url,
                project: params.project
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create work item",
                retryable: false
            }
        };
    }
}
