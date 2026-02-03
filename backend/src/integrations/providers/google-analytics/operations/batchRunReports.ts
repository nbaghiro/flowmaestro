import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleAnalyticsClient } from "../client/GoogleAnalyticsClient";

/**
 * Date range schema
 */
const dateRangeSchema = z.object({
    startDate: z.string().describe("Start date (YYYY-MM-DD or relative like 30daysAgo)"),
    endDate: z.string().describe("End date (YYYY-MM-DD or relative like yesterday)")
});

/**
 * Dimension schema
 */
const dimensionSchema = z.object({
    name: z.string().describe("Dimension name")
});

/**
 * Metric schema
 */
const metricSchema = z.object({
    name: z.string().describe("Metric name")
});

/**
 * Individual report request schema
 */
const reportRequestSchema = z.object({
    dateRanges: z.array(dateRangeSchema).min(1).max(4).describe("Date ranges for this report"),
    dimensions: z.array(dimensionSchema).optional().describe("Dimensions for this report"),
    metrics: z.array(metricSchema).min(1).describe("Metrics for this report"),
    dimensionFilter: z.unknown().optional().describe("Dimension filter"),
    metricFilter: z.unknown().optional().describe("Metric filter"),
    limit: z.number().int().min(1).max(100000).optional().describe("Row limit")
});

/**
 * Batch run reports input schema
 */
export const batchRunReportsSchema = z.object({
    propertyId: z
        .string()
        .min(1)
        .describe("GA4 property ID (numeric ID only, without 'properties/' prefix)"),
    requests: z
        .array(reportRequestSchema)
        .min(1)
        .max(5)
        .describe("Array of report requests to execute (1-5 reports)")
});

export type BatchRunReportsParams = z.infer<typeof batchRunReportsSchema>;

/**
 * Batch run reports operation definition
 */
export const batchRunReportsOperation: OperationDefinition = {
    id: "batchRunReports",
    name: "Batch Run Reports",
    description: "Run multiple analytics reports in a single request",
    category: "data",
    retryable: true,
    inputSchema: batchRunReportsSchema
};

/**
 * Execute batch run reports operation
 */
export async function executeBatchRunReports(
    client: GoogleAnalyticsClient,
    params: BatchRunReportsParams
): Promise<OperationResult> {
    try {
        const response = await client.batchRunReports({
            propertyId: params.propertyId,
            requests: params.requests
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
                message: error instanceof Error ? error.message : "Failed to run batch reports",
                retryable: true
            }
        };
    }
}
