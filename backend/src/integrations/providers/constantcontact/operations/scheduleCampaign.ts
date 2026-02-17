import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ConstantContactClient } from "../client/ConstantContactClient";

export const scheduleCampaignSchema = z.object({
    campaignId: z.string().describe("The campaign ID to schedule"),
    scheduledDate: z
        .string()
        .describe("ISO 8601 date-time for when to send (e.g., 2024-01-15T10:00:00Z)")
});

export type ScheduleCampaignParams = z.infer<typeof scheduleCampaignSchema>;

export const scheduleCampaignOperation: OperationDefinition = {
    id: "scheduleCampaign",
    name: "Schedule Campaign",
    description: "Schedule an email campaign for sending in Constant Contact",
    category: "campaigns",
    inputSchema: scheduleCampaignSchema,
    retryable: false,
    timeout: 15000
};

export async function executeScheduleCampaign(
    client: ConstantContactClient,
    params: ScheduleCampaignParams
): Promise<OperationResult> {
    try {
        const response = await client.scheduleCampaign(params.campaignId, params.scheduledDate);

        return {
            success: true,
            data: {
                scheduled: true,
                campaignId: params.campaignId,
                scheduledDate: params.scheduledDate,
                activityId: response.campaign_activity_id
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to schedule campaign";
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
