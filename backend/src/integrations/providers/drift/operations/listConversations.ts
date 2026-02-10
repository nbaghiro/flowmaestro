import { z } from "zod";
import { DriftClient } from "../client/DriftClient";
import type { DriftConversationsResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const listConversationsSchema = z.object({
    limit: z.number().optional().default(50).describe("Number of conversations to return"),
    next: z.string().optional().describe("Pagination cursor for next page"),
    statusId: z.number().optional().describe("Filter by status ID (1=open, 2=closed, 3=pending)")
});

export type ListConversationsParams = z.infer<typeof listConversationsSchema>;

export const listConversationsOperation: OperationDefinition = {
    id: "listConversations",
    name: "List Conversations",
    description: "List conversations with optional status filtering",
    category: "conversations",
    actionType: "read",
    inputSchema: listConversationsSchema,
    retryable: true,
    timeout: 15000
};

export async function executeListConversations(
    client: DriftClient,
    params: ListConversationsParams
): Promise<OperationResult> {
    try {
        const queryParams = new URLSearchParams();
        if (params.limit) queryParams.set("limit", String(params.limit));
        if (params.next) queryParams.set("next", params.next);
        if (params.statusId) queryParams.set("statusId", String(params.statusId));

        const qs = queryParams.toString();
        const response = await client.get<DriftConversationsResponse>(
            `/conversations${qs ? `?${qs}` : ""}`
        );

        return {
            success: true,
            data: {
                conversations: response.data.map((c) => ({
                    id: c.id,
                    status: c.status,
                    contactId: c.contactId,
                    inboxId: c.inboxId,
                    conversationType: c.conversationType,
                    createdAt: c.createdAt,
                    updatedAt: c.updatedAt
                })),
                pagination: response.pagination
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
