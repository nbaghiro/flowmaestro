import { z } from "zod";
import type { CircleCIWorkflowOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { CircleCIClient } from "../client/CircleCIClient";

export const getWorkflowSchema = z.object({
    workflowId: z.string().min(1).describe("Workflow ID (UUID)")
});

export type GetWorkflowParams = z.infer<typeof getWorkflowSchema>;

export const getWorkflowOperation: OperationDefinition = {
    id: "getWorkflow",
    name: "Get Workflow",
    description: "Get details of a specific CircleCI workflow",
    category: "workflows",
    inputSchema: getWorkflowSchema,
    retryable: true,
    timeout: 30000
};

export async function executeGetWorkflow(
    client: CircleCIClient,
    params: GetWorkflowParams
): Promise<OperationResult> {
    try {
        const workflow = await client.getWorkflow(params.workflowId);

        const formattedWorkflow: CircleCIWorkflowOutput = {
            id: workflow.id,
            name: workflow.name,
            pipelineId: workflow.pipeline_id,
            pipelineNumber: workflow.pipeline_number,
            projectSlug: workflow.project_slug,
            status: workflow.status,
            startedBy: workflow.started_by,
            createdAt: workflow.created_at,
            stoppedAt: workflow.stopped_at
        };

        return {
            success: true,
            data: {
                workflow: formattedWorkflow
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get workflow",
                retryable: true
            }
        };
    }
}
