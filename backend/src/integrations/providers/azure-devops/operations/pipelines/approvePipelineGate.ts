import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AzureDevOpsClient } from "../../client/AzureDevOpsClient";

export const approvePipelineGateSchema = z.object({
    project: z.string(),
    approvalId: z.string(),
    comments: z.string().optional()
});

export type ApprovePipelineGateParams = z.infer<typeof approvePipelineGateSchema>;

export const approvePipelineGateOperation: OperationDefinition = {
    id: "pipelines_approveGate",
    name: "Approve Pipeline Gate",
    description: "Approve a manual pipeline gate",
    category: "pipelines",
    inputSchema: approvePipelineGateSchema,
    retryable: false,
    timeout: 30000
};

export async function executeApprovePipelineGate(
    client: AzureDevOpsClient,
    params: ApprovePipelineGateParams
): Promise<OperationResult> {
    try {
        const response = await client.patch<Record<string, unknown>>(
            `/${params.project}/_apis/pipelines/approvals/${params.approvalId}`,
            {
                status: "approved",
                comment: params.comments
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
                message: error instanceof Error ? error.message : "Failed to approve pipeline gate",
                retryable: false
            }
        };
    }
}
