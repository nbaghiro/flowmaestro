import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AzureDevOpsClient } from "../../client/AzureDevOpsClient";

export const listPipelineRunsSchema = z.object({
    project: z.string().describe("Project name or ID"),
    pipelineId: z.number().int().describe("Pipeline ID"),
    top: z.number().int().min(1).max(100).optional().describe("Maximum number of runs")
});

export type ListPipelineRunsParams = z.infer<typeof listPipelineRunsSchema>;

export const listPipelineRunsOperation: OperationDefinition = {
    id: "pipelines_listRuns",
    name: "List Pipeline Runs",
    description: "List recent pipeline runs",
    category: "pipelines",
    inputSchema: listPipelineRunsSchema,
    retryable: true,
    timeout: 30000
};

export async function executeListPipelineRuns(
    client: AzureDevOpsClient,
    params: ListPipelineRunsParams
): Promise<OperationResult> {
    try {
        const queryParams = params.top ? `?$top=${params.top}` : "";

        const response = await client.get<{
            value: Array<{
                id: number;
                name: string;
                state: string;
                result?: string;
                createdDate: string;
                finishedDate?: string;
                url: string;
            }>;
            count: number;
        }>(`/${params.project}/_apis/pipelines/${params.pipelineId}/runs${queryParams}`);

        return {
            success: true,
            data: {
                runs: response.value,
                count: response.count,
                pipelineId: params.pipelineId,
                project: params.project
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list pipeline runs",
                retryable: true
            }
        };
    }
}
