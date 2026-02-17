import { z } from "zod";
import type { ActiveCampaignListOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ActiveCampaignClient } from "../client/ActiveCampaignClient";

export const createListSchema = z.object({
    name: z.string().min(1).max(200).describe("Name for the new list"),
    stringId: z.string().min(1).max(100).describe("Unique string identifier for the list"),
    senderUrl: z.string().url().describe("URL to use as sender URL"),
    senderReminder: z.string().describe("Reminder text about how the contact signed up")
});

export type CreateListParams = z.infer<typeof createListSchema>;

export const createListOperation: OperationDefinition = {
    id: "createList",
    name: "Create List",
    description: "Create a new list in ActiveCampaign",
    category: "lists",
    inputSchema: createListSchema,
    retryable: false,
    timeout: 15000
};

export async function executeCreateList(
    client: ActiveCampaignClient,
    params: CreateListParams
): Promise<OperationResult> {
    try {
        const response = await client.createList({
            name: params.name,
            stringid: params.stringId,
            sender_url: params.senderUrl,
            sender_reminder: params.senderReminder
        });

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
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create list",
                retryable: false
            }
        };
    }
}
