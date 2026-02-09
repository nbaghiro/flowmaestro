/**
 * AI Pipeline Integration Tests
 *
 * True integration tests that execute LLM pipeline workflows through
 * the Temporal workflow engine with mocked activities.
 *
 * Tests:
 * - Sequential LLM chains with variable passing
 * - Multi-provider pipelines (OpenAI -> Anthropic)
 * - Parallel LLM execution and merging
 * - Error handling in LLM pipelines
 */

import { TestWorkflowEnvironment } from "@temporalio/testing";
import { Worker } from "@temporalio/worker";
import type { WorkflowDefinition, JsonObject } from "@flowmaestro/shared";

// ============================================================================
// MOCK DEFINITIONS
// ============================================================================

// Mock activity implementations
const mockExecuteNode = jest.fn();
const mockValidateInputsActivity = jest.fn();
const mockValidateOutputsActivity = jest.fn();
const mockCreateSpan = jest.fn();
const mockEndSpan = jest.fn();

// Event emissions
const mockEmitExecutionStarted = jest.fn();
const mockEmitExecutionProgress = jest.fn();
const mockEmitExecutionCompleted = jest.fn();
const mockEmitExecutionFailed = jest.fn();
const mockEmitExecutionPaused = jest.fn();
const mockEmitNodeStarted = jest.fn();
const mockEmitNodeCompleted = jest.fn();
const mockEmitNodeFailed = jest.fn();

// Credit activities
const mockShouldAllowExecution = jest.fn();
const mockReserveCredits = jest.fn();
const mockReleaseCredits = jest.fn();
const mockFinalizeCredits = jest.fn();
const mockEstimateWorkflowCredits = jest.fn();
const mockCalculateLLMCredits = jest.fn();
const mockCalculateNodeCredits = jest.fn();

// Create activities object for worker
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
 * Create a sequential LLM pipeline workflow definition
 * Input -> LLM1 -> LLM2 -> ... -> Output
 */
function createLLMPipelineDefinition(
    llmCount: number,
    providers: string[] = []
): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    // Input node
    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "text" },
        position: { x: 0, y: 0 }
    };

    // LLM nodes
    for (let i = 1; i <= llmCount; i++) {
        const nodeId = `llm${i}`;
        const provider = providers[i - 1] || "openai";
        const prevNode = i === 1 ? "input" : `llm${i - 1}`;

        nodes[nodeId] = {
            type: "llm",
            name: `LLM Step ${i}`,
            config: {
                provider,
                model: provider === "openai" ? "gpt-4" : "claude-3-5-sonnet-20241022",
                prompt: `Process step ${i}: {{${prevNode}.content || ${prevNode}.text}}`,
                step: i
            },
            position: { x: i * 200, y: 0 }
        };

        edges.push({
            id: `${prevNode}-${nodeId}`,
            source: prevNode,
            target: nodeId,
            sourceHandle: "output",
            targetHandle: "input"
        });
    }

    // Output node
    const lastLLM = llmCount > 0 ? `llm${llmCount}` : "input";
    nodes["output"] = {
        type: "output",
        name: "Output",
        config: { outputName: "result" },
        position: { x: (llmCount + 1) * 200, y: 0 }
    };

    edges.push({
        id: `${lastLLM}-output`,
        source: lastLLM,
        target: "output",
        sourceHandle: "output",
        targetHandle: "input"
    });

    return {
        name: `LLM Pipeline (${llmCount} steps)`,
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create a parallel LLM workflow for comparison
 * Input -> [LLM_A, LLM_B, LLM_C] -> Merge -> Output
 */
function createParallelLLMDefinition(
    llmConfigs: Array<{ id: string; provider: string }>
): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];
    const llmIds = llmConfigs.map((c) => c.id);

    // Input node
    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "text" },
        position: { x: 0, y: 100 }
    };

    // Parallel LLM nodes
    llmConfigs.forEach((config, index) => {
        nodes[config.id] = {
            type: "llm",
            name: `LLM ${config.provider}`,
            config: {
                provider: config.provider,
                model: config.provider === "openai" ? "gpt-4" : "claude-3-5-sonnet-20241022",
                prompt: "Analyze: {{input.text}}"
            },
            position: { x: 200, y: index * 100 }
        };

        edges.push({
            id: `input-${config.id}`,
            source: "input",
            target: config.id,
            sourceHandle: "output",
            targetHandle: "input"
        });
    });

    // Merge node (transform)
    nodes["merge"] = {
        type: "transform",
        name: "Merge Results",
        config: {
            operation: "merge",
            sources: llmIds
        },
        position: { x: 400, y: 100 }
    };

    for (const llmId of llmIds) {
        edges.push({
            id: `${llmId}-merge`,
            source: llmId,
            target: "merge",
            sourceHandle: "output",
            targetHandle: "input"
        });
    }

    // Output node
    nodes["output"] = {
        type: "output",
        name: "Output",
        config: { outputName: "result" },
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
        name: "Parallel LLM Pipeline",
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

    // Validation activities - pass by default
    mockValidateInputsActivity.mockResolvedValue({ success: true });
    mockValidateOutputsActivity.mockResolvedValue({ success: true });

    // Span tracking
    let spanCounter = 0;
    mockCreateSpan.mockImplementation(() => {
        return Promise.resolve({ spanId: `span-${++spanCounter}`, traceId: "trace-123" });
    });
    mockEndSpan.mockResolvedValue(undefined);

    // Event emissions - no-op
    mockEmitExecutionStarted.mockResolvedValue(undefined);
    mockEmitExecutionProgress.mockResolvedValue(undefined);
    mockEmitExecutionCompleted.mockResolvedValue(undefined);
    mockEmitExecutionFailed.mockResolvedValue(undefined);
    mockEmitExecutionPaused.mockResolvedValue(undefined);
    mockEmitNodeStarted.mockResolvedValue(undefined);
    mockEmitNodeCompleted.mockResolvedValue(undefined);
    mockEmitNodeFailed.mockResolvedValue(undefined);

    // Credit activities - allow by default
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
 * Configure mock node outputs based on node ID patterns
 */
function configureMockNodeOutputs(outputs: Record<string, JsonObject>): void {
    mockExecuteNode.mockImplementation(async (params: ExecuteNodeParams) => {
        const nodeId = params.executionContext.nodeId;
        const output = outputs[nodeId] || { result: `output-${nodeId}` };

        return {
            result: output,
            signals: {},
            metrics: {
                durationMs: 100,
                tokenUsage:
                    params.nodeType === "llm"
                        ? { promptTokens: 100, completionTokens: 50, totalTokens: 150 }
                        : undefined
            },
            success: true,
            output
        };
    });
}

// ============================================================================
// TESTS
// ============================================================================

describe("AI Pipeline Integration Tests", () => {
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

    describe("sequential LLM chain", () => {
        it("should execute two-step LLM chain with variable passing", async () => {
            const workflowDef = createLLMPipelineDefinition(2, ["openai", "openai"]);

            configureMockNodeOutputs({
                input: { text: "Original article content here..." },
                llm1: { content: "Summarized content", tokens: 50 },
                llm2: { content: "Refined and polished summary", tokens: 75 },
                output: { result: "Refined and polished summary" }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-llm-chain-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-llm-chain",
                            workflowDefinition: workflowDef,
                            inputs: { text: "Original article content here..." },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
            expect(result.outputs).toBeDefined();

            // Verify node execution order through mock calls
            const executeCalls = mockExecuteNode.mock.calls;
            const nodeIds = executeCalls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );

            // LLM nodes should be executed
            expect(nodeIds).toContain("llm1");
            expect(nodeIds).toContain("llm2");
        });

        it("should execute three-step summarize-refine-format pipeline", async () => {
            const workflowDef = createLLMPipelineDefinition(3, ["openai", "openai", "openai"]);

            configureMockNodeOutputs({
                input: { text: "Long document with lots of details..." },
                llm1: { content: "Summary of document", step: "summarize" },
                llm2: { content: "Refined summary with better flow", step: "refine" },
                llm3: { content: "# Final Report\n\nRefined summary...", step: "format" },
                output: { result: "# Final Report\n\nRefined summary..." }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-three-step-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-three-step",
                            workflowDefinition: workflowDef,
                            inputs: { text: "Long document with lots of details..." },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            // Verify all three LLM nodes were executed
            const llmCalls = mockExecuteNode.mock.calls.filter(
                (call) => (call[0] as ExecuteNodeParams).nodeType === "llm"
            );
            expect(llmCalls.length).toBe(3);
        });
    });

    describe("multi-provider pipelines", () => {
        it("should execute OpenAI -> Anthropic pipeline", async () => {
            const workflowDef = createLLMPipelineDefinition(2, ["openai", "anthropic"]);

            configureMockNodeOutputs({
                input: { text: "Compare these two approaches..." },
                llm1: { content: "OpenAI analysis", provider: "openai" },
                llm2: { content: "Anthropic refined analysis", provider: "anthropic" },
                output: { result: "Anthropic refined analysis" }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-multi-provider-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-multi-provider",
                            workflowDefinition: workflowDef,
                            inputs: { text: "Compare these two approaches..." },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            // Verify provider configs were passed correctly
            const llmCalls = mockExecuteNode.mock.calls.filter(
                (call) => (call[0] as ExecuteNodeParams).nodeType === "llm"
            );
            expect(llmCalls.length).toBe(2);

            const providers = llmCalls.map(
                (call) => (call[0] as ExecuteNodeParams).nodeConfig?.provider
            );
            expect(providers).toContain("openai");
            expect(providers).toContain("anthropic");
        });
    });

    describe("parallel LLM comparison", () => {
        it("should execute multiple LLMs in parallel for comparison", async () => {
            const workflowDef = createParallelLLMDefinition([
                { id: "llm_openai", provider: "openai" },
                { id: "llm_anthropic", provider: "anthropic" }
            ]);

            configureMockNodeOutputs({
                input: { text: "Analyze this topic" },
                llm_openai: { content: "OpenAI perspective", confidence: 0.9 },
                llm_anthropic: { content: "Anthropic perspective", confidence: 0.85 },
                merge: {
                    openai: { content: "OpenAI perspective", confidence: 0.9 },
                    anthropic: { content: "Anthropic perspective", confidence: 0.85 }
                },
                output: { result: "merged" }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-parallel-llm-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-parallel-llm",
                            workflowDefinition: workflowDef,
                            inputs: { text: "Analyze this topic" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            // Both LLM nodes should have been executed
            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("llm_openai");
            expect(nodeIds).toContain("llm_anthropic");
        });
    });

    describe("error handling in LLM pipelines", () => {
        it("should handle LLM failure in middle of chain", async () => {
            const workflowDef = createLLMPipelineDefinition(3, ["openai", "openai", "openai"]);

            // Make llm2 fail
            mockExecuteNode.mockImplementation(async (params: ExecuteNodeParams) => {
                const nodeId = params.executionContext.nodeId;

                if (nodeId === "llm2") {
                    throw new Error("API rate limit exceeded");
                }

                return {
                    result: { content: `output-${nodeId}` },
                    signals: {},
                    metrics: {},
                    success: true,
                    output: { content: `output-${nodeId}` }
                };
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-llm-failure-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-llm-failure",
                            workflowDefinition: workflowDef,
                            inputs: { text: "Test input" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(false);
            expect(result.error).toContain("failed");
            expect(mockEmitExecutionFailed).toHaveBeenCalled();
        });

        it("should emit node failed event on error", async () => {
            const workflowDef = createLLMPipelineDefinition(1, ["openai"]);

            mockExecuteNode.mockRejectedValue(new Error("LLM API error"));

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-node-failed-event-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-node-failed",
                            workflowDefinition: workflowDef,
                            inputs: { text: "Test" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(false);
            expect(mockEmitNodeFailed).toHaveBeenCalled();
        });
    });

    describe("credit management", () => {
        it("should check and reserve credits before execution", async () => {
            const workflowDef = createLLMPipelineDefinition(1, ["openai"]);

            configureMockNodeOutputs({
                input: { text: "Test" },
                llm1: { content: "Response" },
                output: { result: "Response" }
            });

            await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-credits-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-credits",
                            workflowDefinition: workflowDef,
                            inputs: { text: "Test" },
                            workspaceId: "ws-123"
                            // Note: NOT skipping credit check
                        }
                    ]
                })
            );

            expect(mockShouldAllowExecution).toHaveBeenCalledWith(
                expect.objectContaining({ workspaceId: "ws-123" })
            );
            expect(mockReserveCredits).toHaveBeenCalled();
            expect(mockFinalizeCredits).toHaveBeenCalled();
        });

        it("should fail if insufficient credits", async () => {
            mockShouldAllowExecution.mockResolvedValue(false);

            const workflowDef = createLLMPipelineDefinition(1, ["openai"]);

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-no-credits-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-no-credits",
                            workflowDefinition: workflowDef,
                            inputs: { text: "Test" },
                            workspaceId: "ws-123"
                        }
                    ]
                })
            );

            expect(result.success).toBe(false);
            expect(result.error).toContain("Insufficient credits");
        });
    });

    describe("workflow validation", () => {
        it("should fail if input validation fails", async () => {
            mockValidateInputsActivity.mockResolvedValue({
                success: false,
                error: { message: "Missing required input: text" }
            });

            const workflowDef = createLLMPipelineDefinition(1, ["openai"]);

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-validation-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-validation",
                            workflowDefinition: workflowDef,
                            inputs: {},
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(false);
            expect(result.error).toContain("validation failed");
        });
    });

    describe("span and event tracking", () => {
        it("should create workflow and node spans", async () => {
            const workflowDef = createLLMPipelineDefinition(1, ["openai"]);

            configureMockNodeOutputs({
                input: { text: "Test" },
                llm1: { content: "Response" },
                output: { result: "Response" }
            });

            await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-spans-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-spans",
                            workflowDefinition: workflowDef,
                            inputs: { text: "Test" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            // Should create workflow-level span
            expect(mockCreateSpan).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: expect.stringContaining("Workflow:"),
                    spanType: expect.any(String)
                })
            );

            // Should end all spans
            expect(mockEndSpan).toHaveBeenCalled();
        });

        it("should emit execution progress events", async () => {
            const workflowDef = createLLMPipelineDefinition(2, ["openai", "openai"]);

            configureMockNodeOutputs({
                input: { text: "Test" },
                llm1: { content: "Step 1" },
                llm2: { content: "Step 2" },
                output: { result: "Done" }
            });

            await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-progress-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-progress",
                            workflowDefinition: workflowDef,
                            inputs: { text: "Test" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(mockEmitExecutionStarted).toHaveBeenCalled();
            expect(mockEmitExecutionProgress).toHaveBeenCalled();
            expect(mockEmitExecutionCompleted).toHaveBeenCalled();
        });
    });
});
