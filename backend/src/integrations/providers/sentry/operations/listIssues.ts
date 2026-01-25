import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import type { SentryIssueOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { SentryClient } from "../client/SentryClient";

export const listIssuesSchema = z.object({
    organizationSlug: z.string().min(1).describe("Organization identifier"),
    projectSlug: z.string().optional().describe("Optional project filter"),
    query: z.string().optional().describe("Search query"),
    statsPeriod: z.string().optional().describe("Time period (e.g., '24h', '14d')"),
    sort: z.enum(["date", "new", "freq", "user"]).optional().describe("Sort order"),
    cursor: z.string().optional().describe("Pagination cursor")
});

export type ListIssuesParams = z.infer<typeof listIssuesSchema>;

export const listIssuesOperation: OperationDefinition = {
    id: "listIssues",
    name: "List Issues",
    description: "List issues for a project or organization",
    category: "issues",
    inputSchema: listIssuesSchema,
    inputSchemaJSON: toJSONSchema(listIssuesSchema),
    retryable: true,
    timeout: 30000
};

export async function executeListIssues(
    client: SentryClient,
    params: ListIssuesParams
): Promise<OperationResult> {
    try {
        const issues = await client.listIssues({
            organizationSlug: params.organizationSlug,
            projectSlug: params.projectSlug,
            query: params.query,
            statsPeriod: params.statsPeriod,
            sort: params.sort,
            cursor: params.cursor
        });

        const formattedIssues: SentryIssueOutput[] = issues.map((i) => ({
            id: i.id,
            shortId: i.shortId,
            title: i.title,
            culprit: i.culprit,
            level: i.level,
            status: i.status,
            platform: i.platform,
            project: i.project,
            count: parseInt(i.count, 10),
            userCount: i.userCount,
            firstSeen: i.firstSeen,
            lastSeen: i.lastSeen,
            isBookmarked: i.isBookmarked,
            isSubscribed: i.isSubscribed,
            hasSeen: i.hasSeen,
            assignedTo: i.assignedTo?.name || i.assignedTo?.email
        }));

        return {
            success: true,
            data: {
                issues: formattedIssues,
                count: formattedIssues.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list issues",
                retryable: true
            }
        };
    }
}
