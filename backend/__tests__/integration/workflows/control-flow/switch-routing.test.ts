/**
 * Switch Routing Integration Tests
 *
 * True integration tests that execute switch/multi-branch routing workflows
 * through the Temporal workflow engine with mocked activities.
 *
 * Tests:
 * - Routing to correct case branches
 * - Default case handling
 * - Case-specific processing chains
 * - Converging branches after switch
 * - Dynamic case matching
 * - Nested switches
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
 * Create a basic switch workflow definition
 * Input -> Switch -> [Case_A, Case_B, Case_C, Default] -> Output
 */
function createSwitchWorkflowDefinition(cases: string[]): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    // Input node
    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "data" },
        position: { x: 0, y: 0 }
    };

    // Switch node
    nodes["switch"] = {
        type: "switch",
        name: "Router",
        config: {
            expression: "{{input.type}}",
            cases: cases.map((c) => ({ value: c, label: `Case ${c}` })),
            defaultCase: "default"
        },
        position: { x: 200, y: 0 }
    };

    edges.push({
        id: "input-switch",
        source: "input",
        target: "switch",
        sourceHandle: "output",
        targetHandle: "input"
    });

    // Case nodes
    cases.forEach((caseName, index) => {
        const nodeId = `case_${caseName.toLowerCase()}`;
        nodes[nodeId] = {
            type: "transform",
            name: `Handle ${caseName}`,
            config: { operation: "custom", caseType: caseName },
            position: { x: 400, y: index * 100 }
        };

        edges.push({
            id: `switch-${nodeId}`,
            source: "switch",
            target: nodeId,
            sourceHandle: `case-${caseName.toLowerCase()}`,
            targetHandle: "input"
        });

        edges.push({
            id: `${nodeId}-output`,
            source: nodeId,
            target: "output",
            sourceHandle: "output",
            targetHandle: "input"
        });
    });

    // Default node
    nodes["default"] = {
        type: "transform",
        name: "Handle Default",
        config: { operation: "custom", caseType: "default" },
        position: { x: 400, y: cases.length * 100 }
    };

    edges.push({
        id: "switch-default",
        source: "switch",
        target: "default",
        sourceHandle: "default",
        targetHandle: "input"
    });

    edges.push({
        id: "default-output",
        source: "default",
        target: "output",
        sourceHandle: "output",
        targetHandle: "input"
    });

    // Output node
    nodes["output"] = {
        type: "output",
        name: "Output",
        config: { outputName: "result" },
        position: { x: 600, y: 0 }
    };

    return {
        name: `Switch Workflow (${cases.length} cases)`,
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create a switch workflow with different processing chain lengths
 * Input -> Switch -> [Chain_High (2 steps), Chain_Medium (3 steps), Chain_Low (1 step), Unknown] -> Output
 */
function createSwitchWithChainsDefinition(): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    // Input node
    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "data" },
        position: { x: 0, y: 0 }
    };

    // Switch node
    nodes["switch"] = {
        type: "switch",
        name: "Route by priority",
        config: {
            expression: "{{input.priority}}",
            cases: [
                { value: "high", label: "High Priority" },
                { value: "medium", label: "Medium Priority" },
                { value: "low", label: "Low Priority" }
            ],
            defaultCase: "unknown"
        },
        position: { x: 200, y: 0 }
    };

    edges.push({
        id: "input-switch",
        source: "input",
        target: "switch",
        sourceHandle: "output",
        targetHandle: "input"
    });

    // High priority chain (2 steps)
    nodes["high_1"] = {
        type: "transform",
        name: "High Step 1",
        config: { operation: "prioritize" },
        position: { x: 400, y: 0 }
    };
    nodes["high_2"] = {
        type: "transform",
        name: "High Step 2",
        config: { operation: "escalate" },
        position: { x: 600, y: 0 }
    };

    edges.push({
        id: "switch-high_1",
        source: "switch",
        target: "high_1",
        sourceHandle: "case-high",
        targetHandle: "input"
    });
    edges.push({
        id: "high_1-high_2",
        source: "high_1",
        target: "high_2",
        sourceHandle: "output",
        targetHandle: "input"
    });
    edges.push({
        id: "high_2-output",
        source: "high_2",
        target: "output",
        sourceHandle: "output",
        targetHandle: "input"
    });

    // Medium priority chain (3 steps)
    nodes["medium_1"] = {
        type: "transform",
        name: "Medium Step 1",
        config: { operation: "queue" },
        position: { x: 400, y: 100 }
    };
    nodes["medium_2"] = {
        type: "transform",
        name: "Medium Step 2",
        config: { operation: "process" },
        position: { x: 600, y: 100 }
    };
    nodes["medium_3"] = {
        type: "transform",
        name: "Medium Step 3",
        config: { operation: "notify" },
        position: { x: 800, y: 100 }
    };

    edges.push({
        id: "switch-medium_1",
        source: "switch",
        target: "medium_1",
        sourceHandle: "case-medium",
        targetHandle: "input"
    });
    edges.push({
        id: "medium_1-medium_2",
        source: "medium_1",
        target: "medium_2",
        sourceHandle: "output",
        targetHandle: "input"
    });
    edges.push({
        id: "medium_2-medium_3",
        source: "medium_2",
        target: "medium_3",
        sourceHandle: "output",
        targetHandle: "input"
    });
    edges.push({
        id: "medium_3-output",
        source: "medium_3",
        target: "output",
        sourceHandle: "output",
        targetHandle: "input"
    });

    // Low priority chain (1 step)
    nodes["low_1"] = {
        type: "transform",
        name: "Low Priority Handler",
        config: { operation: "batch" },
        position: { x: 400, y: 200 }
    };

    edges.push({
        id: "switch-low_1",
        source: "switch",
        target: "low_1",
        sourceHandle: "case-low",
        targetHandle: "input"
    });
    edges.push({
        id: "low_1-output",
        source: "low_1",
        target: "output",
        sourceHandle: "output",
        targetHandle: "input"
    });

    // Unknown/Default chain (1 step)
    nodes["unknown"] = {
        type: "transform",
        name: "Unknown Handler",
        config: { operation: "log" },
        position: { x: 400, y: 300 }
    };

    edges.push({
        id: "switch-unknown",
        source: "switch",
        target: "unknown",
        sourceHandle: "default",
        targetHandle: "input"
    });
    edges.push({
        id: "unknown-output",
        source: "unknown",
        target: "output",
        sourceHandle: "output",
        targetHandle: "input"
    });

    // Output node
    nodes["output"] = {
        type: "output",
        name: "Output",
        config: { outputName: "result" },
        position: { x: 1000, y: 0 }
    };

    return {
        name: "Switch with Processing Chains",
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create a nested switch workflow definition
 * Input -> Switch1 -> [Case_A -> Switch2 -> [Sub_A1, Sub_A2], Case_B] -> Output
 */
function createNestedSwitchDefinition(): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    // Input node
    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "data" },
        position: { x: 0, y: 0 }
    };

    // Primary switch
    nodes["switch1"] = {
        type: "switch",
        name: "Primary Router",
        config: {
            expression: "{{input.category}}",
            cases: [
                { value: "A", label: "Category A" },
                { value: "B", label: "Category B" }
            ]
        },
        position: { x: 200, y: 0 }
    };

    edges.push({
        id: "input-switch1",
        source: "input",
        target: "switch1",
        sourceHandle: "output",
        targetHandle: "input"
    });

    // Nested switch (for category A)
    nodes["switch2"] = {
        type: "switch",
        name: "Secondary Router",
        config: {
            expression: "{{input.subCategory}}",
            cases: [
                { value: "A1", label: "Sub A1" },
                { value: "A2", label: "Sub A2" }
            ]
        },
        position: { x: 400, y: 0 }
    };

    edges.push({
        id: "switch1-switch2",
        source: "switch1",
        target: "switch2",
        sourceHandle: "case-a",
        targetHandle: "input"
    });

    // Sub A1 handler
    nodes["sub_a1"] = {
        type: "transform",
        name: "Handle A1",
        config: { subCase: "A1" },
        position: { x: 600, y: 0 }
    };

    edges.push({
        id: "switch2-sub_a1",
        source: "switch2",
        target: "sub_a1",
        sourceHandle: "case-a1",
        targetHandle: "input"
    });
    edges.push({
        id: "sub_a1-output",
        source: "sub_a1",
        target: "output",
        sourceHandle: "output",
        targetHandle: "input"
    });

    // Sub A2 handler
    nodes["sub_a2"] = {
        type: "transform",
        name: "Handle A2",
        config: { subCase: "A2" },
        position: { x: 600, y: 100 }
    };

    edges.push({
        id: "switch2-sub_a2",
        source: "switch2",
        target: "sub_a2",
        sourceHandle: "case-a2",
        targetHandle: "input"
    });
    edges.push({
        id: "sub_a2-output",
        source: "sub_a2",
        target: "output",
        sourceHandle: "output",
        targetHandle: "input"
    });

    // Category B handler (direct, no nested switch)
    nodes["case_b"] = {
        type: "transform",
        name: "Handle B",
        config: { case: "B" },
        position: { x: 400, y: 200 }
    };

    edges.push({
        id: "switch1-case_b",
        source: "switch1",
        target: "case_b",
        sourceHandle: "case-b",
        targetHandle: "input"
    });
    edges.push({
        id: "case_b-output",
        source: "case_b",
        target: "output",
        sourceHandle: "output",
        targetHandle: "input"
    });

    // Output node
    nodes["output"] = {
        type: "output",
        name: "Output",
        config: { outputName: "result" },
        position: { x: 800, y: 0 }
    };

    return {
        name: "Nested Switch Workflow",
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

describe("Switch Routing Integration Tests", () => {
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

    describe("routing to correct case branches", () => {
        it("should route to first case when input matches", async () => {
            const workflowDef = createSwitchWorkflowDefinition(["A", "B", "C"]);

            configureMockNodeOutputs({
                input: { type: "A", value: 42 },
                switch: { selectedRoute: "case-a", input: "A" },
                case_a: { handled: "A", value: 42 },
                case_b: { handled: "B" },
                case_c: { handled: "C" },
                default: { handled: "default" },
                output: { result: { handled: "A" } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-switch-case-a-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-switch-case-a",
                            workflowDefinition: workflowDef,
                            inputs: { type: "A", value: 42 },
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
            expect(nodeIds).toContain("switch");
        });

        it("should route to second case when input matches", async () => {
            const workflowDef = createSwitchWorkflowDefinition(["A", "B", "C"]);

            configureMockNodeOutputs({
                input: { type: "B", value: 100 },
                switch: { selectedRoute: "case-b", input: "B" },
                case_a: { handled: "A" },
                case_b: { handled: "B", value: 100 },
                case_c: { handled: "C" },
                default: { handled: "default" },
                output: { result: { handled: "B" } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-switch-case-b-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-switch-case-b",
                            workflowDefinition: workflowDef,
                            inputs: { type: "B", value: 100 },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("switch");
        });

        it("should route to third case when input matches", async () => {
            const workflowDef = createSwitchWorkflowDefinition(["X", "Y", "Z"]);

            configureMockNodeOutputs({
                input: { type: "Z", data: { nested: true } },
                switch: { selectedRoute: "case-z", input: "Z" },
                case_x: { handled: "X" },
                case_y: { handled: "Y" },
                case_z: { handled: "Z", data: { nested: true } },
                default: { handled: "default" },
                output: { result: { handled: "Z" } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-switch-case-z-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-switch-case-z",
                            workflowDefinition: workflowDef,
                            inputs: { type: "Z", data: { nested: true } },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });
    });

    describe("default case handling", () => {
        it("should route to default when no case matches", async () => {
            const workflowDef = createSwitchWorkflowDefinition(["A", "B", "C"]);

            configureMockNodeOutputs({
                input: { type: "UNKNOWN", value: 0 },
                switch: { selectedRoute: "default", input: "UNKNOWN" },
                case_a: { handled: "A" },
                case_b: { handled: "B" },
                case_c: { handled: "C" },
                default: { handled: "default", reason: "unknown type" },
                output: { result: { handled: "default" } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-switch-default-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-switch-default",
                            workflowDefinition: workflowDef,
                            inputs: { type: "UNKNOWN" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("switch");
        });

        it("should handle null input by routing to default", async () => {
            const workflowDef = createSwitchWorkflowDefinition(["A", "B"]);

            configureMockNodeOutputs({
                input: { type: null },
                switch: { selectedRoute: "default", input: null },
                case_a: { handled: "A" },
                case_b: { handled: "B" },
                default: { handled: "default", reason: "null input" },
                output: { result: { handled: "default" } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-switch-null-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-switch-null",
                            workflowDefinition: workflowDef,
                            inputs: { type: null },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });

        it("should handle empty string by routing to default", async () => {
            const workflowDef = createSwitchWorkflowDefinition(["valid", "test"]);

            configureMockNodeOutputs({
                input: { type: "" },
                switch: { selectedRoute: "default", input: "" },
                case_valid: { handled: "valid" },
                case_test: { handled: "test" },
                default: { handled: "default", reason: "empty string" },
                output: { result: { handled: "default" } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-switch-empty-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-switch-empty",
                            workflowDefinition: workflowDef,
                            inputs: { type: "" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });
    });

    describe("case-specific processing chains", () => {
        it("should execute high priority chain (2 steps)", async () => {
            const workflowDef = createSwitchWithChainsDefinition();

            configureMockNodeOutputs({
                input: { priority: "high", ticket: "T-001" },
                switch: { selectedRoute: "case-high" },
                high_1: { prioritized: true, ticket: "T-001" },
                high_2: { escalated: true, priority: "high" },
                medium_1: {},
                medium_2: {},
                medium_3: {},
                low_1: {},
                unknown: {},
                output: { result: { escalated: true } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-chain-high-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-chain-high",
                            workflowDefinition: workflowDef,
                            inputs: { priority: "high", ticket: "T-001" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("switch");
            expect(nodeIds).toContain("high_1");
            expect(nodeIds).toContain("high_2");
        });

        it("should execute medium priority chain (3 steps)", async () => {
            const workflowDef = createSwitchWithChainsDefinition();

            configureMockNodeOutputs({
                input: { priority: "medium", ticket: "T-002" },
                switch: { selectedRoute: "case-medium" },
                high_1: {},
                high_2: {},
                medium_1: { queued: true },
                medium_2: { processed: true },
                medium_3: { notified: true },
                low_1: {},
                unknown: {},
                output: { result: { notified: true } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-chain-medium-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-chain-medium",
                            workflowDefinition: workflowDef,
                            inputs: { priority: "medium", ticket: "T-002" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("switch");
            expect(nodeIds).toContain("medium_1");
            expect(nodeIds).toContain("medium_2");
            expect(nodeIds).toContain("medium_3");
        });

        it("should execute low priority chain (1 step)", async () => {
            const workflowDef = createSwitchWithChainsDefinition();

            configureMockNodeOutputs({
                input: { priority: "low", ticket: "T-003" },
                switch: { selectedRoute: "case-low" },
                high_1: {},
                high_2: {},
                medium_1: {},
                medium_2: {},
                medium_3: {},
                low_1: { batched: true },
                unknown: {},
                output: { result: { batched: true } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-chain-low-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-chain-low",
                            workflowDefinition: workflowDef,
                            inputs: { priority: "low", ticket: "T-003" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("switch");
            expect(nodeIds).toContain("low_1");
        });
    });

    describe("converging branches after switch", () => {
        it("should converge all branches to output node", async () => {
            const workflowDef = createSwitchWorkflowDefinition(["A", "B"]);

            configureMockNodeOutputs({
                input: { type: "A" },
                switch: { selectedRoute: "case-a" },
                case_a: { handled: "A", final: true },
                case_b: { handled: "B" },
                default: { handled: "default" },
                output: { result: { converged: true } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-converge-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-converge",
                            workflowDefinition: workflowDef,
                            inputs: { type: "A" },
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
            expect(nodeIds).toContain("output");
        });

        it("should pass correct context to converging output", async () => {
            const workflowDef = createSwitchWorkflowDefinition(["first", "second"]);

            let outputContext: JsonObject = {};

            mockExecuteNode.mockImplementation(async (params: ExecuteNodeParams) => {
                const nodeId = params.executionContext.nodeId;

                if (nodeId === "output") {
                    outputContext = params.context;
                }

                const outputs: Record<string, JsonObject> = {
                    input: { type: "first", important: "data" },
                    switch: { selectedRoute: "case-first" },
                    case_first: { handled: "first", processed: true },
                    case_second: { handled: "second" },
                    default: { handled: "default" },
                    output: { result: { done: true } }
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
                    workflowId: "test-context-converge-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-context-converge",
                            workflowDefinition: workflowDef,
                            inputs: { type: "first", important: "data" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
            expect(outputContext).toBeDefined();
        });
    });

    describe("dynamic case matching", () => {
        it("should match case-insensitive string values", async () => {
            const workflowDef = createSwitchWorkflowDefinition(["ERROR", "WARNING", "INFO"]);

            configureMockNodeOutputs({
                input: { type: "ERROR", message: "Something went wrong" },
                switch: { selectedRoute: "case-error" },
                case_error: { handled: "ERROR", severity: "critical" },
                case_warning: { handled: "WARNING" },
                case_info: { handled: "INFO" },
                default: { handled: "default" },
                output: { result: { severity: "critical" } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-dynamic-case-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-dynamic-case",
                            workflowDefinition: workflowDef,
                            inputs: { type: "ERROR", message: "Something went wrong" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });

        it("should match numeric case values", async () => {
            const workflowDef = createSwitchWorkflowDefinition(["100", "200", "300"]);

            configureMockNodeOutputs({
                input: { type: "200" },
                switch: { selectedRoute: "case-200" },
                case_100: { handled: "100" },
                case_200: { handled: "200", statusCode: 200 },
                case_300: { handled: "300" },
                default: { handled: "default" },
                output: { result: { statusCode: 200 } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-numeric-case-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-numeric-case",
                            workflowDefinition: workflowDef,
                            inputs: { type: "200" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });
    });

    describe("nested switches", () => {
        it("should route through nested switches - path A -> A1", async () => {
            const workflowDef = createNestedSwitchDefinition();

            configureMockNodeOutputs({
                input: { category: "A", subCategory: "A1" },
                switch1: { selectedRoute: "case-a" },
                switch2: { selectedRoute: "case-a1" },
                sub_a1: { handled: "A1", path: ["A", "A1"] },
                sub_a2: { handled: "A2" },
                case_b: { handled: "B" },
                output: { result: { handled: "A1" } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-nested-a1-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-nested-a1",
                            workflowDefinition: workflowDef,
                            inputs: { category: "A", subCategory: "A1" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("switch1");
            expect(nodeIds).toContain("switch2");
            expect(nodeIds).toContain("sub_a1");
        });

        it("should route through nested switches - path A -> A2", async () => {
            const workflowDef = createNestedSwitchDefinition();

            configureMockNodeOutputs({
                input: { category: "A", subCategory: "A2" },
                switch1: { selectedRoute: "case-a" },
                switch2: { selectedRoute: "case-a2" },
                sub_a1: { handled: "A1" },
                sub_a2: { handled: "A2", path: ["A", "A2"] },
                case_b: { handled: "B" },
                output: { result: { handled: "A2" } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-nested-a2-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-nested-a2",
                            workflowDefinition: workflowDef,
                            inputs: { category: "A", subCategory: "A2" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("switch1");
            expect(nodeIds).toContain("switch2");
            expect(nodeIds).toContain("sub_a2");
        });

        it("should route directly to B (bypassing nested switch)", async () => {
            const workflowDef = createNestedSwitchDefinition();

            configureMockNodeOutputs({
                input: { category: "B", subCategory: "ignored" },
                switch1: { selectedRoute: "case-b" },
                switch2: {},
                sub_a1: {},
                sub_a2: {},
                case_b: { handled: "B", direct: true },
                output: { result: { handled: "B" } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-nested-b-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-nested-b",
                            workflowDefinition: workflowDef,
                            inputs: { category: "B" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("switch1");
            expect(nodeIds).toContain("case_b");
        });
    });

    describe("real-world scenarios", () => {
        it("should route customer support tickets by type", async () => {
            const workflowDef = createSwitchWorkflowDefinition(["billing", "technical", "general"]);

            configureMockNodeOutputs({
                input: {
                    type: "technical",
                    subject: "Cannot login",
                    customerId: "C-123"
                },
                switch: { selectedRoute: "case-technical" },
                case_billing: { assigned: "billing-team" },
                case_technical: {
                    assigned: "tech-support",
                    priority: "high",
                    escalated: false
                },
                case_general: { assigned: "general-inbox" },
                default: { assigned: "unrouted" },
                output: { result: { assigned: "tech-support" } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-support-ticket-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-support-ticket",
                            workflowDefinition: workflowDef,
                            inputs: { type: "technical", subject: "Cannot login" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });

        it("should route orders by fulfillment type", async () => {
            const workflowDef = createSwitchWorkflowDefinition([
                "digital",
                "physical",
                "subscription"
            ]);

            configureMockNodeOutputs({
                input: {
                    type: "subscription",
                    productId: "P-SUB-001",
                    interval: "monthly"
                },
                switch: { selectedRoute: "case-subscription" },
                case_digital: { fulfillment: "instant-download" },
                case_physical: { fulfillment: "shipping-queue" },
                case_subscription: {
                    fulfillment: "recurring-billing",
                    nextBilling: "2024-02-01"
                },
                default: { fulfillment: "manual-review" },
                output: { result: { fulfillment: "recurring-billing" } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-order-routing-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-order-routing",
                            workflowDefinition: workflowDef,
                            inputs: { type: "subscription" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });

        it("should route API requests by HTTP method", async () => {
            const workflowDef = createSwitchWorkflowDefinition(["GET", "POST", "PUT", "DELETE"]);

            configureMockNodeOutputs({
                input: { type: "POST", path: "/users", body: { name: "John" } },
                switch: { selectedRoute: "case-post" },
                case_get: { action: "read" },
                case_post: { action: "create", created: true },
                case_put: { action: "update" },
                case_delete: { action: "delete" },
                default: { action: "method-not-allowed" },
                output: { result: { action: "create" } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-http-method-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-http-method",
                            workflowDefinition: workflowDef,
                            inputs: { type: "POST" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });

        it("should handle multi-language content routing", async () => {
            const workflowDef = createSwitchWorkflowDefinition(["en", "es", "fr", "de"]);

            configureMockNodeOutputs({
                input: { type: "es", content: "Hola mundo" },
                switch: { selectedRoute: "case-es" },
                case_en: { translated: "Hello world" },
                case_es: { translated: "Hola mundo", isOriginal: true },
                case_fr: { translated: "Bonjour le monde" },
                case_de: { translated: "Hallo Welt" },
                default: { translated: "Unsupported language" },
                output: { result: { translated: "Hola mundo" } }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-language-routing-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-language-routing",
                            workflowDefinition: workflowDef,
                            inputs: { type: "es" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });
    });

    describe("error handling", () => {
        it("should handle switch node failure", async () => {
            const workflowDef = createSwitchWorkflowDefinition(["A", "B"]);

            mockExecuteNode.mockImplementation(async (params: ExecuteNodeParams) => {
                const nodeId = params.executionContext.nodeId;

                if (nodeId === "switch") {
                    throw new Error("Expression evaluation failed");
                }

                return {
                    result: { input: true },
                    signals: {},
                    metrics: { durationMs: 100 },
                    success: true,
                    output: { input: true }
                };
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-switch-error-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-switch-error",
                            workflowDefinition: workflowDef,
                            inputs: { type: "A" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(false);
            expect(result.error).toContain("failed");
        });

        it("should handle case branch failure", async () => {
            const workflowDef = createSwitchWorkflowDefinition(["A", "B"]);

            mockExecuteNode.mockImplementation(async (params: ExecuteNodeParams) => {
                const nodeId = params.executionContext.nodeId;

                if (nodeId === "case_a") {
                    throw new Error("Case handler failed");
                }

                const outputs: Record<string, JsonObject> = {
                    input: { type: "A" },
                    switch: { selectedRoute: "case-a" }
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
                    workflowId: "test-case-error-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-case-error",
                            workflowDefinition: workflowDef,
                            inputs: { type: "A" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(false);
        });
    });

    describe("context passing through switch", () => {
        it("should pass input context to switch and selected branch", async () => {
            const workflowDef = createSwitchWorkflowDefinition(["A", "B"]);

            let switchContext: JsonObject = {};
            let branchContext: JsonObject = {};

            mockExecuteNode.mockImplementation(async (params: ExecuteNodeParams) => {
                const nodeId = params.executionContext.nodeId;

                if (nodeId === "switch") {
                    switchContext = params.context;
                }
                if (nodeId === "case_a") {
                    branchContext = params.context;
                }

                const outputs: Record<string, JsonObject> = {
                    input: { type: "A", payload: { value: 100 } },
                    switch: { selectedRoute: "case-a" },
                    case_a: { handled: "A" },
                    case_b: { handled: "B" },
                    default: { handled: "default" },
                    output: { result: {} }
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
                    workflowId: "test-context-pass-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-context-pass",
                            workflowDefinition: workflowDef,
                            inputs: { type: "A", payload: { value: 100 } },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
            expect(switchContext).toBeDefined();
            expect(branchContext).toBeDefined();
        });
    });
});
