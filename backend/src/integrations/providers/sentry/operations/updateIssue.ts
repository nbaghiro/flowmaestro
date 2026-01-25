import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { SentryClient } from "../client/SentryClient";

export const updateIssueSchema = z.object({
    issueId: z.string().min(1).describe("Issue ID"),
    status: z.enum(["resolved", "unresolved", "ignored"]).optional().describe("Issue status"),
    assignedTo: z.string().optional().describe("User/team to assign"),
    hasSeen: z.boolean().optional().describe("Mark as seen"),
    isBookmarked: z.boolean().optional().describe("Bookmark the issue")
});

export type UpdateIssueParams = z.infer<typeof updateIssueSchema>;

export const updateIssueOperation: OperationDefinition = {
    id: "updateIssue",
    name: "Update Issue",
    description: "Update issue status (resolve, ignore, etc.)",
    category: "issues",
    inputSchema: updateIssueSchema,
    inputSchemaJSON: toJSONSchema(updateIssueSchema),
    retryable: false,
    timeout: 30000
};

export async function executeUpdateIssue(
    client: SentryClient,
    params: UpdateIssueParams
): Promise<OperationResult> {
    try {
        const updates: {
            status?: "resolved" | "unresolved" | "ignored";
            assignedTo?: string;
            hasSeen?: boolean;
            isBookmarked?: boolean;
        } = {};

        if (params.status) {
            updates.status = params.status;
        }
        if (params.assignedTo !== undefined) {
            updates.assignedTo = params.assignedTo;
        }
        if (params.hasSeen !== undefined) {
            updates.hasSeen = params.hasSeen;
        }
        if (params.isBookmarked !== undefined) {
            updates.isBookmarked = params.isBookmarked;
        }

        const issue = await client.updateIssue(params.issueId, updates);

        return {
            success: true,
            data: {
                id: issue.id,
                shortId: issue.shortId,
                title: issue.title,
                status: issue.status,
                assignedTo: issue.assignedTo?.name || issue.assignedTo?.email,
                hasSeen: issue.hasSeen,
                isBookmarked: issue.isBookmarked
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update issue",
                retryable: false
            }
        };
    }
}
