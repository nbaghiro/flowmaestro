import { z } from "zod";
import { BitbucketClient } from "../../client/BitbucketClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { BitbucketIssue } from "../types";

/**
 * Create Issue operation schema
 */
export const createIssueSchema = z.object({
    workspace: z.string().min(1).describe("Workspace slug or UUID"),
    repo_slug: z.string().min(1).describe("Repository slug"),
    title: z.string().min(1).describe("Issue title"),
    content: z.string().optional().describe("Issue description (supports Markdown)"),
    kind: z
        .enum(["bug", "enhancement", "proposal", "task"])
        .optional()
        .default("bug")
        .describe("Issue type"),
    priority: z
        .enum(["trivial", "minor", "major", "critical", "blocker"])
        .optional()
        .default("major")
        .describe("Issue priority"),
    assignee_uuid: z
        .string()
        .optional()
        .describe("Assignee UUID (with curly braces, e.g., '{uuid}')"),
    component: z.string().optional().describe("Component name"),
    milestone: z.string().optional().describe("Milestone name"),
    version: z.string().optional().describe("Version name")
});

export type CreateIssueParams = z.infer<typeof createIssueSchema>;

/**
 * Create Issue operation definition
 */
export const createIssueOperation: OperationDefinition = {
    id: "createIssue",
    name: "Create Issue",
    description:
        "Create a new issue in a Bitbucket repository (requires issue tracker to be enabled)",
    category: "issues",
    actionType: "write",
    inputSchema: createIssueSchema,
    retryable: false,
    timeout: 30000
};

/**
 * Execute create issue operation
 */
export async function executeCreateIssue(
    client: BitbucketClient,
    params: CreateIssueParams
): Promise<OperationResult> {
    try {
        const {
            workspace,
            repo_slug,
            content,
            assignee_uuid,
            component,
            milestone,
            version,
            ...issueData
        } = params;

        const requestBody: Record<string, unknown> = {
            ...issueData
        };

        // Add content as object with raw markup
        if (content) {
            requestBody.content = {
                raw: content,
                markup: "markdown"
            };
        }

        // Add assignee if specified
        if (assignee_uuid) {
            requestBody.assignee = { uuid: assignee_uuid };
        }

        // Add component, milestone, version if specified
        if (component) {
            requestBody.component = { name: component };
        }
        if (milestone) {
            requestBody.milestone = { name: milestone };
        }
        if (version) {
            requestBody.version = { name: version };
        }

        const issue = await client.post<BitbucketIssue>(
            `/repositories/${workspace}/${repo_slug}/issues`,
            requestBody
        );

        return {
            success: true,
            data: {
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
                created_on: issue.created_on,
                html_url: issue.links.html?.href
            }
        };
    } catch (error) {
        // Handle case where issue tracker is not enabled
        const errorMessage = error instanceof Error ? error.message : "Failed to create issue";
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
                retryable: false
            }
        };
    }
}
