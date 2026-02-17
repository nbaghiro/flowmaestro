import { z } from "zod";
import type { ActiveCampaignListOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ActiveCampaignClient } from "../client/ActiveCampaignClient";

export const getListsSchema = z.object({
    limit: z.number().min(1).max(100).optional().describe("Number of lists to return (max 100)"),
    offset: z.number().min(0).optional().describe("Number of lists to skip")
});

export type GetListsParams = z.infer<typeof getListsSchema>;

export const getListsOperation: OperationDefinition = {
    id: "getLists",
    name: "Get Lists",
    description: "Get all lists from ActiveCampaign",
    category: "lists",
    inputSchema: getListsSchema,
    retryable: true,
    timeout: 15000
};

export async function executeGetLists(
    client: ActiveCampaignClient,
    params: GetListsParams
): Promise<OperationResult> {
    try {
        const response = await client.getLists({
            limit: params.limit,
            offset: params.offset
        });

        const lists: ActiveCampaignListOutput[] = response.lists.map((list) => ({
            id: list.id,
            name: list.name,
            stringId: list.stringid,
            senderName: list.sender_name,
            senderEmail: list.sender_addr,
            senderUrl: list.sender_url,
            senderReminder: list.sender_reminder,
            subscriberCount: list.subscriber_count,
            createdAt: list.cdate,
            updatedAt: list.udate
        }));

        return {
            success: true,
            data: {
                lists,
                total: parseInt(response.meta.total, 10),
                hasMore: lists.length === (params.limit || 20)
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get lists",
                retryable: true
            }
        };
    }
}
