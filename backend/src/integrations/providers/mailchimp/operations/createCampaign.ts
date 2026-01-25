import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import type { MailchimpCampaignOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MailchimpClient } from "../client/MailchimpClient";

export const createCampaignSchema = z.object({
    type: z
        .enum(["regular", "plaintext", "absplit", "rss", "variate"])
        .describe("The type of campaign"),
    listId: z.string().min(1).describe("The list/audience ID to send the campaign to"),
    segmentId: z.number().optional().describe("Optional segment ID to filter recipients"),
    subjectLine: z.string().optional().describe("The subject line of the campaign"),
    previewText: z.string().optional().describe("Preview text shown in email clients"),
    title: z.string().optional().describe("The title of the campaign (for your reference)"),
    fromName: z.string().optional().describe("The from name for the campaign"),
    replyTo: z.string().email().optional().describe("The reply-to email address"),
    templateId: z.number().optional().describe("Template ID to use for the campaign"),
    trackOpens: z.boolean().optional().describe("Whether to track email opens"),
    trackClicks: z.boolean().optional().describe("Whether to track link clicks")
});

export type CreateCampaignParams = z.infer<typeof createCampaignSchema>;

export const createCampaignOperation: OperationDefinition = {
    id: "createCampaign",
    name: "Create Campaign",
    description: "Create a new email campaign in Mailchimp",
    category: "campaigns",
    inputSchema: createCampaignSchema,
    inputSchemaJSON: toJSONSchema(createCampaignSchema),
    retryable: false,
    timeout: 15000
};

export async function executeCreateCampaign(
    client: MailchimpClient,
    params: CreateCampaignParams
): Promise<OperationResult> {
    try {
        const campaign = await client.createCampaign({
            type: params.type,
            recipients: {
                list_id: params.listId,
                segment_opts: params.segmentId ? { saved_segment_id: params.segmentId } : undefined
            },
            settings: {
                subject_line: params.subjectLine,
                preview_text: params.previewText,
                title: params.title,
                from_name: params.fromName,
                reply_to: params.replyTo,
                template_id: params.templateId
            },
            tracking: {
                opens: params.trackOpens,
                html_clicks: params.trackClicks,
                text_clicks: params.trackClicks
            }
        });

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
            recipientCount: campaign.recipients?.recipient_count
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
                message: error instanceof Error ? error.message : "Failed to create campaign",
                retryable: false
            }
        };
    }
}
