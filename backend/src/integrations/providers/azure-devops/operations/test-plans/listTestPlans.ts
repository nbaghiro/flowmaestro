import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AzureDevOpsClient } from "../../client/AzureDevOpsClient";

export const listTestPlansSchema = z.object({
    project: z.string()
});

export type ListTestPlansParams = z.infer<typeof listTestPlansSchema>;

export const listTestPlansOperation: OperationDefinition = {
    id: "testPlans_list",
    name: "List Test Plans",
    description: "List all test plans in a project",
    category: "test-plans",
    inputSchema: listTestPlansSchema,
    retryable: true,
    timeout: 30000
};

export async function executeListTestPlans(
    client: AzureDevOpsClient,
    params: ListTestPlansParams
): Promise<OperationResult> {
    try {
        const response = await client.get<{ value: Array<Record<string, unknown>>; count: number }>(
            `/${params.project}/_apis/test/plans`
        );
        return {
            success: true,
            data: {
                testPlans: response.value,
                count: response.count,
                project: params.project
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list test plans",
                retryable: true
            }
        };
    }
}
