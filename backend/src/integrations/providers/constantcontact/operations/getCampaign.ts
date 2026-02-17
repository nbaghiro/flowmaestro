import { z } from "zod";
import type { ConstantContactCampaignOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ConstantContactClient } from "../client/ConstantContactClient";

export const getCampaignSchema = z.object({
    campaignId: z.string().describe("The campaign ID to retrieve")
});

export type GetCampaignParams = z.infer<typeof getCampaignSchema>;

export const getCampaignOperation: OperationDefinition = {
    id: "getCampaign",
    name: "Get Campaign",
    description: "Retrieve a single email campaign by ID from Constant Contact",
    category: "campaigns",
    inputSchema: getCampaignSchema,
    retryable: true,
    timeout: 15000
};

export async function executeGetCampaign(
    client: ConstantContactClient,
    params: GetCampaignParams
): Promise<OperationResult> {
    try {
        const campaign = await client.getCampaign(params.campaignId);

        const output: ConstantContactCampaignOutput = {
            id: campaign.campaign_id,
            name: campaign.name,
            type: campaign.type,
            status: campaign.current_status,
            currentStatus: campaign.current_status,
            createdAt: campaign.created_at,
            updatedAt: campaign.updated_at,
            sentDate: campaign.last_sent_date
        };

        return { success: true, data: output };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to get campaign";
        return {
            success: false,
            error: {
                type: message.includes("not found") ? "not_found" : "server_error",
                message,
                retryable: false
            }
        };
    }
}
