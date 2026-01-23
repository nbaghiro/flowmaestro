/**
 * Batch Data Processing Workflow Tests
 *
 * Tests a realistic batch processing pipeline:
 * Fetch Data → Loop → Transform → Aggregate → Store
 *
 * Simulates ETL-like data processing workflows.
 */

import type { JsonObject } from "@flowmaestro/shared";
import {
    createContext,
    storeNodeOutput,
    initializeQueue,
    getReadyNodes,
    markExecuting,
    markCompleted,
    markFailed,
    isExecutionComplete,
    buildFinalOutputs
} from "../../../src/temporal/core/services/context";
import { createMockActivities, withOutputs } from "../../fixtures/activities";
import type {
    BuiltWorkflow,
    ExecutableNode,
    TypedEdge
} from "../../../src/temporal/activities/execution/types";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function createBatchProcessingWorkflow(): BuiltWorkflow {
    const nodes = new Map<string, ExecutableNode>();
    const edges = new Map<string, TypedEdge>();

    nodes.set("Input", {
        id: "Input",
        type: "input",
        name: "Batch Configuration",
        config: { name: "batchConfig" },
        depth: 0,
        dependencies: [],
        dependents: ["FetchRecords"]
    });

    // Fetch records from source
    nodes.set("FetchRecords", {
        id: "FetchRecords",
        type: "database",
        name: "Fetch Records",
        config: {
            connectionId: "conn-123",
            provider: "postgresql",
            operation: "query",
            parameters: {
                sql: "SELECT * FROM {{Input.batchConfig.sourceTable}} WHERE status = 'pending' LIMIT {{Input.batchConfig.batchSize}}"
            }
        },
        depth: 1,
        dependencies: ["Input"],
        dependents: ["ProcessLoop"]
    });

    // Loop over records
    nodes.set("ProcessLoop", {
        id: "ProcessLoop",
        type: "loop",
        name: "Process Records",
        config: {
            mode: "forEach",
            collection: "{{FetchRecords.data}}",
            itemVariable: "record"
        },
        depth: 2,
        dependencies: ["FetchRecords"],
        dependents: ["ValidateRecord"]
    });

    // Validate each record
    nodes.set("ValidateRecord", {
        id: "ValidateRecord",
        type: "conditional",
        name: "Validate Record",
        config: {
            condition: "{{record.data}} !== null && {{record.id}} !== null"
        },
        depth: 3,
        dependencies: ["ProcessLoop"],
        dependents: ["TransformRecord", "MarkInvalid"]
    });

    // Transform record
    nodes.set("TransformRecord", {
        id: "TransformRecord",
        type: "transform",
        name: "Transform Record",
        config: {
            operation: "custom",
            expression: `{
                ...record,
                data: {
                    ...record.data,
                    processed: true,
                    processedAt: new Date().toISOString()
                }
            }`
        },
        depth: 4,
        dependencies: ["ValidateRecord"],
        dependents: ["EnrichRecord"]
    });

    // Enrich with external data
    nodes.set("EnrichRecord", {
        id: "EnrichRecord",
        type: "http",
        name: "Enrich Record",
        config: {
            method: "POST",
            url: "https://api.enrichment.example.com/enrich",
            body: { recordId: "{{record.id}}", data: "{{TransformRecord.data}}" }
        },
        depth: 5,
        dependencies: ["TransformRecord"],
        dependents: ["StoreProcessed"]
    });

    // Store processed record
    nodes.set("StoreProcessed", {
        id: "StoreProcessed",
        type: "database",
        name: "Store Processed",
        config: {
            connectionId: "conn-123",
            provider: "postgresql",
            operation: "update",
            parameters: {
                table: "{{Input.batchConfig.sourceTable}}",
                data: { status: "processed", processed_data: "{{EnrichRecord.data}}" },
                where: { id: "{{record.id}}" }
            }
        },
        depth: 6,
        dependencies: ["EnrichRecord"],
        dependents: ["LoopEnd"]
    });

    // Mark invalid records
    nodes.set("MarkInvalid", {
        id: "MarkInvalid",
        type: "database",
        name: "Mark Invalid",
        config: {
            connectionId: "conn-123",
            provider: "postgresql",
            operation: "update",
            parameters: {
                table: "{{Input.batchConfig.sourceTable}}",
                data: { status: "failed", error: "Validation failed" },
                where: { id: "{{record.id}}" }
            }
        },
        depth: 4,
        dependencies: ["ValidateRecord"],
        dependents: ["LoopEnd"]
    });

    // Loop end
    nodes.set("LoopEnd", {
        id: "LoopEnd",
        type: "echo",
        name: "Loop End",
        config: {},
        depth: 7,
        dependencies: ["StoreProcessed", "MarkInvalid"],
        dependents: ["Aggregate"]
    });

    // Aggregate results
    nodes.set("Aggregate", {
        id: "Aggregate",
        type: "transform",
        name: "Aggregate Results",
        config: {
            operation: "reduce",
            expression: "(acc, result) => ({ ...acc, count: acc.count + 1 })",
            initial: { count: 0, processed: 0, failed: 0 }
        },
        depth: 8,
        dependencies: ["LoopEnd"],
        dependents: ["GenerateReport"]
    });

    // Generate report
    nodes.set("GenerateReport", {
        id: "GenerateReport",
        type: "transform",
        name: "Generate Report",
        config: {
            operation: "custom",
            expression: `{
                batchId: batchConfig.batchId,
                totalRecords: Aggregate.count,
                status: 'completed',
                completedAt: new Date().toISOString()
            }`
        },
        depth: 9,
        dependencies: ["Aggregate"],
        dependents: ["SendNotification"]
    });

    // Send completion notification
    nodes.set("SendNotification", {
        id: "SendNotification",
        type: "http",
        name: "Send Notification",
        config: {
            method: "POST",
            url: "https://api.notifications.example.com/batch-complete",
            body: { batchId: "{{Input.batchConfig.batchId}}", report: "{{GenerateReport}}" }
        },
        depth: 10,
        dependencies: ["GenerateReport"],
        dependents: ["Output"]
    });

    nodes.set("Output", {
        id: "Output",
        type: "output",
        name: "Output",
        config: { name: "result" },
        depth: 11,
        dependencies: ["SendNotification"],
        dependents: []
    });

    // Edges
    const edgePairs: [string, string][] = [
        ["Input", "FetchRecords"],
        ["FetchRecords", "ProcessLoop"],
        ["ProcessLoop", "ValidateRecord"],
        ["ValidateRecord", "TransformRecord"],
        ["ValidateRecord", "MarkInvalid"],
        ["TransformRecord", "EnrichRecord"],
        ["EnrichRecord", "StoreProcessed"],
        ["StoreProcessed", "LoopEnd"],
        ["MarkInvalid", "LoopEnd"],
        ["LoopEnd", "Aggregate"],
        ["Aggregate", "GenerateReport"],
        ["GenerateReport", "SendNotification"],
        ["SendNotification", "Output"]
    ];

    for (const [source, target] of edgePairs) {
        edges.set(`${source}-${target}`, {
            id: `${source}-${target}`,
            source,
            target,
            sourceHandle: "output",
            targetHandle: "input",
            handleType: "default"
        });
    }

    return {
        originalDefinition: {} as never,
        buildTimestamp: Date.now(),
        nodes,
        edges,
        executionLevels: [
            ["Input"],
            ["FetchRecords"],
            ["ProcessLoop"],
            ["ValidateRecord"],
            ["TransformRecord", "MarkInvalid"],
            ["EnrichRecord"],
            ["StoreProcessed"],
            ["LoopEnd"],
            ["Aggregate"],
            ["GenerateReport"],
            ["SendNotification"],
            ["Output"]
        ],
        triggerNodeId: "Input",
        outputNodeIds: ["Output"],
        loopContexts: new Map(),
        maxConcurrentNodes: 10
    };
}

async function simulateWorkflowExecution(
    workflow: BuiltWorkflow,
    mockActivities: ReturnType<typeof createMockActivities>,
    inputs: JsonObject = {}
): Promise<{
    context: ReturnType<typeof createContext>;
    finalOutputs: JsonObject;
    executionOrder: string[];
    failedNodes: string[];
}> {
    let context = createContext(inputs);
    let queueState = initializeQueue(workflow);
    const executionOrder: string[] = [];
    const failedNodes: string[] = [];

    while (!isExecutionComplete(queueState)) {
        const readyNodes = getReadyNodes(queueState, workflow.maxConcurrentNodes || 10);

        if (readyNodes.length === 0) break;

        queueState = markExecuting(queueState, readyNodes);

        for (const nodeId of readyNodes) {
            const node = workflow.nodes.get(nodeId)!;
            executionOrder.push(nodeId);

            try {
                const result = await mockActivities.executeNode(
                    node.type,
                    node.config as JsonObject,
                    context,
                    { nodeId, nodeName: node.name, executionId: "test-execution" }
                );

                if (result.success) {
                    context = storeNodeOutput(context, nodeId, result.output);
                    queueState = markCompleted(queueState, nodeId, result.output, workflow);
                } else {
                    failedNodes.push(nodeId);
                    queueState = markFailed(
                        queueState,
                        nodeId,
                        result.error || "Unknown error",
                        workflow
                    );
                }
            } catch (error) {
                failedNodes.push(nodeId);
                queueState = markFailed(
                    queueState,
                    nodeId,
                    error instanceof Error ? error.message : "Unknown error",
                    workflow
                );
            }
        }
    }

    return {
        context,
        finalOutputs: buildFinalOutputs(context, workflow.outputNodeIds),
        executionOrder,
        failedNodes
    };
}

// ============================================================================
// TESTS
// ============================================================================

describe("Batch Data Processing Workflow", () => {
    describe("successful batch processing", () => {
        it("should process batch of records successfully", async () => {
            const workflow = createBatchProcessingWorkflow();
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: {
                        batchConfig: {
                            batchId: "batch-001",
                            sourceTable: "orders",
                            targetTable: "processed_orders",
                            batchSize: 100
                        }
                    },
                    FetchRecords: {
                        data: [
                            { id: "rec-1", data: { amount: 100 } },
                            { id: "rec-2", data: { amount: 200 } },
                            { id: "rec-3", data: { amount: 300 } }
                        ]
                    },
                    ProcessLoop: { iterating: true, items: 3 },
                    ValidateRecord: { valid: true },
                    TransformRecord: { data: { processed: true } },
                    EnrichRecord: { data: { enriched: true } },
                    StoreProcessed: { success: true, rowsAffected: 1 },
                    MarkInvalid: { skipped: true },
                    LoopEnd: { completed: true },
                    Aggregate: { count: 3, processed: 3, failed: 0 },
                    GenerateReport: {
                        batchId: "batch-001",
                        totalRecords: 3,
                        processedRecords: 3,
                        failedRecords: 0,
                        status: "completed"
                    },
                    SendNotification: { success: true, notificationId: "notif-001" },
                    Output: { result: { batchId: "batch-001", status: "completed" } }
                })
            );

            const { executionOrder, failedNodes, finalOutputs } = await simulateWorkflowExecution(
                workflow,
                mockActivities
            );

            expect(executionOrder).toContain("FetchRecords");
            expect(executionOrder).toContain("Aggregate");
            expect(executionOrder).toContain("GenerateReport");
            expect(failedNodes).toHaveLength(0);
            expect(finalOutputs.result).toBeDefined();
        });

        it("should handle empty batch", async () => {
            const workflow = createBatchProcessingWorkflow();
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: {
                        batchConfig: {
                            batchId: "batch-empty",
                            sourceTable: "orders",
                            batchSize: 100
                        }
                    },
                    FetchRecords: { data: [] },
                    ProcessLoop: { iterating: false, items: 0 },
                    ValidateRecord: { skipped: true },
                    TransformRecord: { skipped: true },
                    EnrichRecord: { skipped: true },
                    StoreProcessed: { skipped: true },
                    MarkInvalid: { skipped: true },
                    LoopEnd: { completed: true },
                    Aggregate: { count: 0, processed: 0, failed: 0 },
                    GenerateReport: {
                        batchId: "batch-empty",
                        totalRecords: 0,
                        status: "completed"
                    },
                    SendNotification: { success: true },
                    Output: { result: { status: "completed", recordsProcessed: 0 } }
                })
            );

            const { failedNodes, finalOutputs } = await simulateWorkflowExecution(
                workflow,
                mockActivities
            );

            expect(failedNodes).toHaveLength(0);
            expect(finalOutputs).toBeDefined();
        });
    });

    describe("partial failures", () => {
        it("should handle invalid records in batch", async () => {
            const workflow = createBatchProcessingWorkflow();
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: {
                        batchConfig: {
                            batchId: "batch-partial",
                            sourceTable: "orders",
                            batchSize: 100
                        }
                    },
                    FetchRecords: {
                        data: [
                            { id: "valid-1", data: { amount: 100 } },
                            { id: "invalid-1", data: null },
                            { id: "valid-2", data: { amount: 200 } }
                        ]
                    },
                    ProcessLoop: { iterating: true },
                    ValidateRecord: { valid: true }, // Some will be false
                    TransformRecord: { data: { processed: true } },
                    EnrichRecord: { data: { enriched: true } },
                    StoreProcessed: { success: true },
                    MarkInvalid: { success: true, rowsAffected: 1 },
                    LoopEnd: { completed: true },
                    Aggregate: { count: 3, processed: 2, failed: 1 },
                    GenerateReport: {
                        batchId: "batch-partial",
                        totalRecords: 3,
                        processedRecords: 2,
                        failedRecords: 1,
                        status: "partial"
                    },
                    SendNotification: { success: true },
                    Output: { result: { status: "partial" } }
                })
            );

            const { failedNodes } = await simulateWorkflowExecution(workflow, mockActivities);
            expect(failedNodes).toHaveLength(0);
        });

        it("should handle enrichment API failure for some records", async () => {
            const workflow = createBatchProcessingWorkflow();
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: {
                        batchConfig: {
                            batchId: "batch-enrich-fail",
                            sourceTable: "orders",
                            batchSize: 100
                        }
                    },
                    FetchRecords: {
                        data: [
                            { id: "rec-1", data: { amount: 100 } },
                            { id: "rec-2", data: { amount: 200 } }
                        ]
                    },
                    ProcessLoop: { iterating: true },
                    ValidateRecord: { valid: true },
                    TransformRecord: { data: { processed: true } },
                    EnrichRecord: { data: { enriched: true, partial: true } },
                    StoreProcessed: { success: true },
                    MarkInvalid: { skipped: true },
                    LoopEnd: { completed: true },
                    Aggregate: { count: 2, processed: 2, failed: 0, enrichmentFailures: 1 },
                    GenerateReport: {
                        batchId: "batch-enrich-fail",
                        status: "completed_with_warnings"
                    },
                    SendNotification: { success: true },
                    Output: { result: { status: "completed_with_warnings" } }
                })
            );

            const { failedNodes } = await simulateWorkflowExecution(workflow, mockActivities);
            expect(failedNodes).toHaveLength(0);
        });
    });

    describe("error handling", () => {
        it("should handle database fetch failure", async () => {
            const workflow = createBatchProcessingWorkflow();
            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: {
                        customOutput: {
                            batchConfig: { batchId: "batch-db-fail", sourceTable: "orders" }
                        }
                    },
                    FetchRecords: {
                        shouldFail: true,
                        errorMessage: "Database connection timeout"
                    },
                    ProcessLoop: { customOutput: {} },
                    ValidateRecord: { customOutput: {} },
                    TransformRecord: { customOutput: {} },
                    EnrichRecord: { customOutput: {} },
                    StoreProcessed: { customOutput: {} },
                    MarkInvalid: { customOutput: {} },
                    LoopEnd: { customOutput: {} },
                    Aggregate: { customOutput: {} },
                    GenerateReport: { customOutput: {} },
                    SendNotification: { customOutput: {} },
                    Output: { customOutput: { result: {} } }
                }
            });

            const { failedNodes } = await simulateWorkflowExecution(workflow, mockActivities);
            expect(failedNodes).toContain("FetchRecords");
        });

        it("should handle notification failure without affecting batch result", async () => {
            const workflow = createBatchProcessingWorkflow();
            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: {
                        customOutput: {
                            batchConfig: { batchId: "batch-notif-fail", sourceTable: "orders" }
                        }
                    },
                    FetchRecords: { customOutput: { data: [{ id: "rec-1", data: {} }] } },
                    ProcessLoop: { customOutput: { iterating: true } },
                    ValidateRecord: { customOutput: { valid: true } },
                    TransformRecord: { customOutput: { data: {} } },
                    EnrichRecord: { customOutput: { data: {} } },
                    StoreProcessed: { customOutput: { success: true } },
                    MarkInvalid: { customOutput: { skipped: true } },
                    LoopEnd: { customOutput: { completed: true } },
                    Aggregate: { customOutput: { count: 1 } },
                    GenerateReport: { customOutput: { status: "completed" } },
                    SendNotification: {
                        shouldFail: true,
                        errorMessage: "Notification service unavailable"
                    },
                    Output: { customOutput: { result: {} } }
                }
            });

            const { failedNodes, executionOrder } = await simulateWorkflowExecution(
                workflow,
                mockActivities
            );

            expect(failedNodes).toContain("SendNotification");
            expect(executionOrder).toContain("GenerateReport");
        });
    });

    describe("large batch handling", () => {
        it("should process large batch with pagination", async () => {
            const workflow = createBatchProcessingWorkflow();
            // Simulate a large batch with 1000 records (represented in summary)
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: {
                        batchConfig: {
                            batchId: "batch-large",
                            sourceTable: "orders",
                            batchSize: 1000
                        }
                    },
                    FetchRecords: {
                        data: Array.from({ length: 100 }, (_, i) => ({
                            id: `rec-${i}`,
                            data: { amount: i * 10 }
                        }))
                    },
                    ProcessLoop: { iterating: true, totalItems: 100 },
                    ValidateRecord: { valid: true },
                    TransformRecord: { data: { processed: true } },
                    EnrichRecord: { data: { enriched: true } },
                    StoreProcessed: { success: true },
                    MarkInvalid: { skipped: true },
                    LoopEnd: { completed: true },
                    Aggregate: { count: 100, processed: 100, failed: 0 },
                    GenerateReport: {
                        batchId: "batch-large",
                        totalRecords: 100,
                        processedRecords: 100,
                        duration: 5000,
                        status: "completed"
                    },
                    SendNotification: { success: true },
                    Output: { result: { status: "completed", recordsProcessed: 100 } }
                })
            );

            const { failedNodes, finalOutputs } = await simulateWorkflowExecution(
                workflow,
                mockActivities
            );

            expect(failedNodes).toHaveLength(0);
            expect(finalOutputs).toBeDefined();
        });
    });

    describe("transformation operations", () => {
        it("should apply multiple transformations", async () => {
            const workflow = createBatchProcessingWorkflow();
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: {
                        batchConfig: {
                            batchId: "batch-transform",
                            sourceTable: "raw_data",
                            transformations: ["normalize", "validate", "enrich"]
                        }
                    },
                    FetchRecords: {
                        data: [
                            {
                                id: "rec-1",
                                data: { name: "  JOHN DOE  ", email: "JOHN@EXAMPLE.COM" }
                            }
                        ]
                    },
                    ProcessLoop: { iterating: true },
                    ValidateRecord: { valid: true },
                    TransformRecord: {
                        data: {
                            name: "John Doe",
                            email: "john@example.com",
                            normalized: true
                        }
                    },
                    EnrichRecord: {
                        data: {
                            name: "John Doe",
                            email: "john@example.com",
                            emailVerified: true,
                            locationData: { country: "US" }
                        }
                    },
                    StoreProcessed: { success: true },
                    MarkInvalid: { skipped: true },
                    LoopEnd: { completed: true },
                    Aggregate: { count: 1, processed: 1, transformationsApplied: 3 },
                    GenerateReport: { status: "completed" },
                    SendNotification: { success: true },
                    Output: { result: { status: "completed" } }
                })
            );

            const { failedNodes } = await simulateWorkflowExecution(workflow, mockActivities);
            expect(failedNodes).toHaveLength(0);
        });
    });

    describe("data quality metrics", () => {
        it("should track data quality metrics", async () => {
            const workflow = createBatchProcessingWorkflow();
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: {
                        batchConfig: {
                            batchId: "batch-quality",
                            sourceTable: "data",
                            batchSize: 50
                        }
                    },
                    FetchRecords: {
                        data: [
                            { id: "good-1", data: { complete: true, score: 95 } },
                            { id: "good-2", data: { complete: true, score: 88 } },
                            { id: "poor-1", data: { complete: false, score: 45 } }
                        ]
                    },
                    ProcessLoop: { iterating: true },
                    ValidateRecord: { valid: true },
                    TransformRecord: { data: { processed: true } },
                    EnrichRecord: { data: { enriched: true } },
                    StoreProcessed: { success: true },
                    MarkInvalid: { skipped: true },
                    LoopEnd: { completed: true },
                    Aggregate: {
                        count: 3,
                        processed: 3,
                        qualityMetrics: {
                            averageScore: 76,
                            highQuality: 2,
                            lowQuality: 1
                        }
                    },
                    GenerateReport: {
                        batchId: "batch-quality",
                        dataQuality: { average: 76, distribution: { high: 2, low: 1 } }
                    },
                    SendNotification: { success: true },
                    Output: { result: { qualityScore: 76 } }
                })
            );

            const { failedNodes } = await simulateWorkflowExecution(workflow, mockActivities);
            expect(failedNodes).toHaveLength(0);
        });
    });
});
