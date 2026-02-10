import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AzureDevOpsClient } from "../../client/AzureDevOpsClient";

export const listVariableGroupsSchema = z.object({
    project: z.string()
});

export type ListVariableGroupsParams = z.infer<typeof listVariableGroupsSchema>;

export const listVariableGroupsOperation: OperationDefinition = {
    id: "pipelines_listVariableGroups",
    name: "List Variable Groups",
    description: "List all variable groups",
    category: "pipelines",
    inputSchema: listVariableGroupsSchema,
    retryable: true,
    timeout: 30000
};

export async function executeListVariableGroups(
    client: AzureDevOpsClient,
    params: ListVariableGroupsParams
): Promise<OperationResult> {
    try {
        const response = await client.get<{ value: Array<Record<string, unknown>>; count: number }>(
            `/${params.project}/_apis/distributedtask/variablegroups`
        );
        return {
            success: true,
            data: {
                variableGroups: response.value,
                count: response.count,
                project: params.project
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list variable groups",
                retryable: true
            }
        };
    }
}
