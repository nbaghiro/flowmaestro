import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { DatadogClient } from "../client/DatadogClient";

const metricSeriesSchema = z.object({
    metric: z.string().min(1).describe("Metric name"),
    points: z
        .array(z.tuple([z.number(), z.number()]))
        .min(1)
        .describe("Array of [timestamp, value] pairs"),
    tags: z.array(z.string()).optional().describe("Optional tags for the metric"),
    type: z.enum(["count", "gauge", "rate"]).optional().describe("Metric type")
});

export const submitMetricsSchema = z.object({
    series: z.array(metricSeriesSchema).min(1).describe("Array of metric series to submit")
});

export type SubmitMetricsParams = z.infer<typeof submitMetricsSchema>;

export const submitMetricsOperation: OperationDefinition = {
    id: "submitMetrics",
    name: "Submit Metrics",
    description: "Submit custom metric datapoints to Datadog",
    category: "metrics",
    inputSchema: submitMetricsSchema,
    inputSchemaJSON: toJSONSchema(submitMetricsSchema),
    retryable: true,
    timeout: 30000
};

export async function executeSubmitMetrics(
    client: DatadogClient,
    params: SubmitMetricsParams
): Promise<OperationResult> {
    try {
        const result = await client.submitMetrics({ series: params.series });

        return {
            success: true,
            data: {
                status: result.status,
                seriesCount: params.series.length,
                totalPoints: params.series.reduce((acc, s) => acc + s.points.length, 0)
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to submit metrics",
                retryable: true
            }
        };
    }
}
