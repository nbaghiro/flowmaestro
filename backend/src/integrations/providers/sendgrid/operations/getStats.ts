import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import type { SendGridStatsOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { SendGridClient } from "../client/SendGridClient";

export const getStatsSchema = z.object({
    startDate: z.string().describe("Start date (YYYY-MM-DD)"),
    endDate: z.string().optional().describe("End date (YYYY-MM-DD), defaults to today"),
    aggregatedBy: z.enum(["day", "week", "month"]).optional().describe("Aggregation period")
});

export type GetStatsParams = z.infer<typeof getStatsSchema>;

export const getStatsOperation: OperationDefinition = {
    id: "getStats",
    name: "Get Stats",
    description: "Get global email statistics from SendGrid",
    category: "analytics",
    inputSchema: getStatsSchema,
    inputSchemaJSON: toJSONSchema(getStatsSchema),
    retryable: true,
    timeout: 30000
};

export async function executeGetStats(
    client: SendGridClient,
    params: GetStatsParams
): Promise<OperationResult> {
    try {
        const response = await client.getStats({
            start_date: params.startDate,
            end_date: params.endDate,
            aggregated_by: params.aggregatedBy
        });

        const stats: SendGridStatsOutput[] = response.map((s) => {
            const metrics = s.stats[0]?.metrics || {};
            return {
                date: s.date,
                requests: metrics.requests || 0,
                delivered: metrics.delivered || 0,
                opens: metrics.opens || 0,
                uniqueOpens: metrics.unique_opens || 0,
                clicks: metrics.clicks || 0,
                uniqueClicks: metrics.unique_clicks || 0,
                bounces: metrics.bounces || 0,
                spamReports: metrics.spam_reports || 0,
                unsubscribes: metrics.unsubscribes || 0,
                blocked: metrics.blocks || 0,
                deferred: metrics.deferred || 0
            };
        });

        return {
            success: true,
            data: {
                stats,
                startDate: params.startDate,
                endDate: params.endDate || new Date().toISOString().split("T")[0]
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get stats",
                retryable: true
            }
        };
    }
}
