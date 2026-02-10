/**
 * Gorgias Ticket Operations
 *
 * Tickets are the primary entity for customer support interactions.
 * Each ticket can have multiple messages and is assigned to agents/teams.
 */

import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GorgiasClient } from "../client/GorgiasClient";
import type { GorgiasTicket, GorgiasListResponse } from "../types";

// ============================================
// List Tickets
// ============================================

export const listTicketsSchema = z.object({
    limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe("Number of results to return (max 100)"),
    cursor: z.string().optional().describe("Cursor for pagination from previous response"),
    status: z.enum(["open", "closed"]).optional().describe("Filter by ticket status"),
    customer_id: z.number().int().optional().describe("Filter by customer ID")
});

export type ListTicketsParams = z.infer<typeof listTicketsSchema>;

export const listTicketsOperation: OperationDefinition = {
    id: "listTickets",
    name: "List Tickets",
    description: "List support tickets with pagination and optional filters",
    category: "tickets",
    inputSchema: listTicketsSchema,
    retryable: true,
    timeout: 30000
};

export async function executeListTickets(
    client: GorgiasClient,
    params: ListTicketsParams
): Promise<OperationResult> {
    try {
        const response = (await client.listTickets(params)) as GorgiasListResponse<GorgiasTicket>;

        return {
            success: true,
            data: {
                tickets: response.data || [],
                pagination: response.meta
                    ? {
                          next_cursor: response.meta.next_cursor,
                          prev_cursor: response.meta.prev_cursor
                      }
                    : null
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
// Get Ticket
// ============================================

export const getTicketSchema = z.object({
    ticketId: z.number().int().positive().describe("The unique ID of the ticket")
});

export type GetTicketParams = z.infer<typeof getTicketSchema>;

export const getTicketOperation: OperationDefinition = {
    id: "getTicket",
    name: "Get Ticket",
    description: "Retrieve a specific support ticket by ID",
    category: "tickets",
    inputSchema: getTicketSchema,
    retryable: true,
    timeout: 10000
};

export async function executeGetTicket(
    client: GorgiasClient,
    params: GetTicketParams
): Promise<OperationResult> {
    try {
        const ticket = (await client.getTicket(params.ticketId)) as GorgiasTicket;

        return {
            success: true,
            data: ticket
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to get ticket";
        const isNotFound = message.includes("not found") || message.includes("404");

        return {
            success: false,
            error: {
                type: isNotFound ? "not_found" : "server_error",
                message,
                retryable: !isNotFound
            }
        };
    }
}

// ============================================
// Create Ticket
// ============================================

export const createTicketSchema = z.object({
    customer: z
        .object({
            id: z.number().int().optional().describe("Existing customer ID"),
            email: z.string().email().optional().describe("Customer email for new/lookup")
        })
        .describe("Customer associated with the ticket"),
    subject: z.string().optional().describe("Ticket subject line"),
    channel: z
        .enum(["email", "chat", "phone", "api", "internal-note"])
        .default("api")
        .describe("Channel the ticket came from"),
    status: z.enum(["open", "closed"]).default("open").describe("Initial ticket status"),
    priority: z
        .enum(["low", "normal", "high", "urgent"])
        .default("normal")
        .describe("Ticket priority"),
    assignee_user_id: z.number().int().optional().describe("User ID to assign the ticket to"),
    assignee_team_id: z.number().int().optional().describe("Team ID to assign the ticket to"),
    tags: z
        .array(z.object({ id: z.number().int() }))
        .optional()
        .describe("Tags to apply to the ticket"),
    messages: z
        .array(
            z.object({
                channel: z.enum(["email", "chat", "phone", "api", "internal-note"]).default("api"),
                via: z.string().default("api"),
                body_text: z.string().optional().describe("Plain text message body"),
                body_html: z.string().optional().describe("HTML message body"),
                from_agent: z.boolean().default(false).describe("Whether message is from an agent")
            })
        )
        .optional()
        .describe("Initial messages to include with the ticket"),
    external_id: z.string().optional().describe("External ID for integration purposes")
});

export type CreateTicketParams = z.infer<typeof createTicketSchema>;

export const createTicketOperation: OperationDefinition = {
    id: "createTicket",
    name: "Create Ticket",
    description: "Create a new support ticket",
    category: "tickets",
    inputSchema: createTicketSchema,
    retryable: false,
    timeout: 15000
};

export async function executeCreateTicket(
    client: GorgiasClient,
    params: CreateTicketParams
): Promise<OperationResult> {
    try {
        const data: Record<string, unknown> = {
            customer: params.customer,
            channel: params.channel,
            status: params.status,
            priority: params.priority
        };

        if (params.subject) data.subject = params.subject;
        if (params.assignee_user_id) data.assignee_user = { id: params.assignee_user_id };
        if (params.assignee_team_id) data.assignee_team = { id: params.assignee_team_id };
        if (params.tags) data.tags = params.tags;
        if (params.messages) data.messages = params.messages;
        if (params.external_id) data.external_id = params.external_id;

        const ticket = (await client.createTicket(data)) as GorgiasTicket;

        return {
            success: true,
            data: ticket
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to create ticket";
        const isValidation = message.includes("validation") || message.includes("required");

        return {
            success: false,
            error: {
                type: isValidation ? "validation" : "server_error",
                message,
                retryable: !isValidation
            }
        };
    }
}

// ============================================
// Update Ticket
// ============================================

export const updateTicketSchema = z.object({
    ticketId: z.number().int().positive().describe("The unique ID of the ticket to update"),
    status: z.enum(["open", "closed"]).optional().describe("Updated ticket status"),
    priority: z.enum(["low", "normal", "high", "urgent"]).optional().describe("Updated priority"),
    assignee_user_id: z
        .number()
        .int()
        .nullable()
        .optional()
        .describe("User ID to assign (null to unassign)"),
    assignee_team_id: z
        .number()
        .int()
        .nullable()
        .optional()
        .describe("Team ID to assign (null to unassign)"),
    tags: z
        .array(z.object({ id: z.number().int() }))
        .optional()
        .describe("Tags to set on the ticket (replaces existing)"),
    subject: z.string().optional().describe("Updated subject line"),
    spam: z.boolean().optional().describe("Mark ticket as spam"),
    snooze_datetime: z
        .string()
        .optional()
        .describe("ISO datetime to snooze ticket until (null to unsnooze)")
});

export type UpdateTicketParams = z.infer<typeof updateTicketSchema>;

export const updateTicketOperation: OperationDefinition = {
    id: "updateTicket",
    name: "Update Ticket",
    description: "Update an existing support ticket",
    category: "tickets",
    inputSchema: updateTicketSchema,
    retryable: false,
    timeout: 10000
};

export async function executeUpdateTicket(
    client: GorgiasClient,
    params: UpdateTicketParams
): Promise<OperationResult> {
    try {
        const data: Record<string, unknown> = {};

        if (params.status !== undefined) data.status = params.status;
        if (params.priority !== undefined) data.priority = params.priority;
        if (params.subject !== undefined) data.subject = params.subject;
        if (params.tags !== undefined) data.tags = params.tags;
        if (params.spam !== undefined) data.spam = params.spam;
        if (params.snooze_datetime !== undefined) data.snooze_datetime = params.snooze_datetime;

        if (params.assignee_user_id !== undefined) {
            data.assignee_user = params.assignee_user_id ? { id: params.assignee_user_id } : null;
        }
        if (params.assignee_team_id !== undefined) {
            data.assignee_team = params.assignee_team_id ? { id: params.assignee_team_id } : null;
        }

        const ticket = (await client.updateTicket(params.ticketId, data)) as GorgiasTicket;

        return {
            success: true,
            data: ticket
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to update ticket";
        const isNotFound = message.includes("not found") || message.includes("404");

        return {
            success: false,
            error: {
                type: isNotFound ? "not_found" : "server_error",
                message,
                retryable: !isNotFound
            }
        };
    }
}

// ============================================
// Search Tickets
// ============================================

export const searchTicketsSchema = z.object({
    limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe("Number of results to return (max 100)"),
    cursor: z.string().optional().describe("Cursor for pagination"),
    status: z.enum(["open", "closed"]).optional().describe("Filter by ticket status"),
    channel: z
        .enum([
            "email",
            "chat",
            "facebook",
            "facebook-messenger",
            "instagram",
            "phone",
            "api",
            "twitter",
            "internal-note"
        ])
        .optional()
        .describe("Filter by channel"),
    assignee_user_id: z.number().int().optional().describe("Filter by assigned user ID"),
    assignee_team_id: z.number().int().optional().describe("Filter by assigned team ID"),
    customer_id: z.number().int().optional().describe("Filter by customer ID"),
    tag_id: z.number().int().optional().describe("Filter by tag ID"),
    created_after: z.string().optional().describe("Filter tickets created after this ISO datetime"),
    created_before: z
        .string()
        .optional()
        .describe("Filter tickets created before this ISO datetime"),
    updated_after: z.string().optional().describe("Filter tickets updated after this ISO datetime"),
    updated_before: z
        .string()
        .optional()
        .describe("Filter tickets updated before this ISO datetime")
});

export type SearchTicketsParams = z.infer<typeof searchTicketsSchema>;

export const searchTicketsOperation: OperationDefinition = {
    id: "searchTickets",
    name: "Search Tickets",
    description: "Search and filter support tickets with advanced criteria",
    category: "tickets",
    inputSchema: searchTicketsSchema,
    retryable: true,
    timeout: 30000
};

export async function executeSearchTickets(
    client: GorgiasClient,
    params: SearchTicketsParams
): Promise<OperationResult> {
    try {
        const response = (await client.searchTickets(params)) as GorgiasListResponse<GorgiasTicket>;

        return {
            success: true,
            data: {
                tickets: response.data || [],
                pagination: response.meta
                    ? {
                          next_cursor: response.meta.next_cursor,
                          prev_cursor: response.meta.prev_cursor
                      }
                    : null
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
