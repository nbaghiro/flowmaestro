import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { toJSONSchema } from "../../../core/schema-utils";
import { InstagramClient } from "../client/InstagramClient";
import type { InstagramInsightResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get Account Insights operation schema
 */
export const getAccountInsightsSchema = z.object({
    igAccountId: z.string().describe("The Instagram Business Account ID"),
    metrics: z
        .array(z.string())
        .min(1)
        .optional()
        .default(["impressions", "reach", "follower_count", "profile_views"])
        .describe("Metrics to retrieve"),
    period: z
        .enum(["day", "week", "days_28", "lifetime"])
        .default("day")
        .describe("Time period for the metrics")
});

export type GetAccountInsightsParams = z.infer<typeof getAccountInsightsSchema>;

/**
 * Get Account Insights operation definition
 */
export const getAccountInsightsOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getAccountInsights",
            name: "Get Account Insights",
            description: "Get account-level insights and metrics for an Instagram Business account",
            category: "analytics",
            inputSchema: getAccountInsightsSchema,
            inputSchemaJSON: toJSONSchema(getAccountInsightsSchema),
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "Instagram", err: error },
            "Failed to create getAccountInsightsOperation"
        );
        throw new Error(
            `Failed to create getAccountInsights operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get account insights operation
 */
export async function executeGetAccountInsights(
    client: InstagramClient,
    params: GetAccountInsightsParams
): Promise<OperationResult> {
    try {
        const response = await client.getAccountInsights(
            params.igAccountId,
            params.metrics,
            params.period
        );

        const insights: InstagramInsightResponse[] = response.data.map((insight) => ({
            name: insight.name,
            value: insight.values[0]?.value || 0,
            period: insight.period,
            title: insight.title,
            description: insight.description
        }));

        return {
            success: true,
            data: {
                igAccountId: params.igAccountId,
                period: params.period,
                insights
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get account insights",
                retryable: true
            }
        };
    }
}
