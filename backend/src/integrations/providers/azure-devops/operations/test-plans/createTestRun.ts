import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AzureDevOpsClient } from "../../client/AzureDevOpsClient";

export const createTestRunSchema = z.object({
    project: z.string(),
    name: z.string(),
    planId: z.number().int(),
    testCaseIds: z.array(z.number().int())
});

export type CreateTestRunParams = z.infer<typeof createTestRunSchema>;

export const createTestRunOperation: OperationDefinition = {
    id: "testPlans_createRun",
    name: "Create Test Run",
    description: "Create a new test run",
    category: "test-plans",
    inputSchema: createTestRunSchema,
    retryable: false,
    timeout: 30000
};

export async function executeCreateTestRun(
    client: AzureDevOpsClient,
    params: CreateTestRunParams
): Promise<OperationResult> {
    try {
        const response = await client.post<Record<string, unknown>>(
            `/${params.project}/_apis/test/runs`,
            {
                name: params.name,
                plan: { id: params.planId },
                pointIds: params.testCaseIds
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
                message: error instanceof Error ? error.message : "Failed to create test run",
                retryable: false
            }
        };
    }
}
