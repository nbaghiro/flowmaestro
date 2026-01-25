import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MailchimpClient } from "../client/MailchimpClient";

export const sendCampaignSchema = z.object({
    campaignId: z.string().min(1).describe("The unique ID of the campaign to send")
});

export type SendCampaignParams = z.infer<typeof sendCampaignSchema>;

export const sendCampaignOperation: OperationDefinition = {
    id: "sendCampaign",
    name: "Send Campaign",
    description: "Send a campaign immediately in Mailchimp",
    category: "campaigns",
    inputSchema: sendCampaignSchema,
    inputSchemaJSON: toJSONSchema(sendCampaignSchema),
    retryable: false,
    timeout: 30000
};

export async function executeSendCampaign(
    client: MailchimpClient,
    params: SendCampaignParams
): Promise<OperationResult> {
    try {
        await client.sendCampaign(params.campaignId);

        return {
            success: true,
            data: {
                sent: true,
                campaignId: params.campaignId
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to send campaign",
                retryable: false
            }
        };
    }
}
