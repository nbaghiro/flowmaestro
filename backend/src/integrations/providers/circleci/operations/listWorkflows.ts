import { z } from "zod";
import type { CircleCIWorkflowOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { CircleCIClient } from "../client/CircleCIClient";

export const listWorkflowsSchema = z.object({
    pipelineId: z.string().min(1).describe("Pipeline ID (UUID) to list workflows for")
});

export type ListWorkflowsParams = z.infer<typeof listWorkflowsSchema>;

export const listWorkflowsOperation: OperationDefinition = {
    id: "listWorkflows",
    name: "List Workflows",
    description: "List all workflows in a CircleCI pipeline",
    category: "workflows",
    inputSchema: listWorkflowsSchema,
    retryable: true,
    timeout: 30000
};

export async function executeListWorkflows(
    client: CircleCIClient,
    params: ListWorkflowsParams
): Promise<OperationResult> {
    try {
        const workflows = await client.listWorkflows(params.pipelineId);

        const formattedWorkflows: CircleCIWorkflowOutput[] = workflows.map((w) => ({
            id: w.id,
            name: w.name,
            pipelineId: w.pipeline_id,
            pipelineNumber: w.pipeline_number,
            projectSlug: w.project_slug,
            status: w.status,
            startedBy: w.started_by,
            createdAt: w.created_at,
            stoppedAt: w.stopped_at
        }));

        return {
            success: true,
            data: {
                workflows: formattedWorkflows,
                count: formattedWorkflows.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list workflows",
                retryable: true
            }
        };
    }
}
