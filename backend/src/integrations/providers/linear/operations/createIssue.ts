import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { LinearClient } from "../client/LinearClient";

/**
 * Create issue input schema
 */
export const createIssueSchema = z.object({
    teamId: z.string().min(1).describe("Team ID where issue will be created"),
    title: z.string().min(1).max(255).describe("Issue title"),
    description: z.string().optional().describe("Issue description (markdown)"),
    assigneeId: z.string().optional().describe("Assignee user ID"),
    priority: z
        .number()
        .min(0)
        .max(4)
        .optional()
        .describe("Priority (0=None, 1=Urgent, 2=High, 3=Normal, 4=Low)"),
    stateId: z.string().optional().describe("Workflow state ID"),
    labelIds: z.array(z.string()).optional().describe("Array of label IDs")
});

export type CreateIssueParams = z.infer<typeof createIssueSchema>;

/**
 * Create issue operation definition
 */
export const createIssueOperation: OperationDefinition = {
    id: "createIssue",
    name: "Create Issue",
    description: "Create a new issue in Linear",
    category: "issues",
    retryable: true,
    inputSchema: createIssueSchema
};

interface CreateIssueResponse {
    issueCreate: {
        success: boolean;
        issue: {
            id: string;
            title: string;
            identifier: string;
            url: string;
            createdAt: string;
        };
    };
}

/**
 * Execute create issue operation
 */
export async function executeCreateIssue(
    client: LinearClient,
    params: CreateIssueParams
): Promise<OperationResult> {
    try {
        const response = (await client.createIssue(params)) as CreateIssueResponse;

        // Normalize the GraphQL response to extract the issue data
        const issue = response.issueCreate?.issue;
        if (!issue) {
            return {
                success: false,
                error: {
                    type: "server_error",
                    message: "Linear API returned unexpected response format",
                    retryable: false
                }
            };
        }

        return {
            success: true,
            data: {
                id: issue.id,
                title: issue.title,
                identifier: issue.identifier,
                url: issue.url,
                createdAt: issue.createdAt
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create Linear issue",
                retryable: true
            }
        };
    }
}
