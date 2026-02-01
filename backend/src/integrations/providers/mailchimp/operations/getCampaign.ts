import { z } from "zod";
import type { MailchimpCampaignOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MailchimpClient } from "../client/MailchimpClient";

export const getCampaignSchema = z.object({
    campaignId: z.string().min(1).describe("The unique ID of the campaign")
});

export type GetCampaignParams = z.infer<typeof getCampaignSchema>;

export const getCampaignOperation: OperationDefinition = {
    id: "getCampaign",
    name: "Get Campaign",
    description: "Get a single campaign by ID from Mailchimp",
    category: "campaigns",
    inputSchema: getCampaignSchema,
    retryable: true,
    timeout: 10000
};

export async function executeGetCampaign(
    client: MailchimpClient,
    params: GetCampaignParams
): Promise<OperationResult> {
    try {
        const campaign = await client.getCampaign(params.campaignId);

        const output: MailchimpCampaignOutput = {
            id: campaign.id,
            type: campaign.type,
            status: campaign.status,
            createTime: campaign.create_time,
            sendTime: campaign.send_time,
            emailsSent: campaign.emails_sent,
            subjectLine: campaign.settings?.subject_line,
            title: campaign.settings?.title,
            fromName: campaign.settings?.from_name,
            replyTo: campaign.settings?.reply_to,
            listId: campaign.recipients?.list_id,
            listName: campaign.recipients?.list_name,
            recipientCount: campaign.recipients?.recipient_count,
            openRate: campaign.report_summary?.open_rate,
            clickRate: campaign.report_summary?.click_rate
        };

        return {
            success: true,
            data: output
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get campaign",
                retryable: true
            }
        };
    }
}
