import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AzureDevOpsClient } from "../../client/AzureDevOpsClient";

export const approveReleaseSchema = z.object({
    project: z.string(),
    approvalId: z.number().int(),
    comments: z.string().optional()
});

export type ApproveReleaseParams = z.infer<typeof approveReleaseSchema>;

export const approveReleaseOperation: OperationDefinition = {
    id: "releases_approve",
    name: "Approve Release",
    description: "Approve a release stage",
    category: "releases",
    inputSchema: approveReleaseSchema,
    retryable: false,
    timeout: 30000
};

export async function executeApproveRelease(
    client: AzureDevOpsClient,
    params: ApproveReleaseParams
): Promise<OperationResult> {
    try {
        const response = await client.patch<Record<string, unknown>>(
            `/${params.project}/_apis/release/approvals/${params.approvalId}`,
            {
                status: "approved",
                comments: params.comments
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
                message: error instanceof Error ? error.message : "Failed to approve release",
                retryable: false
            }
        };
    }
}
