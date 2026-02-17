import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { HubspotMarketingClient } from "../client/HubspotMarketingClient";

export const getEmailStatsSchema = z.object({
    emailId: z.number().describe("The ID of the marketing email to get stats for")
});

export type GetEmailStatsParams = z.infer<typeof getEmailStatsSchema>;

export const getEmailStatsOperation: OperationDefinition = {
    id: "getEmailStats",
    name: "Get Email Stats",
    description: "Get statistics for a specific marketing email from HubSpot Marketing",
    category: "emails",
    inputSchema: getEmailStatsSchema,
    retryable: true,
    timeout: 15000
};

export async function executeGetEmailStats(
    client: HubspotMarketingClient,
    params: GetEmailStatsParams
): Promise<OperationResult> {
    try {
        const stats = await client.getMarketingEmailStats(params.emailId);

        return {
            success: true,
            data: {
                emailId: params.emailId,
                sent: stats.counters.sent || 0,
                delivered: stats.counters.delivered || 0,
                bounced: stats.counters.bounce || 0,
                opened: stats.counters.open || 0,
                clicked: stats.counters.click || 0,
                unsubscribed: stats.counters.unsubscribed || 0,
                openRate: stats.ratios.openratio || 0,
                clickRate: stats.ratios.clickratio || 0,
                clickThroughRate: stats.ratios.clickthroughratio || 0,
                unsubscribeRate: stats.ratios.unsubscribedratio || 0
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to get email stats";
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
