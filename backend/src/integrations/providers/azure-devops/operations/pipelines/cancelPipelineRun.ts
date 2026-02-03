import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AzureDevOpsClient } from "../../client/AzureDevOpsClient";

export const cancelPipelineRunSchema = z.object({
    project: z.string(),
    pipelineId: z.number().int(),
    runId: z.number().int()
});

export type CancelPipelineRunParams = z.infer<typeof cancelPipelineRunSchema>;

export const cancelPipelineRunOperation: OperationDefinition = {
    id: "pipelines_cancelRun",
    name: "Cancel Pipeline Run",
    description: "Cancel a running pipeline",
    category: "pipelines",
    inputSchema: cancelPipelineRunSchema,
    retryable: false,
    timeout: 30000
};

export async function executeCancelPipelineRun(
    client: AzureDevOpsClient,
    params: CancelPipelineRunParams
): Promise<OperationResult> {
    try {
        await client.patch(`/${params.project}/_apis/build/builds/${params.runId}`, {
            status: "Cancelling"
        });
        return {
            success: true,
            data: {
                runId: params.runId,
                message: "Pipeline run cancelled",
                project: params.project
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to cancel pipeline run",
                retryable: false
            }
        };
    }
}
