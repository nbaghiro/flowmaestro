import { z } from "zod";
import type { DatadogMetricSeriesOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { DatadogClient } from "../client/DatadogClient";

export const queryMetricsSchema = z.object({
    query: z.string().min(1).describe("Metric query (e.g., 'avg:system.cpu.user{*}')"),
    from: z.number().describe("Start timestamp (Unix epoch seconds)"),
    to: z.number().describe("End timestamp (Unix epoch seconds)")
});

export type QueryMetricsParams = z.infer<typeof queryMetricsSchema>;

export const queryMetricsOperation: OperationDefinition = {
    id: "queryMetrics",
    name: "Query Metrics",
    description: "Query timeseries metric data from Datadog",
    category: "metrics",
    inputSchema: queryMetricsSchema,
    retryable: true,
    timeout: 30000
};

export async function executeQueryMetrics(
    client: DatadogClient,
    params: QueryMetricsParams
): Promise<OperationResult> {
    try {
        const result = await client.queryMetrics(params);

        const series: DatadogMetricSeriesOutput[] = (result.series || []).map((s) => ({
            metric: s.metric,
            displayName: s.display_name,
            points: (s.pointlist || []).map((p) => ({
                timestamp: p[0],
                value: p[1]
            })),
            unit: s.unit?.[0]?.short_name,
            scope: s.scope,
            expression: s.expression
        }));

        return {
            success: true,
            data: {
                query: result.query,
                fromDate: result.from_date,
                toDate: result.to_date,
                series
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
