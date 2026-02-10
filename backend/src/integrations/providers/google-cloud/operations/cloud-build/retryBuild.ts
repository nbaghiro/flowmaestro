import { z } from "zod";
import { BuildIdSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GoogleCloudClient } from "../../client/GoogleCloudClient";

/**
 * Retry Build operation schema
 */
export const retryBuildSchema = z.object({
    buildId: BuildIdSchema
});

export type RetryBuildParams = z.infer<typeof retryBuildSchema>;

/**
 * Retry Build operation definition
 */
export const retryBuildOperation: OperationDefinition = {
    id: "cloud_build_retryBuild",
    name: "Retry Build",
    description: "Retry a failed build with the same configuration",
    category: "cloud-build",
    inputSchema: retryBuildSchema,
    retryable: false,
    timeout: 30000
};

/**
 * Execute retry build operation
 */
export async function executeRetryBuild(
    client: GoogleCloudClient,
    params: RetryBuildParams
): Promise<OperationResult> {
    try {
        const response = await client.cloudBuild.post<{
            name: string;
            metadata: {
                build: {
                    id: string;
                    status: string;
                    createTime: string;
                    startTime?: string;
                };
            };
        }>(`/projects/${client.projectId}/builds/${params.buildId}:retry`);

        return {
            success: true,
            data: {
                operationName: response.name,
                buildId: response.metadata.build.id,
                status: response.metadata.build.status,
                createTime: response.metadata.build.createTime,
                startTime: response.metadata.build.startTime,
                projectId: client.projectId
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to retry build",
                retryable: true
            }
        };
    }
}
