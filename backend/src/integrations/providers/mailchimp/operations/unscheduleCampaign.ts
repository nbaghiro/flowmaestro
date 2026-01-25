import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MailchimpClient } from "../client/MailchimpClient";

export const unscheduleCampaignSchema = z.object({
    campaignId: z.string().min(1).describe("The unique ID of the campaign to unschedule")
});

export type UnscheduleCampaignParams = z.infer<typeof unscheduleCampaignSchema>;

export const unscheduleCampaignOperation: OperationDefinition = {
    id: "unscheduleCampaign",
    name: "Unschedule Campaign",
    description: "Unschedule a previously scheduled campaign in Mailchimp",
    category: "campaigns",
    inputSchema: unscheduleCampaignSchema,
    inputSchemaJSON: toJSONSchema(unscheduleCampaignSchema),
    retryable: false,
    timeout: 10000
};

export async function executeUnscheduleCampaign(
    client: MailchimpClient,
    params: UnscheduleCampaignParams
): Promise<OperationResult> {
    try {
        await client.unscheduleCampaign(params.campaignId);

        return {
            success: true,
            data: {
                unscheduled: true,
                campaignId: params.campaignId
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to unschedule campaign",
                retryable: false
            }
        };
    }
}
