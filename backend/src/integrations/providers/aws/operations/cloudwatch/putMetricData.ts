import { z } from "zod";
import { MetricNamespaceSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AWSClient } from "../../client/AWSClient";

/**
 * Put Metric Data operation schema
 */
export const putMetricDataSchema = z.object({
    namespace: MetricNamespaceSchema,
    metricData: z
        .array(
            z.object({
                metricName: z.string().describe("Metric name"),
                value: z.number().optional().describe("Metric value"),
                values: z.array(z.number()).optional().describe("Array of values for statistics"),
                counts: z.array(z.number()).optional().describe("Array of counts for statistics"),
                timestamp: z.string().datetime().optional().describe("Metric timestamp"),
                unit: z
                    .enum([
                        "Seconds",
                        "Microseconds",
                        "Milliseconds",
                        "Bytes",
                        "Kilobytes",
                        "Megabytes",
                        "Gigabytes",
                        "Terabytes",
                        "Bits",
                        "Kilobits",
                        "Megabits",
                        "Gigabits",
                        "Terabits",
                        "Percent",
                        "Count",
                        "Bytes/Second",
                        "Kilobytes/Second",
                        "Megabytes/Second",
                        "Gigabytes/Second",
                        "Terabytes/Second",
                        "Bits/Second",
                        "Kilobits/Second",
                        "Megabits/Second",
                        "Gigabits/Second",
                        "Terabits/Second",
                        "Count/Second",
                        "None"
                    ])
                    .optional()
                    .describe("Unit of measurement"),
                dimensions: z
                    .array(
                        z.object({
                            name: z.string(),
                            value: z.string()
                        })
                    )
                    .optional()
                    .describe("Metric dimensions")
            })
        )
        .min(1)
        .max(1000)
        .describe("Metric data points (1-1000)")
});

export type PutMetricDataParams = z.infer<typeof putMetricDataSchema>;

/**
 * Put Metric Data operation definition
 */
export const putMetricDataOperation: OperationDefinition = {
    id: "cloudwatch_putMetricData",
    name: "Publish Custom CloudWatch Metrics",
    description: "Publish custom metric data to CloudWatch",
    category: "cloudwatch",
    inputSchema: putMetricDataSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute put metric data operation
 */
export async function executePutMetricData(
    client: AWSClient,
    params: PutMetricDataParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, string> = {
            Action: "PutMetricData",
            Namespace: params.namespace,
            Version: "2010-08-01"
        };

        // Add metric data
        params.metricData.forEach((metric, index) => {
            const prefix = `MetricData.member.${index + 1}`;
            queryParams[`${prefix}.MetricName`] = metric.metricName;

            if (metric.value !== undefined) {
                queryParams[`${prefix}.Value`] = metric.value.toString();
            }

            if (metric.values && metric.values.length > 0) {
                metric.values.forEach((val, valIndex) => {
                    queryParams[`${prefix}.Values.member.${valIndex + 1}`] = val.toString();
                });
            }

            if (metric.counts && metric.counts.length > 0) {
                metric.counts.forEach((count, countIndex) => {
                    queryParams[`${prefix}.Counts.member.${countIndex + 1}`] = count.toString();
                });
            }

            if (metric.timestamp) {
                queryParams[`${prefix}.Timestamp`] = new Date(metric.timestamp).toISOString();
            }

            if (metric.unit) {
                queryParams[`${prefix}.Unit`] = metric.unit;
            }

            if (metric.dimensions) {
                metric.dimensions.forEach((dim, dimIndex) => {
                    queryParams[`${prefix}.Dimensions.member.${dimIndex + 1}.Name`] = dim.name;
                    queryParams[`${prefix}.Dimensions.member.${dimIndex + 1}.Value`] = dim.value;
                });
            }
        });

        await client.monitoring.get("/", queryParams);

        return {
            success: true,
            data: {
                namespace: params.namespace,
                metricsPublished: params.metricData.length,
                publishedAt: new Date().toISOString(),
                region: client.getRegion()
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to publish metrics",
                retryable: true
            }
        };
    }
}
