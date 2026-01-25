import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import type { MailchimpCampaignOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MailchimpClient } from "../client/MailchimpClient";

export const getCampaignsSchema = z.object({
    count: z
        .number()
        .min(1)
        .max(1000)
        .optional()
        .describe("Number of campaigns to return (max 1000)"),
    offset: z.number().min(0).optional().describe("Number of campaigns to skip"),
    type: z
        .enum(["regular", "plaintext", "absplit", "rss", "variate"])
        .optional()
        .describe("Filter by campaign type"),
    status: z
        .enum(["save", "paused", "schedule", "sending", "sent"])
        .optional()
        .describe("Filter by campaign status"),
    listId: z.string().optional().describe("Filter by list/audience ID"),
    sortField: z.enum(["create_time", "send_time"]).optional().describe("Field to sort by"),
    sortDir: z.enum(["ASC", "DESC"]).optional().describe("Sort direction")
});

export type GetCampaignsParams = z.infer<typeof getCampaignsSchema>;

export const getCampaignsOperation: OperationDefinition = {
    id: "getCampaigns",
    name: "Get Campaigns",
    description: "Get all campaigns from Mailchimp",
    category: "campaigns",
    inputSchema: getCampaignsSchema,
    inputSchemaJSON: toJSONSchema(getCampaignsSchema),
    retryable: true,
    timeout: 15000
};

export async function executeGetCampaigns(
    client: MailchimpClient,
    params: GetCampaignsParams
): Promise<OperationResult> {
    try {
        const response = await client.getCampaigns({
            count: params.count,
            offset: params.offset,
            type: params.type,
            status: params.status,
            list_id: params.listId,
            sort_field: params.sortField,
            sort_dir: params.sortDir
        });

        const campaigns: MailchimpCampaignOutput[] = response.campaigns.map((campaign) => ({
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
        }));

        return {
            success: true,
            data: {
                campaigns,
                totalItems: response.total_items,
                hasMore: (params.offset || 0) + campaigns.length < response.total_items
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get campaigns",
                retryable: true
            }
        };
    }
}
