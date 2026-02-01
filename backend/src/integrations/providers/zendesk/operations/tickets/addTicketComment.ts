import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { ZendeskClient } from "../../client/ZendeskClient";
import type { TicketResponse } from "../../types";

/**
 * Add Ticket Comment Parameters
 */
export const addTicketCommentSchema = z.object({
    ticket_id: z.number().describe("The ID of the ticket to add a comment to"),
    body: z.string().describe("The comment body text"),
    html_body: z.string().optional().describe("HTML version of the comment body"),
    public: z
        .boolean()
        .optional()
        .describe("Whether the comment is public (visible to requester). Default: true"),
    author_id: z.number().optional().describe("The author user ID (defaults to authenticated user)")
});

export type AddTicketCommentParams = z.infer<typeof addTicketCommentSchema>;

/**
 * Operation Definition
 */
export const addTicketCommentOperation: OperationDefinition = {
    id: "addTicketComment",
    name: "Add Ticket Comment",
    description: "Add a comment to an existing ticket in Zendesk",
    category: "tickets",
    inputSchema: addTicketCommentSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Add Ticket Comment
 */
export async function executeAddTicketComment(
    client: ZendeskClient,
    params: AddTicketCommentParams
): Promise<OperationResult> {
    try {
        const { ticket_id, ...commentFields } = params;

        // Build comment object
        const comment: Record<string, unknown> = {
            body: commentFields.body
        };

        if (commentFields.html_body) comment.html_body = commentFields.html_body;
        if (commentFields.public !== undefined) comment.public = commentFields.public;
        if (commentFields.author_id) comment.author_id = commentFields.author_id;

        const response = await client.put<TicketResponse>(`/tickets/${ticket_id}.json`, {
            ticket: { comment }
        });

        return {
            success: true,
            data: response.ticket
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to add ticket comment",
                retryable: false
            }
        };
    }
}
