/**
 * Gorgias Message Operations
 *
 * Messages are the individual communications within a ticket.
 * They can be customer messages, agent replies, or internal notes.
 */

import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GorgiasClient } from "../client/GorgiasClient";
import type { GorgiasMessage, GorgiasListResponse } from "../types";

// ============================================
// List Messages
// ============================================

export const listMessagesSchema = z.object({
    ticketId: z.number().int().positive().describe("The ticket ID to list messages from"),
    limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe("Number of results to return (max 100)"),
    cursor: z.string().optional().describe("Cursor for pagination from previous response")
});

export type ListMessagesParams = z.infer<typeof listMessagesSchema>;

export const listMessagesOperation: OperationDefinition = {
    id: "listMessages",
    name: "List Messages",
    description: "List all messages in a support ticket",
    category: "messages",
    inputSchema: listMessagesSchema,
    retryable: true,
    timeout: 30000
};

export async function executeListMessages(
    client: GorgiasClient,
    params: ListMessagesParams
): Promise<OperationResult> {
    try {
        const response = (await client.listMessages(params.ticketId, {
            limit: params.limit,
            cursor: params.cursor
        })) as GorgiasListResponse<GorgiasMessage>;

        return {
            success: true,
            data: {
                messages: response.data || [],
                ticketId: params.ticketId,
                pagination: response.meta
                    ? {
                          next_cursor: response.meta.next_cursor,
                          prev_cursor: response.meta.prev_cursor
                      }
                    : null
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to list messages";
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
// Create Message (Reply to Ticket)
// ============================================

export const createMessageSchema = z.object({
    ticketId: z.number().int().positive().describe("The ticket ID to add the message to"),
    channel: z
        .enum(["email", "chat", "api", "internal-note"])
        .default("api")
        .describe("Channel for the message"),
    body_text: z.string().optional().describe("Plain text message body"),
    body_html: z.string().optional().describe("HTML message body (for email channel)"),
    from_agent: z
        .boolean()
        .default(true)
        .describe("Whether the message is from an agent (true) or customer (false)"),
    sender: z
        .object({
            email: z.string().email().optional().describe("Sender email address")
        })
        .optional()
        .describe("Sender information"),
    receiver: z
        .object({
            email: z.string().email().optional().describe("Receiver email address")
        })
        .optional()
        .describe("Receiver information (for email channel)"),
    subject: z.string().optional().describe("Message subject (for email channel)")
});

export type CreateMessageParams = z.infer<typeof createMessageSchema>;

export const createMessageOperation: OperationDefinition = {
    id: "createMessage",
    name: "Create Message",
    description: "Add a reply or message to an existing support ticket",
    category: "messages",
    inputSchema: createMessageSchema,
    retryable: false,
    timeout: 15000
};

export async function executeCreateMessage(
    client: GorgiasClient,
    params: CreateMessageParams
): Promise<OperationResult> {
    try {
        const data: Record<string, unknown> = {
            channel: params.channel,
            from_agent: params.from_agent,
            via: "api"
        };

        if (params.body_text) data.body_text = params.body_text;
        if (params.body_html) data.body_html = params.body_html;
        if (params.sender) data.sender = params.sender;
        if (params.receiver) data.receiver = params.receiver;
        if (params.subject) data.subject = params.subject;

        const message = (await client.createMessage(params.ticketId, data)) as GorgiasMessage;

        return {
            success: true,
            data: message
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to create message";
        const isNotFound = errorMessage.includes("not found") || errorMessage.includes("404");
        const isValidation =
            errorMessage.includes("validation") || errorMessage.includes("required");

        return {
            success: false,
            error: {
                type: isNotFound ? "not_found" : isValidation ? "validation" : "server_error",
                message: errorMessage,
                retryable: !isNotFound && !isValidation
            }
        };
    }
}

// ============================================
// Create Internal Note
// ============================================

export const createInternalNoteSchema = z.object({
    ticketId: z.number().int().positive().describe("The ticket ID to add the note to"),
    body_text: z.string().min(1).describe("Note content in plain text"),
    body_html: z.string().optional().describe("Note content in HTML format")
});

export type CreateInternalNoteParams = z.infer<typeof createInternalNoteSchema>;

export const createInternalNoteOperation: OperationDefinition = {
    id: "createInternalNote",
    name: "Create Internal Note",
    description: "Add an internal note to a ticket (not visible to customer)",
    category: "messages",
    inputSchema: createInternalNoteSchema,
    retryable: false,
    timeout: 10000
};

export async function executeCreateInternalNote(
    client: GorgiasClient,
    params: CreateInternalNoteParams
): Promise<OperationResult> {
    try {
        const data: Record<string, unknown> = {
            channel: "internal-note",
            from_agent: true,
            via: "api",
            body_text: params.body_text
        };

        if (params.body_html) data.body_html = params.body_html;

        const message = (await client.createMessage(params.ticketId, data)) as GorgiasMessage;

        return {
            success: true,
            data: message
        };
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : "Failed to create internal note";
        const isNotFound = errorMessage.includes("not found") || errorMessage.includes("404");

        return {
            success: false,
            error: {
                type: isNotFound ? "not_found" : "server_error",
                message: errorMessage,
                retryable: !isNotFound
            }
        };
    }
}
