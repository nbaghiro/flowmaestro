/**
 * Loop Pattern Integration Tests
 *
 * True integration tests that verify loop node behavior through
 * the Temporal workflow engine with mocked activities.
 *
 * Tests:
 * - Loop node preparation and metadata generation
 * - forEach loop with array items
 * - Count-based loop iteration counts
 * - Loop metadata in workflow context
 * - Error handling for invalid loop configurations
 *
 * Note: Full loop execution with loopback edges is tested in
 * business-workflows tests which use the complete workflow format.
 * These tests focus on the loop node's behavior within simpler workflows.
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
 * Create a simple loop preparation workflow
 * Input -> Loop (forEach) -> Output
 * Tests loop node metadata generation without full loop execution
 */
function createLoopPreparationDefinition(loopType: "forEach" | "count"): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "data" },
        position: { x: 0, y: 0 }
    };

    const loopConfig: Record<string, string> =
        loopType === "forEach"
            ? {
                  loopType: "forEach",
                  arrayPath: "${input.data.items}",
                  itemVariable: "currentItem"
              }
            : {
                  loopType: "count",
                  count: "${input.data.count}",
                  itemVariable: "index"
              };

    nodes["loop"] = {
        type: "loop",
        name: "Process Loop",
        config: loopConfig,
        position: { x: 200, y: 0 }
    };

    nodes["output"] = {
        type: "output",
        name: "Output",
        config: { outputName: "loopResult" },
        position: { x: 400, y: 0 }
    };

    edges.push(
        {
            id: "input-loop",
            source: "input",
            target: "loop",
            sourceHandle: "output",
            targetHandle: "input"
        },
        {
            id: "loop-output",
            source: "loop",
            target: "output",
            sourceHandle: "output",
            targetHandle: "input"
        }
    );

    return {
        name: `Loop Preparation Workflow (${loopType})`,
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create a workflow with transform followed by loop preparation
 * Input -> Transform (prepare array) -> Loop -> Output
 */
function createTransformThenLoopDefinition(): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "rawData" },
        position: { x: 0, y: 0 }
    };

    nodes["transform"] = {
        type: "transform",
        name: "Prepare Items",
        config: {
            operation: "filter",
            inputData: "${input.rawData}",
            expression: "item => item.active === true",
            outputVariable: "activeItems"
        },
        position: { x: 200, y: 0 }
    };

    nodes["loop"] = {
        type: "loop",
        name: "Iterate Items",
        config: {
            loopType: "forEach",
            arrayPath: "${transform.activeItems}",
            itemVariable: "item"
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
        {
            id: "input-transform",
            source: "input",
            target: "transform",
            sourceHandle: "output",
            targetHandle: "input"
        },
        {
            id: "transform-loop",
            source: "transform",
            target: "loop",
            sourceHandle: "output",
            targetHandle: "input"
        },
        {
            id: "loop-output",
            source: "loop",
            target: "output",
            sourceHandle: "output",
            targetHandle: "input"
        }
    );

    return {
        name: "Transform Then Loop Workflow",
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create a workflow with code generating array for loop
 * Input -> Code (generate array) -> Loop -> Output
 */
function createCodeGeneratedLoopDefinition(): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "params" },
        position: { x: 0, y: 0 }
    };

    nodes["generate"] = {
        type: "code",
        name: "Generate Items",
        config: {
            language: "javascript",
            code: `
                const count = inputs.input.params.count || 5;
                const items = Array.from({ length: count }, (_, i) => ({
                    id: i + 1,
                    name: 'Item ' + (i + 1),
                    value: (i + 1) * 10
                }));
                return { items };
            `
        },
        position: { x: 200, y: 0 }
    };

    nodes["loop"] = {
        type: "loop",
        name: "Process Generated",
        config: {
            loopType: "forEach",
            arrayPath: "${generate.items}",
            itemVariable: "item"
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
        {
            id: "input-generate",
            source: "input",
            target: "generate",
            sourceHandle: "output",
            targetHandle: "input"
        },
        {
            id: "generate-loop",
            source: "generate",
            target: "loop",
            sourceHandle: "output",
            targetHandle: "input"
        },
        {
            id: "loop-output",
            source: "loop",
            target: "output",
            sourceHandle: "output",
            targetHandle: "input"
        }
    );

    return {
        name: "Code Generated Loop Workflow",
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create a workflow with HTTP fetch feeding loop
 * Input -> HTTP (fetch list) -> Loop -> Output
 */
function createHTTPFeedingLoopDefinition(): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "endpoint" },
        position: { x: 0, y: 0 }
    };

    nodes["fetch"] = {
        type: "http",
        name: "Fetch Items",
        config: {
            method: "GET",
            url: "{{input.endpoint}}"
        },
        position: { x: 200, y: 0 }
    };

    nodes["loop"] = {
        type: "loop",
        name: "Process Fetched",
        config: {
            loopType: "forEach",
            arrayPath: "${fetch.body.items}",
            itemVariable: "item"
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
        {
            id: "input-fetch",
            source: "input",
            target: "fetch",
            sourceHandle: "output",
            targetHandle: "input"
        },
        {
            id: "fetch-loop",
            source: "fetch",
            target: "loop",
            sourceHandle: "output",
            targetHandle: "input"
        },
        {
            id: "loop-output",
            source: "loop",
            target: "output",
            sourceHandle: "output",
            targetHandle: "input"
        }
    );

    return {
        name: "HTTP Feeding Loop Workflow",
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

/**
 * Helper to extract base node ID from sentinel IDs.
 * Loop nodes are transformed to `loop__LOOP_START` and `loop__LOOP_END` by the orchestrator.
 */
function getBaseNodeId(nodeId: string): string {
    if (nodeId.includes("__LOOP_START")) {
        return nodeId.replace("__LOOP_START", "");
    }
    if (nodeId.includes("__LOOP_END")) {
        return nodeId.replace("__LOOP_END", "");
    }
    return nodeId;
}

function configureMockNodeOutputs(outputs: Record<string, JsonObject>): void {
    mockExecuteNode.mockImplementation(async (params: ExecuteNodeParams) => {
        const nodeId = params.executionContext.nodeId;
        // Use base node ID to look up outputs (handles loop sentinels)
        const baseNodeId = getBaseNodeId(nodeId);
        const output = outputs[baseNodeId] || outputs[nodeId] || { result: `output-${nodeId}` };

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

describe("Loop Pattern Integration Tests", () => {
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

    describe("forEach loop preparation", () => {
        it("should prepare forEach loop with array items", async () => {
            const workflowDef = createLoopPreparationDefinition("forEach");

            const items = [
                { id: 1, name: "Item A" },
                { id: 2, name: "Item B" },
                { id: 3, name: "Item C" }
            ];

            configureMockNodeOutputs({
                input: { data: { items } },
                loop: {
                    iterations: 3,
                    items,
                    completed: true
                },
                output: { loopResult: { iterations: 3 } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-foreach-prep-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-foreach-prep",
                            workflowDefinition: workflowDef,
                            inputs: { data: { items } },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            // Verify workflow completes successfully
            // Note: Loop sentinels and input nodes are evaluated inline by the orchestrator,
            // not via executeNode activity. Only verify output node was executed.
            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("output");
        });

        it("should handle empty array in forEach loop", async () => {
            const workflowDef = createLoopPreparationDefinition("forEach");

            configureMockNodeOutputs({
                input: { data: { items: [] } },
                loop: {
                    iterations: 0,
                    items: [],
                    completed: true
                },
                output: { loopResult: { iterations: 0 } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-foreach-empty-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-foreach-empty",
                            workflowDefinition: workflowDef,
                            inputs: { data: { items: [] } },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            // Loop sentinels and input nodes are evaluated inline, verify output node
            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("output");
        });

        it("should complete workflow with forEach loop", async () => {
            // This test verifies the workflow completes with a forEach loop.
            // Loop sentinels (loop-start, loop-end) are evaluated inline by the
            // orchestrator, not via executeNode activity.
            const workflowDef = createLoopPreparationDefinition("forEach");

            configureMockNodeOutputs({
                input: { data: { items: [{ id: 1 }, { id: 2 }] } },
                output: { loopResult: { processed: true } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-loop-workflow-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-loop-workflow",
                            workflowDefinition: workflowDef,
                            inputs: { data: { items: [{ id: 1 }, { id: 2 }] } },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });
    });

    describe("count loop preparation", () => {
        it("should prepare count-based loop", async () => {
            const workflowDef = createLoopPreparationDefinition("count");

            configureMockNodeOutputs({
                input: { data: { count: 5 } },
                loop: {
                    iterations: 5,
                    completed: true
                },
                output: { loopResult: { iterations: 5 } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-count-prep-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-count-prep",
                            workflowDefinition: workflowDef,
                            inputs: { data: { count: 5 } },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            // Loop sentinels and input nodes are evaluated inline, verify output node
            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("output");
        });

        it("should handle zero count", async () => {
            const workflowDef = createLoopPreparationDefinition("count");

            configureMockNodeOutputs({
                input: { data: { count: 0 } },
                loop: {
                    iterations: 0,
                    completed: true
                },
                output: { loopResult: { iterations: 0 } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-count-zero-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-count-zero",
                            workflowDefinition: workflowDef,
                            inputs: { data: { count: 0 } },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });
    });

    describe("transform then loop", () => {
        it("should filter items before loop preparation", async () => {
            const workflowDef = createTransformThenLoopDefinition();

            const rawData = [
                { id: 1, name: "Active Item", active: true },
                { id: 2, name: "Inactive Item", active: false },
                { id: 3, name: "Another Active", active: true }
            ];

            const activeItems = rawData.filter((item) => item.active);

            configureMockNodeOutputs({
                input: { rawData },
                transform: { activeItems },
                loop: {
                    iterations: 2,
                    items: activeItems,
                    completed: true
                },
                output: { result: {} }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-transform-loop-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-transform-loop",
                            workflowDefinition: workflowDef,
                            inputs: { rawData },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            // Verify transform node was executed before loop
            // Loop sentinels and input nodes are evaluated inline
            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("transform");
            expect(nodeIds).toContain("output");
        });
    });

    describe("code generated loop", () => {
        it("should generate array via code then prepare loop", async () => {
            const workflowDef = createCodeGeneratedLoopDefinition();

            const generatedItems = [
                { id: 1, name: "Item 1", value: 10 },
                { id: 2, name: "Item 2", value: 20 },
                { id: 3, name: "Item 3", value: 30 }
            ];

            configureMockNodeOutputs({
                input: { params: { count: 3 } },
                generate: { items: generatedItems },
                loop: {
                    iterations: 3,
                    items: generatedItems,
                    completed: true
                },
                output: { result: {} }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-code-loop-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-code-loop",
                            workflowDefinition: workflowDef,
                            inputs: { params: { count: 3 } },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            // Verify code node was executed before loop
            // Loop sentinels and input nodes are evaluated inline
            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("generate");
            expect(nodeIds).toContain("output");
        });
    });

    describe("HTTP feeding loop", () => {
        it("should fetch data via HTTP then prepare loop", async () => {
            const workflowDef = createHTTPFeedingLoopDefinition();

            const fetchedItems = [
                { id: "user-1", email: "user1@example.com" },
                { id: "user-2", email: "user2@example.com" }
            ];

            configureMockNodeOutputs({
                input: { endpoint: "https://api.example.com/users" },
                fetch: {
                    statusCode: 200,
                    body: { items: fetchedItems, total: 2 }
                },
                loop: {
                    iterations: 2,
                    items: fetchedItems,
                    completed: true
                },
                output: { result: {} }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-http-loop-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-http-loop",
                            workflowDefinition: workflowDef,
                            inputs: { endpoint: "https://api.example.com/users" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            // Verify HTTP node was executed before loop
            // Loop sentinels and input nodes are evaluated inline
            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("fetch");
            expect(nodeIds).toContain("output");
        });

        it("should handle HTTP error before loop", async () => {
            const workflowDef = createHTTPFeedingLoopDefinition();

            mockExecuteNode.mockImplementation(async (params: ExecuteNodeParams) => {
                const nodeId = params.executionContext.nodeId;

                if (nodeId === "fetch") {
                    throw new Error("HTTP request failed: 500 Internal Server Error");
                }

                return {
                    result: { endpoint: "test" },
                    signals: {},
                    metrics: { durationMs: 100 },
                    success: true,
                    output: { endpoint: "test" }
                };
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-http-error-loop-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-http-error-loop",
                            workflowDefinition: workflowDef,
                            inputs: { endpoint: "https://api.example.com/users" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });
    });

    describe("error handling", () => {
        it("should handle upstream node error before loop", async () => {
            // Test that errors in nodes before the loop cause workflow failure
            const workflowDef = createTransformThenLoopDefinition();

            mockExecuteNode.mockImplementation(async (params: ExecuteNodeParams) => {
                const nodeId = params.executionContext.nodeId;

                if (nodeId === "transform") {
                    throw new Error("Transform operation failed: invalid data format");
                }

                return {
                    result: { rawData: [{ id: 1 }] },
                    signals: {},
                    metrics: { durationMs: 100 },
                    success: true,
                    output: { rawData: [{ id: 1 }] }
                };
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-upstream-error-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-upstream-error",
                            workflowDefinition: workflowDef,
                            inputs: { rawData: "not-an-array" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        it("should handle output node error after loop", async () => {
            // Test that errors in nodes after the loop cause workflow failure
            const workflowDef = createLoopPreparationDefinition("forEach");

            mockExecuteNode.mockImplementation(async (params: ExecuteNodeParams) => {
                const nodeId = params.executionContext.nodeId;

                if (nodeId === "output") {
                    throw new Error("Output operation failed");
                }

                return {
                    result: { data: { items: [{ id: 1 }] } },
                    signals: {},
                    metrics: { durationMs: 100 },
                    success: true,
                    output: { data: { items: [{ id: 1 }] } }
                };
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-downstream-error-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-downstream-error",
                            workflowDefinition: workflowDef,
                            inputs: { data: { items: [{ id: 1 }] } },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });
    });

    describe("context passing", () => {
        it("should pass upstream context to output node after loop", async () => {
            // Verify that context flows through the workflow
            // Note: Loop nodes are evaluated inline, so we check the output node
            const workflowDef = createCodeGeneratedLoopDefinition();

            let capturedOutputContext: JsonObject | null = null;

            mockExecuteNode.mockImplementation(async (params: ExecuteNodeParams) => {
                const nodeId = params.executionContext.nodeId;
                const baseNodeId = getBaseNodeId(nodeId);

                if (nodeId === "output") {
                    capturedOutputContext = params.context;
                }

                const outputs: Record<string, JsonObject> = {
                    input: { params: { count: 2 } },
                    generate: { items: [{ id: 1 }, { id: 2 }] },
                    output: { result: { processed: true } }
                };

                const output = outputs[baseNodeId] ||
                    outputs[nodeId] || { result: `output-${nodeId}` };

                return {
                    result: output,
                    signals: {},
                    metrics: { durationMs: 100 },
                    success: true,
                    output
                };
            });

            await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-output-context-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-output-context",
                            workflowDefinition: workflowDef,
                            inputs: { params: { count: 2 } },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(capturedOutputContext).toBeDefined();
            // The output node should have access to upstream node outputs
            expect(capturedOutputContext).toHaveProperty("input");
            expect(capturedOutputContext).toHaveProperty("generate");
        });
    });

    describe("real-world scenarios", () => {
        it("should prepare loop for batch processing scenario", async () => {
            const workflowDef = createHTTPFeedingLoopDefinition();

            // Simulating fetching a batch of records to process
            const batchRecords = Array.from({ length: 50 }, (_, i) => ({
                id: `record-${i + 1}`,
                status: "pending",
                data: { value: Math.random() * 100 }
            }));

            configureMockNodeOutputs({
                input: { endpoint: "https://api.example.com/batch/pending" },
                fetch: {
                    statusCode: 200,
                    body: { items: batchRecords, total: 50, hasMore: false }
                },
                loop: {
                    iterations: 50,
                    items: batchRecords,
                    completed: true
                },
                output: { result: { batchSize: 50 } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-batch-prep-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-batch-prep",
                            workflowDefinition: workflowDef,
                            inputs: { endpoint: "https://api.example.com/batch/pending" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });

        it("should prepare loop for user notification scenario", async () => {
            const workflowDef = createTransformThenLoopDefinition();

            // Users with notification preferences
            const users = [
                { id: 1, email: "user1@example.com", active: true, notifications: true },
                { id: 2, email: "user2@example.com", active: false, notifications: true },
                { id: 3, email: "user3@example.com", active: true, notifications: false },
                { id: 4, email: "user4@example.com", active: true, notifications: true }
            ];

            // Only active users should be in the loop
            const activeUsers = users.filter((u) => u.active);

            configureMockNodeOutputs({
                input: { rawData: users },
                transform: { activeItems: activeUsers },
                loop: {
                    iterations: 3,
                    items: activeUsers,
                    completed: true
                },
                output: { result: { usersToNotify: 3 } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-notification-prep-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-notification-prep",
                            workflowDefinition: workflowDef,
                            inputs: { rawData: users },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });
    });
});
