/**
 * State & Memory Pattern Integration Tests
 *
 * True integration tests that verify shared memory and state management
 * behavior through the Temporal workflow engine with mocked activities.
 *
 * Tests:
 * - Shared memory store operations
 * - Shared memory semantic search
 * - Cross-node state sharing
 * - Memory accumulation patterns
 * - Error handling scenarios
 */

import { TestWorkflowEnvironment } from "@temporalio/testing";
import { Worker } from "@temporalio/worker";
import type { WorkflowDefinition, JsonObject, JsonValue } from "@flowmaestro/shared";

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
 * Create a basic store workflow
 * Input -> SharedMemory (store) -> Output
 */
function createStoreDefinition(): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "data" },
        position: { x: 0, y: 0 }
    };

    nodes["store"] = {
        type: "shared-memory",
        name: "Store Value",
        config: {
            operation: "store",
            key: "userContext",
            value: "${input.data.context}",
            enableSemanticSearch: false
        },
        position: { x: 200, y: 0 }
    };

    nodes["output"] = {
        type: "output",
        name: "Output",
        config: { outputName: "result" },
        position: { x: 400, y: 0 }
    };

    edges.push(
        { id: "input-store", source: "input", target: "store" },
        { id: "store-output", source: "store", target: "output" }
    );

    return {
        name: "Store Workflow",
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create a semantic store workflow with search enabled
 * Input -> SharedMemory (store with embeddings) -> Output
 */
function createSemanticStoreDefinition(): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "data" },
        position: { x: 0, y: 0 }
    };

    nodes["store"] = {
        type: "shared-memory",
        name: "Store Knowledge",
        config: {
            operation: "store",
            key: "knowledge",
            value: "${input.data.content}",
            enableSemanticSearch: true
        },
        position: { x: 200, y: 0 }
    };

    nodes["output"] = {
        type: "output",
        name: "Output",
        config: { outputName: "result" },
        position: { x: 400, y: 0 }
    };

    edges.push(
        { id: "input-store", source: "input", target: "store" },
        { id: "store-output", source: "store", target: "output" }
    );

    return {
        name: "Semantic Store Workflow",
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create a search workflow
 * Input -> SharedMemory (search) -> Output
 */
function createSearchDefinition(): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "data" },
        position: { x: 0, y: 0 }
    };

    nodes["search"] = {
        type: "shared-memory",
        name: "Search Memory",
        config: {
            operation: "search",
            searchQuery: "${input.data.query}",
            topK: 5,
            similarityThreshold: 0.7
        },
        position: { x: 200, y: 0 }
    };

    nodes["output"] = {
        type: "output",
        name: "Output",
        config: { outputName: "result" },
        position: { x: 400, y: 0 }
    };

    edges.push(
        { id: "input-search", source: "input", target: "search" },
        { id: "search-output", source: "search", target: "output" }
    );

    return {
        name: "Search Workflow",
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create a store and retrieve workflow
 * Input -> Store -> Process (using stored value) -> Output
 */
function createStoreRetrieveDefinition(): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "data" },
        position: { x: 0, y: 0 }
    };

    nodes["store"] = {
        type: "shared-memory",
        name: "Store Config",
        config: {
            operation: "store",
            key: "config",
            value: "${input.data.settings}",
            enableSemanticSearch: false
        },
        position: { x: 200, y: 0 }
    };

    nodes["process"] = {
        type: "code",
        name: "Process with Config",
        config: {
            language: "javascript",
            code: "return { processed: true, usedConfig: shared.config };",
            outputVariable: "processResult"
        },
        position: { x: 400, y: 0 }
    };

    nodes["output"] = {
        type: "output",
        name: "Output",
        config: { outputName: "result" },
        position: { x: 600, y: 0 }
    };

    edges.push(
        { id: "input-store", source: "input", target: "store" },
        { id: "store-process", source: "store", target: "process" },
        { id: "process-output", source: "process", target: "output" }
    );

    return {
        name: "Store and Retrieve Workflow",
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create an accumulation workflow
 * Input -> Store (item 1) -> Store (item 2) -> Aggregate -> Output
 */
function createAccumulationDefinition(): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "data" },
        position: { x: 0, y: 0 }
    };

    nodes["store1"] = {
        type: "shared-memory",
        name: "Store First",
        config: {
            operation: "store",
            key: "item1",
            value: "${input.data.first}",
            enableSemanticSearch: false
        },
        position: { x: 200, y: -50 }
    };

    nodes["store2"] = {
        type: "shared-memory",
        name: "Store Second",
        config: {
            operation: "store",
            key: "item2",
            value: "${input.data.second}",
            enableSemanticSearch: false
        },
        position: { x: 200, y: 50 }
    };

    nodes["aggregate"] = {
        type: "code",
        name: "Aggregate",
        config: {
            language: "javascript",
            code: "return { combined: [shared.item1, shared.item2] };",
            outputVariable: "aggregated"
        },
        position: { x: 400, y: 0 }
    };

    nodes["output"] = {
        type: "output",
        name: "Output",
        config: { outputName: "result" },
        position: { x: 600, y: 0 }
    };

    edges.push(
        { id: "input-store1", source: "input", target: "store1" },
        { id: "input-store2", source: "input", target: "store2" },
        { id: "store1-aggregate", source: "store1", target: "aggregate" },
        { id: "store2-aggregate", source: "store2", target: "aggregate" },
        { id: "aggregate-output", source: "aggregate", target: "output" }
    );

    return {
        name: "Accumulation Workflow",
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create a context passing workflow
 * Input -> Process1 (store result) -> Process2 (use stored) -> Output
 */
function createContextPassingDefinition(): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "data" },
        position: { x: 0, y: 0 }
    };

    nodes["process1"] = {
        type: "code",
        name: "Calculate",
        config: {
            language: "javascript",
            code: "return { value: input.data.number * 2 };",
            outputVariable: "calculated"
        },
        position: { x: 200, y: 0 }
    };

    nodes["store"] = {
        type: "shared-memory",
        name: "Store Result",
        config: {
            operation: "store",
            key: "calculatedValue",
            value: "${process1.calculated.value}",
            enableSemanticSearch: false
        },
        position: { x: 400, y: 0 }
    };

    nodes["process2"] = {
        type: "code",
        name: "Use Stored",
        config: {
            language: "javascript",
            code: "return { final: shared.calculatedValue + 10 };",
            outputVariable: "finalResult"
        },
        position: { x: 600, y: 0 }
    };

    nodes["output"] = {
        type: "output",
        name: "Output",
        config: { outputName: "result" },
        position: { x: 800, y: 0 }
    };

    edges.push(
        { id: "input-process1", source: "input", target: "process1" },
        { id: "process1-store", source: "process1", target: "store" },
        { id: "store-process2", source: "store", target: "process2" },
        { id: "process2-output", source: "process2", target: "output" }
    );

    return {
        name: "Context Passing Workflow",
        nodes,
        edges,
        entryPoint: "input"
    };
}

// ============================================================================
// MOCK SETUP
// ============================================================================

function setupDefaultMocks(): void {
    jest.clearAllMocks();

    mockExecuteNode.mockImplementation(async (params: ExecuteNodeParams) => {
        const nodeId = params.executionContext.nodeId;
        return {
            result: { executed: nodeId },
            signals: {},
            metrics: { durationMs: 100 },
            success: true,
            output: { executed: nodeId }
        };
    });

    mockValidateInputsActivity.mockResolvedValue({ success: true });
    mockValidateOutputsActivity.mockResolvedValue({ success: true });
    mockCreateSpan.mockResolvedValue({ traceId: "test-trace-id", spanId: "test-span-id" });
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
    mockReserveCredits.mockResolvedValue({ success: true, reservationId: "test-reservation" });
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

        const signals: Record<string, JsonValue> = {};

        return {
            result: output,
            signals,
            metrics: { durationMs: 100 },
            success: true,
            output
        };
    });
}

// ============================================================================
// TESTS
// ============================================================================

describe("State & Memory Pattern Integration Tests", () => {
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
            workflowsPath: require.resolve(
                "../../../../src/temporal/workflows/workflow-orchestrator"
            ),
            activities: mockActivities
        });
    });

    describe("store operations", () => {
        it("should store value in shared memory", async () => {
            const workflowDef = createStoreDefinition();

            configureMockNodeOutputs({
                store: {
                    key: "userContext",
                    stored: true,
                    searchable: false
                },
                output: { result: { stored: true } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-store-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-store",
                            workflowDefinition: workflowDef,
                            inputs: { data: { context: "User prefers dark mode" } },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("store");
        });

        it("should store value with semantic search enabled", async () => {
            const workflowDef = createSemanticStoreDefinition();

            configureMockNodeOutputs({
                store: {
                    key: "knowledge",
                    stored: true,
                    searchable: true
                },
                output: { result: { indexed: true } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-semantic-store-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-semantic-store",
                            workflowDefinition: workflowDef,
                            inputs: {
                                data: {
                                    content:
                                        "The quick brown fox jumps over the lazy dog. This is a longer text that will be indexed for semantic search."
                                }
                            },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });
    });

    describe("search operations", () => {
        it("should search shared memory semantically", async () => {
            const workflowDef = createSearchDefinition();

            configureMockNodeOutputs({
                search: {
                    query: "How do I configure settings?",
                    results: [
                        {
                            key: "config-guide",
                            value: "To configure settings...",
                            similarity: 0.89
                        },
                        { key: "setup-docs", value: "Initial setup requires...", similarity: 0.75 }
                    ],
                    resultCount: 2
                },
                output: { result: { found: 2 } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-search-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-search",
                            workflowDefinition: workflowDef,
                            inputs: { data: { query: "How do I configure settings?" } },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("search");
        });
    });

    describe("cross-node state sharing", () => {
        it("should store and retrieve value across nodes", async () => {
            const workflowDef = createStoreRetrieveDefinition();

            configureMockNodeOutputs({
                store: {
                    key: "config",
                    stored: true,
                    searchable: false
                },
                process: {
                    processed: true,
                    usedConfig: { theme: "dark", language: "en" }
                },
                output: { result: { completed: true } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-store-retrieve-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-store-retrieve",
                            workflowDefinition: workflowDef,
                            inputs: { data: { settings: { theme: "dark", language: "en" } } },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("store");
            expect(nodeIds).toContain("process");
        });

        it("should pass context through computation chain", async () => {
            const workflowDef = createContextPassingDefinition();

            configureMockNodeOutputs({
                process1: {
                    value: 20
                },
                store: {
                    key: "calculatedValue",
                    stored: true,
                    searchable: false
                },
                process2: {
                    final: 30
                },
                output: { result: { final: 30 } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-context-pass-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-context-pass",
                            workflowDefinition: workflowDef,
                            inputs: { data: { number: 10 } },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("process1");
            expect(nodeIds).toContain("store");
            expect(nodeIds).toContain("process2");
        });
    });

    describe("accumulation patterns", () => {
        it("should accumulate multiple values in parallel", async () => {
            const workflowDef = createAccumulationDefinition();

            configureMockNodeOutputs({
                store1: {
                    key: "item1",
                    stored: true,
                    searchable: false
                },
                store2: {
                    key: "item2",
                    stored: true,
                    searchable: false
                },
                aggregate: {
                    combined: ["first value", "second value"]
                },
                output: { result: { aggregated: true } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-accumulate-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-accumulate",
                            workflowDefinition: workflowDef,
                            inputs: {
                                data: {
                                    first: "first value",
                                    second: "second value"
                                }
                            },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("store1");
            expect(nodeIds).toContain("store2");
            expect(nodeIds).toContain("aggregate");
        });
    });

    describe("error handling", () => {
        it("should handle store failure", async () => {
            const workflowDef = createStoreDefinition();

            mockExecuteNode.mockImplementation(async (params: ExecuteNodeParams) => {
                const nodeId = params.executionContext.nodeId;

                if (nodeId === "store") {
                    throw new Error("Memory limit exceeded");
                }

                return {
                    result: { executed: nodeId },
                    signals: {},
                    metrics: { durationMs: 100 },
                    success: true,
                    output: { executed: nodeId }
                };
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-store-error-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-store-error",
                            workflowDefinition: workflowDef,
                            inputs: { data: { context: "Very large data..." } },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        it("should handle search failure", async () => {
            const workflowDef = createSearchDefinition();

            mockExecuteNode.mockImplementation(async (params: ExecuteNodeParams) => {
                const nodeId = params.executionContext.nodeId;

                if (nodeId === "search") {
                    throw new Error("Embedding generation not available");
                }

                return {
                    result: { executed: nodeId },
                    signals: {},
                    metrics: { durationMs: 100 },
                    success: true,
                    output: { executed: nodeId }
                };
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-search-error-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-search-error",
                            workflowDefinition: workflowDef,
                            inputs: { data: { query: "test query" } },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(false);
        });
    });

    describe("real-world scenarios", () => {
        it("should handle conversation context storage", async () => {
            const workflowDef = createStoreDefinition();

            configureMockNodeOutputs({
                store: {
                    key: "userContext",
                    stored: true,
                    searchable: false
                },
                output: { result: { contextStored: true } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-conversation-context-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-conversation-context",
                            workflowDefinition: workflowDef,
                            inputs: {
                                data: {
                                    context: JSON.stringify({
                                        userId: "user-123",
                                        sessionId: "session-abc",
                                        previousTurns: [
                                            { role: "user", content: "Hello" },
                                            { role: "assistant", content: "Hi there!" }
                                        ]
                                    })
                                }
                            },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });
    });
});
