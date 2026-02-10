import { z } from "zod";
import { BuildIdSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GoogleCloudClient } from "../../client/GoogleCloudClient";

/**
 * Get Build operation schema
 */
export const getBuildSchema = z.object({
    buildId: BuildIdSchema
});

export type GetBuildParams = z.infer<typeof getBuildSchema>;

/**
 * Get Build operation definition
 */
export const getBuildOperation: OperationDefinition = {
    id: "cloud_build_getBuild",
    name: "Get Cloud Build",
    description: "Get detailed information about a specific build",
    category: "cloud-build",
    inputSchema: getBuildSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute get build operation
 */
export async function executeGetBuild(
    client: GoogleCloudClient,
    params: GetBuildParams
): Promise<OperationResult> {
    try {
        const response = await client.cloudBuild.get<{
            id: string;
            projectId: string;
            status: string;
            statusDetail?: string;
            createTime: string;
            startTime?: string;
            finishTime?: string;
            timeout?: string;
            source?: {
                repoSource?: {
                    projectId: string;
                    repoName: string;
                    branchName?: string;
                    tagName?: string;
                    commitSha?: string;
                };
                storageSource?: {
                    bucket: string;
                    object: string;
                };
            };
            steps: Array<{
                name: string;
                args?: string[];
                env?: string[];
                dir?: string;
                id?: string;
                waitFor?: string[];
                entrypoint?: string;
                timeout?: string;
            }>;
            results?: {
                images?: Array<{
                    name: string;
                    digest: string;
                    pushTiming?: {
                        startTime: string;
                        endTime: string;
                    };
                }>;
                buildStepImages?: string[];
                artifactManifest?: string;
            };
            logUrl?: string;
            logsBucket?: string;
            tags?: string[];
        }>(`/projects/${client.projectId}/builds/${params.buildId}`);

        return {
            success: true,
            data: {
                ...response,
                projectId: client.projectId
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get build",
                retryable: true
            }
        };
    }
}
