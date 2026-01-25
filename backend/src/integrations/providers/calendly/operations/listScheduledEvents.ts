import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { toJSONSchema } from "../../../core/schema-utils";
import { CalendlyClient } from "../client/CalendlyClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * List Scheduled Events operation schema
 */
export const listScheduledEventsSchema = z.object({
    user: z.string().optional().describe("User URI to filter by"),
    organization: z.string().optional().describe("Organization URI to filter by"),
    minStartTime: z
        .string()
        .optional()
        .describe("ISO 8601 datetime - filter events starting after this time"),
    maxStartTime: z
        .string()
        .optional()
        .describe("ISO 8601 datetime - filter events starting before this time"),
    status: z
        .enum(["active", "canceled"])
        .optional()
        .describe("Filter by status (active or canceled)"),
    count: z.number().min(1).max(100).optional().describe("Number of results per page (1-100)"),
    pageToken: z.string().optional().describe("Token for pagination"),
    inviteeEmail: z.string().email().optional().describe("Filter by invitee email address")
});

export type ListScheduledEventsParams = z.infer<typeof listScheduledEventsSchema>;

/**
 * List Scheduled Events operation definition
 */
export const listScheduledEventsOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listScheduledEvents",
            name: "List Scheduled Events",
            description: "List scheduled meetings/events",
            category: "data",
            actionType: "read",
            inputSchema: listScheduledEventsSchema,
            inputSchemaJSON: toJSONSchema(listScheduledEventsSchema),
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "Calendly", err: error },
            "Failed to create listScheduledEventsOperation"
        );
        throw new Error(
            `Failed to create listScheduledEvents operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute list scheduled events operation
 */
export async function executeListScheduledEvents(
    client: CalendlyClient,
    params: ListScheduledEventsParams
): Promise<OperationResult> {
    try {
        const response = await client.listScheduledEvents({
            user: params.user,
            organization: params.organization,
            min_start_time: params.minStartTime,
            max_start_time: params.maxStartTime,
            status: params.status,
            count: params.count,
            page_token: params.pageToken,
            invitee_email: params.inviteeEmail
        });

        return {
            success: true,
            data: {
                events: response.collection.map((event) => ({
                    uri: event.uri,
                    name: event.name,
                    status: event.status,
                    startTime: event.start_time,
                    endTime: event.end_time,
                    eventType: event.event_type,
                    location: event.location,
                    inviteesCounter: {
                        total: event.invitees_counter.total,
                        active: event.invitees_counter.active,
                        limit: event.invitees_counter.limit
                    },
                    eventMemberships: event.event_memberships,
                    eventGuests: event.event_guests,
                    cancellation: event.cancellation
                        ? {
                              canceledBy: event.cancellation.canceled_by,
                              reason: event.cancellation.reason,
                              cancelerType: event.cancellation.canceler_type,
                              createdAt: event.cancellation.created_at
                          }
                        : null,
                    createdAt: event.created_at,
                    updatedAt: event.updated_at
                })),
                pagination: {
                    count: response.pagination.count,
                    nextPageToken: response.pagination.next_page_token
                }
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list scheduled events",
                retryable: true
            }
        };
    }
}
