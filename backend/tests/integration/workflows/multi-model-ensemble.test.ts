/**
 * Multi-Model Ensemble Workflow Tests
 *
 * Tests for multi-model patterns including:
 * - Fallback patterns (primary fails -> secondary)
 * - Voting/consensus (majority selection)
 * - Confidence-based selection
 * - Cost optimization (cheap first, escalate if needed)
 * - Parallel comparison
 */

import {
    createContext,
    storeNodeOutput,
    getExecutionContext,
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
import type { JsonObject } from "../../../src/temporal/core/types";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ModelConfig {
    id: string;
    provider: string;
    model: string;
    cost: number; // Cost per 1k tokens
    qualityScore: number; // Expected quality 0-1
    [key: string]: unknown;
}

interface ModelResponse {
    content: string;
    confidence: number;
    tokens: number;
    latency: number;
    model: string;
    [key: string]: unknown;
}

interface VotingResult {
    winner: string;
    votes: Map<string, number>;
    agreement: number;
    [key: string]: unknown;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a fallback chain workflow
 * Input -> Model1 (primary) -> [on fail] -> Model2 (fallback) -> [on fail] -> Model3 -> Output
 */
function createFallbackChainWorkflow(modelCount: number): BuiltWorkflow {
    const nodes = new Map<string, ExecutableNode>();
    const edges = new Map<string, TypedEdge>();

    // Input node
    nodes.set("Input", {
        id: "Input",
        type: "input",
        name: "Input",
        config: { name: "prompt" },
        depth: 0,
        dependencies: [],
        dependents: ["Model1"]
    });

    // Model nodes with fallback logic
    for (let i = 1; i <= modelCount; i++) {
        const nodeId = `Model${i}`;
        const prevNode = i === 1 ? "Input" : `Fallback${i - 1}`;
        const nextNode = i === modelCount ? "Output" : `Fallback${i}`;

        nodes.set(nodeId, {
            id: nodeId,
            type: "llm",
            name: nodeId,
            config: {
                provider: i === 1 ? "openai" : i === 2 ? "anthropic" : "cohere",
                model: i === 1 ? "gpt-4" : i === 2 ? "claude-3-5-sonnet-20241022" : "command",
                isFallback: i > 1,
                priority: i
            },
            depth: (i - 1) * 2 + 1,
            dependencies: i === 1 ? ["Input"] : [prevNode],
            dependents: [nextNode]
        });

        if (i === 1) {
            edges.set("Input-Model1", {
                id: "Input-Model1",
                source: "Input",
                target: "Model1",
                sourceHandle: "output",
                targetHandle: "input",
                handleType: "default"
            });
        } else {
            edges.set(`${prevNode}-${nodeId}`, {
                id: `${prevNode}-${nodeId}`,
                source: prevNode,
                target: nodeId,
                sourceHandle: "fallback",
                targetHandle: "input",
                handleType: "default"
            });
        }

        // Add fallback conditional for non-last models
        if (i < modelCount) {
            const fallbackId = `Fallback${i}`;
            nodes.set(fallbackId, {
                id: fallbackId,
                type: "conditional",
                name: `CheckSuccess${i}`,
                config: {
                    condition: `{{${nodeId}.success}}`,
                    operator: "equals",
                    value: true
                },
                depth: i * 2,
                dependencies: [nodeId],
                dependents: i === modelCount - 1 ? ["Output", `Model${i + 1}`] : [`Model${i + 1}`]
            });

            edges.set(`${nodeId}-${fallbackId}`, {
                id: `${nodeId}-${fallbackId}`,
                source: nodeId,
                target: fallbackId,
                sourceHandle: "output",
                targetHandle: "input",
                handleType: "default"
            });

            // Success path goes to Output
            if (i === modelCount - 1) {
                edges.set(`${fallbackId}-Output`, {
                    id: `${fallbackId}-Output`,
                    source: fallbackId,
                    target: "Output",
                    sourceHandle: "true",
                    targetHandle: "input",
                    handleType: "true"
                });
            }
        } else {
            // Last model connects directly to Output
            edges.set(`${nodeId}-Output`, {
                id: `${nodeId}-Output`,
                source: nodeId,
                target: "Output",
                sourceHandle: "output",
                targetHandle: "input",
                handleType: "default"
            });
        }
    }

    // Output node
    nodes.set("Output", {
        id: "Output",
        type: "output",
        name: "Output",
        config: { name: "response" },
        depth: modelCount * 2 + 1,
        dependencies:
            modelCount > 1 ? [`Fallback${modelCount - 1}`, `Model${modelCount}`] : ["Model1"],
        dependents: []
    });

    return {
        originalDefinition: {} as never,
        buildTimestamp: Date.now(),
        nodes,
        edges,
        executionLevels: generateExecutionLevels(modelCount),
        triggerNodeId: "Input",
        outputNodeIds: ["Output"],
        loopContexts: new Map(),
        maxConcurrentNodes: 10
    };
}

function generateExecutionLevels(modelCount: number): string[][] {
    const levels: string[][] = [["Input"]];
    for (let i = 1; i <= modelCount; i++) {
        levels.push([`Model${i}`]);
        if (i < modelCount) {
            levels.push([`Fallback${i}`]);
        }
    }
    levels.push(["Output"]);
    return levels;
}

/**
 * Create a parallel voting workflow
 * Input -> [Model_A, Model_B, Model_C] (parallel) -> Voter -> Output
 */
function createVotingWorkflow(modelConfigs: ModelConfig[]): BuiltWorkflow {
    const nodes = new Map<string, ExecutableNode>();
    const edges = new Map<string, TypedEdge>();
    const modelIds = modelConfigs.map((c) => c.id);

    // Input node
    nodes.set("Input", {
        id: "Input",
        type: "input",
        name: "Input",
        config: { name: "prompt" },
        depth: 0,
        dependencies: [],
        dependents: modelIds
    });

    // Parallel model nodes
    for (const config of modelConfigs) {
        nodes.set(config.id, {
            id: config.id,
            type: "llm",
            name: config.id,
            config: {
                provider: config.provider,
                model: config.model,
                cost: config.cost,
                qualityScore: config.qualityScore
            },
            depth: 1,
            dependencies: ["Input"],
            dependents: ["Voter"]
        });

        edges.set(`Input-${config.id}`, {
            id: `Input-${config.id}`,
            source: "Input",
            target: config.id,
            sourceHandle: "output",
            targetHandle: "input",
            handleType: "default"
        });
    }

    // Voter node
    nodes.set("Voter", {
        id: "Voter",
        type: "transform",
        name: "Voter",
        config: {
            operation: "vote",
            sources: modelIds,
            strategy: "majority"
        },
        depth: 2,
        dependencies: modelIds,
        dependents: ["Output"]
    });

    for (const modelId of modelIds) {
        edges.set(`${modelId}-Voter`, {
            id: `${modelId}-Voter`,
            source: modelId,
            target: "Voter",
            sourceHandle: "output",
            targetHandle: "input",
            handleType: "default"
        });
    }

    // Output node
    nodes.set("Output", {
        id: "Output",
        type: "output",
        name: "Output",
        config: { name: "response" },
        depth: 3,
        dependencies: ["Voter"],
        dependents: []
    });

    edges.set("Voter-Output", {
        id: "Voter-Output",
        source: "Voter",
        target: "Output",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });

    return {
        originalDefinition: {} as never,
        buildTimestamp: Date.now(),
        nodes,
        edges,
        executionLevels: [["Input"], modelIds, ["Voter"], ["Output"]],
        triggerNodeId: "Input",
        outputNodeIds: ["Output"],
        loopContexts: new Map(),
        maxConcurrentNodes: 10
    };
}

/**
 * Create a confidence-based selection workflow
 * Input -> [Models in parallel] -> ConfidenceSelector -> Output
 */
function createConfidenceSelectionWorkflow(modelConfigs: ModelConfig[]): BuiltWorkflow {
    const nodes = new Map<string, ExecutableNode>();
    const edges = new Map<string, TypedEdge>();
    const modelIds = modelConfigs.map((c) => c.id);

    // Input node
    nodes.set("Input", {
        id: "Input",
        type: "input",
        name: "Input",
        config: { name: "prompt" },
        depth: 0,
        dependencies: [],
        dependents: modelIds
    });

    // Parallel model nodes
    for (const config of modelConfigs) {
        nodes.set(config.id, {
            id: config.id,
            type: "llm",
            name: config.id,
            config: {
                provider: config.provider,
                model: config.model,
                returnConfidence: true
            },
            depth: 1,
            dependencies: ["Input"],
            dependents: ["ConfidenceSelector"]
        });

        edges.set(`Input-${config.id}`, {
            id: `Input-${config.id}`,
            source: "Input",
            target: config.id,
            sourceHandle: "output",
            targetHandle: "input",
            handleType: "default"
        });
    }

    // Confidence Selector node
    nodes.set("ConfidenceSelector", {
        id: "ConfidenceSelector",
        type: "transform",
        name: "ConfidenceSelector",
        config: {
            operation: "selectByConfidence",
            sources: modelIds,
            minConfidence: 0.7,
            strategy: "highest"
        },
        depth: 2,
        dependencies: modelIds,
        dependents: ["Output"]
    });

    for (const modelId of modelIds) {
        edges.set(`${modelId}-ConfidenceSelector`, {
            id: `${modelId}-ConfidenceSelector`,
            source: modelId,
            target: "ConfidenceSelector",
            sourceHandle: "output",
            targetHandle: "input",
            handleType: "default"
        });
    }

    // Output node
    nodes.set("Output", {
        id: "Output",
        type: "output",
        name: "Output",
        config: { name: "response" },
        depth: 3,
        dependencies: ["ConfidenceSelector"],
        dependents: []
    });

    edges.set("ConfidenceSelector-Output", {
        id: "ConfidenceSelector-Output",
        source: "ConfidenceSelector",
        target: "Output",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });

    return {
        originalDefinition: {} as never,
        buildTimestamp: Date.now(),
        nodes,
        edges,
        executionLevels: [["Input"], modelIds, ["ConfidenceSelector"], ["Output"]],
        triggerNodeId: "Input",
        outputNodeIds: ["Output"],
        loopContexts: new Map(),
        maxConcurrentNodes: 10
    };
}

/**
 * Create a cost-optimized escalation workflow
 * Input -> CheapModel -> [if quality < threshold] -> ExpensiveModel -> Output
 */
function createCostOptimizedWorkflow(): BuiltWorkflow {
    const nodes = new Map<string, ExecutableNode>();
    const edges = new Map<string, TypedEdge>();

    // Input node
    nodes.set("Input", {
        id: "Input",
        type: "input",
        name: "Input",
        config: { name: "prompt" },
        depth: 0,
        dependencies: [],
        dependents: ["CheapModel"]
    });

    // Cheap model (GPT-3.5)
    nodes.set("CheapModel", {
        id: "CheapModel",
        type: "llm",
        name: "CheapModel",
        config: {
            provider: "openai",
            model: "gpt-3.5-turbo",
            costPer1kTokens: 0.002,
            returnQualityScore: true
        },
        depth: 1,
        dependencies: ["Input"],
        dependents: ["QualityCheck"]
    });

    edges.set("Input-CheapModel", {
        id: "Input-CheapModel",
        source: "Input",
        target: "CheapModel",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });

    // Quality check conditional
    nodes.set("QualityCheck", {
        id: "QualityCheck",
        type: "conditional",
        name: "QualityCheck",
        config: {
            condition: "{{CheapModel.qualityScore}}",
            operator: "gte",
            value: 0.8
        },
        depth: 2,
        dependencies: ["CheapModel"],
        dependents: ["Output", "ExpensiveModel"]
    });

    edges.set("CheapModel-QualityCheck", {
        id: "CheapModel-QualityCheck",
        source: "CheapModel",
        target: "QualityCheck",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });

    // Success path - cheap model was good enough
    edges.set("QualityCheck-Output-true", {
        id: "QualityCheck-Output-true",
        source: "QualityCheck",
        target: "Output",
        sourceHandle: "true",
        targetHandle: "input",
        handleType: "true"
    });

    // Escalation path - need expensive model
    nodes.set("ExpensiveModel", {
        id: "ExpensiveModel",
        type: "llm",
        name: "ExpensiveModel",
        config: {
            provider: "openai",
            model: "gpt-4",
            costPer1kTokens: 0.06,
            returnQualityScore: true
        },
        depth: 3,
        dependencies: ["QualityCheck"],
        dependents: ["Output"]
    });

    edges.set("QualityCheck-ExpensiveModel", {
        id: "QualityCheck-ExpensiveModel",
        source: "QualityCheck",
        target: "ExpensiveModel",
        sourceHandle: "false",
        targetHandle: "input",
        handleType: "false"
    });

    edges.set("ExpensiveModel-Output", {
        id: "ExpensiveModel-Output",
        source: "ExpensiveModel",
        target: "Output",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });

    // Output node
    nodes.set("Output", {
        id: "Output",
        type: "output",
        name: "Output",
        config: { name: "response" },
        depth: 4,
        dependencies: ["QualityCheck", "ExpensiveModel"],
        dependents: []
    });

    return {
        originalDefinition: {} as never,
        buildTimestamp: Date.now(),
        nodes,
        edges,
        executionLevels: [
            ["Input"],
            ["CheapModel"],
            ["QualityCheck"],
            ["ExpensiveModel"],
            ["Output"]
        ],
        triggerNodeId: "Input",
        outputNodeIds: ["Output"],
        loopContexts: new Map(),
        maxConcurrentNodes: 10
    };
}

/**
 * Simulate workflow execution with fallback handling
 */
async function simulateEnsembleExecution(
    workflow: BuiltWorkflow,
    mockActivities: ReturnType<typeof createMockActivities>,
    inputs: JsonObject = {},
    options: {
        failingModels?: Set<string>;
        modelResponses?: Map<string, ModelResponse>;
    } = {}
): Promise<{
    context: ReturnType<typeof createContext>;
    finalOutputs: JsonObject;
    executionOrder: string[];
    modelsCalled: string[];
    totalCost: number;
}> {
    let context = createContext(inputs);
    let queueState = initializeQueue(workflow);
    const executionOrder: string[] = [];
    const modelsCalled: string[] = [];
    let totalCost = 0;

    while (!isExecutionComplete(queueState)) {
        const readyNodes = getReadyNodes(queueState, workflow.maxConcurrentNodes || 10);

        if (readyNodes.length === 0) {
            break;
        }

        queueState = markExecuting(queueState, readyNodes);

        for (const nodeId of readyNodes) {
            const node = workflow.nodes.get(nodeId)!;
            executionOrder.push(nodeId);

            // Track LLM model calls
            if (node.type === "llm") {
                modelsCalled.push(nodeId);
            }

            try {
                // Check if this model should fail
                if (options.failingModels?.has(nodeId)) {
                    throw new Error(`Model ${nodeId} failed`);
                }

                const result = await mockActivities.executeNode(
                    node.type,
                    node.config as JsonObject,
                    context,
                    {
                        nodeId,
                        nodeName: node.name,
                        executionId: "test-execution"
                    }
                );

                if (result.success) {
                    context = storeNodeOutput(context, nodeId, result.output);
                    queueState = markCompleted(queueState, nodeId, result.output, workflow);

                    // Track costs for LLM nodes
                    if (node.type === "llm" && result.output) {
                        const output = result.output as JsonObject;
                        if (output.cost) {
                            totalCost += output.cost as number;
                        }
                    }
                } else {
                    queueState = markFailed(
                        queueState,
                        nodeId,
                        result.error || "Unknown error",
                        workflow
                    );
                }
            } catch (error) {
                // Store error but allow fallback to continue
                context = storeNodeOutput(context, nodeId, {
                    success: false,
                    error: error instanceof Error ? error.message : "Unknown error"
                });
                queueState = markCompleted(queueState, nodeId, { success: false }, workflow);
            }
        }
    }

    const finalOutputs = buildFinalOutputs(context, workflow.outputNodeIds);

    return {
        context,
        finalOutputs,
        executionOrder,
        modelsCalled,
        totalCost
    };
}

/**
 * Calculate voting result from multiple model responses
 */
function calculateVotingResult(
    responses: Map<string, ModelResponse>,
    options: { requireMinAgreement?: number; tieBreaker?: "first" | "highest_confidence" } = {}
): VotingResult {
    const votes = new Map<string, number>();
    const contentToModels = new Map<string, string[]>();

    // Group responses by content (simplified - in reality would use semantic similarity)
    for (const [modelId, response] of responses) {
        const content = response.content.toLowerCase().trim();
        votes.set(content, (votes.get(content) || 0) + 1);

        if (!contentToModels.has(content)) {
            contentToModels.set(content, []);
        }
        contentToModels.get(content)!.push(modelId);
    }

    // Find winner
    let maxVotes = 0;
    let winners: string[] = [];
    for (const [content, count] of votes) {
        if (count > maxVotes) {
            maxVotes = count;
            winners = [content];
        } else if (count === maxVotes) {
            winners.push(content);
        }
    }

    // Handle tie
    let winner = winners[0];
    if (winners.length > 1 && options.tieBreaker === "highest_confidence") {
        let highestConfidence = 0;
        for (const content of winners) {
            const models = contentToModels.get(content)!;
            for (const modelId of models) {
                const response = responses.get(modelId)!;
                if (response.confidence > highestConfidence) {
                    highestConfidence = response.confidence;
                    winner = content;
                }
            }
        }
    }

    const agreement = maxVotes / responses.size;

    return {
        winner,
        votes,
        agreement
    };
}

// ============================================================================
// TESTS
// ============================================================================

describe("Multi-Model Ensemble Workflows", () => {
    describe("fallback patterns", () => {
        it("should fallback to secondary model on primary failure", async () => {
            const workflow = createFallbackChainWorkflow(2);
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { prompt: "Summarize this text" },
                    Model1: { success: false, error: "API rate limit exceeded" },
                    Fallback1: { shouldFallback: true },
                    Model2: { content: "Summary from fallback model", success: true },
                    Output: { response: "Summary from fallback model" }
                })
            );

            const { executionOrder, finalOutputs, modelsCalled } = await simulateEnsembleExecution(
                workflow,
                mockActivities,
                { prompt: "Summarize this text" },
                { failingModels: new Set(["Model1"]) }
            );

            expect(executionOrder).toContain("Model1");
            expect(executionOrder).toContain("Model2");
            expect(modelsCalled).toEqual(["Model1", "Model2"]);
            expect(finalOutputs.response).toBe("Summary from fallback model");
        });

        it("should chain through 3 models until success", async () => {
            const workflow = createFallbackChainWorkflow(3);
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { prompt: "Complex question" },
                    Model1: { success: false },
                    Fallback1: { shouldFallback: true },
                    Model2: { success: false },
                    Fallback2: { shouldFallback: true },
                    Model3: { content: "Answer from third model", success: true },
                    Output: { response: "Answer from third model" }
                })
            );

            const { modelsCalled, finalOutputs } = await simulateEnsembleExecution(
                workflow,
                mockActivities,
                { prompt: "Complex question" },
                { failingModels: new Set(["Model1", "Model2"]) }
            );

            expect(modelsCalled).toEqual(["Model1", "Model2", "Model3"]);
            expect(finalOutputs.response).toBe("Answer from third model");
        });

        it("should return error when all models fail", async () => {
            const workflow = createFallbackChainWorkflow(2);
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { prompt: "Impossible request" },
                    Model1: { success: false, error: "Model1 failed" },
                    Fallback1: { shouldFallback: true },
                    Model2: { success: false, error: "Model2 failed" },
                    Output: { response: null, error: "All models failed" }
                })
            );

            const { context, modelsCalled } = await simulateEnsembleExecution(
                workflow,
                mockActivities,
                { prompt: "Impossible request" },
                { failingModels: new Set(["Model1", "Model2"]) }
            );

            expect(modelsCalled).toEqual(["Model1", "Model2"]);
            const execContext = getExecutionContext(context);
            expect((execContext.Model1 as JsonObject).success).toBe(false);
            expect((execContext.Model2 as JsonObject).success).toBe(false);
        });
    });

    describe("voting/consensus", () => {
        it("should select majority response from 3 models", async () => {
            const modelConfigs: ModelConfig[] = [
                { id: "ModelA", provider: "openai", model: "gpt-4", cost: 0.03, qualityScore: 0.9 },
                {
                    id: "ModelB",
                    provider: "anthropic",
                    model: "claude-3-5-sonnet-20241022",
                    cost: 0.02,
                    qualityScore: 0.9
                },
                {
                    id: "ModelC",
                    provider: "openai",
                    model: "gpt-3.5-turbo",
                    cost: 0.002,
                    qualityScore: 0.7
                }
            ];
            const workflow = createVotingWorkflow(modelConfigs);

            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { prompt: "Is water wet?" },
                    ModelA: { content: "Yes, water is wet", confidence: 0.9 },
                    ModelB: { content: "Yes, water is wet", confidence: 0.85 },
                    ModelC: { content: "No, water makes things wet", confidence: 0.6 },
                    Voter: {
                        winner: "Yes, water is wet",
                        votes: { "yes, water is wet": 2, "no, water makes things wet": 1 },
                        agreement: 0.67
                    },
                    Output: { response: "Yes, water is wet" }
                })
            );

            const { finalOutputs, executionOrder } = await simulateEnsembleExecution(
                workflow,
                mockActivities,
                { prompt: "Is water wet?" }
            );

            expect(executionOrder).toContain("ModelA");
            expect(executionOrder).toContain("ModelB");
            expect(executionOrder).toContain("ModelC");
            expect(executionOrder).toContain("Voter");
            expect(finalOutputs.response).toBe("Yes, water is wet");
        });

        it("should handle tie-breaking in voting", async () => {
            const responses = new Map<string, ModelResponse>([
                [
                    "ModelA",
                    {
                        content: "Answer A",
                        confidence: 0.9,
                        tokens: 10,
                        latency: 100,
                        model: "gpt-4"
                    }
                ],
                [
                    "ModelB",
                    {
                        content: "Answer B",
                        confidence: 0.7,
                        tokens: 12,
                        latency: 120,
                        model: "claude"
                    }
                ]
            ]);

            // Test first wins tie
            const resultFirst = calculateVotingResult(responses, { tieBreaker: "first" });
            expect(resultFirst.agreement).toBe(0.5); // 1 out of 2

            // Test highest confidence wins tie
            const resultConfidence = calculateVotingResult(responses, {
                tieBreaker: "highest_confidence"
            });
            expect(resultConfidence.winner).toBe("answer a"); // Higher confidence
        });

        it("should require minimum agreement threshold", async () => {
            const responses = new Map<string, ModelResponse>([
                [
                    "ModelA",
                    {
                        content: "Answer A",
                        confidence: 0.8,
                        tokens: 10,
                        latency: 100,
                        model: "gpt-4"
                    }
                ],
                [
                    "ModelB",
                    {
                        content: "Answer B",
                        confidence: 0.7,
                        tokens: 12,
                        latency: 120,
                        model: "claude"
                    }
                ],
                [
                    "ModelC",
                    {
                        content: "Answer C",
                        confidence: 0.6,
                        tokens: 11,
                        latency: 110,
                        model: "cohere"
                    }
                ]
            ]);

            const result = calculateVotingResult(responses);

            // With all different answers, agreement is only 1/3
            expect(result.agreement).toBeLessThan(0.5);
        });
    });

    describe("confidence-based selection", () => {
        it("should select highest confidence response", async () => {
            const modelConfigs: ModelConfig[] = [
                { id: "ModelA", provider: "openai", model: "gpt-4", cost: 0.03, qualityScore: 0.9 },
                {
                    id: "ModelB",
                    provider: "anthropic",
                    model: "claude-3-5-sonnet-20241022",
                    cost: 0.02,
                    qualityScore: 0.9
                }
            ];
            const workflow = createConfidenceSelectionWorkflow(modelConfigs);

            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { prompt: "Technical question" },
                    ModelA: { content: "GPT answer", confidence: 0.75 },
                    ModelB: { content: "Claude answer", confidence: 0.92 },
                    ConfidenceSelector: {
                        selected: "ModelB",
                        content: "Claude answer",
                        confidence: 0.92
                    },
                    Output: { response: "Claude answer" }
                })
            );

            const { finalOutputs, context } = await simulateEnsembleExecution(
                workflow,
                mockActivities,
                { prompt: "Technical question" }
            );

            expect(finalOutputs.response).toBe("Claude answer");
            const execContext = getExecutionContext(context);
            expect((execContext.ConfidenceSelector as JsonObject).selected).toBe("ModelB");
        });

        it("should fallback when no response meets confidence threshold", async () => {
            const modelConfigs: ModelConfig[] = [
                { id: "ModelA", provider: "openai", model: "gpt-4", cost: 0.03, qualityScore: 0.9 },
                {
                    id: "ModelB",
                    provider: "anthropic",
                    model: "claude-3-5-sonnet-20241022",
                    cost: 0.02,
                    qualityScore: 0.9
                }
            ];
            const workflow = createConfidenceSelectionWorkflow(modelConfigs);

            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { prompt: "Ambiguous question" },
                    ModelA: { content: "Uncertain answer A", confidence: 0.4 },
                    ModelB: { content: "Uncertain answer B", confidence: 0.5 },
                    ConfidenceSelector: {
                        selected: null,
                        belowThreshold: true,
                        maxConfidence: 0.5,
                        content: "I'm not confident enough to answer this question."
                    },
                    Output: { response: "I'm not confident enough to answer this question." }
                })
            );

            const { finalOutputs, context } = await simulateEnsembleExecution(
                workflow,
                mockActivities,
                { prompt: "Ambiguous question" }
            );

            expect(finalOutputs.response).toContain("not confident");
            const execContext = getExecutionContext(context);
            expect((execContext.ConfidenceSelector as JsonObject).belowThreshold).toBe(true);
        });
    });

    describe("cost optimization", () => {
        it("should try cheaper model first before expensive one", async () => {
            const workflow = createCostOptimizedWorkflow();

            // Verify workflow structure: cheap model executes first
            const cheapModel = workflow.nodes.get("CheapModel")!;
            const expensiveModel = workflow.nodes.get("ExpensiveModel")!;
            const qualityCheck = workflow.nodes.get("QualityCheck")!;

            // CheapModel should run before QualityCheck
            expect(cheapModel.depth).toBeLessThan(qualityCheck.depth);

            // ExpensiveModel should only run after QualityCheck (conditional path)
            expect(expensiveModel.dependencies).toContain("QualityCheck");

            // Verify edge types for conditional routing
            const edgeToOutput = workflow.edges.get("QualityCheck-Output-true");
            const edgeToExpensive = workflow.edges.get("QualityCheck-ExpensiveModel");
            expect(edgeToOutput?.handleType).toBe("true"); // Success path skips expensive
            expect(edgeToExpensive?.handleType).toBe("false"); // Failure path escalates

            // Verify cost configuration
            expect((cheapModel.config as JsonObject).costPer1kTokens).toBeLessThan(
                (expensiveModel.config as JsonObject).costPer1kTokens as number
            );
        });

        it("should escalate to expensive model on quality threshold failure", async () => {
            const workflow = createCostOptimizedWorkflow();
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { prompt: "Complex question" },
                    CheapModel: {
                        content: "Poor answer from cheap model",
                        qualityScore: 0.5,
                        cost: 0.001
                    },
                    QualityCheck: { meetsThreshold: false, branch: "false" },
                    ExpensiveModel: {
                        content: "Excellent answer from expensive model",
                        qualityScore: 0.95,
                        cost: 0.05
                    },
                    Output: { response: "Excellent answer from expensive model" }
                })
            );

            const { modelsCalled, finalOutputs } = await simulateEnsembleExecution(
                workflow,
                mockActivities,
                { prompt: "Complex question" }
            );

            expect(modelsCalled).toContain("CheapModel");
            expect(modelsCalled).toContain("ExpensiveModel");
            expect(finalOutputs.response).toBe("Excellent answer from expensive model");
        });
    });

    describe("parallel comparison", () => {
        it("should run models in parallel and compare outputs", async () => {
            const modelConfigs: ModelConfig[] = [
                { id: "GPT4", provider: "openai", model: "gpt-4", cost: 0.03, qualityScore: 0.9 },
                {
                    id: "Claude",
                    provider: "anthropic",
                    model: "claude-3-5-sonnet-20241022",
                    cost: 0.02,
                    qualityScore: 0.9
                }
            ];
            const workflow = createVotingWorkflow(modelConfigs);

            const startTimes: Record<string, number> = {};

            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: { customOutput: { prompt: "Compare outputs" } },
                    GPT4: {
                        customOutput: { content: "GPT-4 response", confidence: 0.9 },
                        onExecute: () => {
                            startTimes.GPT4 = Date.now();
                        }
                    },
                    Claude: {
                        customOutput: { content: "Claude response", confidence: 0.88 },
                        onExecute: () => {
                            startTimes.Claude = Date.now();
                        }
                    },
                    Voter: {
                        customOutput: {
                            comparison: {
                                GPT4: "GPT-4 response",
                                Claude: "Claude response"
                            },
                            similarity: 0.85
                        }
                    },
                    Output: { customOutput: { response: "Compared outputs" } }
                }
            });

            const { executionOrder, context } = await simulateEnsembleExecution(
                workflow,
                mockActivities,
                { prompt: "Compare outputs" }
            );

            // Both models should be in execution order before Voter
            const gpt4Index = executionOrder.indexOf("GPT4");
            const claudeIndex = executionOrder.indexOf("Claude");
            const voterIndex = executionOrder.indexOf("Voter");

            expect(gpt4Index).toBeLessThan(voterIndex);
            expect(claudeIndex).toBeLessThan(voterIndex);

            const execContext = getExecutionContext(context);
            expect(execContext.GPT4).toBeDefined();
            expect(execContext.Claude).toBeDefined();
        });

        it("should reconcile disagreement between models", async () => {
            const modelConfigs: ModelConfig[] = [
                { id: "ModelA", provider: "openai", model: "gpt-4", cost: 0.03, qualityScore: 0.9 },
                {
                    id: "ModelB",
                    provider: "anthropic",
                    model: "claude-3-5-sonnet-20241022",
                    cost: 0.02,
                    qualityScore: 0.9
                },
                {
                    id: "ModelC",
                    provider: "cohere",
                    model: "command",
                    cost: 0.01,
                    qualityScore: 0.7
                }
            ];
            const workflow = createVotingWorkflow(modelConfigs);

            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { prompt: "Controversial topic" },
                    ModelA: { content: "Position A is correct", confidence: 0.8 },
                    ModelB: { content: "Position B is correct", confidence: 0.85 },
                    ModelC: { content: "Position A is correct", confidence: 0.6 },
                    Voter: {
                        winner: "Position A is correct",
                        disagreement: true,
                        votes: { "Position A": 2, "Position B": 1 },
                        reconciliationNote: "Models disagreed, majority vote selected Position A"
                    },
                    Output: { response: "Position A is correct" }
                })
            );

            const { finalOutputs, context } = await simulateEnsembleExecution(
                workflow,
                mockActivities,
                { prompt: "Controversial topic" }
            );

            const execContext = getExecutionContext(context);
            expect((execContext.Voter as JsonObject).disagreement).toBe(true);
            expect(finalOutputs.response).toBe("Position A is correct");
        });
    });
});
