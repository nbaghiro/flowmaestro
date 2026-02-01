import { z } from "zod";
import { BitbucketClient } from "../../client/BitbucketClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { BitbucketIssue, BitbucketPaginatedResponse } from "../types";

/**
 * List Issues operation schema
 */
export const listIssuesSchema = z.object({
    workspace: z.string().min(1).describe("Workspace slug or UUID"),
    repo_slug: z.string().min(1).describe("Repository slug"),
    state: z
        .enum(["new", "open", "resolved", "on hold", "invalid", "duplicate", "wontfix", "closed"])
        .optional()
        .describe("Filter by issue state"),
    priority: z
        .enum(["trivial", "minor", "major", "critical", "blocker"])
        .optional()
        .describe("Filter by priority"),
    kind: z
        .enum(["bug", "enhancement", "proposal", "task"])
        .optional()
        .describe("Filter by issue kind"),
    q: z.string().optional().describe("Query string to filter results"),
    sort: z
        .string()
        .optional()
        .describe("Field to sort by (e.g., '-created_on' for descending by creation date)"),
    pagelen: z.number().int().min(1).max(50).optional().default(20).describe("Results per page"),
    page: z.number().int().min(1).optional().default(1).describe("Page number")
});

export type ListIssuesParams = z.infer<typeof listIssuesSchema>;

/**
 * List Issues operation definition
 */
export const listIssuesOperation: OperationDefinition = {
    id: "listIssues",
    name: "List Issues",
    description:
        "List issues in a Bitbucket repository (requires issue tracker to be enabled on the repository)",
    category: "issues",
    inputSchema: listIssuesSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute list issues operation
 */
export async function executeListIssues(
    client: BitbucketClient,
    params: ListIssuesParams
): Promise<OperationResult> {
    try {
        const { workspace, repo_slug, ...queryParams } = params;

        const response = await client.get<BitbucketPaginatedResponse<BitbucketIssue>>(
            `/repositories/${workspace}/${repo_slug}/issues`,
            queryParams
        );

        return {
            success: true,
            data: {
                issues: response.values.map((issue) => ({
                    id: issue.id,
                    title: issue.title,
                    content: issue.content?.raw,
                    state: issue.state,
                    kind: issue.kind,
                    priority: issue.priority,
                    reporter: issue.reporter
                        ? {
                              uuid: issue.reporter.uuid,
                              display_name: issue.reporter.display_name
                          }
                        : null,
                    assignee: issue.assignee
                        ? {
                              uuid: issue.assignee.uuid,
                              display_name: issue.assignee.display_name
                          }
                        : null,
                    component: issue.component?.name,
                    milestone: issue.milestone?.name,
                    version: issue.version?.name,
                    created_on: issue.created_on,
                    updated_on: issue.updated_on,
                    votes: issue.votes,
                    html_url: issue.links.html?.href
                })),
                count: response.values.length,
                has_more: !!response.next
            }
        };
    } catch (error) {
        // Handle case where issue tracker is not enabled
        const errorMessage = error instanceof Error ? error.message : "Failed to list issues";
        if (errorMessage.includes("404") || errorMessage.includes("not found")) {
            return {
                success: false,
                error: {
                    type: "validation",
                    message:
                        "Issue tracker is not enabled for this repository. Enable it in repository settings.",
                    retryable: false
                }
            };
        }
        return {
            success: false,
            error: {
                type: "server_error",
                message: errorMessage,
                retryable: true
            }
        };
    }
}
