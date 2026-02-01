import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { ZendeskClient } from "../../client/ZendeskClient";
import type { TicketResponse } from "../../types";

/**
 * Create Ticket Parameters
 */
export const createTicketSchema = z.object({
    subject: z.string().min(1).describe("Ticket subject line"),
    description: z.string().describe("Initial ticket description/comment body"),
    priority: z.enum(["urgent", "high", "normal", "low"]).optional().describe("Ticket priority"),
    type: z.enum(["problem", "incident", "question", "task"]).optional().describe("Ticket type"),
    status: z
        .enum(["new", "open", "pending", "hold", "solved", "closed"])
        .optional()
        .describe("Ticket status"),
    requester_email: z
        .string()
        .email()
        .optional()
        .describe("Requester email (creates user if needed)"),
    requester_id: z.number().optional().describe("Requester user ID"),
    assignee_id: z.number().optional().describe("Assignee user ID"),
    group_id: z.number().optional().describe("Group ID to assign ticket to"),
    tags: z.array(z.string()).optional().describe("Tags to apply to the ticket"),
    external_id: z.string().optional().describe("External ID for the ticket"),
    due_at: z.string().optional().describe("Due date in ISO 8601 format"),
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

export type CreateTicketParams = z.infer<typeof createTicketSchema>;

/**
 * Operation Definition
 */
export const createTicketOperation: OperationDefinition = {
    id: "createTicket",
    name: "Create Ticket",
    description: "Create a new support ticket in Zendesk",
    category: "tickets",
    inputSchema: createTicketSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Create Ticket
 */
export async function executeCreateTicket(
    client: ZendeskClient,
    params: CreateTicketParams
): Promise<OperationResult> {
    try {
        // Build ticket object
        const ticket: Record<string, unknown> = {
            subject: params.subject,
            comment: { body: params.description }
        };

        // Add optional fields
        if (params.priority) ticket.priority = params.priority;
        if (params.type) ticket.type = params.type;
        if (params.status) ticket.status = params.status;
        if (params.requester_email) {
            ticket.requester = { email: params.requester_email };
        } else if (params.requester_id) {
            ticket.requester_id = params.requester_id;
        }
        if (params.assignee_id) ticket.assignee_id = params.assignee_id;
        if (params.group_id) ticket.group_id = params.group_id;
        if (params.tags) ticket.tags = params.tags;
        if (params.external_id) ticket.external_id = params.external_id;
        if (params.due_at) ticket.due_at = params.due_at;
        if (params.custom_fields) ticket.custom_fields = params.custom_fields;

        const response = await client.post<TicketResponse>("/tickets.json", { ticket });

        return {
            success: true,
            data: response.ticket
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create ticket",
                retryable: false
            }
        };
    }
}
