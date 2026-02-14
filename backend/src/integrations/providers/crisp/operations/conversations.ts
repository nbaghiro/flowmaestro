/**
 * Crisp Conversations Operations
 */

import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { CrispClient } from "../client/CrispClient";
import type { CrispConversation, CrispMessage } from "../types";

// ============================================
// List Conversations
// ============================================

export const listConversationsSchema = z.object({
    pageNumber: z.number().int().min(1).optional().default(1).describe("Page number (1-indexed)")
});

export type ListConversationsParams = z.infer<typeof listConversationsSchema>;

export const listConversationsOperation: OperationDefinition = {
    id: "listConversations",
    name: "List Conversations",
    description: "List conversations for the website with pagination",
    category: "conversations",
    inputSchema: listConversationsSchema,
    retryable: true,
    timeout: 30000
};

export async function executeListConversations(
    client: CrispClient,
    params: ListConversationsParams
): Promise<OperationResult> {
    try {
        const conversations = await client.listConversations(params.pageNumber);

        return {
            success: true,
            data: {
                conversations
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
    sessionId: z.string().min(1).describe("Conversation session ID")
});

export type GetConversationParams = z.infer<typeof getConversationSchema>;

export const getConversationOperation: OperationDefinition = {
    id: "getConversation",
    name: "Get Conversation",
    description: "Retrieve a specific conversation by session ID",
    category: "conversations",
    inputSchema: getConversationSchema,
    retryable: true,
    timeout: 10000
};

export async function executeGetConversation(
    client: CrispClient,
    params: GetConversationParams
): Promise<OperationResult> {
    try {
        const conversation = (await client.getConversation(params.sessionId)) as CrispConversation;

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
// Create Conversation
// ============================================

export const createConversationSchema = z.object({});

export type CreateConversationParams = z.infer<typeof createConversationSchema>;

export const createConversationOperation: OperationDefinition = {
    id: "createConversation",
    name: "Create Conversation",
    description: "Create a new conversation",
    category: "conversations",
    inputSchema: createConversationSchema,
    retryable: false,
    timeout: 10000
};

export async function executeCreateConversation(
    client: CrispClient,
    _params: CreateConversationParams
): Promise<OperationResult> {
    try {
        const result = await client.createConversation();

        return {
            success: true,
            data: {
                session_id: result.session_id
            }
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
// Change Conversation State
// ============================================

export const changeConversationStateSchema = z.object({
    sessionId: z.string().min(1).describe("Conversation session ID"),
    state: z.enum(["pending", "unresolved", "resolved"]).describe("New conversation state")
});

export type ChangeConversationStateParams = z.infer<typeof changeConversationStateSchema>;

export const changeConversationStateOperation: OperationDefinition = {
    id: "changeConversationState",
    name: "Change Conversation State",
    description: "Update the state of a conversation (pending, unresolved, or resolved)",
    category: "conversations",
    inputSchema: changeConversationStateSchema,
    retryable: false,
    timeout: 10000
};

export async function executeChangeConversationState(
    client: CrispClient,
    params: ChangeConversationStateParams
): Promise<OperationResult> {
    try {
        await client.updateConversationState(params.sessionId, params.state);

        return {
            success: true,
            data: {
                updated: true,
                sessionId: params.sessionId,
                state: params.state
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message:
                    error instanceof Error ? error.message : "Failed to update conversation state",
                retryable: false
            }
        };
    }
}

// ============================================
// Get Messages
// ============================================

export const getMessagesSchema = z.object({
    sessionId: z.string().min(1).describe("Conversation session ID")
});

export type GetMessagesParams = z.infer<typeof getMessagesSchema>;

export const getMessagesOperation: OperationDefinition = {
    id: "getMessages",
    name: "Get Messages",
    description: "Get all messages in a conversation",
    category: "conversations",
    inputSchema: getMessagesSchema,
    retryable: true,
    timeout: 30000
};

export async function executeGetMessages(
    client: CrispClient,
    params: GetMessagesParams
): Promise<OperationResult> {
    try {
        const messages = (await client.getMessages(params.sessionId)) as CrispMessage[];

        return {
            success: true,
            data: {
                messages
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get messages",
                retryable: true
            }
        };
    }
}

// ============================================
// Send Message
// ============================================

export const sendMessageSchema = z.object({
    sessionId: z.string().min(1).describe("Conversation session ID"),
    content: z.string().min(1).describe("Message content"),
    type: z
        .enum(["text", "file", "animation", "audio", "picker", "field"])
        .optional()
        .default("text")
        .describe("Message type"),
    nickname: z.string().optional().describe("Sender nickname (optional)"),
    avatar: z.string().url().optional().describe("Sender avatar URL (optional)")
});

export type SendMessageParams = z.infer<typeof sendMessageSchema>;

export const sendMessageOperation: OperationDefinition = {
    id: "sendMessage",
    name: "Send Message",
    description: "Send a message in a conversation",
    category: "conversations",
    inputSchema: sendMessageSchema,
    retryable: false,
    timeout: 10000
};

export async function executeSendMessage(
    client: CrispClient,
    params: SendMessageParams
): Promise<OperationResult> {
    try {
        const messageData: {
            type: string;
            content: string;
            from: "operator";
            origin: "chat";
            user?: { nickname?: string; avatar?: string };
        } = {
            type: params.type || "text",
            content: params.content,
            from: "operator",
            origin: "chat"
        };

        if (params.nickname || params.avatar) {
            messageData.user = {};
            if (params.nickname) messageData.user.nickname = params.nickname;
            if (params.avatar) messageData.user.avatar = params.avatar;
        }

        const result = await client.sendMessage(params.sessionId, messageData);

        return {
            success: true,
            data: {
                fingerprint: result.fingerprint,
                sessionId: params.sessionId
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to send message",
                retryable: false
            }
        };
    }
}

// ============================================
// Search Conversations
// ============================================

export const searchConversationsSchema = z.object({
    query: z.string().min(1).describe("Search query"),
    pageNumber: z.number().int().min(1).optional().default(1).describe("Page number (1-indexed)")
});

export type SearchConversationsParams = z.infer<typeof searchConversationsSchema>;

export const searchConversationsOperation: OperationDefinition = {
    id: "searchConversations",
    name: "Search Conversations",
    description: "Search conversations by query",
    category: "search",
    inputSchema: searchConversationsSchema,
    retryable: true,
    timeout: 30000
};

export async function executeSearchConversations(
    client: CrispClient,
    params: SearchConversationsParams
): Promise<OperationResult> {
    try {
        const conversations = await client.searchConversations(params.query, params.pageNumber);

        return {
            success: true,
            data: {
                conversations
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to search conversations",
                retryable: true
            }
        };
    }
}

// ============================================
// Add Note
// ============================================

export const addNoteSchema = z.object({
    sessionId: z.string().min(1).describe("Conversation session ID"),
    content: z.string().min(1).describe("Note content")
});

export type AddNoteParams = z.infer<typeof addNoteSchema>;

export const addNoteOperation: OperationDefinition = {
    id: "addNote",
    name: "Add Note",
    description: "Add an internal note to a conversation",
    category: "notes",
    inputSchema: addNoteSchema,
    retryable: false,
    timeout: 10000
};

export async function executeAddNote(
    client: CrispClient,
    params: AddNoteParams
): Promise<OperationResult> {
    try {
        const result = await client.addNote(params.sessionId, params.content);

        return {
            success: true,
            data: {
                fingerprint: result.fingerprint,
                sessionId: params.sessionId
            }
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
