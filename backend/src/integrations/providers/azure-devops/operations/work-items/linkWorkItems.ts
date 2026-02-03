import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AzureDevOpsClient } from "../../client/AzureDevOpsClient";

/**
 * Link Work Items operation schema
 */
export const linkWorkItemsSchema = z.object({
    project: z.string().describe("Project name or ID"),
    sourceWorkItemId: z.number().int().describe("Source work item ID"),
    targetWorkItemId: z.number().int().describe("Target work item ID"),
    linkType: z
        .enum(["Related", "Parent", "Child", "Predecessor", "Successor"])
        .describe("Type of relationship")
});

export type LinkWorkItemsParams = z.infer<typeof linkWorkItemsSchema>;

/**
 * Link Work Items operation definition
 */
export const linkWorkItemsOperation: OperationDefinition = {
    id: "work_items_link",
    name: "Link Work Items",
    description: "Create a link between two work items",
    category: "work-items",
    inputSchema: linkWorkItemsSchema,
    retryable: false,
    timeout: 30000
};

/**
 * Execute link work items operation
 */
export async function executeLinkWorkItems(
    client: AzureDevOpsClient,
    params: LinkWorkItemsParams
): Promise<OperationResult> {
    try {
        const linkTypeMap: Record<string, string> = {
            Related: "System.LinkTypes.Related",
            Parent: "System.LinkTypes.Hierarchy-Reverse",
            Child: "System.LinkTypes.Hierarchy-Forward",
            Predecessor: "System.LinkTypes.Dependency-Reverse",
            Successor: "System.LinkTypes.Dependency-Forward"
        };

        const patchDocument = [
            {
                op: "add",
                path: "/relations/-",
                value: {
                    rel: linkTypeMap[params.linkType],
                    url: `https://dev.azure.com/${client.organization}/${params.project}/_apis/wit/workItems/${params.targetWorkItemId}`,
                    attributes: {
                        comment: "Linked via FlowMaestro"
                    }
                }
            }
        ];

        const response = await client.request<{
            id: number;
            rev: number;
            relations: Array<{
                rel: string;
                url: string;
            }>;
        }>({
            method: "PATCH",
            url: `/${params.project}/_apis/wit/workitems/${params.sourceWorkItemId}`,
            data: patchDocument,
            headers: {
                "Content-Type": "application/json-patch+json"
            }
        });

        return {
            success: true,
            data: {
                sourceWorkItemId: params.sourceWorkItemId,
                targetWorkItemId: params.targetWorkItemId,
                linkType: params.linkType,
                revision: response.rev,
                project: params.project
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to link work items",
                retryable: false
            }
        };
    }
}
