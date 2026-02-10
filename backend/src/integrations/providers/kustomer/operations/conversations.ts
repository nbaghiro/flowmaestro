/**
 * Kustomer Conversation Operations
 *
 * Conversations contain the interaction history with customers.
 * They can have multiple messages and are organized by status.
 */

import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { KustomerClient } from "../client/KustomerClient";
import type { KustomerConversation, KustomerSingleResponse, KustomerListResponse } from "../types";

// ============================================
// List Conversations
// ============================================

export const listConversationsSchema = z.object({
    page: z.number().int().min(1).optional().describe("Page number for pagination"),
    pageSize: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe("Number of results per page (max 100)"),
    status: z.enum(["open", "snoozed", "done"]).optional().describe("Filter by conversation status")
});

export type ListConversationsParams = z.infer<typeof listConversationsSchema>;

export const listConversationsOperation: OperationDefinition = {
    id: "listConversations",
    name: "List Conversations",
    description: "List conversations with pagination and optional status filter",
    category: "conversations",
    inputSchema: listConversationsSchema,
    retryable: true,
    timeout: 30000
};

export async function executeListConversations(
    client: KustomerClient,
    params: ListConversationsParams
): Promise<OperationResult> {
    try {
        const response = (await client.listConversations(
            params
        )) as KustomerListResponse<KustomerConversation>;

        return {
            success: true,
            data: {
                conversations: response.data || [],
                meta: response.meta
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
    conversationId: z.string().min(1).describe("The unique ID of the conversation")
});

export type GetConversationParams = z.infer<typeof getConversationSchema>;

export const getConversationOperation: OperationDefinition = {
    id: "getConversation",
    name: "Get Conversation",
    description: "Retrieve a specific conversation by ID",
    category: "conversations",
    inputSchema: getConversationSchema,
    retryable: true,
    timeout: 10000
};

export async function executeGetConversation(
    client: KustomerClient,
    params: GetConversationParams
): Promise<OperationResult> {
    try {
        const response = (await client.getConversation(
            params.conversationId
        )) as KustomerSingleResponse<KustomerConversation>;

        return {
            success: true,
            data: response.data
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
// Create Conversation
// ============================================

export const createConversationSchema = z.object({
    customerId: z.string().min(1).describe("The customer ID to associate with this conversation"),
    name: z.string().optional().describe("Name/title for the conversation"),
    channel: z.string().optional().describe("Communication channel (e.g., email, chat, phone)"),
    direction: z
        .enum(["in", "out"])
        .optional()
        .describe("Direction of the conversation (in=customer initiated, out=agent initiated)"),
    status: z
        .enum(["open", "snoozed", "done"])
        .optional()
        .describe("Initial status of the conversation"),
    priority: z
        .number()
        .int()
        .min(1)
        .max(5)
        .optional()
        .describe("Priority level (1=Low, 2=Normal, 3=Medium, 4=High, 5=Critical)"),
    tags: z.array(z.string()).optional().describe("Tags to apply to the conversation"),
    custom: z.record(z.unknown()).optional().describe("Custom attribute values")
});

export type CreateConversationParams = z.infer<typeof createConversationSchema>;

export const createConversationOperation: OperationDefinition = {
    id: "createConversation",
    name: "Create Conversation",
    description: "Create a new conversation for a customer",
    category: "conversations",
    inputSchema: createConversationSchema,
    retryable: false,
    timeout: 10000
};

export async function executeCreateConversation(
    client: KustomerClient,
    params: CreateConversationParams
): Promise<OperationResult> {
    try {
        const data: Record<string, unknown> = {
            customer: params.customerId
        };

        if (params.name) data.name = params.name;
        if (params.channel) data.channel = params.channel;
        if (params.direction) data.direction = params.direction;
        if (params.status) data.status = params.status;
        if (params.priority) data.priority = params.priority;
        if (params.tags) data.tags = params.tags;
        if (params.custom) data.custom = params.custom;

        const response = (await client.createConversation(
            data
        )) as KustomerSingleResponse<KustomerConversation>;

        return {
            success: true,
            data: response.data
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create conversation",
                retryable: false
            }
        };
    }
}

// ============================================
// Update Conversation
// ============================================

export const updateConversationSchema = z.object({
    conversationId: z.string().min(1).describe("The unique ID of the conversation to update"),
    name: z.string().optional().describe("Updated conversation name"),
    status: z.enum(["open", "snoozed", "done"]).optional().describe("Updated status"),
    priority: z.number().int().min(1).max(5).optional().describe("Updated priority level"),
    assignedUsers: z
        .array(z.string())
        .optional()
        .describe("User IDs to assign to this conversation"),
    assignedTeams: z
        .array(z.string())
        .optional()
        .describe("Team IDs to assign to this conversation"),
    tags: z.array(z.string()).optional().describe("Updated tags (replaces existing)"),
    custom: z.record(z.unknown()).optional().describe("Updated custom attributes")
});

export type UpdateConversationParams = z.infer<typeof updateConversationSchema>;

export const updateConversationOperation: OperationDefinition = {
    id: "updateConversation",
    name: "Update Conversation",
    description: "Update an existing conversation",
    category: "conversations",
    inputSchema: updateConversationSchema,
    retryable: false,
    timeout: 10000
};

export async function executeUpdateConversation(
    client: KustomerClient,
    params: UpdateConversationParams
): Promise<OperationResult> {
    try {
        const data: Record<string, unknown> = {};

        if (params.name) data.name = params.name;
        if (params.status) data.status = params.status;
        if (params.priority) data.priority = params.priority;
        if (params.assignedUsers) data.assignedUsers = params.assignedUsers;
        if (params.assignedTeams) data.assignedTeams = params.assignedTeams;
        if (params.tags) data.tags = params.tags;
        if (params.custom) data.custom = params.custom;

        const response = (await client.updateConversation(
            params.conversationId,
            data
        )) as KustomerSingleResponse<KustomerConversation>;

        return {
            success: true,
            data: response.data
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update conversation",
                retryable: false
            }
        };
    }
}

// ============================================
// Add Conversation Tags
// ============================================

export const addConversationTagsSchema = z.object({
    conversationId: z.string().min(1).describe("The unique ID of the conversation"),
    tags: z.array(z.string()).min(1).describe("Tags to add to the conversation")
});

export type AddConversationTagsParams = z.infer<typeof addConversationTagsSchema>;

export const addConversationTagsOperation: OperationDefinition = {
    id: "addConversationTags",
    name: "Add Conversation Tags",
    description: "Add tags to a conversation",
    category: "conversations",
    inputSchema: addConversationTagsSchema,
    retryable: false,
    timeout: 10000
};

export async function executeAddConversationTags(
    client: KustomerClient,
    params: AddConversationTagsParams
): Promise<OperationResult> {
    try {
        const response = (await client.addConversationTags(
            params.conversationId,
            params.tags
        )) as KustomerSingleResponse<KustomerConversation>;

        return {
            success: true,
            data: response.data
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to add conversation tags",
                retryable: false
            }
        };
    }
}

// ============================================
// Remove Conversation Tags
// ============================================

export const removeConversationTagsSchema = z.object({
    conversationId: z.string().min(1).describe("The unique ID of the conversation"),
    tags: z.array(z.string()).min(1).describe("Tags to remove from the conversation")
});

export type RemoveConversationTagsParams = z.infer<typeof removeConversationTagsSchema>;

export const removeConversationTagsOperation: OperationDefinition = {
    id: "removeConversationTags",
    name: "Remove Conversation Tags",
    description: "Remove tags from a conversation",
    category: "conversations",
    inputSchema: removeConversationTagsSchema,
    retryable: false,
    timeout: 10000
};

export async function executeRemoveConversationTags(
    client: KustomerClient,
    params: RemoveConversationTagsParams
): Promise<OperationResult> {
    try {
        await client.removeConversationTags(params.conversationId, params.tags);

        return {
            success: true,
            data: {
                conversationId: params.conversationId,
                removedTags: params.tags
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message:
                    error instanceof Error ? error.message : "Failed to remove conversation tags",
                retryable: false
            }
        };
    }
}
