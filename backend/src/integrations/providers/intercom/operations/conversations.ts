/**
 * Intercom Conversations Operations
 */

import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { IntercomClient } from "../client/IntercomClient";
import type { IntercomConversation, IntercomListResponse } from "../types";

// ============================================
// List Conversations
// ============================================

export const listConversationsSchema = z.object({
    per_page: z
        .number()
        .int()
        .min(1)
        .max(150)
        .optional()
        .describe("Number of results per page (max 150)"),
    starting_after: z.string().optional().describe("Cursor for pagination")
});

export type ListConversationsParams = z.infer<typeof listConversationsSchema>;

export const listConversationsOperation: OperationDefinition = {
    id: "listConversations",
    name: "List Conversations",
    description: "List all conversations",
    category: "messaging",
    inputSchema: listConversationsSchema,
    inputSchemaJSON: toJSONSchema(listConversationsSchema),
    retryable: true,
    timeout: 30000
};

export async function executeListConversations(
    client: IntercomClient,
    params: ListConversationsParams
): Promise<OperationResult> {
    try {
        const response = (await client.listConversations({
            per_page: params.per_page,
            starting_after: params.starting_after
        })) as IntercomListResponse<IntercomConversation>;

        return {
            success: true,
            data: {
                conversations: response.data || [],
                pages: response.pages
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list conversations",
                retryable: true
            }
        };
    }
}

// ============================================
// Get Conversation
// ============================================

export const getConversationSchema = z.object({
    conversationId: z.string().min(1).describe("The unique identifier of the conversation")
});

export type GetConversationParams = z.infer<typeof getConversationSchema>;

export const getConversationOperation: OperationDefinition = {
    id: "getConversation",
    name: "Get Conversation",
    description: "Retrieve a specific conversation with all parts",
    category: "messaging",
    inputSchema: getConversationSchema,
    inputSchemaJSON: toJSONSchema(getConversationSchema),
    retryable: true,
    timeout: 10000
};

export async function executeGetConversation(
    client: IntercomClient,
    params: GetConversationParams
): Promise<OperationResult> {
    try {
        const conversation = (await client.getConversation(
            params.conversationId
        )) as IntercomConversation;

        return {
            success: true,
            data: conversation
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get conversation",
                retryable: true
            }
        };
    }
}

// ============================================
// Reply to Conversation
// ============================================

export const replyToConversationSchema = z.object({
    conversationId: z.string().min(1).describe("The unique identifier of the conversation"),
    message_type: z
        .enum(["comment", "note"])
        .describe("Reply type: comment (visible to user) or note (internal)"),
    body: z.string().min(1).describe("Reply content (HTML supported)"),
    admin_id: z.string().optional().describe("Admin ID for the reply")
});

export type ReplyToConversationParams = z.infer<typeof replyToConversationSchema>;

export const replyToConversationOperation: OperationDefinition = {
    id: "replyToConversation",
    name: "Reply to Conversation",
    description: "Add a reply to an existing conversation",
    category: "messaging",
    inputSchema: replyToConversationSchema,
    inputSchemaJSON: toJSONSchema(replyToConversationSchema),
    retryable: false,
    timeout: 10000
};

export async function executeReplyToConversation(
    client: IntercomClient,
    params: ReplyToConversationParams
): Promise<OperationResult> {
    try {
        const data: Record<string, unknown> = {
            message_type: params.message_type,
            body: params.body,
            type: "admin"
        };

        if (params.admin_id) data.admin_id = params.admin_id;

        const conversation = (await client.replyToConversation(
            params.conversationId,
            data
        )) as IntercomConversation;

        return {
            success: true,
            data: conversation
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to reply to conversation",
                retryable: false
            }
        };
    }
}

// ============================================
// Close Conversation
// ============================================

export const closeConversationSchema = z.object({
    conversationId: z.string().min(1).describe("The unique identifier of the conversation"),
    admin_id: z.string().min(1).describe("Admin ID closing the conversation"),
    body: z.string().optional().describe("Optional closing message")
});

export type CloseConversationParams = z.infer<typeof closeConversationSchema>;

export const closeConversationOperation: OperationDefinition = {
    id: "closeConversation",
    name: "Close Conversation",
    description: "Close/resolve a conversation",
    category: "messaging",
    inputSchema: closeConversationSchema,
    inputSchemaJSON: toJSONSchema(closeConversationSchema),
    retryable: false,
    timeout: 10000
};

export async function executeCloseConversation(
    client: IntercomClient,
    params: CloseConversationParams
): Promise<OperationResult> {
    try {
        const data: Record<string, unknown> = {
            message_type: "close",
            type: "admin",
            admin_id: params.admin_id
        };

        if (params.body) data.body = params.body;

        const conversation = (await client.manageConversation(
            params.conversationId,
            "close",
            data
        )) as IntercomConversation;

        return {
            success: true,
            data: conversation
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to close conversation",
                retryable: false
            }
        };
    }
}

// ============================================
// Assign Conversation
// ============================================

export const assignConversationSchema = z.object({
    conversationId: z.string().min(1).describe("The unique identifier of the conversation"),
    admin_id: z.string().min(1).describe("Admin ID performing the assignment"),
    assignee_id: z.string().optional().describe("Admin ID to assign the conversation to"),
    team_id: z.string().optional().describe("Team ID to assign the conversation to")
});

export type AssignConversationParams = z.infer<typeof assignConversationSchema>;

export const assignConversationOperation: OperationDefinition = {
    id: "assignConversation",
    name: "Assign Conversation",
    description: "Assign conversation to an admin or team",
    category: "messaging",
    inputSchema: assignConversationSchema,
    inputSchemaJSON: toJSONSchema(assignConversationSchema),
    retryable: false,
    timeout: 10000
};

export async function executeAssignConversation(
    client: IntercomClient,
    params: AssignConversationParams
): Promise<OperationResult> {
    try {
        const data: Record<string, unknown> = {
            message_type: "assignment",
            type: "admin",
            admin_id: params.admin_id
        };

        if (params.assignee_id) data.assignee_id = params.assignee_id;
        if (params.team_id) data.body = { team_id: params.team_id };

        const conversation = (await client.manageConversation(
            params.conversationId,
            "assignment",
            data
        )) as IntercomConversation;

        return {
            success: true,
            data: conversation
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to assign conversation",
                retryable: false
            }
        };
    }
}
