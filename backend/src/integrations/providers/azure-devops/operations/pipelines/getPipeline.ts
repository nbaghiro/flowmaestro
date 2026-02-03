import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AzureDevOpsClient } from "../../client/AzureDevOpsClient";

export const getPipelineSchema = z.object({
    project: z.string().describe("Project name or ID"),
    pipelineId: z.number().int().describe("Pipeline ID")
});

export type GetPipelineParams = z.infer<typeof getPipelineSchema>;

export const getPipelineOperation: OperationDefinition = {
    id: "pipelines_get",
    name: "Get Pipeline",
    description: "Get detailed information about a pipeline",
    category: "pipelines",
    inputSchema: getPipelineSchema,
    retryable: true,
    timeout: 30000
};

export async function executeGetPipeline(
    client: AzureDevOpsClient,
    params: GetPipelineParams
): Promise<OperationResult> {
    try {
        const response = await client.get<{
            id: number;
            name: string;
            folder: string;
            configuration: object;
            url: string;
        }>(`/${params.project}/_apis/pipelines/${params.pipelineId}`);

        return {
            success: true,
            data: {
                ...response,
                project: params.project
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get pipeline",
                retryable: true
            }
        };
    }
}
