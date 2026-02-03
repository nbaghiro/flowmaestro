import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleAnalyticsClient } from "../client/GoogleAnalyticsClient";

/**
 * Dimension schema
 */
const dimensionSchema = z.object({
    name: z
        .string()
        .describe(
            "Realtime dimension name (e.g., city, country, deviceCategory, unifiedScreenName)"
        )
});

/**
 * Metric schema
 */
const metricSchema = z.object({
    name: z
        .string()
        .describe(
            "Realtime metric name (e.g., activeUsers, screenPageViews, conversions, eventCount)"
        )
});

/**
 * Run realtime report input schema
 */
export const runRealtimeReportSchema = z.object({
    propertyId: z
        .string()
        .min(1)
        .describe("GA4 property ID (numeric ID only, without 'properties/' prefix)"),
    dimensions: z
        .array(dimensionSchema)
        .optional()
        .describe("Realtime dimensions to break down by"),
    metrics: z.array(metricSchema).min(1).describe("Realtime metrics to retrieve"),
    dimensionFilter: z.unknown().optional().describe("Filter expression for dimensions"),
    metricFilter: z.unknown().optional().describe("Filter expression for metrics"),
    limit: z.number().int().min(1).max(100000).optional().describe("Maximum rows to return")
});

export type RunRealtimeReportParams = z.infer<typeof runRealtimeReportSchema>;

/**
 * Run realtime report operation definition
 */
export const runRealtimeReportOperation: OperationDefinition = {
    id: "runRealtimeReport",
    name: "Run Realtime Report",
    description: "Run a real-time analytics report showing current activity",
    category: "data",
    retryable: true,
    inputSchema: runRealtimeReportSchema
};

/**
 * Execute run realtime report operation
 */
export async function executeRunRealtimeReport(
    client: GoogleAnalyticsClient,
    params: RunRealtimeReportParams
): Promise<OperationResult> {
    try {
        const response = await client.runRealtimeReport({
            propertyId: params.propertyId,
            dimensions: params.dimensions,
            metrics: params.metrics,
            dimensionFilter: params.dimensionFilter,
            metricFilter: params.metricFilter,
            limit: params.limit
        });

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to run realtime report",
                retryable: true
            }
        };
    }
}
