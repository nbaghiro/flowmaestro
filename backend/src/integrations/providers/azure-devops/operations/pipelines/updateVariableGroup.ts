import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AzureDevOpsClient } from "../../client/AzureDevOpsClient";

export const updateVariableGroupSchema = z.object({
    project: z.string(),
    groupId: z.number().int(),
    variables: z.record(z.string())
});

export type UpdateVariableGroupParams = z.infer<typeof updateVariableGroupSchema>;

export const updateVariableGroupOperation: OperationDefinition = {
    id: "pipelines_updateVariableGroup",
    name: "Update Variable Group",
    description: "Update variables in a group",
    category: "pipelines",
    inputSchema: updateVariableGroupSchema,
    retryable: false,
    timeout: 30000
};

export async function executeUpdateVariableGroup(
    client: AzureDevOpsClient,
    params: UpdateVariableGroupParams
): Promise<OperationResult> {
    try {
        const response = await client.put<Record<string, unknown>>(
            `/${params.project}/_apis/distributedtask/variablegroups/${params.groupId}`,
            {
                variables: Object.fromEntries(
                    Object.entries(params.variables).map(([k, v]) => [k, { value: v }])
                )
            }
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
                message: error instanceof Error ? error.message : "Failed to update variable group",
                retryable: false
            }
        };
    }
}
