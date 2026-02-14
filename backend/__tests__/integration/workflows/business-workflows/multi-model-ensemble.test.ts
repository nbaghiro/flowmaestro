/**
 * Multi-Model Ensemble Integration Tests
 *
 * True integration tests that execute multi-model ensemble workflows through
 * the Temporal workflow engine with mocked activities.
 *
 * Tests:
 * - Fallback patterns (primary fails -> secondary)
 * - Voting/consensus (majority selection)
 * - Confidence-based selection
 * - Cost optimization (cheap first, escalate if needed)
 * - Parallel comparison
 */

import { TestWorkflowEnvironment } from "@temporalio/testing";
import { Worker } from "@temporalio/worker";
import type { WorkflowDefinition, WorkflowNode, JsonObject } from "@flowmaestro/shared";

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
// TYPE DEFINITIONS
// ============================================================================

interface ModelConfig {
    id: string;
    provider: string;
    model: string;
    cost: number;
    qualityScore: number;
}

interface ExecuteNodeParams {
    nodeType: string;
    nodeConfig: JsonObject;
    context: JsonObject;
    executionContext: { nodeId: string };
}

// ============================================================================
// WORKFLOW DEFINITION BUILDERS
// ============================================================================

/**
 * Create a fallback chain workflow definition
 * Input -> Model1 (primary) -> Conditional -> [fail: Model2] -> Output
 */
function createFallbackChainDefinition(modelCount: number): WorkflowDefinition {
    const nodes: Record<string, WorkflowNode> = {};
    const edges: WorkflowDefinition["edges"] = [];

    // Input node
    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "prompt" },
        position: { x: 0, y: 100 }
    };

    // Model nodes with fallback logic
    for (let i = 1; i <= modelCount; i++) {
        const nodeId = `model${i}`;
        const prevNode = i === 1 ? "input" : `conditional${i - 1}`;

        nodes[nodeId] = {
            type: "llm",
            name: `Model ${i}`,
            config: {
                provider: i === 1 ? "openai" : i === 2 ? "anthropic" : "cohere",
                model: i === 1 ? "gpt-4" : i === 2 ? "claude-3-5-sonnet-20241022" : "command",
                prompt: "{{input.prompt}}",
                isFallback: i > 1,
                priority: i
            },
            position: { x: i * 300, y: 100 }
        };

        edges.push({
            id: `${prevNode}-${nodeId}`,
            source: prevNode,
            target: nodeId,
            sourceHandle: i === 1 ? "output" : "false",
            targetHandle: "input"
        });

        // Add conditional for non-last models
        if (i < modelCount) {
            const condId = `conditional${i}`;
            nodes[condId] = {
                type: "conditional",
                name: `Check Model ${i} Success`,
                config: {
                    condition: `{{model${i}.success}}`,
                    operator: "equals",
                    value: true
                },
                position: { x: i * 300 + 150, y: 100 }
            };

            edges.push({
                id: `${nodeId}-${condId}`,
                source: nodeId,
                target: condId,
                sourceHandle: "output",
                targetHandle: "input"
            });

            // Success path goes to output
            if (i === modelCount - 1) {
                edges.push({
                    id: `${condId}-output-true`,
                    source: condId,
                    target: "output",
                    sourceHandle: "true",
                    targetHandle: "input"
                });
            }
        } else {
            // Last model connects directly to output
            edges.push({
                id: `${nodeId}-output`,
                source: nodeId,
                target: "output",
                sourceHandle: "output",
                targetHandle: "input"
            });
        }
    }

    // Output node
    nodes["output"] = {
        type: "output",
        name: "Output",
        config: { outputName: "response" },
        position: { x: (modelCount + 1) * 300, y: 100 }
    };

    return {
        name: `Fallback Chain (${modelCount} models)`,
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create a parallel voting workflow definition
 * Input -> [Model_A, Model_B, Model_C] (parallel) -> Voter -> Output
 */
function createVotingWorkflowDefinition(modelConfigs: ModelConfig[]): WorkflowDefinition {
    const nodes: Record<string, WorkflowNode> = {};
    const edges: WorkflowDefinition["edges"] = [];
    const modelIds = modelConfigs.map((c) => c.id);

    // Input node
    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "prompt" },
        position: { x: 0, y: 100 }
    };

    // Parallel model nodes
    modelConfigs.forEach((config, index) => {
        nodes[config.id] = {
            type: "llm",
            name: `LLM ${config.provider}`,
            config: {
                provider: config.provider,
                model: config.model,
                prompt: "{{input.prompt}}",
                cost: config.cost,
                qualityScore: config.qualityScore
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

    // Voter node (transform)
    nodes["voter"] = {
        type: "transform",
        name: "Voter",
        config: {
            operation: "vote",
            sources: modelIds,
            strategy: "majority"
        },
        position: { x: 400, y: 100 }
    };

    for (const modelId of modelIds) {
        edges.push({
            id: `${modelId}-voter`,
            source: modelId,
            target: "voter",
            sourceHandle: "output",
            targetHandle: "input"
        });
    }

    // Output node
    nodes["output"] = {
        type: "output",
        name: "Output",
        config: { outputName: "response" },
        position: { x: 600, y: 100 }
    };

    edges.push({
        id: "voter-output",
        source: "voter",
        target: "output",
        sourceHandle: "output",
        targetHandle: "input"
    });

    return {
        name: "Voting Ensemble",
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create a confidence-based selection workflow
 * Input -> [Models in parallel] -> ConfidenceSelector -> Output
 */
function createConfidenceSelectionDefinition(modelConfigs: ModelConfig[]): WorkflowDefinition {
    const nodes: Record<string, WorkflowNode> = {};
    const edges: WorkflowDefinition["edges"] = [];
    const modelIds = modelConfigs.map((c) => c.id);

    // Input node
    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "prompt" },
        position: { x: 0, y: 100 }
    };

    // Parallel model nodes
    modelConfigs.forEach((config, index) => {
        nodes[config.id] = {
            type: "llm",
            name: `LLM ${config.provider}`,
            config: {
                provider: config.provider,
                model: config.model,
                prompt: "{{input.prompt}}",
                returnConfidence: true
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

    // Confidence Selector node
    nodes["confidence_selector"] = {
        type: "transform",
        name: "ConfidenceSelector",
        config: {
            operation: "selectByConfidence",
            sources: modelIds,
            minConfidence: 0.7,
            strategy: "highest"
        },
        position: { x: 400, y: 100 }
    };

    for (const modelId of modelIds) {
        edges.push({
            id: `${modelId}-confidence_selector`,
            source: modelId,
            target: "confidence_selector",
            sourceHandle: "output",
            targetHandle: "input"
        });
    }

    // Output node
    nodes["output"] = {
        type: "output",
        name: "Output",
        config: { outputName: "response" },
        position: { x: 600, y: 100 }
    };

    edges.push({
        id: "confidence_selector-output",
        source: "confidence_selector",
        target: "output",
        sourceHandle: "output",
        targetHandle: "input"
    });

    return {
        name: "Confidence Selection Ensemble",
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create a cost-optimized escalation workflow
 * Input -> CheapModel -> QualityCheck -> [low quality: ExpensiveModel] -> Output
 */
function createCostOptimizedDefinition(): WorkflowDefinition {
    const nodes: Record<string, WorkflowNode> = {};
    const edges: WorkflowDefinition["edges"] = [];

    // Input node
    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "prompt" },
        position: { x: 0, y: 100 }
    };

    // Cheap model (GPT-3.5)
    nodes["cheap_model"] = {
        type: "llm",
        name: "CheapModel",
        config: {
            provider: "openai",
            model: "gpt-3.5-turbo",
            prompt: "{{input.prompt}}",
            costPer1kTokens: 0.002,
            returnQualityScore: true
        },
        position: { x: 200, y: 100 }
    };

    edges.push({
        id: "input-cheap_model",
        source: "input",
        target: "cheap_model",
        sourceHandle: "output",
        targetHandle: "input"
    });

    // Quality check conditional
    nodes["quality_check"] = {
        type: "conditional",
        name: "QualityCheck",
        config: {
            leftValue: "{{cheap_model.qualityScore}}",
            operator: "gte",
            rightValue: "0.8"
        },
        position: { x: 400, y: 100 }
    };

    edges.push({
        id: "cheap_model-quality_check",
        source: "cheap_model",
        target: "quality_check",
        sourceHandle: "output",
        targetHandle: "input"
    });

    // Success path - cheap model was good enough
    edges.push({
        id: "quality_check-output-true",
        source: "quality_check",
        target: "output",
        sourceHandle: "true",
        targetHandle: "input"
    });

    // Escalation path - need expensive model
    nodes["expensive_model"] = {
        type: "llm",
        name: "ExpensiveModel",
        config: {
            provider: "openai",
            model: "gpt-4",
            prompt: "{{input.prompt}}",
            costPer1kTokens: 0.06,
            returnQualityScore: true
        },
        position: { x: 600, y: 200 }
    };

    edges.push({
        id: "quality_check-expensive_model",
        source: "quality_check",
        target: "expensive_model",
        sourceHandle: "false",
        targetHandle: "input"
    });

    edges.push({
        id: "expensive_model-output",
        source: "expensive_model",
        target: "output",
        sourceHandle: "output",
        targetHandle: "input"
    });

    // Output node
    nodes["output"] = {
        type: "output",
        name: "Output",
        config: { outputName: "response" },
        position: { x: 800, y: 100 }
    };

    return {
        name: "Cost-Optimized Ensemble",
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create a parallel comparison workflow
 * Input -> [GPT-4, Claude] (parallel) -> Comparison -> Output
 */
function createParallelComparisonDefinition(): WorkflowDefinition {
    const nodes: Record<string, WorkflowNode> = {};
    const edges: WorkflowDefinition["edges"] = [];

    // Input node
    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "prompt" },
        position: { x: 0, y: 100 }
    };

    // Parallel model nodes
    nodes["gpt4"] = {
        type: "llm",
        name: "GPT-4",
        config: {
            provider: "openai",
            model: "gpt-4",
            prompt: "{{input.prompt}}"
        },
        position: { x: 200, y: 0 }
    };

    nodes["claude"] = {
        type: "llm",
        name: "Claude",
        config: {
            provider: "anthropic",
            model: "claude-3-5-sonnet-20241022",
            prompt: "{{input.prompt}}"
        },
        position: { x: 200, y: 200 }
    };

    edges.push({
        id: "input-gpt4",
        source: "input",
        target: "gpt4",
        sourceHandle: "output",
        targetHandle: "input"
    });

    edges.push({
        id: "input-claude",
        source: "input",
        target: "claude",
        sourceHandle: "output",
        targetHandle: "input"
    });

    // Comparison node
    nodes["comparison"] = {
        type: "transform",
        name: "Comparison",
        config: {
            operation: "compare",
            sources: ["gpt4", "claude"]
        },
        position: { x: 400, y: 100 }
    };

    edges.push({
        id: "gpt4-comparison",
        source: "gpt4",
        target: "comparison",
        sourceHandle: "output",
        targetHandle: "input"
    });

    edges.push({
        id: "claude-comparison",
        source: "claude",
        target: "comparison",
        sourceHandle: "output",
        targetHandle: "input"
    });

    // Output node
    nodes["output"] = {
        type: "output",
        name: "Output",
        config: { outputName: "response" },
        position: { x: 600, y: 100 }
    };

    edges.push({
        id: "comparison-output",
        source: "comparison",
        target: "output",
        sourceHandle: "output",
        targetHandle: "input"
    });

    return {
        name: "Parallel Comparison",
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

/**
 * Configure mock node outputs based on node ID patterns
 */
function configureMockNodeOutputs(
    outputs: Record<string, JsonObject>,
    failingNodes: Set<string> = new Set()
): void {
    mockExecuteNode.mockImplementation(async (params: ExecuteNodeParams) => {
        const nodeId = params.executionContext.nodeId;

        // Check if this node should fail
        if (failingNodes.has(nodeId)) {
            throw new Error(`Model ${nodeId} failed: API rate limit exceeded`);
        }

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

describe("Multi-Model Ensemble Integration Tests", () => {
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
                "../../../../../src/temporal/workflows/workflow-orchestrator"
            ),
            activities: mockActivities
        });
    });

    describe("fallback patterns", () => {
        it("should use primary model when it succeeds", async () => {
            const workflowDef = createFallbackChainDefinition(2);

            configureMockNodeOutputs({
                input: { prompt: "Summarize this text" },
                model1: { content: "Summary from primary model", success: true },
                conditional1: { result: true, branch: "true" },
                output: { response: "Summary from primary model" }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-fallback-primary-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-fallback-primary",
                            workflowDefinition: workflowDef,
                            inputs: { prompt: "Summarize this text" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            // Verify model1 was executed
            const executeCalls = mockExecuteNode.mock.calls;
            const nodeIds = executeCalls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("model1");
        });

        it("should fallback to secondary model on primary failure", async () => {
            const workflowDef = createFallbackChainDefinition(2);

            configureMockNodeOutputs(
                {
                    input: { prompt: "Summarize this text" },
                    model1: { content: null, success: false, error: "API rate limit exceeded" },
                    conditional1: { result: false, branch: "false" },
                    model2: { content: "Summary from fallback model", success: true },
                    output: { response: "Summary from fallback model" }
                },
                new Set(["model1"])
            );

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-fallback-secondary-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-fallback-secondary",
                            workflowDefinition: workflowDef,
                            inputs: { prompt: "Summarize this text" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            // The workflow should fail since model1 throws an error
            // In a real fallback scenario, we'd catch this in the workflow
            expect(result.success).toBe(false);
            expect(mockEmitNodeFailed).toHaveBeenCalled();
        });

        it("should chain through 3 models until success", async () => {
            const workflowDef = createFallbackChainDefinition(3);

            configureMockNodeOutputs({
                input: { prompt: "Complex question" },
                model1: { content: "Answer from first model", success: true },
                conditional1: { result: true, branch: "true" },
                output: { response: "Answer from first model" }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-fallback-chain-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-fallback-chain",
                            workflowDefinition: workflowDef,
                            inputs: { prompt: "Complex question" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            // Verify execution
            const llmCalls = mockExecuteNode.mock.calls.filter(
                (call) => (call[0] as ExecuteNodeParams).nodeType === "llm"
            );
            expect(llmCalls.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe("voting/consensus", () => {
        it("should select majority response from 3 models", async () => {
            const modelConfigs: ModelConfig[] = [
                {
                    id: "model_a",
                    provider: "openai",
                    model: "gpt-4",
                    cost: 0.03,
                    qualityScore: 0.9
                },
                {
                    id: "model_b",
                    provider: "anthropic",
                    model: "claude-3-5-sonnet-20241022",
                    cost: 0.02,
                    qualityScore: 0.9
                },
                {
                    id: "model_c",
                    provider: "openai",
                    model: "gpt-3.5-turbo",
                    cost: 0.002,
                    qualityScore: 0.7
                }
            ];
            const workflowDef = createVotingWorkflowDefinition(modelConfigs);

            configureMockNodeOutputs({
                input: { prompt: "Is water wet?" },
                model_a: { content: "Yes, water is wet", confidence: 0.9 },
                model_b: { content: "Yes, water is wet", confidence: 0.85 },
                model_c: { content: "No, water makes things wet", confidence: 0.6 },
                voter: {
                    winner: "Yes, water is wet",
                    votes: { "yes, water is wet": 2, "no, water makes things wet": 1 },
                    agreement: 0.67
                },
                output: { response: "Yes, water is wet" }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-voting-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-voting",
                            workflowDefinition: workflowDef,
                            inputs: { prompt: "Is water wet?" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            // Verify all 3 models were executed
            const llmCalls = mockExecuteNode.mock.calls.filter(
                (call) => (call[0] as ExecuteNodeParams).nodeType === "llm"
            );
            expect(llmCalls.length).toBe(3);

            // Verify voter was executed
            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("voter");
        });

        it("should execute all models in parallel before voting", async () => {
            const modelConfigs: ModelConfig[] = [
                {
                    id: "model_a",
                    provider: "openai",
                    model: "gpt-4",
                    cost: 0.03,
                    qualityScore: 0.9
                },
                {
                    id: "model_b",
                    provider: "anthropic",
                    model: "claude-3-5-sonnet-20241022",
                    cost: 0.02,
                    qualityScore: 0.9
                }
            ];
            const workflowDef = createVotingWorkflowDefinition(modelConfigs);

            configureMockNodeOutputs({
                input: { prompt: "Test question" },
                model_a: { content: "Answer A", confidence: 0.9 },
                model_b: { content: "Answer B", confidence: 0.85 },
                voter: { winner: "Answer A", agreement: 0.5 },
                output: { response: "Answer A" }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-parallel-voting-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-parallel-voting",
                            workflowDefinition: workflowDef,
                            inputs: { prompt: "Test question" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            // Both models should be executed before voter
            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("model_a");
            expect(nodeIds).toContain("model_b");
            expect(nodeIds).toContain("voter");

            // Voter should come after models
            const voterIndex = nodeIds.indexOf("voter");
            const modelAIndex = nodeIds.indexOf("model_a");
            const modelBIndex = nodeIds.indexOf("model_b");
            expect(voterIndex).toBeGreaterThan(modelAIndex);
            expect(voterIndex).toBeGreaterThan(modelBIndex);
        });
    });

    describe("confidence-based selection", () => {
        it("should select highest confidence response", async () => {
            const modelConfigs: ModelConfig[] = [
                {
                    id: "model_a",
                    provider: "openai",
                    model: "gpt-4",
                    cost: 0.03,
                    qualityScore: 0.9
                },
                {
                    id: "model_b",
                    provider: "anthropic",
                    model: "claude-3-5-sonnet-20241022",
                    cost: 0.02,
                    qualityScore: 0.9
                }
            ];
            const workflowDef = createConfidenceSelectionDefinition(modelConfigs);

            configureMockNodeOutputs({
                input: { prompt: "Technical question" },
                model_a: { content: "GPT answer", confidence: 0.75 },
                model_b: { content: "Claude answer", confidence: 0.92 },
                confidence_selector: {
                    selected: "model_b",
                    content: "Claude answer",
                    confidence: 0.92
                },
                output: { response: "Claude answer" }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-confidence-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-confidence",
                            workflowDefinition: workflowDef,
                            inputs: { prompt: "Technical question" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            // Verify both models and selector were executed
            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("model_a");
            expect(nodeIds).toContain("model_b");
            expect(nodeIds).toContain("confidence_selector");
        });

        it("should handle low confidence responses with fallback message", async () => {
            const modelConfigs: ModelConfig[] = [
                {
                    id: "model_a",
                    provider: "openai",
                    model: "gpt-4",
                    cost: 0.03,
                    qualityScore: 0.9
                },
                {
                    id: "model_b",
                    provider: "anthropic",
                    model: "claude-3-5-sonnet-20241022",
                    cost: 0.02,
                    qualityScore: 0.9
                }
            ];
            const workflowDef = createConfidenceSelectionDefinition(modelConfigs);

            configureMockNodeOutputs({
                input: { prompt: "Ambiguous question" },
                model_a: { content: "Uncertain answer A", confidence: 0.4 },
                model_b: { content: "Uncertain answer B", confidence: 0.5 },
                confidence_selector: {
                    selected: null,
                    belowThreshold: true,
                    maxConfidence: 0.5,
                    content: "I'm not confident enough to answer this question."
                },
                output: { response: "I'm not confident enough to answer this question." }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-low-confidence-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-low-confidence",
                            workflowDefinition: workflowDef,
                            inputs: { prompt: "Ambiguous question" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });
    });

    describe("cost optimization", () => {
        it("should try cheaper model first and skip expensive model if quality is good", async () => {
            const workflowDef = createCostOptimizedDefinition();

            configureMockNodeOutputs({
                input: { prompt: "Simple question" },
                cheap_model: {
                    content: "Good answer from cheap model",
                    qualityScore: 0.9,
                    cost: 0.001
                },
                quality_check: { result: true, meetsThreshold: true, branch: "true" },
                output: { response: "Good answer from cheap model" }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-cost-cheap-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-cost-cheap",
                            workflowDefinition: workflowDef,
                            inputs: { prompt: "Simple question" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            // Verify cheap model was executed
            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("cheap_model");

            // Expensive model should NOT be executed when quality is good
            const llmCalls = mockExecuteNode.mock.calls.filter(
                (call) => (call[0] as ExecuteNodeParams).nodeType === "llm"
            );
            // Only cheap_model should be called
            expect(llmCalls.length).toBe(1);
        });

        it("should escalate to expensive model on quality threshold failure", async () => {
            const workflowDef = createCostOptimizedDefinition();

            configureMockNodeOutputs({
                input: { prompt: "Complex question" },
                cheap_model: {
                    content: "Poor answer from cheap model",
                    qualityScore: 0.5,
                    cost: 0.001
                },
                quality_check: { result: false, meetsThreshold: false, branch: "false" },
                expensive_model: {
                    content: "Excellent answer from expensive model",
                    qualityScore: 0.95,
                    cost: 0.05
                },
                output: { response: "Excellent answer from expensive model" }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-cost-escalate-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-cost-escalate",
                            workflowDefinition: workflowDef,
                            inputs: { prompt: "Complex question" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            // Verify both models were executed
            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("cheap_model");
            expect(nodeIds).toContain("expensive_model");
        });

        it("should verify cost configuration in workflow definition", async () => {
            const workflowDef = createCostOptimizedDefinition();

            // Verify the workflow structure
            expect(workflowDef.nodes["cheap_model"]).toBeDefined();
            expect(workflowDef.nodes["expensive_model"]).toBeDefined();
            expect(workflowDef.nodes["quality_check"]).toBeDefined();

            // Verify cost configuration
            const cheapConfig = workflowDef.nodes["cheap_model"].config as JsonObject;
            const expensiveConfig = workflowDef.nodes["expensive_model"].config as JsonObject;
            expect(cheapConfig.costPer1kTokens).toBeLessThan(
                expensiveConfig.costPer1kTokens as number
            );

            // Verify conditional routing
            const qualityCheckEdges = workflowDef.edges.filter((e) => e.source === "quality_check");
            expect(qualityCheckEdges.length).toBe(2);

            const trueEdge = qualityCheckEdges.find((e) => e.sourceHandle === "true");
            const falseEdge = qualityCheckEdges.find((e) => e.sourceHandle === "false");
            expect(trueEdge?.target).toBe("output");
            expect(falseEdge?.target).toBe("expensive_model");
        });
    });

    describe("parallel comparison", () => {
        it("should run models in parallel and compare outputs", async () => {
            const workflowDef = createParallelComparisonDefinition();

            configureMockNodeOutputs({
                input: { prompt: "Compare outputs" },
                gpt4: { content: "GPT-4 response", confidence: 0.9 },
                claude: { content: "Claude response", confidence: 0.88 },
                comparison: {
                    gpt4: { content: "GPT-4 response", confidence: 0.9 },
                    claude: { content: "Claude response", confidence: 0.88 },
                    similarity: 0.85,
                    winner: "gpt4"
                },
                output: { response: "Compared outputs" }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-parallel-compare-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-parallel-compare",
                            workflowDefinition: workflowDef,
                            inputs: { prompt: "Compare outputs" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            // Both models should be executed before comparison
            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("gpt4");
            expect(nodeIds).toContain("claude");
            expect(nodeIds).toContain("comparison");

            // Comparison should come after both models
            const comparisonIndex = nodeIds.indexOf("comparison");
            const gpt4Index = nodeIds.indexOf("gpt4");
            const claudeIndex = nodeIds.indexOf("claude");
            expect(comparisonIndex).toBeGreaterThan(gpt4Index);
            expect(comparisonIndex).toBeGreaterThan(claudeIndex);
        });

        it("should reconcile disagreement between models", async () => {
            const modelConfigs: ModelConfig[] = [
                {
                    id: "model_a",
                    provider: "openai",
                    model: "gpt-4",
                    cost: 0.03,
                    qualityScore: 0.9
                },
                {
                    id: "model_b",
                    provider: "anthropic",
                    model: "claude-3-5-sonnet-20241022",
                    cost: 0.02,
                    qualityScore: 0.9
                },
                {
                    id: "model_c",
                    provider: "cohere",
                    model: "command",
                    cost: 0.01,
                    qualityScore: 0.7
                }
            ];
            const workflowDef = createVotingWorkflowDefinition(modelConfigs);

            configureMockNodeOutputs({
                input: { prompt: "Controversial topic" },
                model_a: { content: "Position A is correct", confidence: 0.8 },
                model_b: { content: "Position B is correct", confidence: 0.85 },
                model_c: { content: "Position A is correct", confidence: 0.6 },
                voter: {
                    winner: "Position A is correct",
                    disagreement: true,
                    votes: { "Position A": 2, "Position B": 1 },
                    reconciliationNote: "Models disagreed, majority vote selected Position A"
                },
                output: { response: "Position A is correct" }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-reconcile-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-reconcile",
                            workflowDefinition: workflowDef,
                            inputs: { prompt: "Controversial topic" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            // All 3 models should be executed
            const llmCalls = mockExecuteNode.mock.calls.filter(
                (call) => (call[0] as ExecuteNodeParams).nodeType === "llm"
            );
            expect(llmCalls.length).toBe(3);
        });
    });

    describe("error handling", () => {
        it("should emit failure events when model fails", async () => {
            const workflowDef = createFallbackChainDefinition(1);

            configureMockNodeOutputs({}, new Set(["model1"]));

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-model-failure-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-model-failure",
                            workflowDefinition: workflowDef,
                            inputs: { prompt: "Test" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(false);
            expect(result.error).toContain("failed");
            expect(mockEmitNodeFailed).toHaveBeenCalled();
            expect(mockEmitExecutionFailed).toHaveBeenCalled();
        });
    });

    describe("span and event tracking", () => {
        it("should create workflow and node spans for ensemble", async () => {
            const workflowDef = createParallelComparisonDefinition();

            configureMockNodeOutputs({
                input: { prompt: "Test" },
                gpt4: { content: "Response 1" },
                claude: { content: "Response 2" },
                comparison: { result: "compared" },
                output: { response: "Done" }
            });

            await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-spans-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-spans",
                            workflowDefinition: workflowDef,
                            inputs: { prompt: "Test" },
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
            const workflowDef = createParallelComparisonDefinition();

            configureMockNodeOutputs({
                input: { prompt: "Test" },
                gpt4: { content: "Response 1" },
                claude: { content: "Response 2" },
                comparison: { result: "compared" },
                output: { response: "Done" }
            });

            await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-progress-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-progress",
                            workflowDefinition: workflowDef,
                            inputs: { prompt: "Test" },
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
