/**
 * Data Enrichment Integration Tests
 *
 * True integration tests that execute data enrichment workflows through
 * the Temporal workflow engine with mocked activities.
 *
 * Tests:
 * - Fetching external data via HTTP
 * - Transforming and extracting data
 * - Multiple enrichment sources
 * - Error handling for failed fetches
 * - Parallel enrichment workflows
 */

import { TestWorkflowEnvironment } from "@temporalio/testing";
import { Worker } from "@temporalio/worker";
import type { WorkflowDefinition, JsonObject } from "@flowmaestro/shared";

// ============================================================================
// MOCK DEFINITIONS
// ============================================================================

const mockExecuteNode = jest.fn();
const mockValidateInputsActivity = jest.fn();
const mockValidateOutputsActivity = jest.fn();
const mockCreateSpan = jest.fn();
const mockEndSpan = jest.fn();

const mockEmitExecutionStarted = jest.fn();
const mockEmitExecutionProgress = jest.fn();
const mockEmitExecutionCompleted = jest.fn();
const mockEmitExecutionFailed = jest.fn();
const mockEmitExecutionPaused = jest.fn();
const mockEmitNodeStarted = jest.fn();
const mockEmitNodeCompleted = jest.fn();
const mockEmitNodeFailed = jest.fn();

const mockShouldAllowExecution = jest.fn();
const mockReserveCredits = jest.fn();
const mockReleaseCredits = jest.fn();
const mockFinalizeCredits = jest.fn();
const mockEstimateWorkflowCredits = jest.fn();
const mockCalculateLLMCredits = jest.fn();
const mockCalculateNodeCredits = jest.fn();

const mockActivities = {
    executeNode: mockExecuteNode,
    validateInputsActivity: mockValidateInputsActivity,
    validateOutputsActivity: mockValidateOutputsActivity,
    createSpan: mockCreateSpan,
    endSpan: mockEndSpan,
    emitExecutionStarted: mockEmitExecutionStarted,
    emitExecutionProgress: mockEmitExecutionProgress,
    emitExecutionCompleted: mockEmitExecutionCompleted,
    emitExecutionFailed: mockEmitExecutionFailed,
    emitExecutionPaused: mockEmitExecutionPaused,
    emitNodeStarted: mockEmitNodeStarted,
    emitNodeCompleted: mockEmitNodeCompleted,
    emitNodeFailed: mockEmitNodeFailed,
    shouldAllowExecution: mockShouldAllowExecution,
    reserveCredits: mockReserveCredits,
    releaseCredits: mockReleaseCredits,
    finalizeCredits: mockFinalizeCredits,
    estimateWorkflowCredits: mockEstimateWorkflowCredits,
    calculateLLMCredits: mockCalculateLLMCredits,
    calculateNodeCredits: mockCalculateNodeCredits
};

// ============================================================================
// WORKFLOW DEFINITION BUILDERS
// ============================================================================

/**
 * Create a data enrichment workflow definition
 * Input -> HTTP (fetch) -> Transform (extract) -> Output
 */
function createEnrichmentWorkflowDefinition(enrichmentSteps: number = 1): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "entityId" },
        position: { x: 0, y: 0 }
    };

    for (let i = 1; i <= enrichmentSteps; i++) {
        const httpId = `http${i}`;
        const transformId = `transform${i}`;
        const prevNode = i === 1 ? "input" : `transform${i - 1}`;

        nodes[httpId] = {
            type: "http",
            name: `Fetch ${i}`,
            config: {
                method: "GET",
                url: `https://api.example.com/enrich/${i}/{{${prevNode}.id || ${prevNode}.entityId}}`,
                headers: { Authorization: "Bearer token" }
            },
            position: { x: i * 200, y: 0 }
        };

        edges.push({
            id: `${prevNode}-${httpId}`,
            source: prevNode,
            target: httpId,
            sourceHandle: "output",
            targetHandle: "input"
        });

        nodes[transformId] = {
            type: "transform",
            name: `Extract ${i}`,
            config: {
                operation: "extract",
                path: "data",
                outputVariable: "enrichedData"
            },
            position: { x: i * 200 + 100, y: 0 }
        };

        edges.push({
            id: `${httpId}-${transformId}`,
            source: httpId,
            target: transformId,
            sourceHandle: "output",
            targetHandle: "input"
        });
    }

    const lastTransform = `transform${enrichmentSteps}`;
    nodes["output"] = {
        type: "output",
        name: "Output",
        config: { outputName: "enrichedEntity" },
        position: { x: (enrichmentSteps + 1) * 200, y: 0 }
    };

    edges.push({
        id: `${lastTransform}-output`,
        source: lastTransform,
        target: "output",
        sourceHandle: "output",
        targetHandle: "input"
    });

    return {
        name: `Enrichment Pipeline (${enrichmentSteps} steps)`,
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create a parallel enrichment workflow definition
 * Input -> [HTTP_A, HTTP_B, HTTP_C] -> Merge -> Output
 */
function createParallelEnrichmentDefinition(
    sources: Array<{ id: string; url: string }>
): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];
    const sourceIds = sources.map((s) => s.id);

    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "entityId" },
        position: { x: 0, y: 100 }
    };

    sources.forEach((source, index) => {
        nodes[source.id] = {
            type: "http",
            name: source.id,
            config: {
                method: "GET",
                url: source.url,
                headers: { Accept: "application/json" }
            },
            position: { x: 200, y: index * 100 }
        };

        edges.push({
            id: `input-${source.id}`,
            source: "input",
            target: source.id,
            sourceHandle: "output",
            targetHandle: "input"
        });
    });

    nodes["merge"] = {
        type: "transform",
        name: "Merge",
        config: {
            operation: "merge",
            sources: sourceIds
        },
        position: { x: 400, y: 100 }
    };

    for (const sourceId of sourceIds) {
        edges.push({
            id: `${sourceId}-merge`,
            source: sourceId,
            target: "merge",
            sourceHandle: "output",
            targetHandle: "input"
        });
    }

    nodes["output"] = {
        type: "output",
        name: "Output",
        config: { outputName: "enrichedEntity" },
        position: { x: 600, y: 100 }
    };

    edges.push({
        id: "merge-output",
        source: "merge",
        target: "output",
        sourceHandle: "output",
        targetHandle: "input"
    });

    return {
        name: "Parallel Enrichment Pipeline",
        nodes,
        edges,
        entryPoint: "input"
    };
}

// ============================================================================
// TEST HELPERS
// ============================================================================

function setupDefaultMocks(): void {
    jest.clearAllMocks();

    mockValidateInputsActivity.mockResolvedValue({ success: true });
    mockValidateOutputsActivity.mockResolvedValue({ success: true });

    let spanCounter = 0;
    mockCreateSpan.mockImplementation(() => {
        return Promise.resolve({ spanId: `span-${++spanCounter}`, traceId: "trace-123" });
    });
    mockEndSpan.mockResolvedValue(undefined);

    mockEmitExecutionStarted.mockResolvedValue(undefined);
    mockEmitExecutionProgress.mockResolvedValue(undefined);
    mockEmitExecutionCompleted.mockResolvedValue(undefined);
    mockEmitExecutionFailed.mockResolvedValue(undefined);
    mockEmitExecutionPaused.mockResolvedValue(undefined);
    mockEmitNodeStarted.mockResolvedValue(undefined);
    mockEmitNodeCompleted.mockResolvedValue(undefined);
    mockEmitNodeFailed.mockResolvedValue(undefined);

    mockShouldAllowExecution.mockResolvedValue(true);
    mockReserveCredits.mockResolvedValue(true);
    mockReleaseCredits.mockResolvedValue(undefined);
    mockFinalizeCredits.mockResolvedValue(undefined);
    mockEstimateWorkflowCredits.mockResolvedValue({ totalCredits: 10 });
    mockCalculateLLMCredits.mockResolvedValue(5);
    mockCalculateNodeCredits.mockResolvedValue(1);
}

interface ExecuteNodeParams {
    nodeType: string;
    nodeConfig: JsonObject;
    context: JsonObject;
    executionContext: { nodeId: string };
}

function configureMockNodeOutputs(outputs: Record<string, JsonObject>): void {
    mockExecuteNode.mockImplementation(async (params: ExecuteNodeParams) => {
        const nodeId = params.executionContext.nodeId;
        const output = outputs[nodeId] || { result: `output-${nodeId}` };

        return {
            result: output,
            signals: {},
            metrics: { durationMs: 100 },
            success: true,
            output
        };
    });
}

// ============================================================================
// TESTS
// ============================================================================

describe("Data Enrichment Integration Tests", () => {
    let testEnv: TestWorkflowEnvironment;
    let worker: Worker;

    beforeAll(async () => {
        testEnv = await TestWorkflowEnvironment.createLocal();
    });

    afterAll(async () => {
        await testEnv?.teardown();
    });

    beforeEach(async () => {
        setupDefaultMocks();

        worker = await Worker.create({
            connection: testEnv.nativeConnection,
            taskQueue: "test-workflow-queue",
            workflowsPath: require.resolve("../../../src/temporal/workflows/workflow-orchestrator"),
            activities: mockActivities
        });
    });

    describe("sequential enrichment", () => {
        it("should execute single HTTP fetch and transform", async () => {
            const workflowDef = createEnrichmentWorkflowDefinition(1);

            configureMockNodeOutputs({
                input: { entityId: "user-123" },
                http1: {
                    statusCode: 200,
                    body: { data: { name: "John Doe", email: "john@example.com" } }
                },
                transform1: { enrichedData: { name: "John Doe", email: "john@example.com" } },
                output: { enrichedEntity: { name: "John Doe", email: "john@example.com" } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-enrichment-single-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-enrichment-single",
                            workflowDefinition: workflowDef,
                            inputs: { entityId: "user-123" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
            expect(result.outputs).toBeDefined();

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("http1");
            expect(nodeIds).toContain("transform1");
        });

        it("should execute multi-step enrichment pipeline", async () => {
            const workflowDef = createEnrichmentWorkflowDefinition(3);

            configureMockNodeOutputs({
                input: { entityId: "company-456" },
                http1: {
                    statusCode: 200,
                    body: { data: { id: "company-456", name: "Acme Inc" } }
                },
                transform1: { id: "company-456", name: "Acme Inc" },
                http2: { statusCode: 200, body: { data: { employees: 500, revenue: "10M" } } },
                transform2: {
                    id: "company-456",
                    name: "Acme Inc",
                    employees: 500,
                    revenue: "10M"
                },
                http3: {
                    statusCode: 200,
                    body: { data: { industry: "Technology", founded: 2010 } }
                },
                transform3: {
                    id: "company-456",
                    name: "Acme Inc",
                    employees: 500,
                    industry: "Technology"
                },
                output: { enrichedEntity: { complete: true } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-enrichment-multi-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-enrichment-multi",
                            workflowDefinition: workflowDef,
                            inputs: { entityId: "company-456" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("http1");
            expect(nodeIds).toContain("http2");
            expect(nodeIds).toContain("http3");
            expect(nodeIds).toContain("transform1");
            expect(nodeIds).toContain("transform2");
            expect(nodeIds).toContain("transform3");
        });

        it("should pass data between enrichment steps", async () => {
            const workflowDef = createEnrichmentWorkflowDefinition(2);

            const capturedContexts: JsonObject[] = [];

            mockExecuteNode.mockImplementation(async (params: ExecuteNodeParams) => {
                const nodeId = params.executionContext.nodeId;

                if (nodeId.startsWith("transform")) {
                    capturedContexts.push(params.context);
                }

                const outputs: Record<string, JsonObject> = {
                    input: { entityId: "lead-789" },
                    http1: {
                        statusCode: 200,
                        body: { data: { email: "lead@company.com" } }
                    },
                    transform1: { email: "lead@company.com" },
                    http2: {
                        statusCode: 200,
                        body: { data: { company: "Big Corp", size: "Enterprise" } }
                    },
                    transform2: { email: "lead@company.com", company: "Big Corp" },
                    output: { enrichedEntity: {} }
                };

                const output = outputs[nodeId] || { result: `output-${nodeId}` };

                return {
                    result: output,
                    signals: {},
                    metrics: { durationMs: 100 },
                    success: true,
                    output
                };
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-enrichment-chain-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-enrichment-chain",
                            workflowDefinition: workflowDef,
                            inputs: { entityId: "lead-789" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
            expect(capturedContexts.length).toBeGreaterThan(0);
        });
    });

    describe("parallel enrichment", () => {
        it("should fetch from multiple sources in parallel", async () => {
            const workflowDef = createParallelEnrichmentDefinition([
                { id: "crm", url: "https://crm.example.com/api/entity" },
                { id: "erp", url: "https://erp.example.com/api/entity" },
                { id: "analytics", url: "https://analytics.example.com/api/entity" }
            ]);

            configureMockNodeOutputs({
                input: { entityId: "customer-001" },
                crm: { statusCode: 200, body: { source: "crm", data: { name: "Customer A" } } },
                erp: { statusCode: 200, body: { source: "erp", data: { orders: 15 } } },
                analytics: {
                    statusCode: 200,
                    body: { source: "analytics", data: { visits: 1000 } }
                },
                merge: {
                    crm: { name: "Customer A" },
                    erp: { orders: 15 },
                    analytics: { visits: 1000 }
                },
                output: { enrichedEntity: { merged: true } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-parallel-enrich-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-parallel-enrich",
                            workflowDefinition: workflowDef,
                            inputs: { entityId: "customer-001" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("crm");
            expect(nodeIds).toContain("erp");
            expect(nodeIds).toContain("analytics");
            expect(nodeIds).toContain("merge");
        });

        it("should merge data from multiple sources", async () => {
            const workflowDef = createParallelEnrichmentDefinition([
                { id: "source_a", url: "https://a.example.com/api" },
                { id: "source_b", url: "https://b.example.com/api" }
            ]);

            let mergeContext: JsonObject = {};

            mockExecuteNode.mockImplementation(async (params: ExecuteNodeParams) => {
                const nodeId = params.executionContext.nodeId;

                if (nodeId === "merge") {
                    mergeContext = params.context;
                }

                const outputs: Record<string, JsonObject> = {
                    input: { entityId: "test-entity" },
                    source_a: { statusCode: 200, body: { field_a: "value_a" } },
                    source_b: { statusCode: 200, body: { field_b: "value_b" } },
                    merge: { merged: { field_a: "value_a", field_b: "value_b" } },
                    output: { enrichedEntity: {} }
                };

                const output = outputs[nodeId] || { result: `output-${nodeId}` };

                return {
                    result: output,
                    signals: {},
                    metrics: { durationMs: 100 },
                    success: true,
                    output
                };
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-merge-sources-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-merge-sources",
                            workflowDefinition: workflowDef,
                            inputs: {},
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
            expect(mergeContext).toBeDefined();
        });
    });

    describe("error handling", () => {
        it("should handle HTTP fetch failure", async () => {
            const workflowDef = createEnrichmentWorkflowDefinition(1);

            mockExecuteNode.mockImplementation(async (params: ExecuteNodeParams) => {
                const nodeId = params.executionContext.nodeId;

                if (nodeId === "http1") {
                    throw new Error("404 Not Found");
                }

                return {
                    result: { entityId: "bad-entity" },
                    signals: {},
                    metrics: { durationMs: 100 },
                    success: true,
                    output: { entityId: "bad-entity" }
                };
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-http-fail-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-http-fail",
                            workflowDefinition: workflowDef,
                            inputs: { entityId: "bad-entity" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(false);
            expect(result.error).toContain("failed");
        });

        it("should handle partial failure in parallel enrichment", async () => {
            const workflowDef = createParallelEnrichmentDefinition([
                { id: "good_source", url: "https://good.example.com" },
                { id: "bad_source", url: "https://bad.example.com" }
            ]);

            mockExecuteNode.mockImplementation(async (params: ExecuteNodeParams) => {
                const nodeId = params.executionContext.nodeId;

                if (nodeId === "bad_source") {
                    throw new Error("Service unavailable");
                }

                const outputs: Record<string, JsonObject> = {
                    input: { entityId: "partial-test" },
                    good_source: { statusCode: 200, body: { data: "success" } },
                    merge: { partial: true, processed: 1 },
                    output: { enrichedEntity: {} }
                };

                const output = outputs[nodeId] || { result: `output-${nodeId}` };

                return {
                    result: output,
                    signals: {},
                    metrics: { durationMs: 100 },
                    success: true,
                    output
                };
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-partial-fail-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-partial-fail",
                            workflowDefinition: workflowDef,
                            inputs: { entityId: "partial-test" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            // Workflow should fail due to partial failure
            expect(result.success).toBe(false);
        });

        it("should handle transform failure", async () => {
            const workflowDef = createEnrichmentWorkflowDefinition(1);

            mockExecuteNode.mockImplementation(async (params: ExecuteNodeParams) => {
                const nodeId = params.executionContext.nodeId;

                if (nodeId === "transform1") {
                    throw new Error("Invalid data format");
                }

                const outputs: Record<string, JsonObject> = {
                    input: { entityId: "transform-fail" },
                    http1: { statusCode: 200, body: { data: { invalid: true } } }
                };

                const output = outputs[nodeId] || { result: `output-${nodeId}` };

                return {
                    result: output,
                    signals: {},
                    metrics: { durationMs: 100 },
                    success: true,
                    output
                };
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-transform-fail-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-transform-fail",
                            workflowDefinition: workflowDef,
                            inputs: { entityId: "transform-fail" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(false);
        });
    });

    describe("real-world scenarios", () => {
        it("should execute lead enrichment pipeline", async () => {
            const workflowDef = createParallelEnrichmentDefinition([
                { id: "clearbit", url: "https://api.clearbit.com/enrich" },
                { id: "linkedin", url: "https://api.linkedin.com/lookup" }
            ]);

            configureMockNodeOutputs({
                input: { email: "john@company.com" },
                clearbit: {
                    statusCode: 200,
                    body: {
                        company: "Company Inc",
                        role: "Engineering Manager",
                        employees: "500-1000"
                    }
                },
                linkedin: {
                    statusCode: 200,
                    body: {
                        connections: 500,
                        experience: "10+ years",
                        skills: ["Leadership", "Engineering"]
                    }
                },
                merge: {
                    company: "Company Inc",
                    role: "Engineering Manager",
                    connections: 500
                },
                output: { enrichedEntity: { score: 85 } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-lead-enrich-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-lead-enrich",
                            workflowDefinition: workflowDef,
                            inputs: { email: "john@company.com" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("clearbit");
            expect(nodeIds).toContain("linkedin");
            expect(nodeIds).toContain("merge");
        });

        it("should execute product catalog enrichment", async () => {
            const workflowDef = createEnrichmentWorkflowDefinition(2);

            configureMockNodeOutputs({
                input: { sku: "PROD-12345" },
                http1: {
                    statusCode: 200,
                    body: {
                        data: { name: "Widget Pro", price: 99.99, category: "Electronics" }
                    }
                },
                transform1: { name: "Widget Pro", price: 99.99 },
                http2: {
                    statusCode: 200,
                    body: { data: { stock: 150, warehouse: "US-EAST", eta: "2 days" } }
                },
                transform2: { name: "Widget Pro", price: 99.99, stock: 150, eta: "2 days" },
                output: { enrichedEntity: { complete: true } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-product-enrich-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-product-enrich",
                            workflowDefinition: workflowDef,
                            inputs: { sku: "PROD-12345" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("http1");
            expect(nodeIds).toContain("http2");
        });
    });
});
