/**
 * Intercom Tags Operations
 */

import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { IntercomClient } from "../client/IntercomClient";
import type { IntercomTag, IntercomListResponse } from "../types";

// ============================================
// List Tags
// ============================================

export const listTagsSchema = z.object({});

export type ListTagsParams = z.infer<typeof listTagsSchema>;

export const listTagsOperation: OperationDefinition = {
    id: "listTags",
    name: "List Tags",
    description: "List all tags in workspace",
    category: "data",
    inputSchema: listTagsSchema,
    retryable: true,
    timeout: 10000
};

export async function executeListTags(
    client: IntercomClient,
    _params: ListTagsParams
): Promise<OperationResult> {
    try {
        const response = (await client.listTags()) as IntercomListResponse<IntercomTag>;

        return {
            success: true,
            data: {
                tags: response.data || []
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list tags",
                retryable: true
            }
        };
    }
}

// ============================================
// Tag Contact
// ============================================

export const tagContactSchema = z.object({
    contactId: z.string().min(1).describe("The unique identifier of the contact"),
    tagId: z.string().min(1).describe("The unique identifier of the tag to add")
});

export type TagContactParams = z.infer<typeof tagContactSchema>;

export const tagContactOperation: OperationDefinition = {
    id: "tagContact",
    name: "Tag Contact",
    description: "Add a tag to a contact",
    category: "data",
    inputSchema: tagContactSchema,
    retryable: false,
    timeout: 10000
};

export async function executeTagContact(
    client: IntercomClient,
    params: TagContactParams
): Promise<OperationResult> {
    try {
        const tag = (await client.tagContact(params.contactId, params.tagId)) as IntercomTag;

        return {
            success: true,
            data: tag
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to tag contact",
                retryable: false
            }
        };
    }
}

// ============================================
// Tag Conversation
// ============================================

export const tagConversationSchema = z.object({
    conversationId: z.string().min(1).describe("The unique identifier of the conversation"),
    tagId: z.string().min(1).describe("The unique identifier of the tag to add"),
    admin_id: z.string().min(1).describe("Admin ID performing the action")
});

export type TagConversationParams = z.infer<typeof tagConversationSchema>;

export const tagConversationOperation: OperationDefinition = {
    id: "tagConversation",
    name: "Tag Conversation",
    description: "Add a tag to a conversation",
    category: "messaging",
    inputSchema: tagConversationSchema,
    retryable: false,
    timeout: 10000
};

export async function executeTagConversation(
    client: IntercomClient,
    params: TagConversationParams
): Promise<OperationResult> {
    try {
        const tag = (await client.tagConversation(
            params.conversationId,
            params.tagId,
            params.admin_id
        )) as IntercomTag;

        return {
            success: true,
            data: tag
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to tag conversation",
                retryable: false
            }
        };
    }
}
