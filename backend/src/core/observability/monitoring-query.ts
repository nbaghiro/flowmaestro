/**
 * Cloud Monitoring Query Service
 *
 * Queries metrics from GCP Cloud Monitoring for analytics.
 * Uses the Monitoring Query Language (MQL) for aggregations.
 */

import { MetricServiceClient } from "@google-cloud/monitoring";
import { config } from "../config";
import { createServiceLogger } from "../logging";

const logger = createServiceLogger("MonitoringQuery");

// Lazy-initialized client
let client: MetricServiceClient | null = null;

function getClient(): MetricServiceClient {
    if (!client) {
        client = new MetricServiceClient();
    }
    return client;
}

/** Time range for queries */
export interface TimeRange {
    startTime: Date;
    endTime: Date;
}

/** Aggregated metric result */
export interface MetricDataPoint {
    timestamp: Date;
    value: number;
}

/** Analytics overview data */
export interface AnalyticsOverview {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    successRate: number;
    totalTokens: number;
    totalCost: number;
    avgDurationMs: number;
}

/** Model usage stats */
export interface ModelUsageStats {
    provider: string;
    model: string;
    requests: number;
    tokens: number;
    cost: number;
}

/** Daily analytics data */
export interface DailyAnalytics {
    date: string;
    executions: number;
    successfulExecutions: number;
    failedExecutions: number;
    tokens: number;
    cost: number;
}

/**
 * Get the GCP project ID for monitoring queries
 */
function getProjectId(): string {
    return config.logging.gcpProjectId || process.env.GOOGLE_CLOUD_PROJECT || "";
}

/**
 * Query a counter metric and sum values over the time range
 */
async function queryCounterSum(
    metricType: string,
    timeRange: TimeRange,
    filter?: string
): Promise<number> {
    const projectId = getProjectId();
    if (!projectId) {
        logger.warn("No GCP project ID configured, returning 0");
        return 0;
    }

    try {
        const client = getClient();
        const projectName = `projects/${projectId}`;

        // Build the filter
        let metricFilter = `metric.type="custom.googleapis.com/${metricType}"`;
        if (filter) {
            metricFilter += ` AND ${filter}`;
        }

        const request = {
            name: projectName,
            filter: metricFilter,
            interval: {
                startTime: { seconds: Math.floor(timeRange.startTime.getTime() / 1000) },
                endTime: { seconds: Math.floor(timeRange.endTime.getTime() / 1000) }
            },
            aggregation: {
                alignmentPeriod: {
                    seconds: Math.floor(
                        (timeRange.endTime.getTime() - timeRange.startTime.getTime()) / 1000
                    )
                },
                perSeriesAligner: "ALIGN_SUM" as const,
                crossSeriesReducer: "REDUCE_SUM" as const
            }
        };

        const [timeSeries] = await client.listTimeSeries(request);

        let total = 0;
        for (const series of timeSeries) {
            for (const point of series.points || []) {
                total += point.value?.int64Value
                    ? parseInt(point.value.int64Value as string, 10)
                    : point.value?.doubleValue || 0;
            }
        }

        return total;
    } catch (error) {
        logger.error({ error, metricType }, "Failed to query counter metric");
        return 0;
    }
}

/**
 * Query a histogram metric and get the mean value
 */
async function queryHistogramMean(
    metricType: string,
    timeRange: TimeRange,
    filter?: string
): Promise<number> {
    const projectId = getProjectId();
    if (!projectId) {
        return 0;
    }

    try {
        const client = getClient();
        const projectName = `projects/${projectId}`;

        let metricFilter = `metric.type="custom.googleapis.com/${metricType}"`;
        if (filter) {
            metricFilter += ` AND ${filter}`;
        }

        const request = {
            name: projectName,
            filter: metricFilter,
            interval: {
                startTime: { seconds: Math.floor(timeRange.startTime.getTime() / 1000) },
                endTime: { seconds: Math.floor(timeRange.endTime.getTime() / 1000) }
            },
            aggregation: {
                alignmentPeriod: {
                    seconds: Math.floor(
                        (timeRange.endTime.getTime() - timeRange.startTime.getTime()) / 1000
                    )
                },
                perSeriesAligner: "ALIGN_MEAN" as const,
                crossSeriesReducer: "REDUCE_MEAN" as const
            }
        };

        const [timeSeries] = await client.listTimeSeries(request);

        let sum = 0;
        let count = 0;
        for (const series of timeSeries) {
            for (const point of series.points || []) {
                sum += point.value?.doubleValue || 0;
                count++;
            }
        }

        return count > 0 ? sum / count : 0;
    } catch (error) {
        logger.error({ error, metricType }, "Failed to query histogram metric");
        return 0;
    }
}

/**
 * Query a histogram metric and get the sum of all values
 */
async function queryHistogramSum(
    metricType: string,
    timeRange: TimeRange,
    filter?: string
): Promise<number> {
    const projectId = getProjectId();
    if (!projectId) {
        return 0;
    }

    try {
        const client = getClient();
        const projectName = `projects/${projectId}`;

        let metricFilter = `metric.type="custom.googleapis.com/${metricType}"`;
        if (filter) {
            metricFilter += ` AND ${filter}`;
        }

        const request = {
            name: projectName,
            filter: metricFilter,
            interval: {
                startTime: { seconds: Math.floor(timeRange.startTime.getTime() / 1000) },
                endTime: { seconds: Math.floor(timeRange.endTime.getTime() / 1000) }
            },
            aggregation: {
                alignmentPeriod: {
                    seconds: Math.floor(
                        (timeRange.endTime.getTime() - timeRange.startTime.getTime()) / 1000
                    )
                },
                perSeriesAligner: "ALIGN_SUM" as const,
                crossSeriesReducer: "REDUCE_SUM" as const
            }
        };

        const [timeSeries] = await client.listTimeSeries(request);

        let total = 0;
        for (const series of timeSeries) {
            for (const point of series.points || []) {
                total += point.value?.doubleValue || 0;
            }
        }

        return total;
    } catch (error) {
        logger.error({ error, metricType }, "Failed to query histogram sum");
        return 0;
    }
}

/**
 * Get analytics overview for a user over a time period
 */
export async function getAnalyticsOverview(
    userId: string,
    days: number = 7
): Promise<AnalyticsOverview> {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - days * 24 * 60 * 60 * 1000);
    const timeRange = { startTime, endTime };

    const userFilter = `metric.labels.user_id="${userId}"`;

    // Query all metrics in parallel
    const [
        totalExecutions,
        successfulExecutions,
        failedExecutions,
        promptTokens,
        completionTokens,
        totalCost,
        avgDurationMs
    ] = await Promise.all([
        queryCounterSum("flowmaestro.workflow.executions", timeRange, userFilter),
        queryCounterSum(
            "flowmaestro.workflow.executions",
            timeRange,
            `${userFilter} AND metric.labels.status="completed"`
        ),
        queryCounterSum(
            "flowmaestro.workflow.executions",
            timeRange,
            `${userFilter} AND metric.labels.status="failed"`
        ),
        queryCounterSum(
            "flowmaestro.llm.tokens",
            timeRange,
            `${userFilter} AND metric.labels.token_type="prompt"`
        ),
        queryCounterSum(
            "flowmaestro.llm.tokens",
            timeRange,
            `${userFilter} AND metric.labels.token_type="completion"`
        ),
        queryHistogramSum("flowmaestro.llm.cost", timeRange, userFilter),
        queryHistogramMean("flowmaestro.workflow.duration", timeRange, userFilter)
    ]);

    const totalTokens = promptTokens + completionTokens;
    const successRate =
        totalExecutions > 0
            ? Math.round((successfulExecutions / totalExecutions) * 10000) / 100
            : 0;

    return {
        totalExecutions,
        successfulExecutions,
        failedExecutions,
        successRate,
        totalTokens,
        totalCost: Math.round(totalCost * 10000) / 10000, // Round to 4 decimal places
        avgDurationMs: Math.round(avgDurationMs)
    };
}

/**
 * Get model usage statistics for a user
 */
export async function getModelUsageStats(
    userId: string,
    days: number = 7,
    limit: number = 10
): Promise<ModelUsageStats[]> {
    const projectId = getProjectId();
    if (!projectId) {
        return [];
    }

    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - days * 24 * 60 * 60 * 1000);

    try {
        const client = getClient();
        const projectName = `projects/${projectId}`;

        // Query LLM requests grouped by provider and model
        const request = {
            name: projectName,
            filter: `metric.type="custom.googleapis.com/flowmaestro.llm.requests" AND metric.labels.user_id="${userId}"`,
            interval: {
                startTime: { seconds: Math.floor(startTime.getTime() / 1000) },
                endTime: { seconds: Math.floor(endTime.getTime() / 1000) }
            },
            aggregation: {
                alignmentPeriod: {
                    seconds: Math.floor((endTime.getTime() - startTime.getTime()) / 1000)
                },
                perSeriesAligner: "ALIGN_SUM" as const,
                groupByFields: ["metric.labels.provider", "metric.labels.model"]
            }
        };

        const [timeSeries] = await client.listTimeSeries(request);

        const modelStats: Map<string, ModelUsageStats> = new Map();

        for (const series of timeSeries) {
            const provider = series.metric?.labels?.provider || "unknown";
            const model = series.metric?.labels?.model || "unknown";
            const key = `${provider}:${model}`;

            let requests = 0;
            for (const point of series.points || []) {
                requests += point.value?.int64Value
                    ? parseInt(point.value.int64Value as string, 10)
                    : 0;
            }

            if (!modelStats.has(key)) {
                modelStats.set(key, {
                    provider,
                    model,
                    requests,
                    tokens: 0,
                    cost: 0
                });
            } else {
                const existing = modelStats.get(key)!;
                existing.requests += requests;
            }
        }

        // Sort by requests and limit
        const sorted = Array.from(modelStats.values())
            .sort((a, b) => b.requests - a.requests)
            .slice(0, limit);

        return sorted;
    } catch (error) {
        logger.error({ error }, "Failed to get model usage stats");
        return [];
    }
}

/**
 * Get daily analytics for a user
 */
export async function getDailyAnalytics(
    userId: string,
    days: number = 30
): Promise<DailyAnalytics[]> {
    const projectId = getProjectId();
    if (!projectId) {
        return [];
    }

    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - days * 24 * 60 * 60 * 1000);

    try {
        const client = getClient();
        const projectName = `projects/${projectId}`;

        // Query executions with daily alignment
        const request = {
            name: projectName,
            filter: `metric.type="custom.googleapis.com/flowmaestro.workflow.executions" AND metric.labels.user_id="${userId}"`,
            interval: {
                startTime: { seconds: Math.floor(startTime.getTime() / 1000) },
                endTime: { seconds: Math.floor(endTime.getTime() / 1000) }
            },
            aggregation: {
                alignmentPeriod: { seconds: 86400 }, // 1 day
                perSeriesAligner: "ALIGN_SUM" as const,
                crossSeriesReducer: "REDUCE_SUM" as const,
                groupByFields: ["metric.labels.status"]
            }
        };

        const [timeSeries] = await client.listTimeSeries(request);

        const dailyData: Map<string, DailyAnalytics> = new Map();

        for (const series of timeSeries) {
            const status = series.metric?.labels?.status || "unknown";

            for (const point of series.points || []) {
                const timestamp = point.interval?.endTime?.seconds;
                if (!timestamp) continue;

                const date = new Date(parseInt(timestamp as string, 10) * 1000)
                    .toISOString()
                    .split("T")[0];
                const value = point.value?.int64Value
                    ? parseInt(point.value.int64Value as string, 10)
                    : 0;

                if (!dailyData.has(date)) {
                    dailyData.set(date, {
                        date,
                        executions: 0,
                        successfulExecutions: 0,
                        failedExecutions: 0,
                        tokens: 0,
                        cost: 0
                    });
                }

                const day = dailyData.get(date)!;
                day.executions += value;
                if (status === "completed") {
                    day.successfulExecutions += value;
                } else if (status === "failed") {
                    day.failedExecutions += value;
                }
            }
        }

        // Sort by date descending
        return Array.from(dailyData.values()).sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
    } catch (error) {
        logger.error({ error }, "Failed to get daily analytics");
        return [];
    }
}
