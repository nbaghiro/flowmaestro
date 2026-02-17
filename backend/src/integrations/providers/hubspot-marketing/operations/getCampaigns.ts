import { z } from "zod";
import type { HubspotMarketingCampaignOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { HubspotMarketingClient } from "../client/HubspotMarketingClient";

export const getCampaignsSchema = z.object({
    limit: z
        .number()
        .min(1)
        .max(250)
        .optional()
        .describe("Number of campaigns to return (max 250)"),
    offset: z.number().min(0).optional().describe("Number of campaigns to skip")
});

export type GetCampaignsParams = z.infer<typeof getCampaignsSchema>;

export const getCampaignsOperation: OperationDefinition = {
    id: "getCampaigns",
    name: "Get Campaigns",
    description: "Get all email campaigns from HubSpot Marketing",
    category: "campaigns",
    inputSchema: getCampaignsSchema,
    retryable: true,
    timeout: 15000
};

export async function executeGetCampaigns(
    client: HubspotMarketingClient,
    params: GetCampaignsParams
): Promise<OperationResult> {
    try {
        const response = await client.getCampaigns({
            limit: params.limit,
            offset: params.offset
        });

        const campaigns: HubspotMarketingCampaignOutput[] = response.campaigns.map((campaign) => ({
            id: campaign.id,
            name: campaign.name,
            subject: campaign.subject,
            type: campaign.type,
            appName: campaign.appName,
            numIncluded: campaign.numIncluded,
            numQueued: campaign.numQueued,
            lastUpdatedTime: campaign.lastUpdatedTime
                ? new Date(campaign.lastUpdatedTime).toISOString()
                : undefined
        }));

        return {
            success: true,
            data: {
                campaigns,
                hasMore: response.hasMore,
                offset: response.offset
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
