import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import type { SentryEventOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { SentryClient } from "../client/SentryClient";

export const listIssueEventsSchema = z.object({
    issueId: z.string().min(1).describe("Issue ID"),
    full: z.boolean().optional().describe("Include full event body with stacktrace"),
    cursor: z.string().optional().describe("Pagination cursor")
});

export type ListIssueEventsParams = z.infer<typeof listIssueEventsSchema>;

export const listIssueEventsOperation: OperationDefinition = {
    id: "listIssueEvents",
    name: "List Issue Events",
    description: "List events for a specific issue",
    category: "events",
    inputSchema: listIssueEventsSchema,
    inputSchemaJSON: toJSONSchema(listIssueEventsSchema),
    retryable: true,
    timeout: 30000
};

export async function executeListIssueEvents(
    client: SentryClient,
    params: ListIssueEventsParams
): Promise<OperationResult> {
    try {
        const events = await client.listIssueEvents(params.issueId, {
            full: params.full,
            cursor: params.cursor
        });

        const formattedEvents: SentryEventOutput[] = events.map((e) => ({
            id: e.id,
            eventId: e.eventID,
            dateCreated: e.dateCreated,
            message: e.message,
            title: e.title,
            platform: e.platform,
            user: e.user
                ? {
                      id: e.user.id,
                      email: e.user.email,
                      username: e.user.username,
                      ipAddress: e.user.ip_address
                  }
                : undefined,
            tags: e.tags
        }));

        return {
            success: true,
            data: {
                events: formattedEvents,
                count: formattedEvents.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list issue events",
                retryable: true
            }
        };
    }
}
