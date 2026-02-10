import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AzureDevOpsClient } from "../../client/AzureDevOpsClient";

export const getPipelineRunSchema = z.object({
    project: z.string(),
    pipelineId: z.number().int(),
    runId: z.number().int()
});

export type GetPipelineRunParams = z.infer<typeof getPipelineRunSchema>;

export const getPipelineRunOperation: OperationDefinition = {
    id: "pipelines_getRun",
    name: "Get Pipeline Run",
    description: "Get detailed information about a pipeline run",
    category: "pipelines",
    inputSchema: getPipelineRunSchema,
    retryable: true,
    timeout: 30000
};

export async function executeGetPipelineRun(
    client: AzureDevOpsClient,
    params: GetPipelineRunParams
): Promise<OperationResult> {
    try {
        const response = await client.get<Record<string, unknown>>(
            `/${params.project}/_apis/pipelines/${params.pipelineId}/runs/${params.runId}`
        );
        return {
            success: true,
            data: { ...response, project: params.project }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get pipeline run",
                retryable: true
            }
        };
    }
}
