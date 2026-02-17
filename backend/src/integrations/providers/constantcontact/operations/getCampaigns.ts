import { z } from "zod";
import type { ConstantContactCampaignOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ConstantContactClient } from "../client/ConstantContactClient";

export const getCampaignsSchema = z.object({
    limit: z.number().min(1).max(500).optional().describe("Maximum campaigns to return (1-500)"),
    cursor: z.string().optional().describe("Pagination cursor for next page")
});

export type GetCampaignsParams = z.infer<typeof getCampaignsSchema>;

export const getCampaignsOperation: OperationDefinition = {
    id: "getCampaigns",
    name: "Get Campaigns",
    description: "Retrieve all email campaigns from Constant Contact",
    category: "campaigns",
    inputSchema: getCampaignsSchema,
    retryable: true,
    timeout: 30000
};

export async function executeGetCampaigns(
    client: ConstantContactClient,
    params: GetCampaignsParams
): Promise<OperationResult> {
    try {
        const response = await client.getCampaigns({
            limit: params.limit,
            cursor: params.cursor
        });

        const campaigns: ConstantContactCampaignOutput[] = response.campaigns.map((campaign) => ({
            id: campaign.campaign_id,
            name: campaign.name,
            type: campaign.type,
            status: campaign.current_status,
            currentStatus: campaign.current_status,
            createdAt: campaign.created_at,
            updatedAt: campaign.updated_at,
            sentDate: campaign.last_sent_date
        }));

        return {
            success: true,
            data: {
                campaigns,
                total: campaigns.length,
                hasMore: !!response._links?.next
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to get campaigns";
        return {
            success: false,
            error: {
                type: message.includes("rate limit") ? "rate_limit" : "server_error",
                message,
                retryable: message.includes("rate limit")
            }
        };
    }
}
