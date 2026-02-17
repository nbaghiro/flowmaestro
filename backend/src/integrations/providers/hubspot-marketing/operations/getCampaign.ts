import { z } from "zod";
import type { HubspotMarketingCampaignOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { HubspotMarketingClient } from "../client/HubspotMarketingClient";

export const getCampaignSchema = z.object({
    campaignId: z.string().describe("The ID of the campaign to retrieve")
});

export type GetCampaignParams = z.infer<typeof getCampaignSchema>;

export const getCampaignOperation: OperationDefinition = {
    id: "getCampaign",
    name: "Get Campaign",
    description: "Get a single email campaign from HubSpot Marketing by ID",
    category: "campaigns",
    inputSchema: getCampaignSchema,
    retryable: true,
    timeout: 15000
};

export async function executeGetCampaign(
    client: HubspotMarketingClient,
    params: GetCampaignParams
): Promise<OperationResult> {
    try {
        const campaign = await client.getCampaign(params.campaignId);

        const output: HubspotMarketingCampaignOutput = {
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
        };

        return { success: true, data: output };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to get campaign";
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
