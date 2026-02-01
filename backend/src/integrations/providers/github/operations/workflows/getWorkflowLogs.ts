import { z } from "zod";
import { GitHubClient } from "../../client/GitHubClient";
import { GitHubOwnerSchema, GitHubRepoNameSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";

/**
 * Get Workflow Logs operation schema
 */
export const getWorkflowLogsSchema = z.object({
    owner: GitHubOwnerSchema,
    repo: GitHubRepoNameSchema,
    run_id: z.number().int().positive().describe("Workflow run ID")
});

export type GetWorkflowLogsParams = z.infer<typeof getWorkflowLogsSchema>;

/**
 * Get Workflow Logs operation definition
 */
export const getWorkflowLogsOperation: OperationDefinition = {
    id: "getWorkflowLogs",
    name: "Get Workflow Logs",
    description: "Download logs for a workflow run",
    category: "workflows",
    inputSchema: getWorkflowLogsSchema,
    retryable: true,
    timeout: 60000 // Logs can be large
};

/**
 * Execute get workflow logs operation
 */
export async function executeGetWorkflowLogs(
    client: GitHubClient,
    params: GetWorkflowLogsParams
): Promise<OperationResult> {
    try {
        // This endpoint returns a 302 redirect to the logs archive
        // We'll return the download URL instead of downloading the archive
        const response = await client.get<{ url?: string }>(
            `/repos/${params.owner}/${params.repo}/actions/runs/${params.run_id}/logs`
        );

        return {
            success: true,
            data: {
                message: "Workflow logs available for download",
                run_id: params.run_id,
                download_url:
                    response.url ||
                    `https://github.com/${params.owner}/${params.repo}/actions/runs/${params.run_id}`
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get workflow logs",
                retryable: true
            }
        };
    }
}
