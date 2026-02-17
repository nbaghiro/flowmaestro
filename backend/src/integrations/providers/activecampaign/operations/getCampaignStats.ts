import { z } from "zod";
import type { ActiveCampaignCampaignOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ActiveCampaignClient } from "../client/ActiveCampaignClient";

export const getCampaignStatsSchema = z.object({
    campaignId: z.string().describe("The ID of the campaign to get stats for")
});

export type GetCampaignStatsParams = z.infer<typeof getCampaignStatsSchema>;

export const getCampaignStatsOperation: OperationDefinition = {
    id: "getCampaignStats",
    name: "Get Campaign Stats",
    description: "Get statistics for a specific campaign from ActiveCampaign",
    category: "campaigns",
    inputSchema: getCampaignStatsSchema,
    retryable: true,
    timeout: 15000
};

export async function executeGetCampaignStats(
    client: ActiveCampaignClient,
    params: GetCampaignStatsParams
): Promise<OperationResult> {
    try {
        const response = await client.getCampaignStats(params.campaignId);

        const output: ActiveCampaignCampaignOutput = {
            id: response.campaign.id,
            name: response.campaign.name,
            type: response.campaign.type,
            status: response.campaign.status,
            sentDate: response.campaign.sdate,
            lastSentDate: response.campaign.ldate,
            stats: {
                sent: response.campaign.send_amt,
                opens: response.campaign.opens,
                uniqueOpens: response.campaign.unique_opens,
                clicks: response.campaign.clicks,
                uniqueClicks: response.campaign.unique_clicks,
                unsubscribes: response.campaign.unsubscribes,
                bounceSoft: response.campaign.bounce_soft,
                bounceHard: response.campaign.bounce_hard
            }
        };

        return { success: true, data: output };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to get campaign stats";
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
