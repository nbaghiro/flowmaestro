import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AzureDevOpsClient } from "../../client/AzureDevOpsClient";

export const getTestPlanSchema = z.object({
    project: z.string(),
    planId: z.number().int()
});

export type GetTestPlanParams = z.infer<typeof getTestPlanSchema>;

export const getTestPlanOperation: OperationDefinition = {
    id: "testPlans_get",
    name: "Get Test Plan",
    description: "Get detailed information about a test plan",
    category: "test-plans",
    inputSchema: getTestPlanSchema,
    retryable: true,
    timeout: 30000
};

export async function executeGetTestPlan(
    client: AzureDevOpsClient,
    params: GetTestPlanParams
): Promise<OperationResult> {
    try {
        const response = await client.get<Record<string, unknown>>(
            `/${params.project}/_apis/test/plans/${params.planId}`
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
                message: error instanceof Error ? error.message : "Failed to get test plan",
                retryable: true
            }
        };
    }
}
