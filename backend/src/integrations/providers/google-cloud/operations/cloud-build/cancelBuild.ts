import { z } from "zod";
import { BuildIdSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GoogleCloudClient } from "../../client/GoogleCloudClient";

/**
 * Cancel Build operation schema
 */
export const cancelBuildSchema = z.object({
    buildId: BuildIdSchema
});

export type CancelBuildParams = z.infer<typeof cancelBuildSchema>;

/**
 * Cancel Build operation definition
 */
export const cancelBuildOperation: OperationDefinition = {
    id: "cloud_build_cancelBuild",
    name: "Cancel Cloud Build",
    description: "Cancel a running build",
    category: "cloud-build",
    inputSchema: cancelBuildSchema,
    retryable: false,
    timeout: 30000
};

/**
 * Execute cancel build operation
 */
export async function executeCancelBuild(
    client: GoogleCloudClient,
    params: CancelBuildParams
): Promise<OperationResult> {
    try {
        const response = await client.cloudBuild.post<{
            id: string;
            projectId: string;
            status: string;
            statusDetail: string;
            createTime: string;
            startTime?: string;
            finishTime?: string;
        }>(`/projects/${client.projectId}/builds/${params.buildId}:cancel`, {});

        return {
            success: true,
            data: {
                buildId: response.id,
                projectId: response.projectId,
                status: response.status,
                statusDetail: response.statusDetail,
                cancelledAt: new Date().toISOString()
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to cancel build",
                retryable: false
            }
        };
    }
}
