import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AzureDevOpsClient } from "../../client/AzureDevOpsClient";

export const listPipelinesSchema = z.object({
    project: z.string().describe("Project name or ID")
});

export type ListPipelinesParams = z.infer<typeof listPipelinesSchema>;

export const listPipelinesOperation: OperationDefinition = {
    id: "pipelines_list",
    name: "List Pipelines",
    description: "List all build pipelines in a project",
    category: "pipelines",
    inputSchema: listPipelinesSchema,
    retryable: true,
    timeout: 30000
};

export async function executeListPipelines(
    client: AzureDevOpsClient,
    params: ListPipelinesParams
): Promise<OperationResult> {
    try {
        const response = await client.get<{
            value: Array<{
                id: number;
                name: string;
                folder: string;
                url: string;
            }>;
            count: number;
        }>(`/${params.project}/_apis/pipelines`);

        return {
            success: true,
            data: {
                pipelines: response.value,
                count: response.count,
                project: params.project
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list pipelines",
                retryable: true
            }
        };
    }
}
