import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AzureDevOpsClient } from "../../client/AzureDevOpsClient";

export const getReleaseStatusSchema = z.object({
    project: z.string(),
    releaseId: z.number().int()
});

export type GetReleaseStatusParams = z.infer<typeof getReleaseStatusSchema>;

export const getReleaseStatusOperation: OperationDefinition = {
    id: "releases_getStatus",
    name: "Get Release Status",
    description: "Get current status of a release",
    category: "releases",
    inputSchema: getReleaseStatusSchema,
    retryable: true,
    timeout: 30000
};

export async function executeGetReleaseStatus(
    client: AzureDevOpsClient,
    params: GetReleaseStatusParams
): Promise<OperationResult> {
    try {
        const response = await client.get<Record<string, unknown>>(
            `/${params.project}/_apis/release/releases/${params.releaseId}`
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
                message: error instanceof Error ? error.message : "Failed to get release status",
                retryable: true
            }
        };
    }
}
