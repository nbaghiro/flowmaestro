import { z } from "zod";
import { PageSizeSchema, PageTokenSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { GoogleCloudClient } from "../../client/GoogleCloudClient";

/**
 * List Builds operation schema
 */
export const listBuildsSchema = z.object({
    pageSize: PageSizeSchema.optional(),
    pageToken: PageTokenSchema,
    filter: z.string().optional().describe("Filter expression")
});

export type ListBuildsParams = z.infer<typeof listBuildsSchema>;

/**
 * List Builds operation definition
 */
export const listBuildsOperation: OperationDefinition = {
    id: "cloud_build_listBuilds",
    name: "List Cloud Builds",
    description: "List Cloud Build builds with optional filters",
    category: "cloud-build",
    inputSchema: listBuildsSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute list builds operation
 */
export async function executeListBuilds(
    client: GoogleCloudClient,
    params: ListBuildsParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, string> = {};

        if (params.pageSize) {
            queryParams.pageSize = params.pageSize.toString();
        }

        if (params.pageToken) {
            queryParams.pageToken = params.pageToken;
        }

        if (params.filter) {
            queryParams.filter = params.filter;
        }

        const response = await client.cloudBuild.get<{
            builds: Array<{
                id: string;
                projectId: string;
                status: string;
                createTime: string;
                startTime?: string;
                finishTime?: string;
                source?: {
                    repoSource?: {
                        projectId: string;
                        repoName: string;
                        branchName?: string;
                        tagName?: string;
                        commitSha?: string;
                    };
                };
                steps: Array<{
                    name: string;
                    args?: string[];
                    env?: string[];
                }>;
                results?: {
                    images?: Array<{
                        name: string;
                        digest: string;
                    }>;
                    buildStepImages?: string[];
                };
                logUrl?: string;
            }>;
            nextPageToken?: string;
        }>(`/projects/${client.projectId}/builds`, queryParams);

        return {
            success: true,
            data: {
                builds: response.builds || [],
                nextPageToken: response.nextPageToken,
                buildCount: (response.builds || []).length,
                projectId: client.projectId
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list builds",
                retryable: true
            }
        };
    }
}
