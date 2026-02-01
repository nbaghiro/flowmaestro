import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { InstagramClient } from "../client/InstagramClient";
import type { InstagramInsightResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get Media Insights operation schema
 */
export const getMediaInsightsSchema = z.object({
    mediaId: z.string().describe("The Instagram media ID"),
    metrics: z
        .array(z.string())
        .min(1)
        .optional()
        .default(["engagement", "impressions", "reach", "saved"])
        .describe("Metrics to retrieve (e.g., engagement, impressions, reach, saved, video_views)")
});

export type GetMediaInsightsParams = z.infer<typeof getMediaInsightsSchema>;

/**
 * Get Media Insights operation definition
 */
export const getMediaInsightsOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getMediaInsights",
            name: "Get Media Insights",
            description: "Get engagement metrics for an Instagram post or reel",
            category: "analytics",
            inputSchema: getMediaInsightsSchema,
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "Instagram", err: error },
            "Failed to create getMediaInsightsOperation"
        );
        throw new Error(
            `Failed to create getMediaInsights operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get media insights operation
 */
export async function executeGetMediaInsights(
    client: InstagramClient,
    params: GetMediaInsightsParams
): Promise<OperationResult> {
    try {
        const response = await client.getMediaInsights(params.mediaId, params.metrics);

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
                mediaId: params.mediaId,
                insights
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get media insights",
                retryable: true
            }
        };
    }
}
