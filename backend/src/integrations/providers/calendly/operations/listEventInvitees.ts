import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { toJSONSchema } from "../../../core/schema-utils";
import { CalendlyClient } from "../client/CalendlyClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * List Event Invitees operation schema
 */
export const listEventInviteesSchema = z.object({
    eventUuid: z.string().describe("Scheduled event UUID"),
    status: z
        .enum(["active", "canceled"])
        .optional()
        .describe("Filter by status (active or canceled)"),
    count: z.number().min(1).max(100).optional().describe("Number of results per page (1-100)"),
    pageToken: z.string().optional().describe("Token for pagination"),
    email: z.string().email().optional().describe("Filter by invitee email address")
});

export type ListEventInviteesParams = z.infer<typeof listEventInviteesSchema>;

/**
 * List Event Invitees operation definition
 */
export const listEventInviteesOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listEventInvitees",
            name: "List Event Invitees",
            description: "List invitees/attendees for a scheduled event",
            category: "data",
            actionType: "read",
            inputSchema: listEventInviteesSchema,
            inputSchemaJSON: toJSONSchema(listEventInviteesSchema),
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "Calendly", err: error },
            "Failed to create listEventInviteesOperation"
        );
        throw new Error(
            `Failed to create listEventInvitees operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute list event invitees operation
 */
export async function executeListEventInvitees(
    client: CalendlyClient,
    params: ListEventInviteesParams
): Promise<OperationResult> {
    try {
        const response = await client.listEventInvitees(params.eventUuid, {
            status: params.status,
            count: params.count,
            page_token: params.pageToken,
            email: params.email
        });

        return {
            success: true,
            data: {
                invitees: response.collection.map((invitee) => ({
                    uri: invitee.uri,
                    email: invitee.email,
                    name: invitee.name,
                    status: invitee.status,
                    questionsAndAnswers: invitee.questions_and_answers,
                    timezone: invitee.timezone,
                    tracking: invitee.tracking,
                    textReminderNumber: invitee.text_reminder_number,
                    rescheduled: invitee.rescheduled,
                    oldInvitee: invitee.old_invitee,
                    newInvitee: invitee.new_invitee,
                    cancelUrl: invitee.cancel_url,
                    rescheduleUrl: invitee.reschedule_url,
                    cancellation: invitee.cancellation
                        ? {
                              canceledBy: invitee.cancellation.canceled_by,
                              reason: invitee.cancellation.reason,
                              cancelerType: invitee.cancellation.canceler_type,
                              createdAt: invitee.cancellation.created_at
                          }
                        : null,
                    createdAt: invitee.created_at,
                    updatedAt: invitee.updated_at
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
                message: error instanceof Error ? error.message : "Failed to list event invitees",
                retryable: true
            }
        };
    }
}
