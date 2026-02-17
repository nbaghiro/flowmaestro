import { z } from "zod";
import type { ActiveCampaignListOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ActiveCampaignClient } from "../client/ActiveCampaignClient";

export const getListSchema = z.object({
    listId: z.string().describe("The ID of the list to retrieve")
});

export type GetListParams = z.infer<typeof getListSchema>;

export const getListOperation: OperationDefinition = {
    id: "getList",
    name: "Get List",
    description: "Get a single list from ActiveCampaign by ID",
    category: "lists",
    inputSchema: getListSchema,
    retryable: true,
    timeout: 15000
};

export async function executeGetList(
    client: ActiveCampaignClient,
    params: GetListParams
): Promise<OperationResult> {
    try {
        const response = await client.getList(params.listId);

        const output: ActiveCampaignListOutput = {
            id: response.list.id,
            name: response.list.name,
            stringId: response.list.stringid,
            senderName: response.list.sender_name,
            senderEmail: response.list.sender_addr,
            senderUrl: response.list.sender_url,
            senderReminder: response.list.sender_reminder,
            subscriberCount: response.list.subscriber_count,
            createdAt: response.list.cdate,
            updatedAt: response.list.udate
        };

        return { success: true, data: output };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to get list";
        return {
            success: false,
            error: {
                type: message.includes("not found") ? "not_found" : "server_error",
                message,
                retryable: !message.includes("not found")
            }
        };
    }
}
