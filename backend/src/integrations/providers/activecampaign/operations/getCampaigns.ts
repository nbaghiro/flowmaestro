import { z } from "zod";
import type { ActiveCampaignCampaignOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ActiveCampaignClient } from "../client/ActiveCampaignClient";

export const getCampaignsSchema = z.object({
    limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe("Number of campaigns to return (max 100)"),
    offset: z.number().min(0).optional().describe("Number of campaigns to skip")
});

export type GetCampaignsParams = z.infer<typeof getCampaignsSchema>;

export const getCampaignsOperation: OperationDefinition = {
    id: "getCampaigns",
    name: "Get Campaigns",
    description: "Get all campaigns from ActiveCampaign",
    category: "campaigns",
    inputSchema: getCampaignsSchema,
    retryable: true,
    timeout: 15000
};

export async function executeGetCampaigns(
    client: ActiveCampaignClient,
    params: GetCampaignsParams
): Promise<OperationResult> {
    try {
        const response = await client.getCampaigns({
            limit: params.limit,
            offset: params.offset
        });

        const campaigns: ActiveCampaignCampaignOutput[] = response.campaigns.map((campaign) => ({
            id: campaign.id,
            name: campaign.name,
            type: campaign.type,
            status: campaign.status,
            sentDate: campaign.sdate,
            lastSentDate: campaign.ldate,
            stats: {
                sent: campaign.send_amt,
                opens: campaign.opens,
                uniqueOpens: campaign.unique_opens,
                clicks: campaign.clicks,
                uniqueClicks: campaign.unique_clicks,
                unsubscribes: campaign.unsubscribes,
                bounceSoft: campaign.bounce_soft,
                bounceHard: campaign.bounce_hard
            }
        }));

        return {
            success: true,
            data: {
                campaigns,
                total: parseInt(response.meta.total, 10),
                hasMore: campaigns.length === (params.limit || 20)
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
