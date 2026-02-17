import { z } from "zod";
import type { HubspotMarketingEmailOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { HubspotMarketingClient } from "../client/HubspotMarketingClient";

export const getMarketingEmailsSchema = z.object({
    limit: z.number().min(1).max(100).optional().describe("Number of emails to return (max 100)"),
    offset: z.number().min(0).optional().describe("Number of emails to skip"),
    state: z.enum(["DRAFT", "PUBLISHED", "SCHEDULED"]).optional().describe("Filter by email state")
});

export type GetMarketingEmailsParams = z.infer<typeof getMarketingEmailsSchema>;

export const getMarketingEmailsOperation: OperationDefinition = {
    id: "getMarketingEmails",
    name: "Get Marketing Emails",
    description: "Get all marketing emails from HubSpot Marketing",
    category: "emails",
    inputSchema: getMarketingEmailsSchema,
    retryable: true,
    timeout: 15000
};

export async function executeGetMarketingEmails(
    client: HubspotMarketingClient,
    params: GetMarketingEmailsParams
): Promise<OperationResult> {
    try {
        const response = await client.getMarketingEmails({
            limit: params.limit,
            offset: params.offset,
            state: params.state
        });

        const emails: HubspotMarketingEmailOutput[] = response.objects.map((email) => ({
            id: email.id,
            name: email.name,
            subject: email.subject,
            state: email.state,
            type: email.type,
            campaignId: email.campaignId,
            createdAt: email.createdAt,
            updatedAt: email.updatedAt,
            publishedAt: email.publishedAt,
            stats: email.stats
                ? {
                      sent: email.stats.counters?.sent,
                      delivered: email.stats.counters?.delivered,
                      bounced: email.stats.counters?.bounce,
                      opened: email.stats.counters?.open,
                      clicked: email.stats.counters?.click,
                      unsubscribed: email.stats.counters?.unsubscribed,
                      openRate: email.stats.ratios?.openratio,
                      clickRate: email.stats.ratios?.clickratio
                  }
                : undefined
        }));

        return {
            success: true,
            data: {
                emails,
                total: response.total
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get marketing emails",
                retryable: true
            }
        };
    }
}
