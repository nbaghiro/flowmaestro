import { z } from "zod";
import { HelpScoutClient } from "../client/HelpScoutClient";
import type { HelpScoutConversationsResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const listConversationsSchema = z.object({
    mailbox: z.number().optional().describe("Filter by mailbox ID"),
    status: z
        .enum(["active", "pending", "closed", "spam"])
        .optional()
        .describe("Filter by conversation status"),
    tag: z.string().optional().describe("Filter by tag name"),
    assigned_to: z.number().optional().describe("Filter by assignee user ID"),
    page: z.number().optional().default(1).describe("Page number"),
    sortField: z
        .enum([
            "createdAt",
            "customerEmail",
            "mailboxid",
            "modifiedAt",
            "number",
            "score",
            "status",
            "subject"
        ])
        .optional()
        .describe("Field to sort by"),
    sortOrder: z.enum(["asc", "desc"]).optional().describe("Sort direction")
});

export type ListConversationsParams = z.infer<typeof listConversationsSchema>;

export const listConversationsOperation: OperationDefinition = {
    id: "listConversations",
    name: "List Conversations",
    description: "List conversations with optional filtering by mailbox, status, tag, or assignee",
    category: "conversations",
    actionType: "read",
    inputSchema: listConversationsSchema,
    retryable: true,
    timeout: 15000
};

export async function executeListConversations(
    client: HelpScoutClient,
    params: ListConversationsParams
): Promise<OperationResult> {
    try {
        const queryParams = new URLSearchParams();
        if (params.mailbox) queryParams.set("mailbox", String(params.mailbox));
        if (params.status) queryParams.set("status", params.status);
        if (params.tag) queryParams.set("tag", params.tag);
        if (params.assigned_to) queryParams.set("assigned_to", String(params.assigned_to));
        if (params.page) queryParams.set("page", String(params.page));
        if (params.sortField) queryParams.set("sortField", params.sortField);
        if (params.sortOrder) queryParams.set("sortOrder", params.sortOrder);

        const qs = queryParams.toString();
        const response = await client.get<HelpScoutConversationsResponse>(
            `/conversations${qs ? `?${qs}` : ""}`
        );

        return {
            success: true,
            data: {
                conversations: response._embedded.conversations.map((c) => ({
                    id: c.id,
                    number: c.number,
                    type: c.type,
                    status: c.status,
                    subject: c.subject,
                    preview: c.preview,
                    mailboxId: c.mailboxId,
                    assignee: c.assignee,
                    primaryCustomer: c.primaryCustomer,
                    tags: c.tags,
                    createdAt: c.createdAt,
                    closedAt: c.closedAt
                })),
                page: response.page
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
