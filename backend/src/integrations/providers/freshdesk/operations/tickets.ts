/**
 * Freshdesk Tickets Operations
 */

import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { FreshdeskClient } from "../client/FreshdeskClient";
import type { FreshdeskTicket, FreshdeskConversation, FreshdeskSearchResponse } from "../types";

// ============================================
// Create Ticket
// ============================================

export const createTicketSchema = z.object({
    subject: z.string().min(1).describe("Ticket subject"),
    description: z.string().min(1).describe("Ticket description (HTML supported)"),
    email: z.string().email().optional().describe("Requester email address"),
    requester_id: z.number().int().optional().describe("Requester contact ID"),
    priority: z
        .union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)])
        .optional()
        .describe("Priority: 1=Low, 2=Medium, 3=High, 4=Urgent"),
    status: z
        .union([z.literal(2), z.literal(3), z.literal(4), z.literal(5)])
        .optional()
        .describe("Status: 2=Open, 3=Pending, 4=Resolved, 5=Closed"),
    type: z.string().optional().describe("Ticket type"),
    tags: z.array(z.string()).optional().describe("Tags for the ticket"),
    custom_fields: z.record(z.unknown()).optional().describe("Custom field values")
});

export type CreateTicketParams = z.infer<typeof createTicketSchema>;

export const createTicketOperation: OperationDefinition = {
    id: "createTicket",
    name: "Create Ticket",
    description: "Create a new support ticket",
    category: "tickets",
    inputSchema: createTicketSchema,
    retryable: false,
    timeout: 10000
};

export async function executeCreateTicket(
    client: FreshdeskClient,
    params: CreateTicketParams
): Promise<OperationResult> {
    try {
        const data: Record<string, unknown> = {
            subject: params.subject,
            description: params.description
        };

        if (params.email) data.email = params.email;
        if (params.requester_id) data.requester_id = params.requester_id;
        if (params.priority) data.priority = params.priority;
        if (params.status) data.status = params.status;
        if (params.type) data.type = params.type;
        if (params.tags) data.tags = params.tags;
        if (params.custom_fields) data.custom_fields = params.custom_fields;

        const ticket = (await client.createTicket(data)) as FreshdeskTicket;

        return {
            success: true,
            data: ticket
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

// ============================================
// Get Ticket
// ============================================

export const getTicketSchema = z.object({
    ticketId: z.number().int().describe("Ticket ID"),
    include: z
        .string()
        .optional()
        .describe('Related objects to include (e.g., "requester,company")')
});

export type GetTicketParams = z.infer<typeof getTicketSchema>;

export const getTicketOperation: OperationDefinition = {
    id: "getTicket",
    name: "Get Ticket",
    description: "Retrieve a specific ticket",
    category: "tickets",
    inputSchema: getTicketSchema,
    retryable: true,
    timeout: 10000
};

export async function executeGetTicket(
    client: FreshdeskClient,
    params: GetTicketParams
): Promise<OperationResult> {
    try {
        const ticket = (await client.getTicket(params.ticketId, params.include)) as FreshdeskTicket;

        return {
            success: true,
            data: ticket
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get ticket",
                retryable: true
            }
        };
    }
}

// ============================================
// Update Ticket
// ============================================

export const updateTicketSchema = z.object({
    ticketId: z.number().int().describe("Ticket ID"),
    subject: z.string().optional().describe("Updated subject"),
    description: z.string().optional().describe("Updated description"),
    priority: z
        .union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)])
        .optional()
        .describe("Priority: 1=Low, 2=Medium, 3=High, 4=Urgent"),
    status: z
        .union([z.literal(2), z.literal(3), z.literal(4), z.literal(5)])
        .optional()
        .describe("Status: 2=Open, 3=Pending, 4=Resolved, 5=Closed"),
    responder_id: z.number().int().optional().describe("Assigned agent ID"),
    tags: z.array(z.string()).optional().describe("Tags"),
    custom_fields: z.record(z.unknown()).optional().describe("Custom fields")
});

export type UpdateTicketParams = z.infer<typeof updateTicketSchema>;

export const updateTicketOperation: OperationDefinition = {
    id: "updateTicket",
    name: "Update Ticket",
    description: "Update an existing ticket",
    category: "tickets",
    inputSchema: updateTicketSchema,
    retryable: false,
    timeout: 10000
};

export async function executeUpdateTicket(
    client: FreshdeskClient,
    params: UpdateTicketParams
): Promise<OperationResult> {
    try {
        const data: Record<string, unknown> = {};

        if (params.subject) data.subject = params.subject;
        if (params.description) data.description = params.description;
        if (params.priority) data.priority = params.priority;
        if (params.status) data.status = params.status;
        if (params.responder_id) data.responder_id = params.responder_id;
        if (params.tags) data.tags = params.tags;
        if (params.custom_fields) data.custom_fields = params.custom_fields;

        const ticket = (await client.updateTicket(params.ticketId, data)) as FreshdeskTicket;

        return {
            success: true,
            data: ticket
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

// ============================================
// Delete Ticket
// ============================================

export const deleteTicketSchema = z.object({
    ticketId: z.number().int().describe("Ticket ID")
});

export type DeleteTicketParams = z.infer<typeof deleteTicketSchema>;

export const deleteTicketOperation: OperationDefinition = {
    id: "deleteTicket",
    name: "Delete Ticket",
    description: "Delete a ticket (moves to trash)",
    category: "tickets",
    inputSchema: deleteTicketSchema,
    retryable: false,
    timeout: 10000
};

export async function executeDeleteTicket(
    client: FreshdeskClient,
    params: DeleteTicketParams
): Promise<OperationResult> {
    try {
        await client.deleteTicket(params.ticketId);

        return {
            success: true,
            data: {
                deleted: true,
                ticketId: params.ticketId
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete ticket",
                retryable: false
            }
        };
    }
}

// ============================================
// List Tickets
// ============================================

export const listTicketsSchema = z.object({
    filter: z.string().optional().describe('Predefined filter (e.g., "new_and_my_open")'),
    requester_id: z.number().int().optional().describe("Filter by requester"),
    email: z.string().email().optional().describe("Filter by requester email"),
    company_id: z.number().int().optional().describe("Filter by company"),
    updated_since: z.string().optional().describe("ISO date filter"),
    per_page: z.number().int().min(1).max(100).optional().describe("Results per page (max 100)"),
    page: z.number().int().min(1).optional().describe("Page number")
});

export type ListTicketsParams = z.infer<typeof listTicketsSchema>;

export const listTicketsOperation: OperationDefinition = {
    id: "listTickets",
    name: "List Tickets",
    description: "List tickets with optional filters",
    category: "tickets",
    inputSchema: listTicketsSchema,
    retryable: true,
    timeout: 30000
};

export async function executeListTickets(
    client: FreshdeskClient,
    params: ListTicketsParams
): Promise<OperationResult> {
    try {
        const tickets = (await client.listTickets(params)) as FreshdeskTicket[];

        return {
            success: true,
            data: {
                tickets
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list tickets",
                retryable: true
            }
        };
    }
}

// ============================================
// Search Tickets
// ============================================

export const searchTicketsSchema = z.object({
    query: z.string().min(1).describe('Search query (e.g., "status:2 AND priority:4")')
});

export type SearchTicketsParams = z.infer<typeof searchTicketsSchema>;

export const searchTicketsOperation: OperationDefinition = {
    id: "searchTickets",
    name: "Search Tickets",
    description: "Search tickets using query",
    category: "tickets",
    inputSchema: searchTicketsSchema,
    retryable: true,
    timeout: 30000
};

export async function executeSearchTickets(
    client: FreshdeskClient,
    params: SearchTicketsParams
): Promise<OperationResult> {
    try {
        const response = (await client.searchTickets(
            params.query
        )) as FreshdeskSearchResponse<FreshdeskTicket>;

        return {
            success: true,
            data: {
                tickets: response.results || [],
                total: response.total
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to search tickets",
                retryable: true
            }
        };
    }
}

// ============================================
// Add Ticket Reply
// ============================================

export const addTicketReplySchema = z.object({
    ticketId: z.number().int().describe("Ticket ID"),
    body: z.string().min(1).describe("Reply content (HTML supported)"),
    user_id: z.number().int().optional().describe("User replying")
});

export type AddTicketReplyParams = z.infer<typeof addTicketReplySchema>;

export const addTicketReplyOperation: OperationDefinition = {
    id: "addTicketReply",
    name: "Add Ticket Reply",
    description: "Add a reply to a ticket",
    category: "tickets",
    inputSchema: addTicketReplySchema,
    retryable: false,
    timeout: 10000
};

export async function executeAddTicketReply(
    client: FreshdeskClient,
    params: AddTicketReplyParams
): Promise<OperationResult> {
    try {
        const data: Record<string, unknown> = {
            body: params.body
        };

        if (params.user_id) data.user_id = params.user_id;

        const reply = (await client.addTicketReply(params.ticketId, data)) as FreshdeskConversation;

        return {
            success: true,
            data: reply
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to add reply",
                retryable: false
            }
        };
    }
}

// ============================================
// Add Ticket Note
// ============================================

export const addTicketNoteSchema = z.object({
    ticketId: z.number().int().describe("Ticket ID"),
    body: z.string().min(1).describe("Note content (HTML supported)"),
    private: z.boolean().optional().default(true).describe("Whether the note is private"),
    notify_emails: z.array(z.string().email()).optional().describe("Emails to notify")
});

export type AddTicketNoteParams = z.infer<typeof addTicketNoteSchema>;

export const addTicketNoteOperation: OperationDefinition = {
    id: "addTicketNote",
    name: "Add Ticket Note",
    description: "Add a private note to a ticket",
    category: "tickets",
    inputSchema: addTicketNoteSchema,
    retryable: false,
    timeout: 10000
};

export async function executeAddTicketNote(
    client: FreshdeskClient,
    params: AddTicketNoteParams
): Promise<OperationResult> {
    try {
        const data: Record<string, unknown> = {
            body: params.body,
            private: params.private !== false
        };

        if (params.notify_emails) data.notify_emails = params.notify_emails;

        const note = (await client.addTicketNote(params.ticketId, data)) as FreshdeskConversation;

        return {
            success: true,
            data: note
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to add note",
                retryable: false
            }
        };
    }
}
