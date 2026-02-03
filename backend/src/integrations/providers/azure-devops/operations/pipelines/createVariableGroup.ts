import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AzureDevOpsClient } from "../../client/AzureDevOpsClient";

export const createVariableGroupSchema = z.object({
    project: z.string(),
    name: z.string(),
    description: z.string().optional(),
    variables: z.record(z.string())
});

export type CreateVariableGroupParams = z.infer<typeof createVariableGroupSchema>;

export const createVariableGroupOperation: OperationDefinition = {
    id: "pipelines_createVariableGroup",
    name: "Create Variable Group",
    description: "Create a new variable group",
    category: "pipelines",
    inputSchema: createVariableGroupSchema,
    retryable: false,
    timeout: 30000
};

export async function executeCreateVariableGroup(
    client: AzureDevOpsClient,
    params: CreateVariableGroupParams
): Promise<OperationResult> {
    try {
        const response = await client.post<Record<string, unknown>>(
            `/${params.project}/_apis/distributedtask/variablegroups`,
            {
                name: params.name,
                description: params.description,
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
                message: error instanceof Error ? error.message : "Failed to create variable group",
                retryable: false
            }
        };
    }
}
