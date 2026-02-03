import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AzureDevOpsClient } from "../../client/AzureDevOpsClient";

export const runPipelineSchema = z.object({
    project: z.string().describe("Project name or ID"),
    pipelineId: z.number().int().describe("Pipeline ID"),
    branch: z.string().optional().describe("Source branch"),
    variables: z.record(z.string()).optional().describe("Pipeline variables")
});

export type RunPipelineParams = z.infer<typeof runPipelineSchema>;

export const runPipelineOperation: OperationDefinition = {
    id: "pipelines_run",
    name: "Run Pipeline",
    description: "Trigger a pipeline execution",
    category: "pipelines",
    inputSchema: runPipelineSchema,
    retryable: false,
    timeout: 30000
};

export async function executeRunPipeline(
    client: AzureDevOpsClient,
    params: RunPipelineParams
): Promise<OperationResult> {
    try {
        const requestBody: Record<string, unknown> = {};

        if (params.branch) {
            requestBody.resources = {
                repositories: {
                    self: {
                        refName: `refs/heads/${params.branch}`
                    }
                }
            };
        }

        if (params.variables) {
            requestBody.variables = params.variables;
        }

        const response = await client.post<{
            id: number;
            name: string;
            state: string;
            createdDate: string;
            url: string;
        }>(`/${params.project}/_apis/pipelines/${params.pipelineId}/runs`, requestBody);

        return {
            success: true,
            data: {
                runId: response.id,
                name: response.name,
                state: response.state,
                createdDate: response.createdDate,
                url: response.url,
                pipelineId: params.pipelineId,
                project: params.project
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to run pipeline",
                retryable: false
            }
        };
    }
}
