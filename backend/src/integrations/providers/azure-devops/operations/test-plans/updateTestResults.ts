import { z } from "zod";
import { TestOutcomeSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AzureDevOpsClient } from "../../client/AzureDevOpsClient";

export const updateTestResultsSchema = z.object({
    project: z.string(),
    runId: z.number().int(),
    results: z.array(
        z.object({
            testCaseId: z.number().int(),
            outcome: TestOutcomeSchema,
            comment: z.string().optional()
        })
    )
});

export type UpdateTestResultsParams = z.infer<typeof updateTestResultsSchema>;

export const updateTestResultsOperation: OperationDefinition = {
    id: "testPlans_updateResults",
    name: "Update Test Results",
    description: "Update test case results in a run",
    category: "test-plans",
    inputSchema: updateTestResultsSchema,
    retryable: false,
    timeout: 30000
};

export async function executeUpdateTestResults(
    client: AzureDevOpsClient,
    params: UpdateTestResultsParams
): Promise<OperationResult> {
    try {
        const response = await client.patch<Array<Record<string, unknown>>>(
            `/${params.project}/_apis/test/runs/${params.runId}/results`,
            params.results.map((r) => ({
                id: r.testCaseId,
                outcome: r.outcome,
                comment: r.comment
            }))
        );
        return {
            success: true,
            data: {
                results: response,
                count: response.length,
                runId: params.runId,
                project: params.project
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update test results",
                retryable: false
            }
        };
    }
}
