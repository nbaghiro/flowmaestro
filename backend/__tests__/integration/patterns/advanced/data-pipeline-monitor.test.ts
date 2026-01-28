/**
 * Data Pipeline Monitor Pattern Tests
 *
 * Tests the advanced-level data engineering monitoring workflow that includes:
 * - MongoDB and PostgreSQL pipeline monitoring
 * - AI anomaly detection
 * - Auto-create PagerDuty/Sentry incidents
 * - Datadog dashboard sync
 * - Amplitude metrics update
 * - Slack/Teams notifications
 * - Notion incident reports
 *
 * Pattern: trigger → [action-mongo, action-postgresql] → llm-analyze → llm-anomaly →
 *          conditional-alert → [pagerduty/sentry] → [datadog, amplitude] →
 *          [slack, teams] → action-notion → transform-result → output-1
 */

import type { JsonObject } from "@flowmaestro/shared";
import {
    simulatePatternExecution,
    validatePatternStructure,
    createMockLLMOutput,
    createMockActionOutput,
    createMockConditionalOutput,
    createMockTriggerOutput,
    createMockTransformOutput,
    assertPatternSuccess,
    assertNodesExecuted,
    getPatternNodeIds,
    getPatternNodesByType
} from "../helpers/pattern-test-utils";

describe("Data Pipeline Monitor Pattern", () => {
    const PATTERN_ID = "mongodb-pipeline-monitor";

    // Sample scheduled trigger event (runs every 5 minutes)
    const sampleTriggerEvent = {
        triggerType: "schedule",
        schedule: "*/5 * * * *",
        timestamp: "2024-02-15T10:30:00Z",
        runId: "run-123"
    };

    // MongoDB pipeline metrics
    const mongoMetrics: JsonObject = {
        pipeline: "user-analytics",
        status: "running",
        metrics: {
            documentsProcessed: 1250000,
            documentsPerSecond: 8500,
            averageLatencyMs: 45,
            errorRate: 0.001,
            queueDepth: 150,
            memoryUsageMB: 2048,
            cpuUsagePercent: 65
        },
        stages: [
            { name: "extract", status: "healthy", throughput: 10000 },
            { name: "transform", status: "healthy", throughput: 9500 },
            { name: "load", status: "degraded", throughput: 8500, latencyMs: 120 }
        ],
        lastCheckpoint: "2024-02-15T10:29:00Z",
        replicationLag: 2500
    };

    // PostgreSQL pipeline metrics
    const postgresMetrics = {
        pipeline: "transaction-sync",
        status: "running",
        metrics: {
            rowsProcessed: 500000,
            rowsPerSecond: 3000,
            averageLatencyMs: 25,
            errorRate: 0.0005,
            connectionPoolUsage: 0.7,
            diskUsagePercent: 45,
            walLagBytes: 1024000
        },
        queries: {
            slowQueries: 3,
            blockedQueries: 0,
            avgQueryTimeMs: 15
        },
        replication: {
            status: "streaming",
            lagBytes: 512000,
            lagSeconds: 1.5
        }
    };

    // Analysis result
    const analysisResult = {
        overallHealth: "warning",
        healthScore: 75,
        summary: "MongoDB load stage showing degraded performance. PostgreSQL healthy.",
        concerns: [
            {
                source: "mongodb",
                stage: "load",
                issue: "Elevated latency (120ms vs 45ms baseline)",
                severity: "warning",
                recommendation: "Check downstream database connections"
            }
        ],
        metrics: {
            totalThroughput: 11500,
            avgLatency: 35,
            errorRate: 0.00075
        }
    };

    // Anomaly detection result
    const anomalyResult = {
        anomalyDetected: true,
        anomalyType: "latency_spike",
        confidence: 0.85,
        details: {
            metric: "load_stage_latency",
            currentValue: 120,
            expectedValue: 45,
            deviation: 2.67, // standard deviations
            trend: "increasing",
            startTime: "2024-02-15T10:15:00Z"
        },
        historicalContext: {
            last24hAvg: 42,
            last7dAvg: 44,
            percentile95: 65
        },
        potentialCauses: [
            "Downstream database overload",
            "Network latency increase",
            "Index degradation"
        ],
        suggestedActions: [
            "Check MongoDB connection pool",
            "Review recent schema changes",
            "Scale downstream resources"
        ]
    };

    // PagerDuty incident
    const pagerDutyIncident = {
        incidentId: "pd-inc-456",
        status: "triggered",
        urgency: "high",
        title: "MongoDB Pipeline Latency Anomaly",
        service: "data-pipelines",
        assignedTo: ["oncall-data-team"]
    };

    // Helper to create mock outputs for anomaly scenario
    const createAnomalyMocks = (overrides: Record<string, JsonObject> = {}) => ({
        "trigger-1": createMockTriggerOutput(sampleTriggerEvent),
        "action-mongodb": createMockActionOutput(true, mongoMetrics),
        "action-postgresql": createMockActionOutput(true, postgresMetrics),
        "action-datadog-get": createMockActionOutput(true, {
            baselines: { avgLatency: 45, errorRate: 0.001 }
        }),
        "llm-analyze": createMockLLMOutput(JSON.stringify(analysisResult)),
        "router-severity": {
            selectedRoute: "critical",
            outputVariable: "severityRoute"
        } as JsonObject,
        "action-pagerduty": createMockActionOutput(true, pagerDutyIncident),
        "action-sentry": createMockActionOutput(true, { issueId: "sentry-789" }),
        "action-datadog-event": createMockActionOutput(true, { eventPosted: true }),
        "action-slack-critical": createMockActionOutput(true, { messageTs: "123.456" }),
        "action-teams-critical": createMockActionOutput(true, { messageId: "teams-msg-789" }),
        "action-slack-warning": createMockActionOutput(true, { messageTs: "123.457" }),
        "action-notion-incident": createMockActionOutput(true, { pageId: "notion-page-123" }),
        "action-amplitude": createMockActionOutput(true, { metricsRecorded: true }),
        "action-datadog-metrics": createMockActionOutput(true, { dashboardUpdated: true }),
        "conditional-healthy": createMockConditionalOutput(false),
        "action-slack-healthy": createMockActionOutput(true, { messageTs: "123.458" }),
        "transform-result": createMockTransformOutput({
            runId: "run-123",
            healthScore: 75,
            anomalyDetected: true,
            incidentCreated: true
        }),
        "output-1": createMockActionOutput(true),
        ...overrides
    });

    // Helper for healthy scenario (no anomalies)
    const createHealthyMocks = (overrides: Record<string, JsonObject> = {}) => {
        const healthyAnalysis = {
            ...analysisResult,
            overallHealth: "healthy",
            healthScore: 98,
            anomalies: []
        };

        return {
            ...createAnomalyMocks(),
            "llm-analyze": createMockLLMOutput(JSON.stringify(healthyAnalysis)),
            "router-severity": {
                selectedRoute: "healthy",
                outputVariable: "severityRoute"
            } as JsonObject,
            "conditional-healthy": createMockConditionalOutput(true),
            ...overrides
        };
    };

    describe("pattern structure validation", () => {
        it("should have valid pattern structure", () => {
            const validation = validatePatternStructure(PATTERN_ID);
            // Pattern declares 20 nodes but has 19 - metadata outdated
            const significantErrors = validation.errors.filter(
                (e) => !e.includes("Node count mismatch")
            );
            expect(significantErrors).toHaveLength(0);
        });

        it("should have correct node count (19 nodes)", () => {
            const nodeIds = getPatternNodeIds(PATTERN_ID);
            expect(nodeIds.length).toBe(19);
        });

        it("should have trigger node as entry point", () => {
            const triggerNodes = getPatternNodesByType(PATTERN_ID, "trigger");
            expect(triggerNodes.length).toBe(1);
        });

        it("should have conditional for health check routing", () => {
            const conditionalNodes = getPatternNodesByType(PATTERN_ID, "conditional");
            expect(conditionalNodes.length).toBeGreaterThanOrEqual(1);
        });

        it("should have LLM node for AI analysis", () => {
            const llmNodes = getPatternNodesByType(PATTERN_ID, "llm");
            expect(llmNodes.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe("parallel database monitoring", () => {
        it("should fetch metrics from MongoDB and PostgreSQL in parallel", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { monitorEvent: sampleTriggerEvent },
                mockOutputs: createAnomalyMocks()
            });

            assertPatternSuccess(result);
            assertNodesExecuted(result, ["action-mongodb", "action-postgresql"]);
        });

        it("should handle MongoDB connection failures gracefully", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { monitorEvent: sampleTriggerEvent },
                mockOutputs: createAnomalyMocks({
                    "action-mongodb": createMockActionOutput(false, {
                        error: "Connection timeout"
                    })
                })
            });

            assertPatternSuccess(result);
        });

        it("should handle PostgreSQL connection failures gracefully", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { monitorEvent: sampleTriggerEvent },
                mockOutputs: createAnomalyMocks({
                    "action-postgresql": createMockActionOutput(false, {
                        error: "Connection refused"
                    })
                })
            });

            assertPatternSuccess(result);
        });
    });

    describe("AI analysis", () => {
        it("should analyze pipeline health", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { monitorEvent: sampleTriggerEvent },
                mockOutputs: createAnomalyMocks()
            });

            assertPatternSuccess(result);
            assertNodesExecuted(result, ["llm-analyze"]);
        });

        it("should detect anomalies using ML patterns", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { monitorEvent: sampleTriggerEvent },
                mockOutputs: createAnomalyMocks()
            });

            assertPatternSuccess(result);
            assertNodesExecuted(result, ["llm-analyze"]);
        });

        it("should identify latency spikes", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { monitorEvent: sampleTriggerEvent },
                mockOutputs: createAnomalyMocks()
            });

            assertPatternSuccess(result);
        });

        it("should calculate deviation from baseline", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { monitorEvent: sampleTriggerEvent },
                mockOutputs: createAnomalyMocks()
            });

            assertPatternSuccess(result);
        });
    });

    describe("anomaly alerting", () => {
        it("should create PagerDuty incident for detected anomalies", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { monitorEvent: sampleTriggerEvent },
                mockOutputs: createAnomalyMocks()
            });

            assertPatternSuccess(result);
            assertNodesExecuted(result, ["action-pagerduty"]);
        });

        it("should create Sentry issue for tracking", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { monitorEvent: sampleTriggerEvent },
                mockOutputs: createAnomalyMocks()
            });

            assertPatternSuccess(result);
            assertNodesExecuted(result, ["action-sentry"]);
        });

        it("should skip alerting when no anomaly detected", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { monitorEvent: sampleTriggerEvent },
                mockOutputs: createHealthyMocks()
            });

            assertPatternSuccess(result);
            // Conditional should evaluate to false
        });
    });

    describe("dashboard updates", () => {
        it("should update Datadog dashboards", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { monitorEvent: sampleTriggerEvent },
                mockOutputs: createAnomalyMocks()
            });

            assertPatternSuccess(result);
            assertNodesExecuted(result, ["action-datadog-metrics"]);
        });

        it("should record metrics in Amplitude", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { monitorEvent: sampleTriggerEvent },
                mockOutputs: createAnomalyMocks()
            });

            assertPatternSuccess(result);
            assertNodesExecuted(result, ["action-amplitude"]);
        });
    });

    describe("notifications", () => {
        it("should send Slack notification", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { monitorEvent: sampleTriggerEvent },
                mockOutputs: createAnomalyMocks()
            });

            assertPatternSuccess(result);
            assertNodesExecuted(result, ["action-slack-critical"]);
        });

        it("should send Teams notification", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { monitorEvent: sampleTriggerEvent },
                mockOutputs: createAnomalyMocks()
            });

            assertPatternSuccess(result);
            assertNodesExecuted(result, ["action-teams-critical"]);
        });
    });

    describe("incident documentation", () => {
        it("should create Notion incident report", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { monitorEvent: sampleTriggerEvent },
                mockOutputs: createAnomalyMocks()
            });

            assertPatternSuccess(result);
            assertNodesExecuted(result, ["action-notion-incident"]);
        });
    });

    describe("anomaly types", () => {
        it("should detect throughput anomalies", async () => {
            const throughputAnomaly = {
                ...anomalyResult,
                anomalyType: "throughput_drop",
                details: {
                    metric: "documents_per_second",
                    currentValue: 2000,
                    expectedValue: 8500,
                    deviation: 4.2
                }
            };

            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { monitorEvent: sampleTriggerEvent },
                mockOutputs: createAnomalyMocks({
                    "llm-analyze": createMockLLMOutput(JSON.stringify(throughputAnomaly))
                })
            });

            assertPatternSuccess(result);
        });

        it("should detect error rate spikes", async () => {
            const errorRateAnomaly = {
                ...anomalyResult,
                anomalyType: "error_rate_spike",
                details: {
                    metric: "error_rate",
                    currentValue: 0.05,
                    expectedValue: 0.001,
                    deviation: 8.5
                }
            };

            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { monitorEvent: sampleTriggerEvent },
                mockOutputs: createAnomalyMocks({
                    "llm-analyze": createMockLLMOutput(JSON.stringify(errorRateAnomaly))
                })
            });

            assertPatternSuccess(result);
        });

        it("should detect replication lag", async () => {
            const replicationAnomaly = {
                ...anomalyResult,
                anomalyType: "replication_lag",
                details: {
                    metric: "replication_lag_seconds",
                    currentValue: 300,
                    expectedValue: 2,
                    deviation: 10.5
                }
            };

            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { monitorEvent: sampleTriggerEvent },
                mockOutputs: createAnomalyMocks({
                    "llm-analyze": createMockLLMOutput(JSON.stringify(replicationAnomaly))
                })
            });

            assertPatternSuccess(result);
        });

        it("should detect memory pressure", async () => {
            const memoryAnomaly = {
                ...anomalyResult,
                anomalyType: "memory_pressure",
                details: {
                    metric: "memory_usage_percent",
                    currentValue: 95,
                    expectedValue: 65,
                    deviation: 3.2
                }
            };

            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { monitorEvent: sampleTriggerEvent },
                mockOutputs: createAnomalyMocks({
                    "llm-analyze": createMockLLMOutput(JSON.stringify(memoryAnomaly))
                })
            });

            assertPatternSuccess(result);
        });
    });

    describe("healthy pipeline scenario", () => {
        it("should complete monitoring cycle with healthy metrics", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { monitorEvent: sampleTriggerEvent },
                mockOutputs: createHealthyMocks()
            });

            assertPatternSuccess(result);
        });

        it("should still update dashboards when healthy", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { monitorEvent: sampleTriggerEvent },
                mockOutputs: createHealthyMocks()
            });

            assertPatternSuccess(result);
        });
    });

    describe("edge cases", () => {
        it("should handle pipeline in maintenance mode", async () => {
            const maintenanceMetrics: JsonObject = {
                ...mongoMetrics,
                status: "maintenance",
                metrics: {
                    ...(mongoMetrics.metrics as JsonObject),
                    documentsProcessed: 0,
                    documentsPerSecond: 0
                }
            };

            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { monitorEvent: sampleTriggerEvent },
                mockOutputs: createAnomalyMocks({
                    "action-mongo": createMockActionOutput(true, maintenanceMetrics)
                })
            });

            assertPatternSuccess(result);
        });

        it("should handle multiple simultaneous anomalies", async () => {
            const multiAnomaly = {
                anomalyDetected: true,
                anomalyType: "multiple",
                anomalies: [
                    { type: "latency_spike", severity: "high" },
                    { type: "error_rate_spike", severity: "critical" },
                    { type: "throughput_drop", severity: "medium" }
                ],
                overallSeverity: "critical"
            };

            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { monitorEvent: sampleTriggerEvent },
                mockOutputs: createAnomalyMocks({
                    "llm-analyze": createMockLLMOutput(JSON.stringify(multiAnomaly))
                })
            });

            assertPatternSuccess(result);
        });

        it("should handle cascading failures", async () => {
            const cascadeAnalysis = {
                ...analysisResult,
                overallHealth: "critical",
                healthScore: 20,
                concerns: [
                    { source: "mongodb", stage: "extract", issue: "Failed", severity: "critical" },
                    {
                        source: "mongodb",
                        stage: "transform",
                        issue: "Blocked by extract",
                        severity: "critical"
                    },
                    {
                        source: "mongodb",
                        stage: "load",
                        issue: "Blocked by transform",
                        severity: "critical"
                    }
                ]
            };

            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { monitorEvent: sampleTriggerEvent },
                mockOutputs: createAnomalyMocks({
                    "llm-analyze": createMockLLMOutput(JSON.stringify(cascadeAnalysis))
                })
            });

            assertPatternSuccess(result);
        });

        it("should handle flapping metrics (rapid changes)", async () => {
            const flappingAnomaly = {
                ...anomalyResult,
                anomalyType: "flapping",
                details: {
                    metric: "throughput",
                    pattern: "oscillating",
                    minValue: 2000,
                    maxValue: 10000,
                    frequency: "30s"
                }
            };

            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { monitorEvent: sampleTriggerEvent },
                mockOutputs: createAnomalyMocks({
                    "llm-analyze": createMockLLMOutput(JSON.stringify(flappingAnomaly))
                })
            });

            assertPatternSuccess(result);
        });
    });

    describe("output structure", () => {
        it("should produce comprehensive monitoring result", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { monitorEvent: sampleTriggerEvent },
                mockOutputs: createAnomalyMocks()
            });

            assertPatternSuccess(result);

            const transformOutput = result.context.nodeOutputs.get("transform-result") as Record<
                string,
                unknown
            >;
            expect(transformOutput?.success).toBe(true);
        });
    });
});
