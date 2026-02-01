import { z } from "zod";
import { BitbucketClient } from "../../client/BitbucketClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { BitbucketPullRequest } from "../types";

/**
 * Merge Pull Request operation schema
 */
export const mergePullRequestSchema = z.object({
    workspace: z.string().min(1).describe("Workspace slug or UUID"),
    repo_slug: z.string().min(1).describe("Repository slug"),
    pull_request_id: z.number().int().describe("Pull request ID"),
    message: z.string().optional().describe("Custom merge commit message"),
    close_source_branch: z.boolean().optional().describe("Close source branch after merge"),
    merge_strategy: z
        .enum(["merge_commit", "squash", "fast_forward"])
        .optional()
        .default("merge_commit")
        .describe("Merge strategy to use")
});

export type MergePullRequestParams = z.infer<typeof mergePullRequestSchema>;

/**
 * Merge Pull Request operation definition
 */
export const mergePullRequestOperation: OperationDefinition = {
    id: "mergePullRequest",
    name: "Merge Pull Request",
    description: "Merge a pull request in a Bitbucket repository",
    category: "pull-requests",
    actionType: "write",
    inputSchema: mergePullRequestSchema,
    retryable: false,
    timeout: 60000 // Merging can take longer
};

/**
 * Execute merge pull request operation
 */
export async function executeMergePullRequest(
    client: BitbucketClient,
    params: MergePullRequestParams
): Promise<OperationResult> {
    try {
        const { workspace, repo_slug, pull_request_id, ...mergeData } = params;

        const pr = await client.post<BitbucketPullRequest>(
            `/repositories/${workspace}/${repo_slug}/pullrequests/${pull_request_id}/merge`,
            mergeData
        );

        return {
            success: true,
            data: {
                id: pr.id,
                title: pr.title,
                state: pr.state,
                merged: pr.state === "MERGED",
                merge_commit: pr.merge_commit?.hash,
                source_branch: pr.source.branch.name,
                destination_branch: pr.destination.branch.name,
                closed_by: pr.closed_by
                    ? {
                          uuid: pr.closed_by.uuid,
                          display_name: pr.closed_by.display_name
                      }
                    : null,
                html_url: pr.links.html?.href
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to merge pull request",
                retryable: false
            }
        };
    }
}
