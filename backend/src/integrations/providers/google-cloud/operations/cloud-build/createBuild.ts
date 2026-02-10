import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GoogleCloudClient } from "../../client/GoogleCloudClient";

/**
 * Create Build operation schema
 */
export const createBuildSchema = z.object({
    source: z
        .object({
            repoSource: z
                .object({
                    projectId: z.string().optional(),
                    repoName: z.string(),
                    branchName: z.string().optional(),
                    tagName: z.string().optional(),
                    commitSha: z.string().optional()
                })
                .optional(),
            storageSource: z
                .object({
                    bucket: z.string(),
                    object: z.string()
                })
                .optional()
        })
        .describe("Build source"),
    steps: z
        .array(
            z.object({
                name: z.string().describe("Container image to run"),
                args: z.array(z.string()).optional().describe("Arguments to pass"),
                env: z.array(z.string()).optional().describe("Environment variables"),
                dir: z.string().optional().describe("Working directory"),
                id: z.string().optional().describe("Step ID"),
                waitFor: z.array(z.string()).optional().describe("Step IDs to wait for"),
                entrypoint: z.string().optional().describe("Override entrypoint"),
                timeout: z.string().optional().describe("Step timeout (e.g., '300s')")
            })
        )
        .min(1)
        .describe("Build steps"),
    timeout: z.string().optional().describe("Build timeout (e.g., '600s')"),
    images: z.array(z.string()).optional().describe("Images to push after build"),
    tags: z.array(z.string()).optional().describe("Tags for the build")
});

export type CreateBuildParams = z.infer<typeof createBuildSchema>;

/**
 * Create Build operation definition
 */
export const createBuildOperation: OperationDefinition = {
    id: "cloud_build_createBuild",
    name: "Create Cloud Build",
    description: "Trigger a new Cloud Build from source",
    category: "cloud-build",
    inputSchema: createBuildSchema,
    retryable: false,
    timeout: 60000
};

/**
 * Execute create build operation
 */
export async function executeCreateBuild(
    client: GoogleCloudClient,
    params: CreateBuildParams
): Promise<OperationResult> {
    try {
        const requestBody = {
            source: params.source,
            steps: params.steps,
            ...(params.timeout && { timeout: params.timeout }),
            ...(params.images && { images: params.images }),
            ...(params.tags && { tags: params.tags })
        };

        const response = await client.cloudBuild.post<{
            name: string;
            metadata: {
                "@type": string;
                build: {
                    id: string;
                    projectId: string;
                    status: string;
                    createTime: string;
                    logUrl?: string;
                };
            };
        }>(`/projects/${client.projectId}/builds`, requestBody);

        const build = response.metadata.build;

        return {
            success: true,
            data: {
                buildId: build.id,
                projectId: build.projectId,
                status: build.status,
                createTime: build.createTime,
                logUrl: build.logUrl,
                operationName: response.name
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create build",
                retryable: false
            }
        };
    }
}
