import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleAnalyticsClient } from "../client/GoogleAnalyticsClient";

/**
 * Date range schema
 */
const dateRangeSchema = z.object({
    startDate: z
        .string()
        .describe(
            "Start date (YYYY-MM-DD format, or relative: today, yesterday, NdaysAgo, e.g., 30daysAgo)"
        ),
    endDate: z
        .string()
        .describe(
            "End date (YYYY-MM-DD format, or relative: today, yesterday, NdaysAgo, e.g., yesterday)"
        )
});

/**
 * Dimension schema
 */
const dimensionSchema = z.object({
    name: z
        .string()
        .describe("Dimension name (e.g., city, country, deviceCategory, pagePath, sessionSource)")
});

/**
 * Metric schema
 */
const metricSchema = z.object({
    name: z
        .string()
        .describe(
            "Metric name (e.g., activeUsers, sessions, screenPageViews, totalRevenue, conversions)"
        )
});

/**
 * Run report input schema
 */
export const runReportSchema = z.object({
    propertyId: z
        .string()
        .min(1)
        .describe("GA4 property ID (numeric ID only, without 'properties/' prefix)"),
    dateRanges: z
        .array(dateRangeSchema)
        .min(1)
        .max(4)
        .describe("Date ranges to query (1-4 ranges)"),
    dimensions: z.array(dimensionSchema).optional().describe("Dimensions to break down metrics by"),
    metrics: z.array(metricSchema).min(1).describe("Metrics to retrieve"),
    dimensionFilter: z.unknown().optional().describe("Filter expression for dimensions"),
    metricFilter: z.unknown().optional().describe("Filter expression for metrics"),
    orderBys: z.array(z.unknown()).optional().describe("Ordering specification"),
    limit: z
        .number()
        .int()
        .min(1)
        .max(100000)
        .optional()
        .describe("Maximum rows to return (default: 10000)"),
    offset: z.number().int().min(0).optional().describe("Row offset for pagination")
});

export type RunReportParams = z.infer<typeof runReportSchema>;

/**
 * Run report operation definition
 */
export const runReportOperation: OperationDefinition = {
    id: "runReport",
    name: "Run Report",
    description: "Run a custom analytics report with specified dimensions and metrics",
    category: "data",
    retryable: true,
    inputSchema: runReportSchema
};

/**
 * Execute run report operation
 */
export async function executeRunReport(
    client: GoogleAnalyticsClient,
    params: RunReportParams
): Promise<OperationResult> {
    try {
        const response = await client.runReport({
            propertyId: params.propertyId,
            dateRanges: params.dateRanges,
            dimensions: params.dimensions,
            metrics: params.metrics,
            dimensionFilter: params.dimensionFilter,
            metricFilter: params.metricFilter,
            orderBys: params.orderBys,
            limit: params.limit,
            offset: params.offset
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
                message: error instanceof Error ? error.message : "Failed to run report",
                retryable: true
            }
        };
    }
}
