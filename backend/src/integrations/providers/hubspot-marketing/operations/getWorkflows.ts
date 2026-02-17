import { z } from "zod";
import type { HubspotMarketingWorkflowOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { HubspotMarketingClient } from "../client/HubspotMarketingClient";

export const getWorkflowsSchema = z.object({});

export type GetWorkflowsParams = z.infer<typeof getWorkflowsSchema>;

export const getWorkflowsOperation: OperationDefinition = {
    id: "getWorkflows",
    name: "Get Workflows",
    description: "Get all automation workflows from HubSpot Marketing",
    category: "workflows",
    inputSchema: getWorkflowsSchema,
    retryable: true,
    timeout: 15000
};

export async function executeGetWorkflows(
    client: HubspotMarketingClient,
    _params: GetWorkflowsParams
): Promise<OperationResult> {
    try {
        const response = await client.getWorkflows();

        const workflows: HubspotMarketingWorkflowOutput[] = response.workflows.map((workflow) => ({
            id: workflow.id,
            name: workflow.name,
            type: workflow.type,
            enabled: workflow.enabled,
            createdAt: new Date(workflow.insertedAt).toISOString(),
            updatedAt: new Date(workflow.updatedAt).toISOString(),
            enrolledCount: workflow.contactListIds?.enrolled,
            activeCount: workflow.contactListIds?.active,
            completedCount: workflow.contactListIds?.completed
        }));

        return {
            success: true,
            data: {
                workflows,
                totalItems: workflows.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get workflows",
                retryable: true
            }
        };
    }
}
