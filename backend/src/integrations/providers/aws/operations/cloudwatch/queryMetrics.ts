import { z } from "zod";
import { MetricNamespaceSchema, ISO8601TimestampSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AWSClient } from "../../client/AWSClient";

/**
 * Query Metrics operation schema
 */
export const queryMetricsSchema = z.object({
    namespace: MetricNamespaceSchema,
    metricName: z.string().describe("Metric name"),
    dimensions: z
        .array(
            z.object({
                name: z.string(),
                value: z.string()
            })
        )
        .optional()
        .describe("Metric dimensions"),
    startTime: ISO8601TimestampSchema.describe("Start of time range"),
    endTime: ISO8601TimestampSchema.describe("End of time range"),
    period: z.number().int().min(60).describe("Period in seconds (minimum 60)"),
    statistics: z
        .array(z.enum(["Average", "Sum", "Minimum", "Maximum", "SampleCount"]))
        .default(["Average"])
        .describe("Statistics to retrieve")
});

export type QueryMetricsParams = z.infer<typeof queryMetricsSchema>;

/**
 * Query Metrics operation definition
 */
export const queryMetricsOperation: OperationDefinition = {
    id: "cloudwatch_queryMetrics",
    name: "Query CloudWatch Metrics",
    description: "Query CloudWatch metrics with filters and time range",
    category: "cloudwatch",
    inputSchema: queryMetricsSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute query metrics operation
 */
export async function executeQueryMetrics(
    client: AWSClient,
    params: QueryMetricsParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, string> = {
            Action: "GetMetricStatistics",
            Namespace: params.namespace,
            MetricName: params.metricName,
            StartTime: new Date(params.startTime).toISOString(),
            EndTime: new Date(params.endTime).toISOString(),
            Period: params.period.toString(),
            Version: "2010-08-01"
        };

        // Add statistics
        params.statistics.forEach((stat, index) => {
            queryParams[`Statistics.member.${index + 1}`] = stat;
        });

        // Add dimensions if provided
        if (params.dimensions) {
            params.dimensions.forEach((dim, index) => {
                queryParams[`Dimensions.member.${index + 1}.Name`] = dim.name;
                queryParams[`Dimensions.member.${index + 1}.Value`] = dim.value;
            });
        }

        const response = await client.monitoring.get<{
            GetMetricStatisticsResponse: {
                GetMetricStatisticsResult: {
                    Datapoints: {
                        member: Array<{
                            Timestamp: string;
                            Average?: number;
                            Sum?: number;
                            Minimum?: number;
                            Maximum?: number;
                            SampleCount?: number;
                            Unit?: string;
                        }>;
                    };
                    Label: string;
                };
            };
        }>("/", queryParams);

        const result = response.GetMetricStatisticsResponse.GetMetricStatisticsResult;
        const datapoints = result.Datapoints.member || [];

        return {
            success: true,
            data: {
                namespace: params.namespace,
                metricName: params.metricName,
                label: result.Label,
                datapoints: datapoints
                    .map((point) => ({
                        timestamp: point.Timestamp,
                        average: point.Average,
                        sum: point.Sum,
                        minimum: point.Minimum,
                        maximum: point.Maximum,
                        sampleCount: point.SampleCount,
                        unit: point.Unit
                    }))
                    .sort(
                        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                    ),
                datapointCount: datapoints.length,
                region: client.getRegion()
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to query metrics",
                retryable: true
            }
        };
    }
}
