/**
 * Kustomer Message Operations
 *
 * Messages are the individual communications within conversations.
 * They can be created within a conversation or associated with a customer.
 */

import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { KustomerClient } from "../client/KustomerClient";
import type { KustomerMessage, KustomerSingleResponse, KustomerListResponse } from "../types";

// ============================================
// List Messages
// ============================================

export const listMessagesSchema = z.object({
    conversationId: z.string().min(1).describe("The conversation ID to list messages from"),
    page: z.number().int().min(1).optional().describe("Page number for pagination"),
    pageSize: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe("Number of results per page (max 100)")
});

export type ListMessagesParams = z.infer<typeof listMessagesSchema>;

export const listMessagesOperation: OperationDefinition = {
    id: "listMessages",
    name: "List Messages",
    description: "List messages in a conversation",
    category: "messages",
    inputSchema: listMessagesSchema,
    retryable: true,
    timeout: 30000
};

export async function executeListMessages(
    client: KustomerClient,
    params: ListMessagesParams
): Promise<OperationResult> {
    try {
        const response = (await client.listMessages(params.conversationId, {
            page: params.page,
            pageSize: params.pageSize
        })) as KustomerListResponse<KustomerMessage>;

        return {
            success: true,
            data: {
                messages: response.data || [],
                meta: response.meta
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list messages",
                retryable: true
            }
        };
    }
}

// ============================================
// Create Message
// ============================================

export const createMessageSchema = z.object({
    conversationId: z.string().min(1).describe("The conversation ID to add the message to"),
    channel: z.string().optional().describe("Communication channel (e.g., email, chat, note)"),
    direction: z
        .enum(["in", "out"])
        .optional()
        .describe("Direction of the message (in=from customer, out=to customer)"),
    body: z.string().min(1).describe("Message body content (plain text)"),
    bodyHtml: z.string().optional().describe("Message body in HTML format"),
    subject: z.string().optional().describe("Subject line (for email-type messages)"),
    meta: z.record(z.unknown()).optional().describe("Additional metadata for the message")
});

export type CreateMessageParams = z.infer<typeof createMessageSchema>;

export const createMessageOperation: OperationDefinition = {
    id: "createMessage",
    name: "Create Message",
    description: "Add a message to a conversation",
    category: "messages",
    inputSchema: createMessageSchema,
    retryable: false,
    timeout: 10000
};

export async function executeCreateMessage(
    client: KustomerClient,
    params: CreateMessageParams
): Promise<OperationResult> {
    try {
        const data: Record<string, unknown> = {
            body: params.body
        };

        if (params.channel) data.channel = params.channel;
        if (params.direction) data.direction = params.direction;
        if (params.bodyHtml) data.bodyHtml = params.bodyHtml;
        if (params.subject) data.subject = params.subject;
        if (params.meta) data.meta = params.meta;

        const response = (await client.createMessage(
            params.conversationId,
            data
        )) as KustomerSingleResponse<KustomerMessage>;

        return {
            success: true,
            data: response.data
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create message",
                retryable: false
            }
        };
    }
}

// ============================================
// Create Message By Customer
// ============================================

export const createMessageByCustomerSchema = z.object({
    customerId: z.string().min(1).describe("The customer ID to create the message for"),
    channel: z.string().optional().describe("Communication channel (e.g., email, chat, note)"),
    direction: z
        .enum(["in", "out"])
        .optional()
        .describe("Direction of the message (in=from customer, out=to customer)"),
    body: z.string().min(1).describe("Message body content (plain text)"),
    bodyHtml: z.string().optional().describe("Message body in HTML format"),
    subject: z.string().optional().describe("Subject line (for email-type messages)"),
    meta: z.record(z.unknown()).optional().describe("Additional metadata for the message")
});

export type CreateMessageByCustomerParams = z.infer<typeof createMessageByCustomerSchema>;

export const createMessageByCustomerOperation: OperationDefinition = {
    id: "createMessageByCustomer",
    name: "Create Message by Customer",
    description: "Create a message associated with a customer (may create a new conversation)",
    category: "messages",
    inputSchema: createMessageByCustomerSchema,
    retryable: false,
    timeout: 10000
};

export async function executeCreateMessageByCustomer(
    client: KustomerClient,
    params: CreateMessageByCustomerParams
): Promise<OperationResult> {
    try {
        const data: Record<string, unknown> = {
            body: params.body
        };

        if (params.channel) data.channel = params.channel;
        if (params.direction) data.direction = params.direction;
        if (params.bodyHtml) data.bodyHtml = params.bodyHtml;
        if (params.subject) data.subject = params.subject;
        if (params.meta) data.meta = params.meta;

        const response = (await client.createMessageByCustomer(
            params.customerId,
            data
        )) as KustomerSingleResponse<KustomerMessage>;

        return {
            success: true,
            data: response.data
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message:
                    error instanceof Error ? error.message : "Failed to create message by customer",
                retryable: false
            }
        };
    }
}
