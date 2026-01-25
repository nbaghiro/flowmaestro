import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { SentryClient } from "../client/SentryClient";

export const getIssueSchema = z.object({
    issueId: z.string().min(1).describe("Issue ID")
});

export type GetIssueParams = z.infer<typeof getIssueSchema>;

export const getIssueOperation: OperationDefinition = {
    id: "getIssue",
    name: "Get Issue",
    description: "Get details of a specific issue",
    category: "issues",
    inputSchema: getIssueSchema,
    inputSchemaJSON: toJSONSchema(getIssueSchema),
    retryable: true,
    timeout: 30000
};

export async function executeGetIssue(
    client: SentryClient,
    params: GetIssueParams
): Promise<OperationResult> {
    try {
        const issue = await client.getIssue(params.issueId);

        return {
            success: true,
            data: {
                id: issue.id,
                shortId: issue.shortId,
                title: issue.title,
                culprit: issue.culprit,
                permalink: issue.permalink,
                level: issue.level,
                status: issue.status,
                statusDetails: issue.statusDetails,
                isPublic: issue.isPublic,
                platform: issue.platform,
                project: issue.project,
                type: issue.type,
                metadata: issue.metadata,
                numComments: issue.numComments,
                assignedTo: issue.assignedTo,
                isBookmarked: issue.isBookmarked,
                isSubscribed: issue.isSubscribed,
                hasSeen: issue.hasSeen,
                isUnhandled: issue.isUnhandled,
                count: parseInt(issue.count, 10),
                userCount: issue.userCount,
                firstSeen: issue.firstSeen,
                lastSeen: issue.lastSeen
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get issue",
                retryable: true
            }
        };
    }
}
