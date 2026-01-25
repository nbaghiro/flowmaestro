import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import type { MailchimpCampaignOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MailchimpClient } from "../client/MailchimpClient";

export const updateCampaignSchema = z.object({
    campaignId: z.string().min(1).describe("The unique ID of the campaign"),
    subjectLine: z.string().optional().describe("The subject line of the campaign"),
    previewText: z.string().optional().describe("Preview text shown in email clients"),
    title: z.string().optional().describe("The title of the campaign (for your reference)"),
    fromName: z.string().optional().describe("The from name for the campaign"),
    replyTo: z.string().email().optional().describe("The reply-to email address"),
    templateId: z.number().optional().describe("Template ID to use for the campaign"),
    trackOpens: z.boolean().optional().describe("Whether to track email opens"),
    trackClicks: z.boolean().optional().describe("Whether to track link clicks")
});

export type UpdateCampaignParams = z.infer<typeof updateCampaignSchema>;

export const updateCampaignOperation: OperationDefinition = {
    id: "updateCampaign",
    name: "Update Campaign",
    description: "Update an existing campaign in Mailchimp",
    category: "campaigns",
    inputSchema: updateCampaignSchema,
    inputSchemaJSON: toJSONSchema(updateCampaignSchema),
    retryable: false,
    timeout: 15000
};

export async function executeUpdateCampaign(
    client: MailchimpClient,
    params: UpdateCampaignParams
): Promise<OperationResult> {
    try {
        const updateData: Parameters<typeof client.updateCampaign>[1] = {};

        // Build settings if any provided
        if (
            params.subjectLine ||
            params.previewText ||
            params.title ||
            params.fromName ||
            params.replyTo ||
            params.templateId
        ) {
            updateData.settings = {
                subject_line: params.subjectLine,
                preview_text: params.previewText,
                title: params.title,
                from_name: params.fromName,
                reply_to: params.replyTo,
                template_id: params.templateId
            };
        }

        // Build tracking if any provided
        if (params.trackOpens !== undefined || params.trackClicks !== undefined) {
            updateData.tracking = {
                opens: params.trackOpens,
                html_clicks: params.trackClicks,
                text_clicks: params.trackClicks
            };
        }

        const campaign = await client.updateCampaign(params.campaignId, updateData);

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
                message: error instanceof Error ? error.message : "Failed to update campaign",
                retryable: false
            }
        };
    }
}
