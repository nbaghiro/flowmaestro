import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { ZendeskClient } from "../../client/ZendeskClient";
import type { TicketResponse } from "../../types";

/**
 * Update Ticket Parameters
 */
export const updateTicketSchema = z.object({
    ticket_id: z.number().describe("The ID of the ticket to update"),
    subject: z.string().optional().describe("Updated ticket subject"),
    comment: z
        .object({
            body: z.string().describe("Comment body"),
            public: z.boolean().optional().describe("Whether the comment is public (default: true)")
        })
        .optional()
        .describe("Add a comment to the ticket"),
    priority: z.enum(["urgent", "high", "normal", "low"]).optional().describe("Ticket priority"),
    type: z.enum(["problem", "incident", "question", "task"]).optional().describe("Ticket type"),
    status: z
        .enum(["new", "open", "pending", "hold", "solved", "closed"])
        .optional()
        .describe("Ticket status"),
    assignee_id: z.number().nullable().optional().describe("Assignee user ID (null to unassign)"),
    group_id: z.number().nullable().optional().describe("Group ID (null to unassign)"),
    tags: z.array(z.string()).optional().describe("Replace all tags on the ticket"),
    external_id: z.string().optional().describe("External ID for the ticket"),
    due_at: z.string().nullable().optional().describe("Due date in ISO 8601 format"),
    custom_fields: z
        .array(
            z.object({
                id: z.number().describe("Custom field ID"),
                value: z.unknown().describe("Custom field value")
            })
        )
        .optional()
        .describe("Custom field values")
});

export type UpdateTicketParams = z.infer<typeof updateTicketSchema>;

/**
 * Operation Definition
 */
export const updateTicketOperation: OperationDefinition = {
    id: "updateTicket",
    name: "Update Ticket",
    description: "Update an existing ticket in Zendesk",
    category: "tickets",
    inputSchema: updateTicketSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Update Ticket
 */
export async function executeUpdateTicket(
    client: ZendeskClient,
    params: UpdateTicketParams
): Promise<OperationResult> {
    try {
        const { ticket_id, ...updateFields } = params;

        // Build ticket update object
        const ticket: Record<string, unknown> = {};

        if (updateFields.subject !== undefined) ticket.subject = updateFields.subject;
        if (updateFields.comment) ticket.comment = updateFields.comment;
        if (updateFields.priority !== undefined) ticket.priority = updateFields.priority;
        if (updateFields.type !== undefined) ticket.type = updateFields.type;
        if (updateFields.status !== undefined) ticket.status = updateFields.status;
        if (updateFields.assignee_id !== undefined) ticket.assignee_id = updateFields.assignee_id;
        if (updateFields.group_id !== undefined) ticket.group_id = updateFields.group_id;
        if (updateFields.tags !== undefined) ticket.tags = updateFields.tags;
        if (updateFields.external_id !== undefined) ticket.external_id = updateFields.external_id;
        if (updateFields.due_at !== undefined) ticket.due_at = updateFields.due_at;
        if (updateFields.custom_fields !== undefined) {
            ticket.custom_fields = updateFields.custom_fields;
        }

        const response = await client.put<TicketResponse>(`/tickets/${ticket_id}.json`, { ticket });

        return {
            success: true,
            data: response.ticket
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update ticket",
                retryable: false
            }
        };
    }
}
