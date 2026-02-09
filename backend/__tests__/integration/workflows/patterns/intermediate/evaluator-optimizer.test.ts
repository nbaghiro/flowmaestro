/**
 * Evaluator-Optimizer Integration Tests (Quality Reviewer Pattern)
 *
 * True integration tests that execute evaluator-optimizer workflows through
 * the Temporal workflow engine with mocked activities.
 *
 * Tests:
 * - Multi-criteria evaluation
 * - Generate -> Evaluate pipelines
 * - Targeted optimization based on evaluation feedback
 * - A/B comparison and selection
 * - Ensemble generation with voting
 *
 * Note: Loop-based optimization iterations are tested separately in
 * control-flow tests. These tests focus on the evaluation and optimization
 * node patterns without cycles.
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
// TYPES
// ============================================================================

interface EvaluationCriteria {
    name: string;
    weight: number;
    score: number;
    feedback: string;
    [key: string]: string | number;
}

interface EvaluationResult {
    overallScore: number;
    criteria: EvaluationCriteria[];
    passed: boolean;
    weakestArea: string;
    suggestions: string[];
    [key: string]: number | boolean | string | string[] | EvaluationCriteria[];
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
 * Create a basic evaluator workflow definition (no loop)
 * Input -> Generate -> Evaluate -> Output
 */
function createEvaluatorDefinition(options: { criteria?: string[] }): WorkflowDefinition {
    const { criteria = ["accuracy", "clarity", "completeness"] } = options;

    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    // Input node
    nodes["input"] = {
        type: "input",
        name: "Task Input",
        config: { inputName: "task" },
        position: { x: 0, y: 0 }
    };

    // Generate node
    nodes["generate"] = {
        type: "llm",
        name: "Generator",
        config: {
            provider: "openai",
            model: "gpt-4",
            prompt: "Generate content for: {{input.task}}"
        },
        position: { x: 200, y: 0 }
    };

    // Evaluate node (multi-criteria)
    nodes["evaluate"] = {
        type: "llm",
        name: "Evaluator",
        config: {
            provider: "openai",
            model: "gpt-4",
            systemPrompt: `Evaluate the content on these criteria: ${criteria.join(", ")}.
                          Return a JSON with scores (0-1) and feedback for each criterion.`,
            prompt: "Evaluate this content:\n\n{{generate.content}}",
            outputFormat: "json"
        },
        position: { x: 400, y: 0 }
    };

    // Output node
    nodes["output"] = {
        type: "output",
        name: "Output",
        config: { outputName: "result" },
        position: { x: 600, y: 0 }
    };

    // Create edges
    edges.push(
        {
            id: "input-generate",
            source: "input",
            target: "generate",
            sourceHandle: "output",
            targetHandle: "input"
        },
        {
            id: "generate-evaluate",
            source: "generate",
            target: "evaluate",
            sourceHandle: "output",
            targetHandle: "input"
        },
        {
            id: "evaluate-output",
            source: "evaluate",
            target: "output",
            sourceHandle: "output",
            targetHandle: "input"
        }
    );

    return {
        name: "Evaluator Pipeline",
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create a generate-evaluate-optimize pipeline (single pass, no loop)
 * Input -> Generate -> Evaluate -> Optimize -> Output
 */
function createSinglePassOptimizerDefinition(): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    // Input node
    nodes["input"] = {
        type: "input",
        name: "Task Input",
        config: { inputName: "task" },
        position: { x: 0, y: 0 }
    };

    // Generate node
    nodes["generate"] = {
        type: "llm",
        name: "Generator",
        config: {
            provider: "openai",
            model: "gpt-4",
            prompt: "Generate content for: {{input.task}}"
        },
        position: { x: 200, y: 0 }
    };

    // Evaluate node
    nodes["evaluate"] = {
        type: "llm",
        name: "Evaluator",
        config: {
            provider: "openai",
            model: "gpt-4",
            systemPrompt: "Evaluate the content on accuracy, clarity, and completeness.",
            prompt: "Evaluate this content:\n\n{{generate.content}}",
            outputFormat: "json"
        },
        position: { x: 400, y: 0 }
    };

    // Optimize node
    nodes["optimize"] = {
        type: "llm",
        name: "Optimizer",
        config: {
            provider: "openai",
            model: "gpt-4",
            systemPrompt: "Improve the content based on the evaluation feedback.",
            prompt: "Improve this content:\n{{generate.content}}\n\nFeedback: {{evaluate.suggestions}}"
        },
        position: { x: 600, y: 0 }
    };

    // Output node
    nodes["output"] = {
        type: "output",
        name: "Output",
        config: { outputName: "result" },
        position: { x: 800, y: 0 }
    };

    // Create edges
    edges.push(
        {
            id: "input-generate",
            source: "input",
            target: "generate",
            sourceHandle: "output",
            targetHandle: "input"
        },
        {
            id: "generate-evaluate",
            source: "generate",
            target: "evaluate",
            sourceHandle: "output",
            targetHandle: "input"
        },
        {
            id: "evaluate-optimize",
            source: "evaluate",
            target: "optimize",
            sourceHandle: "output",
            targetHandle: "input"
        },
        {
            id: "optimize-output",
            source: "optimize",
            target: "output",
            sourceHandle: "output",
            targetHandle: "input"
        }
    );

    return {
        name: "Single-Pass Optimizer Pipeline",
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create an A/B comparison workflow definition
 * Input -> [Generator A, Generator B] -> Evaluate Both -> Select Best -> Output
 */
function createABComparisonDefinition(): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    // Input node
    nodes["input"] = {
        type: "input",
        name: "Task Input",
        config: { inputName: "task" },
        position: { x: 0, y: 100 }
    };

    // Generator A (concise style)
    nodes["generatorA"] = {
        type: "llm",
        name: "Generator A",
        config: {
            provider: "openai",
            model: "gpt-4",
            systemPrompt: "You are a concise writer. Keep responses brief and to the point.",
            prompt: "{{input.task}}"
        },
        position: { x: 200, y: 0 }
    };

    // Generator B (detailed style)
    nodes["generatorB"] = {
        type: "llm",
        name: "Generator B",
        config: {
            provider: "anthropic",
            model: "claude-3-5-sonnet-20241022",
            systemPrompt: "You are a detailed writer. Provide comprehensive responses.",
            prompt: "{{input.task}}"
        },
        position: { x: 200, y: 200 }
    };

    // Comparative evaluator
    nodes["evaluateBoth"] = {
        type: "llm",
        name: "Comparative Evaluator",
        config: {
            provider: "openai",
            model: "gpt-4",
            systemPrompt:
                "Compare two responses and determine which is better. " +
                "Consider accuracy, helpfulness, and clarity.",
            prompt:
                "Response A:\n{{generatorA.content}}\n\nResponse B:\n{{generatorB.content}}\n\n" +
                "Which is better and why?",
            outputFormat: "json"
        },
        position: { x: 400, y: 100 }
    };

    // Select best (transform to pick winner)
    nodes["selectBest"] = {
        type: "transform",
        name: "Select Best",
        config: {
            operation: "select",
            condition: "{{evaluateBoth.winner}}"
        },
        position: { x: 600, y: 100 }
    };

    // Output node
    nodes["output"] = {
        type: "output",
        name: "Output",
        config: { outputName: "result" },
        position: { x: 800, y: 100 }
    };

    // Create edges
    edges.push(
        {
            id: "input-genA",
            source: "input",
            target: "generatorA",
            sourceHandle: "output",
            targetHandle: "input"
        },
        {
            id: "input-genB",
            source: "input",
            target: "generatorB",
            sourceHandle: "output",
            targetHandle: "input"
        },
        {
            id: "genA-eval",
            source: "generatorA",
            target: "evaluateBoth",
            sourceHandle: "output",
            targetHandle: "input"
        },
        {
            id: "genB-eval",
            source: "generatorB",
            target: "evaluateBoth",
            sourceHandle: "output",
            targetHandle: "input"
        },
        {
            id: "eval-select",
            source: "evaluateBoth",
            target: "selectBest",
            sourceHandle: "output",
            targetHandle: "input"
        },
        {
            id: "select-output",
            source: "selectBest",
            target: "output",
            sourceHandle: "output",
            targetHandle: "input"
        }
    );

    return {
        name: "A/B Comparison Pipeline",
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create an ensemble generation workflow definition
 * Input -> [Generator1, Generator2, Generator3] -> Aggregate -> Vote -> Output
 */
function createEnsembleVotingDefinition(): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    // Input node
    nodes["input"] = {
        type: "input",
        name: "Task Input",
        config: { inputName: "task" },
        position: { x: 0, y: 150 }
    };

    // Multiple generators with different prompting strategies
    nodes["generator1"] = {
        type: "llm",
        name: "Generator 1 (Direct)",
        config: {
            provider: "openai",
            model: "gpt-4",
            prompt: "{{input.task}}"
        },
        position: { x: 200, y: 0 }
    };

    nodes["generator2"] = {
        type: "llm",
        name: "Generator 2 (Step-by-step)",
        config: {
            provider: "openai",
            model: "gpt-4",
            systemPrompt: "Think step by step before answering.",
            prompt: "{{input.task}}"
        },
        position: { x: 200, y: 150 }
    };

    nodes["generator3"] = {
        type: "llm",
        name: "Generator 3 (Expert)",
        config: {
            provider: "anthropic",
            model: "claude-3-5-sonnet-20241022",
            systemPrompt: "You are an expert in this field. Provide authoritative answers.",
            prompt: "{{input.task}}"
        },
        position: { x: 200, y: 300 }
    };

    // Aggregate node (transform to collect all responses)
    nodes["aggregate"] = {
        type: "transform",
        name: "Aggregate Responses",
        config: {
            operation: "merge",
            sources: ["generator1", "generator2", "generator3"]
        },
        position: { x: 400, y: 150 }
    };

    // Voting node (LLM to evaluate and pick best)
    nodes["vote"] = {
        type: "llm",
        name: "Voting Evaluator",
        config: {
            provider: "openai",
            model: "gpt-4",
            systemPrompt:
                "You are a judge evaluating multiple responses. Score each 1-10 and pick the best.",
            prompt:
                "Evaluate these responses:\n\n" +
                "Response 1: {{aggregate.generator1.content}}\n\n" +
                "Response 2: {{aggregate.generator2.content}}\n\n" +
                "Response 3: {{aggregate.generator3.content}}\n\n" +
                "Return JSON with scores and winner.",
            outputFormat: "json"
        },
        position: { x: 600, y: 150 }
    };

    // Output node
    nodes["output"] = {
        type: "output",
        name: "Output",
        config: { outputName: "result" },
        position: { x: 800, y: 150 }
    };

    // Create edges
    edges.push(
        {
            id: "input-gen1",
            source: "input",
            target: "generator1",
            sourceHandle: "output",
            targetHandle: "input"
        },
        {
            id: "input-gen2",
            source: "input",
            target: "generator2",
            sourceHandle: "output",
            targetHandle: "input"
        },
        {
            id: "input-gen3",
            source: "input",
            target: "generator3",
            sourceHandle: "output",
            targetHandle: "input"
        },
        {
            id: "gen1-agg",
            source: "generator1",
            target: "aggregate",
            sourceHandle: "output",
            targetHandle: "input"
        },
        {
            id: "gen2-agg",
            source: "generator2",
            target: "aggregate",
            sourceHandle: "output",
            targetHandle: "input"
        },
        {
            id: "gen3-agg",
            source: "generator3",
            target: "aggregate",
            sourceHandle: "output",
            targetHandle: "input"
        },
        {
            id: "agg-vote",
            source: "aggregate",
            target: "vote",
            sourceHandle: "output",
            targetHandle: "input"
        },
        {
            id: "vote-output",
            source: "vote",
            target: "output",
            sourceHandle: "output",
            targetHandle: "input"
        }
    );

    return {
        name: "Ensemble Voting Pipeline",
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

/**
 * Create a mock evaluation result
 */
function createMockEvaluation(options: {
    overallScore: number;
    criteria?: EvaluationCriteria[];
    weakestArea?: string;
    suggestions?: string[];
}): EvaluationResult {
    const defaultCriteria: EvaluationCriteria[] = [
        {
            name: "accuracy",
            weight: 0.4,
            score: options.overallScore,
            feedback: "Evaluation feedback"
        },
        {
            name: "clarity",
            weight: 0.3,
            score: options.overallScore,
            feedback: "Evaluation feedback"
        },
        {
            name: "completeness",
            weight: 0.3,
            score: options.overallScore,
            feedback: "Evaluation feedback"
        }
    ];

    return {
        overallScore: options.overallScore,
        criteria: options.criteria || defaultCriteria,
        passed: options.overallScore >= 0.8,
        weakestArea: options.weakestArea || "clarity",
        suggestions: options.suggestions || ["Improve clarity"]
    };
}

// ============================================================================
// TESTS
// ============================================================================

describe("Evaluator-Optimizer Integration Tests", () => {
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

    describe("multi-criteria evaluation", () => {
        it("should evaluate content on multiple criteria", async () => {
            const workflowDef = createEvaluatorDefinition({
                criteria: ["accuracy", "clarity", "completeness"]
            });

            const evaluation = createMockEvaluation({
                overallScore: 0.85,
                criteria: [
                    { name: "accuracy", weight: 0.4, score: 0.9, feedback: "Good accuracy" },
                    { name: "clarity", weight: 0.3, score: 0.8, feedback: "Clear writing" },
                    {
                        name: "completeness",
                        weight: 0.3,
                        score: 0.85,
                        feedback: "Complete coverage"
                    }
                ]
            });

            configureMockNodeOutputs({
                input: { task: "Explain TypeScript" },
                generate: { content: "TypeScript is a typed superset of JavaScript." },
                evaluate: evaluation,
                output: { result: "Evaluation complete" }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-multi-criteria-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-multi-criteria",
                            workflowDefinition: workflowDef,
                            inputs: { task: "Explain TypeScript" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            // Verify both generate and evaluate nodes were executed
            const executeCalls = mockExecuteNode.mock.calls;
            const nodeIds = executeCalls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("generate");
            expect(nodeIds).toContain("evaluate");
        });

        it("should identify weakest area from evaluation", async () => {
            const workflowDef = createEvaluatorDefinition({
                criteria: ["accuracy", "clarity", "completeness"]
            });

            const evaluation = createMockEvaluation({
                overallScore: 0.65,
                criteria: [
                    { name: "accuracy", weight: 0.4, score: 0.9, feedback: "Good accuracy" },
                    { name: "clarity", weight: 0.3, score: 0.8, feedback: "Clear" },
                    { name: "completeness", weight: 0.3, score: 0.3, feedback: "Needs more detail" }
                ],
                weakestArea: "completeness",
                suggestions: ["Add more examples", "Cover edge cases"]
            });

            configureMockNodeOutputs({
                input: { task: "Document API" },
                generate: { content: "Brief docs." },
                evaluate: evaluation,
                output: { result: "Evaluation complete" }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-weakest-area-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-weakest-area",
                            workflowDefinition: workflowDef,
                            inputs: { task: "Document API" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            // Verify evaluation was captured
            const evalCalls = mockExecuteNode.mock.calls.filter(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId === "evaluate"
            );
            expect(evalCalls.length).toBe(1);
        });

        it("should calculate weighted overall score", async () => {
            const workflowDef = createEvaluatorDefinition({
                criteria: ["accuracy", "clarity"]
            });

            // Weighted score: (1.0 * 0.6 + 0.5 * 0.4) / 1.0 = 0.8
            const evaluation = createMockEvaluation({
                overallScore: 0.8,
                criteria: [
                    { name: "accuracy", weight: 0.6, score: 1.0, feedback: "Perfect" },
                    { name: "clarity", weight: 0.4, score: 0.5, feedback: "Needs work" }
                ]
            });

            configureMockNodeOutputs({
                input: { task: "Test task" },
                generate: { content: "Generated content" },
                evaluate: evaluation,
                output: { result: "Evaluation complete" }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-weighted-score-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-weighted-score",
                            workflowDefinition: workflowDef,
                            inputs: { task: "Test task" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });
    });

    describe("generate-evaluate-optimize pipeline", () => {
        it("should execute complete optimization pipeline", async () => {
            const workflowDef = createSinglePassOptimizerDefinition();

            configureMockNodeOutputs({
                input: { task: "Write marketing copy" },
                generate: { content: "Buy our product." },
                evaluate: createMockEvaluation({
                    overallScore: 0.5,
                    weakestArea: "engagement",
                    suggestions: ["Add compelling hook", "Highlight benefits"]
                }),
                optimize: { content: "Transform your workflow with AI-powered productivity!" },
                output: { result: "Optimized content" }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-optimization-pipeline-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-optimization-pipeline",
                            workflowDefinition: workflowDef,
                            inputs: { task: "Write marketing copy" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            // Verify all nodes in the pipeline were executed
            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("generate");
            expect(nodeIds).toContain("evaluate");
            expect(nodeIds).toContain("optimize");
        });

        it("should pass evaluation feedback to optimizer", async () => {
            const workflowDef = createSinglePassOptimizerDefinition();

            const evaluation = createMockEvaluation({
                overallScore: 0.4,
                weakestArea: "completeness",
                suggestions: ["Add more examples", "Include code snippets"]
            });

            configureMockNodeOutputs({
                input: { task: "Document function" },
                generate: { content: "This function does something." },
                evaluate: evaluation,
                optimize: { content: "This function does X. Example: fn(1) returns 2." },
                output: { result: "Improved documentation" }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-feedback-pass-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-feedback-pass",
                            workflowDefinition: workflowDef,
                            inputs: { task: "Document function" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });

        it("should target weakest area in optimization", async () => {
            const workflowDef = createSinglePassOptimizerDefinition();

            configureMockNodeOutputs({
                input: { task: "Technical documentation" },
                generate: { content: "Basic docs" },
                evaluate: createMockEvaluation({
                    overallScore: 0.5,
                    criteria: [
                        { name: "accuracy", weight: 0.4, score: 0.9, feedback: "Good" },
                        { name: "clarity", weight: 0.3, score: 0.3, feedback: "Too complex" },
                        {
                            name: "completeness",
                            weight: 0.3,
                            score: 0.4,
                            feedback: "Missing examples"
                        }
                    ],
                    weakestArea: "clarity",
                    suggestions: ["Simplify language", "Add diagrams"]
                }),
                optimize: { content: "Simplified documentation with clear examples" },
                output: { result: "Optimized" }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-targeted-opt-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-targeted-opt",
                            workflowDefinition: workflowDef,
                            inputs: { task: "Technical documentation" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });
    });

    describe("A/B comparison and selection", () => {
        it("should compare two generated responses", async () => {
            const workflowDef = createABComparisonDefinition();

            configureMockNodeOutputs({
                input: { task: "Explain async/await" },
                generatorA: { content: "Async/await simplifies promises." },
                generatorB: {
                    content:
                        "Async/await is syntactic sugar for promises that makes asynchronous code readable."
                },
                evaluateBoth: {
                    winner: "B",
                    reason: "More comprehensive explanation",
                    scoreA: 7,
                    scoreB: 9
                },
                selectBest: {
                    selected: "generatorB",
                    content: "Async/await is syntactic sugar..."
                },
                output: { result: "Selected response B" }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-ab-comparison-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-ab-comparison",
                            workflowDefinition: workflowDef,
                            inputs: { task: "Explain async/await" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            // Verify both generators were executed
            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("generatorA");
            expect(nodeIds).toContain("generatorB");
            expect(nodeIds).toContain("evaluateBoth");
        });

        it("should execute generators in parallel", async () => {
            const workflowDef = createABComparisonDefinition();

            configureMockNodeOutputs({
                input: { task: "Summarize article" },
                generatorA: { content: "Long detailed summary..." },
                generatorB: { content: "Concise summary." },
                evaluateBoth: { winner: "B", reason: "More concise" },
                selectBest: { selected: "generatorB" },
                output: { result: "Concise summary." }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-parallel-gen-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-parallel-gen",
                            workflowDefinition: workflowDef,
                            inputs: { task: "Summarize article" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            // Both generators should have been called
            const llmCalls = mockExecuteNode.mock.calls.filter(
                (call) => (call[0] as ExecuteNodeParams).nodeType === "llm"
            );
            expect(llmCalls.length).toBeGreaterThanOrEqual(3); // generatorA, generatorB, evaluateBoth
        });

        it("should select based on quality criteria", async () => {
            const workflowDef = createABComparisonDefinition();

            configureMockNodeOutputs({
                input: { task: "Explain for beginners" },
                generatorA: { content: "Technical jargon explanation" },
                generatorB: { content: "Simple explanation with analogies" },
                evaluateBoth: {
                    winner: "B",
                    reason: "More accessible for beginners",
                    criteria: {
                        simplicity: { A: 3, B: 9 },
                        accuracy: { A: 8, B: 8 },
                        helpfulness: { A: 5, B: 9 }
                    }
                },
                selectBest: { selected: "generatorB" },
                output: { result: "Simple explanation" }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-quality-selection-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-quality-selection",
                            workflowDefinition: workflowDef,
                            inputs: { task: "Explain for beginners" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });
    });

    describe("ensemble generation with voting", () => {
        it("should generate multiple versions and vote", async () => {
            const workflowDef = createEnsembleVotingDefinition();

            configureMockNodeOutputs({
                input: { task: "Define TypeScript" },
                generator1: { content: "TypeScript adds types." },
                generator2: {
                    content: "Step 1: Understand JS. Step 2: TypeScript adds static typing."
                },
                generator3: {
                    content: "TypeScript is a strongly typed language extending JavaScript."
                },
                aggregate: {
                    generator1: { content: "TypeScript adds types." },
                    generator2: {
                        content: "Step 1: Understand JS. Step 2: TypeScript adds static typing."
                    },
                    generator3: {
                        content: "TypeScript is a strongly typed language extending JavaScript."
                    }
                },
                vote: {
                    scores: { generator1: 6, generator2: 7, generator3: 9 },
                    winner: "generator3",
                    reason: "Most authoritative and complete"
                },
                output: { result: "Best response selected" }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-ensemble-voting-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-ensemble",
                            workflowDefinition: workflowDef,
                            inputs: { task: "Define TypeScript" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            // Verify all three generators were executed
            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("generator1");
            expect(nodeIds).toContain("generator2");
            expect(nodeIds).toContain("generator3");
            expect(nodeIds).toContain("vote");
        });

        it("should aggregate responses from multiple generators", async () => {
            const workflowDef = createEnsembleVotingDefinition();

            configureMockNodeOutputs({
                input: { task: "Explain promises" },
                generator1: { content: "Promises represent async operations." },
                generator2: { content: "A promise is like a placeholder for a future value." },
                generator3: { content: "Promises are objects representing eventual completion." },
                aggregate: {
                    generator1: { content: "Promises represent async operations." },
                    generator2: { content: "A promise is like a placeholder for a future value." },
                    generator3: {
                        content: "Promises are objects representing eventual completion."
                    },
                    count: 3
                },
                vote: {
                    winner: "generator2",
                    scores: { generator1: 7, generator2: 9, generator3: 8 }
                },
                output: { result: "Aggregated and voted" }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-aggregate-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-aggregate",
                            workflowDefinition: workflowDef,
                            inputs: { task: "Explain promises" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            // Verify aggregate node was executed
            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("aggregate");
        });

        it("should select highest voted response", async () => {
            const workflowDef = createEnsembleVotingDefinition();

            configureMockNodeOutputs({
                input: { task: "Best practices for testing" },
                generator1: { content: "Write tests.", score: 5 },
                generator2: { content: "Use TDD. Write unit tests first.", score: 8 },
                generator3: {
                    content: "Comprehensive testing includes unit, integration, e2e.",
                    score: 9
                },
                aggregate: {
                    generator1: { content: "Write tests." },
                    generator2: { content: "Use TDD. Write unit tests first." },
                    generator3: {
                        content: "Comprehensive testing includes unit, integration, e2e."
                    }
                },
                vote: {
                    scores: { generator1: 5, generator2: 8, generator3: 9 },
                    winner: "generator3",
                    winningContent: "Comprehensive testing includes unit, integration, e2e."
                },
                output: { result: "Comprehensive testing includes unit, integration, e2e." }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-voting-selection-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-voting-selection",
                            workflowDefinition: workflowDef,
                            inputs: { task: "Best practices for testing" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });
    });

    describe("real-world scenarios", () => {
        it("should evaluate and optimize marketing copy", async () => {
            const workflowDef = createSinglePassOptimizerDefinition();

            configureMockNodeOutputs({
                input: { task: "Write ad copy for productivity app" },
                generate: { content: "Try our app. It's good." },
                evaluate: createMockEvaluation({
                    overallScore: 0.4,
                    criteria: [
                        { name: "engagement", weight: 0.4, score: 0.3, feedback: "Not engaging" },
                        { name: "clarity", weight: 0.3, score: 0.5, feedback: "Too vague" },
                        { name: "call-to-action", weight: 0.3, score: 0.4, feedback: "Weak CTA" }
                    ],
                    weakestArea: "engagement",
                    suggestions: ["Add compelling hook", "Highlight benefits"]
                }),
                optimize: {
                    content:
                        "Transform your workflow with AI-powered productivity. Start free today!"
                },
                output: { result: "Optimized ad copy" }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-marketing-optimization-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-marketing",
                            workflowDefinition: workflowDef,
                            inputs: { task: "Write ad copy for productivity app" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });

        it("should compare writing styles for target audience", async () => {
            const workflowDef = createABComparisonDefinition();

            configureMockNodeOutputs({
                input: { task: "Explain cloud computing to beginners" },
                generatorA: {
                    content:
                        "Cloud computing enables distributed resource allocation across networked infrastructure."
                },
                generatorB: {
                    content:
                        "Cloud computing is like renting a computer over the internet instead of buying one."
                },
                evaluateBoth: {
                    winner: "B",
                    reason: "More accessible language for beginners",
                    audienceMatch: { A: 3, B: 9 }
                },
                selectBest: { selected: "generatorB" },
                output: { result: "Beginner-friendly explanation selected" }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-audience-comparison-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-audience",
                            workflowDefinition: workflowDef,
                            inputs: { task: "Explain cloud computing to beginners" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });
    });

    describe("error handling", () => {
        it("should handle evaluation node failure", async () => {
            const workflowDef = createEvaluatorDefinition({});

            mockExecuteNode.mockImplementation(async (params: ExecuteNodeParams) => {
                const nodeId = params.executionContext.nodeId;

                if (nodeId === "evaluate") {
                    throw new Error("Evaluation API error");
                }

                return {
                    result: { content: `output-${nodeId}` },
                    success: true,
                    output: { content: `output-${nodeId}` }
                };
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-eval-failure-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-eval-failure",
                            workflowDefinition: workflowDef,
                            inputs: { task: "Test task" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(false);
            expect(result.error).toContain("failed");
        });

        it("should emit failure events on error", async () => {
            const workflowDef = createABComparisonDefinition();

            mockExecuteNode.mockRejectedValue(new Error("LLM API error"));

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-failure-events-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-failure-events",
                            workflowDefinition: workflowDef,
                            inputs: { task: "Test" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(false);
            expect(mockEmitNodeFailed).toHaveBeenCalled();
        });
    });

    describe("execution tracking", () => {
        it("should emit progress events during evaluation", async () => {
            const workflowDef = createEvaluatorDefinition({});

            configureMockNodeOutputs({
                input: { task: "Test" },
                generate: { content: "Generated" },
                evaluate: createMockEvaluation({ overallScore: 0.9 }),
                output: { result: "Done" }
            });

            await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-progress-events-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-progress",
                            workflowDefinition: workflowDef,
                            inputs: { task: "Test" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(mockEmitExecutionStarted).toHaveBeenCalled();
            expect(mockEmitExecutionProgress).toHaveBeenCalled();
            expect(mockEmitExecutionCompleted).toHaveBeenCalled();
        });

        it("should track spans for evaluation workflow", async () => {
            const workflowDef = createEvaluatorDefinition({});

            configureMockNodeOutputs({
                input: { task: "Test" },
                generate: { content: "Generated" },
                evaluate: createMockEvaluation({ overallScore: 0.85 }),
                output: { result: "Done" }
            });

            await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-spans-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-spans",
                            workflowDefinition: workflowDef,
                            inputs: { task: "Test" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(mockCreateSpan).toHaveBeenCalled();
            expect(mockEndSpan).toHaveBeenCalled();
        });
    });
});
