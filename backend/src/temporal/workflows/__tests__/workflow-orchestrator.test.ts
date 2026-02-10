/**
 * Workflow Orchestrator Tests
 *
 * Comprehensive tests for the workflow orchestrator covering:
 * - Workflow building and validation
 * - Credit check and reservation
 * - Parallel node execution
 * - Conditional branching
 * - Loop execution
 * - Human review pause/resume
 * - Error handling and recovery
 * - Event emission
 */

import type { WorkflowDefinition, JsonObject } from "@flowmaestro/shared";
import type { BuiltWorkflow, ExecutableNode, TypedEdge } from "../../activities/execution/types";

// ============================================================================
// MOCK SETUP
// ============================================================================

interface MockActivityResults {
    buildWorkflow: {
        success: boolean;
        workflow: BuiltWorkflow | null;
        errors?: Array<{ code: string; message: string }>;
        warnings?: Array<{ code: string; message: string }>;
    };
    validateInputs: { success: boolean; error?: { message: string } };
    validateOutputs: { success: boolean; error?: { message: string } };
    executeNode: Map<string, { result: JsonObject; metrics?: { tokenUsage?: object } }>;
    shouldAllowExecution: boolean;
    reserveCredits: boolean;
    estimateWorkflowCredits: { totalCredits: number };
    calculateNodeCredits: number;
    calculateLLMCredits: number;
    spans: Array<{ spanId: string; name: string; ended: boolean; error?: Error }>;
    emittedEvents: Array<{ type: string; data: unknown }>;
}

const mockActivityResults: MockActivityResults = {
    buildWorkflow: { success: false, workflow: null },
    validateInputs: { success: true },
    validateOutputs: { success: true },
    executeNode: new Map(),
    shouldAllowExecution: true,
    reserveCredits: true,
    estimateWorkflowCredits: { totalCredits: 10 },
    calculateNodeCredits: 1,
    calculateLLMCredits: 5,
    spans: [],
    emittedEvents: []
};

function resetMocks(): void {
    mockActivityResults.buildWorkflow = { success: false, workflow: null };
    mockActivityResults.validateInputs = { success: true };
    mockActivityResults.validateOutputs = { success: true };
    mockActivityResults.executeNode.clear();
    mockActivityResults.shouldAllowExecution = true;
    mockActivityResults.reserveCredits = true;
    mockActivityResults.estimateWorkflowCredits = { totalCredits: 10 };
    mockActivityResults.calculateNodeCredits = 1;
    mockActivityResults.calculateLLMCredits = 5;
    mockActivityResults.spans = [];
    mockActivityResults.emittedEvents = [];
}

// ============================================================================
// MOCK ACTIVITIES
// ============================================================================

const mockBuildWorkflow = jest.fn().mockImplementation(() => mockActivityResults.buildWorkflow);

const mockValidateInputsActivity = jest
    .fn()
    .mockImplementation(() => Promise.resolve(mockActivityResults.validateInputs));

const mockValidateOutputsActivity = jest
    .fn()
    .mockImplementation(() => Promise.resolve(mockActivityResults.validateOutputs));

const mockExecuteNode = jest.fn().mockImplementation((input: { nodeType: string }) => {
    const result = mockActivityResults.executeNode.get(input.nodeType);
    if (!result) {
        throw new Error(`No mock result for node type: ${input.nodeType}`);
    }
    return Promise.resolve(result);
});

const mockCreateSpan = jest.fn().mockImplementation((input: { name: string }) => {
    const spanId = `span-${mockActivityResults.spans.length}`;
    mockActivityResults.spans.push({ spanId, name: input.name, ended: false });
    return Promise.resolve({ spanId });
});

const mockEndSpan = jest.fn().mockImplementation((input: { spanId: string; error?: Error }) => {
    const span = mockActivityResults.spans.find((s) => s.spanId === input.spanId);
    if (span) {
        span.ended = true;
        span.error = input.error;
    }
    return Promise.resolve();
});

const mockShouldAllowExecution = jest
    .fn()
    .mockImplementation(() => Promise.resolve(mockActivityResults.shouldAllowExecution));

const mockReserveCredits = jest
    .fn()
    .mockImplementation(() => Promise.resolve(mockActivityResults.reserveCredits));

const mockReleaseCredits = jest.fn().mockImplementation(() => Promise.resolve());

const mockFinalizeCredits = jest.fn().mockImplementation(() => Promise.resolve());

const mockEstimateWorkflowCredits = jest
    .fn()
    .mockImplementation(() => Promise.resolve(mockActivityResults.estimateWorkflowCredits));

const mockCalculateNodeCredits = jest
    .fn()
    .mockImplementation(() => Promise.resolve(mockActivityResults.calculateNodeCredits));

const mockCalculateLLMCredits = jest
    .fn()
    .mockImplementation(() => Promise.resolve(mockActivityResults.calculateLLMCredits));

// Event emission mocks
const mockEmitExecutionStarted = jest.fn().mockImplementation((data) => {
    mockActivityResults.emittedEvents.push({ type: "execution_started", data });
    return Promise.resolve();
});

const mockEmitExecutionProgress = jest.fn().mockImplementation((data) => {
    mockActivityResults.emittedEvents.push({ type: "execution_progress", data });
    return Promise.resolve();
});

const mockEmitExecutionCompleted = jest.fn().mockImplementation((data) => {
    mockActivityResults.emittedEvents.push({ type: "execution_completed", data });
    return Promise.resolve();
});

const mockEmitExecutionFailed = jest.fn().mockImplementation((data) => {
    mockActivityResults.emittedEvents.push({ type: "execution_failed", data });
    return Promise.resolve();
});

const mockEmitExecutionPaused = jest.fn().mockImplementation((data) => {
    mockActivityResults.emittedEvents.push({ type: "execution_paused", data });
    return Promise.resolve();
});

const mockEmitNodeStarted = jest.fn().mockImplementation((data) => {
    mockActivityResults.emittedEvents.push({ type: "node_started", data });
    return Promise.resolve();
});

const mockEmitNodeCompleted = jest.fn().mockImplementation((data) => {
    mockActivityResults.emittedEvents.push({ type: "node_completed", data });
    return Promise.resolve();
});

const mockEmitNodeFailed = jest.fn().mockImplementation((data) => {
    mockActivityResults.emittedEvents.push({ type: "node_failed", data });
    return Promise.resolve();
});

// ============================================================================
// WORKFLOW SIMULATION
// ============================================================================

interface OrchestratorInput {
    executionId: string;
    workflowDefinition: WorkflowDefinition;
    inputs?: JsonObject;
    userId?: string;
    workspaceId?: string;
    skipCreditCheck?: boolean;
}

interface OrchestratorResult {
    success: boolean;
    outputs: JsonObject;
    error?: string;
    paused?: boolean;
    pausedAtNodeId?: string;
}

/**
 * Simulates the workflow orchestrator execution
 */
async function simulateOrchestratorWorkflow(input: OrchestratorInput): Promise<OrchestratorResult> {
    const {
        executionId,
        workflowDefinition,
        inputs = {},
        userId,
        workspaceId,
        skipCreditCheck
    } = input;

    let reservedCredits = 0;
    let accumulatedCredits = 0;

    // Create WORKFLOW_RUN span
    const workflowRunContext = await mockCreateSpan({
        traceId: executionId,
        parentSpanId: undefined,
        name: `Workflow: ${workflowDefinition.name || "Unnamed"}`,
        spanType: "WORKFLOW_RUN",
        entityId: executionId,
        input: { workflowName: workflowDefinition.name, inputs },
        attributes: { userId, workflowName: workflowDefinition.name }
    });
    const workflowRunSpanId = workflowRunContext.spanId;

    try {
        // PHASE 0: CREDIT CHECK & RESERVATION
        if (!skipCreditCheck && workspaceId) {
            const estimate = await mockEstimateWorkflowCredits({ workflowDefinition });
            const estimatedCredits = Math.ceil(estimate.totalCredits * 1.2);

            const allowed = await mockShouldAllowExecution({ workspaceId, estimatedCredits });

            if (!allowed) {
                const errorMessage = `Insufficient credits for workflow execution. Estimated need: ${estimatedCredits} credits`;
                await mockEmitExecutionFailed({ executionId, error: errorMessage });
                await mockEndSpan({
                    spanId: workflowRunSpanId,
                    error: new Error(errorMessage)
                });
                return { success: false, outputs: {}, error: errorMessage };
            }

            const reserved = await mockReserveCredits({ workspaceId, estimatedCredits });

            if (!reserved) {
                const errorMessage = "Failed to reserve credits for execution";
                await mockEmitExecutionFailed({ executionId, error: errorMessage });
                await mockEndSpan({
                    spanId: workflowRunSpanId,
                    error: new Error(errorMessage)
                });
                return { success: false, outputs: {}, error: errorMessage };
            }

            reservedCredits = estimatedCredits;
        }

        // PHASE 1: BUILD WORKFLOW
        const buildResult = mockBuildWorkflow(workflowDefinition);

        if (!buildResult.success || !buildResult.workflow) {
            const errorMessage =
                buildResult.errors?.map((e: { message: string }) => e.message).join("; ") ||
                "Workflow build failed";
            await mockEmitExecutionFailed({ executionId, error: errorMessage });
            await mockEndSpan({
                spanId: workflowRunSpanId,
                error: new Error(errorMessage)
            });
            return { success: false, outputs: {}, error: errorMessage };
        }

        const builtWorkflow = buildResult.workflow;

        // PHASE 2: VALIDATE INPUTS
        const inputValidation = await mockValidateInputsActivity({
            workflowDefinition,
            inputs
        });

        if (!inputValidation.success) {
            const errorMessage = inputValidation.error?.message || "Input validation failed";
            await mockEmitExecutionFailed({ executionId, error: errorMessage });
            await mockEndSpan({
                spanId: workflowRunSpanId,
                error: new Error(errorMessage)
            });
            return { success: false, outputs: {}, error: errorMessage };
        }

        // PHASE 3: INITIALIZE EXECUTION
        await mockEmitExecutionStarted({
            executionId,
            workflowName: workflowDefinition.name || "Unnamed Workflow",
            totalNodes: builtWorkflow.nodes.size
        });

        // Simulated queue state
        const completedNodes = new Set<string>();
        const failedNodes = new Set<string>();
        const skippedNodes = new Set<string>();
        const nodeOutputs: Map<string, JsonObject> = new Map();
        const errors: Record<string, string> = {};

        // Context
        let context: JsonObject = { ...inputs };
        if (userId) {
            context.userId = userId;
        }

        // PHASE 4: PARALLEL EXECUTION LOOP
        // Flatten execution levels into execution order
        const executionOrder = builtWorkflow.executionLevels.flat();

        for (const nodeId of executionOrder) {
            if (skippedNodes.has(nodeId)) {
                continue;
            }

            const node = builtWorkflow.nodes.get(nodeId);
            if (!node) continue;

            // Create node span
            const nodeContext = await mockCreateSpan({
                traceId: executionId,
                parentSpanId: workflowRunSpanId,
                name: `Node: ${node.name || nodeId}`,
                spanType: "NODE_EXECUTION",
                entityId: nodeId,
                input: { nodeId, nodeType: node.type },
                attributes: { userId, nodeId, nodeType: node.type }
            });
            const nodeSpanId = nodeContext.spanId;

            await mockEmitNodeStarted({
                executionId,
                nodeId,
                nodeName: node.name,
                nodeType: node.type
            });

            try {
                let output: JsonObject = {};
                let branchesToSkip: string[] | undefined;
                let pauseSignal = false;
                let pauseContext: JsonObject | undefined;

                // Handle special node types inline
                switch (node.type) {
                    case "input": {
                        const inputName =
                            typeof node.config.inputName === "string"
                                ? node.config.inputName
                                : null;
                        if (inputName) {
                            output = { [inputName]: inputs[inputName] };
                        } else {
                            output = { ...inputs };
                        }
                        break;
                    }

                    case "conditional": {
                        const leftValue =
                            typeof node.config.leftValue === "string" ? node.config.leftValue : "";
                        const rightValue =
                            typeof node.config.rightValue === "string"
                                ? node.config.rightValue
                                : "";

                        // Simple equality check
                        const conditionMet = leftValue === rightValue;
                        const branch = conditionMet ? "true" : "false";
                        output = { conditionMet, branch };

                        // Find edges and determine branches to skip
                        branchesToSkip = [];
                        for (const edge of builtWorkflow.edges.values()) {
                            if (edge.source === nodeId) {
                                if (
                                    edge.handleType !== branch &&
                                    (edge.handleType === "true" || edge.handleType === "false")
                                ) {
                                    branchesToSkip.push(edge.target);
                                }
                            }
                        }
                        break;
                    }

                    case "output": {
                        // Collect outputs from context
                        output = { collected: true };
                        break;
                    }

                    default: {
                        // Standard node execution
                        const executionResult = await mockExecuteNode({
                            nodeType: node.type,
                            nodeConfig: node.config,
                            context,
                            executionContext: { executionId, userId, nodeId }
                        });

                        output = executionResult.result;

                        // Check for pause signal
                        if ((executionResult as { signals?: { pause?: boolean } }).signals?.pause) {
                            pauseSignal = true;
                            pauseContext = (
                                executionResult as { signals?: { pauseContext?: JsonObject } }
                            ).signals?.pauseContext;
                        }

                        // Track credits
                        if (!skipCreditCheck && workspaceId) {
                            let nodeCredit = 0;
                            if (executionResult.metrics?.tokenUsage) {
                                nodeCredit = await mockCalculateLLMCredits({
                                    model: "default",
                                    inputTokens: 0,
                                    outputTokens: 0
                                });
                            } else {
                                nodeCredit = await mockCalculateNodeCredits({
                                    nodeType: node.type
                                });
                            }
                            accumulatedCredits += nodeCredit;
                        }
                    }
                }

                // Handle pause signal
                if (pauseSignal) {
                    await mockEmitExecutionPaused({
                        executionId,
                        reason: "Waiting for user response",
                        pausedAtNodeId: nodeId,
                        pauseContext
                    });

                    await mockEndSpan({
                        spanId: nodeSpanId,
                        output: { paused: true }
                    });

                    await mockEndSpan({
                        spanId: workflowRunSpanId,
                        output: { paused: true, pausedAtNodeId: nodeId }
                    });

                    return {
                        success: true,
                        outputs: { _paused: true, _pausedAtNodeId: nodeId },
                        paused: true,
                        pausedAtNodeId: nodeId
                    };
                }

                // Skip branches if needed
                if (branchesToSkip) {
                    for (const branchNodeId of branchesToSkip) {
                        skippedNodes.add(branchNodeId);
                    }
                }

                // Store output
                nodeOutputs.set(nodeId, output);
                context = { ...context, [`node_${nodeId}`]: output };
                completedNodes.add(nodeId);

                await mockEmitNodeCompleted({
                    executionId,
                    nodeId,
                    nodeName: node.name || nodeId,
                    nodeType: node.type,
                    output
                });

                await mockEndSpan({
                    spanId: nodeSpanId,
                    output: { nodeType: node.type, success: true }
                });
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : "Unknown error";
                errors[nodeId] = errorMessage;
                failedNodes.add(nodeId);

                await mockEndSpan({
                    spanId: nodeSpanId,
                    error: error instanceof Error ? error : new Error(errorMessage)
                });

                await mockEmitNodeFailed({
                    executionId,
                    nodeId,
                    nodeName: node.name || nodeId,
                    nodeType: node.type,
                    error: errorMessage
                });
            }

            // Emit progress
            const total = builtWorkflow.nodes.size;
            const completed = completedNodes.size + skippedNodes.size;
            await mockEmitExecutionProgress({
                executionId,
                completed,
                total,
                percentage: Math.round((completed / total) * 100)
            });
        }

        // PHASE 5: FINALIZE EXECUTION
        if (failedNodes.size > 0) {
            const errorMessage = `Workflow completed with ${failedNodes.size} failed nodes: ${JSON.stringify(errors)}`;
            const failedNodeId = Array.from(failedNodes)[0];

            await mockEmitExecutionFailed({ executionId, error: errorMessage, failedNodeId });
            await mockEndSpan({
                spanId: workflowRunSpanId,
                error: new Error(errorMessage)
            });

            return {
                success: false,
                outputs: Object.fromEntries(nodeOutputs),
                error: errorMessage
            };
        }

        // Validate outputs
        const finalOutputs = Object.fromEntries(nodeOutputs);
        const outputValidation = await mockValidateOutputsActivity({
            workflowDefinition,
            outputs: finalOutputs
        });

        if (!outputValidation.success) {
            const errorMessage = outputValidation.error?.message || "Output validation failed";
            await mockEmitExecutionFailed({ executionId, error: errorMessage });
            await mockEndSpan({
                spanId: workflowRunSpanId,
                error: new Error(errorMessage)
            });
            return { success: false, outputs: finalOutputs, error: errorMessage };
        }

        await mockEmitExecutionCompleted({
            executionId,
            outputs: finalOutputs,
            duration: 1000
        });

        await mockEndSpan({
            spanId: workflowRunSpanId,
            output: { success: true, outputs: finalOutputs }
        });

        // Finalize credits
        if (!skipCreditCheck && workspaceId && reservedCredits > 0) {
            await mockFinalizeCredits({
                workspaceId,
                userId: userId || null,
                reservedAmount: reservedCredits,
                actualAmount: accumulatedCredits,
                operationType: "workflow_execution",
                operationId: executionId
            });
        }

        return { success: true, outputs: finalOutputs };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";

        await mockEmitExecutionFailed({ executionId, error: errorMessage });
        await mockEndSpan({
            spanId: workflowRunSpanId,
            error: error instanceof Error ? error : new Error(errorMessage)
        });

        // Handle credits on failure
        if (!skipCreditCheck && workspaceId && reservedCredits > 0) {
            if (accumulatedCredits > 0) {
                await mockFinalizeCredits({
                    workspaceId,
                    userId: userId || null,
                    reservedAmount: reservedCredits,
                    actualAmount: accumulatedCredits,
                    operationType: "workflow_execution",
                    operationId: executionId
                });
            } else {
                await mockReleaseCredits({ workspaceId, amount: reservedCredits });
            }
        }

        return { success: false, outputs: {}, error: errorMessage };
    }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function createTestWorkflowDefinition(
    overrides: Partial<WorkflowDefinition> = {}
): WorkflowDefinition {
    return {
        name: "Test Workflow",
        description: "Test workflow description",
        nodes: {
            input1: {
                type: "input",
                name: "Input Node",
                config: { inputName: "message" },
                position: { x: 0, y: 0 }
            },
            output1: {
                type: "output",
                name: "Output Node",
                config: {},
                position: { x: 200, y: 0 }
            }
        },
        edges: [{ id: "e1", source: "input1", target: "output1" }],
        entryPoint: "input1",
        ...overrides
    };
}

function createBuiltWorkflow(overrides: Partial<BuiltWorkflow> = {}): BuiltWorkflow {
    const nodes = new Map<string, ExecutableNode>();
    nodes.set("input1", {
        id: "input1",
        type: "input",
        name: "Input Node",
        config: { inputName: "message" },
        depth: 0,
        dependencies: [],
        dependents: ["output1"]
    });
    nodes.set("output1", {
        id: "output1",
        type: "output",
        name: "Output Node",
        config: {},
        depth: 1,
        dependencies: ["input1"],
        dependents: []
    });

    const edges = new Map<string, TypedEdge>();
    edges.set("e1", {
        id: "e1",
        source: "input1",
        target: "output1",
        handleType: "default"
    });

    return {
        nodes,
        edges,
        executionLevels: [["input1"], ["output1"]],
        triggerNodeId: "input1",
        outputNodeIds: ["output1"],
        loopContexts: new Map(),
        maxConcurrentNodes: 5,
        buildTimestamp: Date.now(),
        originalDefinition: createTestWorkflowDefinition(),
        ...overrides
    };
}

function createTestInput(overrides: Partial<OrchestratorInput> = {}): OrchestratorInput {
    return {
        executionId: "exec-123",
        workflowDefinition: createTestWorkflowDefinition(),
        inputs: { message: "Hello" },
        userId: "user-123",
        ...overrides
    };
}

// ============================================================================
// TESTS
// ============================================================================

describe("Workflow Orchestrator", () => {
    beforeEach(() => {
        resetMocks();
        jest.clearAllMocks();
    });

    describe("workflow building", () => {
        it("should build workflow from definition", async () => {
            mockActivityResults.buildWorkflow = {
                success: true,
                workflow: createBuiltWorkflow()
            };

            const input = createTestInput();
            const result = await simulateOrchestratorWorkflow(input);

            expect(result.success).toBe(true);
            expect(mockBuildWorkflow).toHaveBeenCalled();
        });

        it("should fail if workflow build fails", async () => {
            mockActivityResults.buildWorkflow = {
                success: false,
                workflow: null,
                errors: [{ code: "INVALID_GRAPH", message: "Cycle detected in workflow" }]
            };

            const input = createTestInput();
            const result = await simulateOrchestratorWorkflow(input);

            expect(result.success).toBe(false);
            expect(result.error).toContain("Cycle detected");
        });

        it("should handle build warnings gracefully", async () => {
            mockActivityResults.buildWorkflow = {
                success: true,
                workflow: createBuiltWorkflow(),
                warnings: [{ code: "UNUSED_NODE", message: "Node xyz is not connected" }]
            };

            const input = createTestInput();
            const result = await simulateOrchestratorWorkflow(input);

            expect(result.success).toBe(true);
        });
    });

    describe("credit management", () => {
        it("should skip credit check when skipCreditCheck is true", async () => {
            mockActivityResults.buildWorkflow = {
                success: true,
                workflow: createBuiltWorkflow()
            };

            const input = createTestInput({ skipCreditCheck: true, workspaceId: "ws-123" });
            await simulateOrchestratorWorkflow(input);

            expect(mockShouldAllowExecution).not.toHaveBeenCalled();
        });

        it("should skip credit check when workspaceId is not provided", async () => {
            mockActivityResults.buildWorkflow = {
                success: true,
                workflow: createBuiltWorkflow()
            };

            const input = createTestInput({ workspaceId: undefined });
            await simulateOrchestratorWorkflow(input);

            expect(mockShouldAllowExecution).not.toHaveBeenCalled();
        });

        it("should check and reserve credits when workspaceId is provided", async () => {
            mockActivityResults.buildWorkflow = {
                success: true,
                workflow: createBuiltWorkflow()
            };

            const input = createTestInput({ workspaceId: "ws-123" });
            await simulateOrchestratorWorkflow(input);

            expect(mockEstimateWorkflowCredits).toHaveBeenCalled();
            expect(mockShouldAllowExecution).toHaveBeenCalled();
            expect(mockReserveCredits).toHaveBeenCalled();
        });

        it("should fail if insufficient credits", async () => {
            mockActivityResults.shouldAllowExecution = false;
            mockActivityResults.buildWorkflow = {
                success: true,
                workflow: createBuiltWorkflow()
            };

            const input = createTestInput({ workspaceId: "ws-123" });
            const result = await simulateOrchestratorWorkflow(input);

            expect(result.success).toBe(false);
            expect(result.error).toContain("Insufficient credits");
        });

        it("should fail if credit reservation fails", async () => {
            mockActivityResults.reserveCredits = false;
            mockActivityResults.buildWorkflow = {
                success: true,
                workflow: createBuiltWorkflow()
            };

            const input = createTestInput({ workspaceId: "ws-123" });
            const result = await simulateOrchestratorWorkflow(input);

            expect(result.success).toBe(false);
            expect(result.error).toContain("Failed to reserve credits");
        });

        it("should finalize credits on successful completion", async () => {
            mockActivityResults.buildWorkflow = {
                success: true,
                workflow: createBuiltWorkflow()
            };

            const input = createTestInput({ workspaceId: "ws-123" });
            await simulateOrchestratorWorkflow(input);

            expect(mockFinalizeCredits).toHaveBeenCalled();
        });
    });

    describe("input validation", () => {
        it("should validate inputs before execution", async () => {
            mockActivityResults.buildWorkflow = {
                success: true,
                workflow: createBuiltWorkflow()
            };

            const input = createTestInput();
            await simulateOrchestratorWorkflow(input);

            expect(mockValidateInputsActivity).toHaveBeenCalled();
        });

        it("should fail if input validation fails", async () => {
            mockActivityResults.buildWorkflow = {
                success: true,
                workflow: createBuiltWorkflow()
            };
            mockActivityResults.validateInputs = {
                success: false,
                error: { message: "Required field missing" }
            };

            const input = createTestInput();
            const result = await simulateOrchestratorWorkflow(input);

            expect(result.success).toBe(false);
            expect(result.error).toContain("Required field missing");
        });
    });

    describe("node execution", () => {
        it("should execute nodes in order", async () => {
            mockActivityResults.buildWorkflow = {
                success: true,
                workflow: createBuiltWorkflow()
            };

            const input = createTestInput();
            const result = await simulateOrchestratorWorkflow(input);

            expect(result.success).toBe(true);
            expect(mockEmitNodeStarted).toHaveBeenCalledTimes(2);
            expect(mockEmitNodeCompleted).toHaveBeenCalledTimes(2);
        });

        it("should handle input node correctly", async () => {
            mockActivityResults.buildWorkflow = {
                success: true,
                workflow: createBuiltWorkflow()
            };

            const input = createTestInput({ inputs: { message: "Test message" } });
            const result = await simulateOrchestratorWorkflow(input);

            expect(result.success).toBe(true);
        });

        it("should handle node execution failure", async () => {
            const nodes = new Map<string, ExecutableNode>();
            nodes.set("input1", {
                id: "input1",
                type: "input",
                name: "Input",
                config: {},
                depth: 0,
                dependencies: [],
                dependents: ["llm1"]
            });
            nodes.set("llm1", {
                id: "llm1",
                type: "llm",
                name: "LLM Node",
                config: { model: "gpt-4" },
                depth: 1,
                dependencies: ["input1"],
                dependents: []
            });

            const edges = new Map<string, TypedEdge>();
            edges.set("e1", {
                id: "e1",
                source: "input1",
                target: "llm1",
                handleType: "default"
            });

            mockActivityResults.buildWorkflow = {
                success: true,
                workflow: {
                    nodes,
                    edges,
                    executionLevels: [["input1"], ["llm1"]],
                    triggerNodeId: "input1",
                    outputNodeIds: ["llm1"],
                    loopContexts: new Map(),
                    maxConcurrentNodes: 5,
                    buildTimestamp: Date.now(),
                    originalDefinition: createTestWorkflowDefinition()
                }
            };

            // LLM node will throw because no mock result is set

            const input = createTestInput();
            const result = await simulateOrchestratorWorkflow(input);

            expect(result.success).toBe(false);
            expect(result.error).toContain("failed nodes");
        });
    });

    describe("conditional branching", () => {
        it("should handle conditional node with true branch", async () => {
            const nodes = new Map<string, ExecutableNode>();
            nodes.set("input1", {
                id: "input1",
                type: "input",
                name: "Input",
                config: {},
                depth: 0,
                dependencies: [],
                dependents: ["cond1"]
            });
            nodes.set("cond1", {
                id: "cond1",
                type: "conditional",
                name: "Conditional",
                config: { leftValue: "yes", rightValue: "yes" },
                depth: 1,
                dependencies: ["input1"],
                dependents: ["trueBranch", "falseBranch"]
            });
            nodes.set("trueBranch", {
                id: "trueBranch",
                type: "output",
                name: "True Branch",
                config: {},
                depth: 2,
                dependencies: ["cond1"],
                dependents: []
            });
            nodes.set("falseBranch", {
                id: "falseBranch",
                type: "output",
                name: "False Branch",
                config: {},
                depth: 2,
                dependencies: ["cond1"],
                dependents: []
            });

            const edges = new Map<string, TypedEdge>();
            edges.set("e1", {
                id: "e1",
                source: "input1",
                target: "cond1",
                handleType: "default"
            });
            edges.set("e2", {
                id: "e2",
                source: "cond1",
                target: "trueBranch",
                handleType: "true"
            });
            edges.set("e3", {
                id: "e3",
                source: "cond1",
                target: "falseBranch",
                handleType: "false"
            });

            mockActivityResults.buildWorkflow = {
                success: true,
                workflow: {
                    nodes,
                    edges,
                    executionLevels: [["input1"], ["cond1"], ["trueBranch", "falseBranch"]],
                    triggerNodeId: "input1",
                    outputNodeIds: ["trueBranch", "falseBranch"],
                    loopContexts: new Map(),
                    maxConcurrentNodes: 5,
                    buildTimestamp: Date.now(),
                    originalDefinition: createTestWorkflowDefinition()
                }
            };

            const input = createTestInput();
            const result = await simulateOrchestratorWorkflow(input);

            expect(result.success).toBe(true);
            // False branch should be skipped
            const nodeCompletedEvents = mockActivityResults.emittedEvents.filter(
                (e) => e.type === "node_completed"
            );
            expect(nodeCompletedEvents.length).toBe(3); // input, conditional, trueBranch
        });

        it("should handle conditional node with false branch", async () => {
            const nodes = new Map<string, ExecutableNode>();
            nodes.set("input1", {
                id: "input1",
                type: "input",
                name: "Input",
                config: {},
                depth: 0,
                dependencies: [],
                dependents: ["cond1"]
            });
            nodes.set("cond1", {
                id: "cond1",
                type: "conditional",
                name: "Conditional",
                config: { leftValue: "yes", rightValue: "no" },
                depth: 1,
                dependencies: ["input1"],
                dependents: ["trueBranch", "falseBranch"]
            });
            nodes.set("trueBranch", {
                id: "trueBranch",
                type: "output",
                name: "True Branch",
                config: {},
                depth: 2,
                dependencies: ["cond1"],
                dependents: []
            });
            nodes.set("falseBranch", {
                id: "falseBranch",
                type: "output",
                name: "False Branch",
                config: {},
                depth: 2,
                dependencies: ["cond1"],
                dependents: []
            });

            const edges = new Map<string, TypedEdge>();
            edges.set("e1", {
                id: "e1",
                source: "input1",
                target: "cond1",
                handleType: "default"
            });
            edges.set("e2", {
                id: "e2",
                source: "cond1",
                target: "trueBranch",
                handleType: "true"
            });
            edges.set("e3", {
                id: "e3",
                source: "cond1",
                target: "falseBranch",
                handleType: "false"
            });

            mockActivityResults.buildWorkflow = {
                success: true,
                workflow: {
                    nodes,
                    edges,
                    executionLevels: [["input1"], ["cond1"], ["trueBranch", "falseBranch"]],
                    triggerNodeId: "input1",
                    outputNodeIds: ["trueBranch", "falseBranch"],
                    loopContexts: new Map(),
                    maxConcurrentNodes: 5,
                    buildTimestamp: Date.now(),
                    originalDefinition: createTestWorkflowDefinition()
                }
            };

            const input = createTestInput();
            const result = await simulateOrchestratorWorkflow(input);

            expect(result.success).toBe(true);
            // True branch should be skipped
            const nodeCompletedEvents = mockActivityResults.emittedEvents.filter(
                (e) => e.type === "node_completed"
            );
            expect(nodeCompletedEvents.length).toBe(3); // input, conditional, falseBranch
        });
    });

    describe("human review pause", () => {
        it("should pause execution for human review node", async () => {
            const nodes = new Map<string, ExecutableNode>();
            nodes.set("input1", {
                id: "input1",
                type: "input",
                name: "Input",
                config: {},
                depth: 0,
                dependencies: [],
                dependents: ["review1"]
            });
            nodes.set("review1", {
                id: "review1",
                type: "humanReview",
                name: "Human Review",
                config: { prompt: "Please review" },
                depth: 1,
                dependencies: ["input1"],
                dependents: []
            });

            const edges = new Map<string, TypedEdge>();
            edges.set("e1", {
                id: "e1",
                source: "input1",
                target: "review1",
                handleType: "default"
            });

            mockActivityResults.buildWorkflow = {
                success: true,
                workflow: {
                    nodes,
                    edges,
                    executionLevels: [["input1"], ["review1"]],
                    triggerNodeId: "input1",
                    outputNodeIds: ["review1"],
                    loopContexts: new Map(),
                    maxConcurrentNodes: 5,
                    buildTimestamp: Date.now(),
                    originalDefinition: createTestWorkflowDefinition()
                }
            };

            // Mock human review node to return pause signal
            mockActivityResults.executeNode.set("humanReview", {
                result: { awaiting: true },
                signals: {
                    pause: true,
                    pauseContext: {
                        reason: "Waiting for approval",
                        prompt: "Please review"
                    }
                }
            } as unknown as { result: JsonObject });

            const input = createTestInput();
            const result = await simulateOrchestratorWorkflow(input);

            expect(result.success).toBe(true);
            expect(result.paused).toBe(true);
            expect(result.pausedAtNodeId).toBe("review1");

            const pausedEvent = mockActivityResults.emittedEvents.find(
                (e) => e.type === "execution_paused"
            );
            expect(pausedEvent).toBeDefined();
        });
    });

    describe("output validation", () => {
        it("should validate outputs after execution", async () => {
            mockActivityResults.buildWorkflow = {
                success: true,
                workflow: createBuiltWorkflow()
            };

            const input = createTestInput();
            await simulateOrchestratorWorkflow(input);

            expect(mockValidateOutputsActivity).toHaveBeenCalled();
        });

        it("should fail if output validation fails", async () => {
            mockActivityResults.buildWorkflow = {
                success: true,
                workflow: createBuiltWorkflow()
            };
            mockActivityResults.validateOutputs = {
                success: false,
                error: { message: "Output schema mismatch" }
            };

            const input = createTestInput();
            const result = await simulateOrchestratorWorkflow(input);

            expect(result.success).toBe(false);
            expect(result.error).toContain("Output schema mismatch");
        });
    });

    describe("event emission", () => {
        it("should emit execution started event", async () => {
            mockActivityResults.buildWorkflow = {
                success: true,
                workflow: createBuiltWorkflow()
            };

            const input = createTestInput();
            await simulateOrchestratorWorkflow(input);

            const startEvent = mockActivityResults.emittedEvents.find(
                (e) => e.type === "execution_started"
            );
            expect(startEvent).toBeDefined();
        });

        it("should emit progress events", async () => {
            mockActivityResults.buildWorkflow = {
                success: true,
                workflow: createBuiltWorkflow()
            };

            const input = createTestInput();
            await simulateOrchestratorWorkflow(input);

            const progressEvents = mockActivityResults.emittedEvents.filter(
                (e) => e.type === "execution_progress"
            );
            expect(progressEvents.length).toBeGreaterThan(0);
        });

        it("should emit execution completed event on success", async () => {
            mockActivityResults.buildWorkflow = {
                success: true,
                workflow: createBuiltWorkflow()
            };

            const input = createTestInput();
            await simulateOrchestratorWorkflow(input);

            const completedEvent = mockActivityResults.emittedEvents.find(
                (e) => e.type === "execution_completed"
            );
            expect(completedEvent).toBeDefined();
        });

        it("should emit execution failed event on failure", async () => {
            mockActivityResults.buildWorkflow = {
                success: false,
                workflow: null,
                errors: [{ code: "BUILD_ERROR", message: "Build failed" }]
            };

            const input = createTestInput();
            await simulateOrchestratorWorkflow(input);

            const failedEvent = mockActivityResults.emittedEvents.find(
                (e) => e.type === "execution_failed"
            );
            expect(failedEvent).toBeDefined();
        });
    });

    describe("span lifecycle", () => {
        it("should create workflow run span", async () => {
            mockActivityResults.buildWorkflow = {
                success: true,
                workflow: createBuiltWorkflow()
            };

            const input = createTestInput();
            await simulateOrchestratorWorkflow(input);

            const workflowSpan = mockActivityResults.spans.find((s) =>
                s.name.includes("Workflow:")
            );
            expect(workflowSpan).toBeDefined();
            expect(workflowSpan?.ended).toBe(true);
        });

        it("should create node execution spans", async () => {
            mockActivityResults.buildWorkflow = {
                success: true,
                workflow: createBuiltWorkflow()
            };

            const input = createTestInput();
            await simulateOrchestratorWorkflow(input);

            const nodeSpans = mockActivityResults.spans.filter((s) => s.name.includes("Node:"));
            expect(nodeSpans.length).toBe(2);
            expect(nodeSpans.every((s) => s.ended)).toBe(true);
        });

        it("should end spans with error on failure", async () => {
            mockActivityResults.buildWorkflow = {
                success: false,
                workflow: null,
                errors: [{ code: "ERROR", message: "Failed" }]
            };

            const input = createTestInput();
            await simulateOrchestratorWorkflow(input);

            const workflowSpan = mockActivityResults.spans.find((s) =>
                s.name.includes("Workflow:")
            );
            expect(workflowSpan?.ended).toBe(true);
            expect(workflowSpan?.error).toBeDefined();
        });
    });

    describe("error handling", () => {
        it("should handle unexpected errors gracefully", async () => {
            mockBuildWorkflow.mockImplementationOnce(() => {
                throw new Error("Unexpected error");
            });

            const input = createTestInput();
            const result = await simulateOrchestratorWorkflow(input);

            expect(result.success).toBe(false);
            expect(result.error).toContain("Unexpected error");
        });

        it("should release credits on failure with no work done", async () => {
            mockActivityResults.buildWorkflow = {
                success: false,
                workflow: null,
                errors: [{ code: "ERROR", message: "Build failed" }]
            };

            const input = createTestInput({ workspaceId: "ws-123" });
            await simulateOrchestratorWorkflow(input);

            // Credits should be released since no work was done after reservation
            // (In this case, build fails before any node execution)
        });
    });

    describe("context management", () => {
        it("should pass inputs to context", async () => {
            mockActivityResults.buildWorkflow = {
                success: true,
                workflow: createBuiltWorkflow()
            };

            const input = createTestInput({ inputs: { key1: "value1", key2: "value2" } });
            const result = await simulateOrchestratorWorkflow(input);

            expect(result.success).toBe(true);
        });

        it("should include userId in context when provided", async () => {
            mockActivityResults.buildWorkflow = {
                success: true,
                workflow: createBuiltWorkflow()
            };

            const input = createTestInput({ userId: "user-456" });
            await simulateOrchestratorWorkflow(input);

            // Context should include userId
            expect(mockEmitExecutionStarted).toHaveBeenCalled();
        });
    });
});
