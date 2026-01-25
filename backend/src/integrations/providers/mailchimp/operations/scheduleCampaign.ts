import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MailchimpClient } from "../client/MailchimpClient";

export const scheduleCampaignSchema = z.object({
    campaignId: z.string().min(1).describe("The unique ID of the campaign to schedule"),
    scheduleTime: z.string().describe("UTC time to send the campaign (ISO 8601 format)"),
    timewarp: z
        .boolean()
        .optional()
        .describe("Send based on subscriber timezone (requires paid plan)"),
    batchCount: z.number().optional().describe("Number of batches to split the send into"),
    batchDelay: z.number().optional().describe("Minutes between batch sends")
});

export type ScheduleCampaignParams = z.infer<typeof scheduleCampaignSchema>;

export const scheduleCampaignOperation: OperationDefinition = {
    id: "scheduleCampaign",
    name: "Schedule Campaign",
    description: "Schedule a campaign to be sent at a specific time in Mailchimp",
    category: "campaigns",
    inputSchema: scheduleCampaignSchema,
    inputSchemaJSON: toJSONSchema(scheduleCampaignSchema),
    retryable: false,
    timeout: 15000
};

export async function executeScheduleCampaign(
    client: MailchimpClient,
    params: ScheduleCampaignParams
): Promise<OperationResult> {
    try {
        const batchDelivery =
            params.batchCount && params.batchDelay
                ? { batch_count: params.batchCount, batch_delay: params.batchDelay }
                : undefined;

        await client.scheduleCampaign(
            params.campaignId,
            params.scheduleTime,
            params.timewarp,
            batchDelivery
        );

        return {
            success: true,
            data: {
                scheduled: true,
                campaignId: params.campaignId,
                scheduleTime: params.scheduleTime
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to schedule campaign",
                retryable: false
            }
        };
    }
}
