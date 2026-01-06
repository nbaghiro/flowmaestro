/**
 * AI Pipeline Orchestration Tests
 *
 * Tests multi-LLM workflow chains:
 * - Sequential LLM calls with variable passing
 * - Multi-provider pipelines (OpenAI -> Anthropic)
 * - Summarize -> Refine -> Format chains
 * - Context accumulation across LLM nodes
 * - Error handling in LLM pipelines
 */

import nock from "nock";
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
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a multi-LLM pipeline workflow
 * Input -> LLM1 (summarize) -> LLM2 (refine) -> LLM3 (format) -> Output
 */
function createLLMPipelineWorkflow(llmCount: number, providers: string[] = []): BuiltWorkflow {
    const nodes = new Map<string, ExecutableNode>();
    const edges = new Map<string, TypedEdge>();
    const executionLevels: string[][] = [];

    // Input node
    nodes.set("Input", {
        id: "Input",
        type: "input",
        name: "Input",
        config: { name: "text" },
        depth: 0,
        dependencies: [],
        dependents: llmCount > 0 ? ["LLM1"] : ["Output"]
    });
    executionLevels.push(["Input"]);

    // LLM nodes
    for (let i = 1; i <= llmCount; i++) {
        const nodeId = `LLM${i}`;
        const prevNode = i === 1 ? "Input" : `LLM${i - 1}`;
        const nextNode = i === llmCount ? "Output" : `LLM${i + 1}`;
        const provider = providers[i - 1] || "openai";

        nodes.set(nodeId, {
            id: nodeId,
            type: "llm",
            name: nodeId,
            config: {
                provider,
                model: provider === "openai" ? "gpt-4" : "claude-3-5-sonnet-20241022",
                prompt: `Process step ${i}: {{${prevNode}.content || ${prevNode}.text}}`,
                step: i
            },
            depth: i,
            dependencies: [prevNode],
            dependents: [nextNode]
        });

        const edgeId = `${prevNode}-${nodeId}`;
        edges.set(edgeId, {
            id: edgeId,
            source: prevNode,
            target: nodeId,
            sourceHandle: "output",
            targetHandle: "input",
            handleType: "default"
        });

        executionLevels.push([nodeId]);
    }

    // Output node
    const lastLLM = llmCount > 0 ? `LLM${llmCount}` : "Input";
    nodes.set("Output", {
        id: "Output",
        type: "output",
        name: "Output",
        config: { name: "result" },
        depth: llmCount + 1,
        dependencies: [lastLLM],
        dependents: []
    });

    const outputEdgeId = `${lastLLM}-Output`;
    edges.set(outputEdgeId, {
        id: outputEdgeId,
        source: lastLLM,
        target: "Output",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });

    executionLevels.push(["Output"]);

    return {
        originalDefinition: {} as never,
        buildTimestamp: Date.now(),
        nodes,
        edges,
        executionLevels,
        triggerNodeId: "Input",
        outputNodeIds: ["Output"],
        loopContexts: new Map(),
        maxConcurrentNodes: 10
    };
}

/**
 * Create a parallel LLM workflow for comparison
 * Input -> [LLM_A, LLM_B, LLM_C] -> Merge -> Output
 */
function createParallelLLMWorkflow(
    llmConfigs: Array<{ id: string; provider: string }>
): BuiltWorkflow {
    const nodes = new Map<string, ExecutableNode>();
    const edges = new Map<string, TypedEdge>();
    const llmIds = llmConfigs.map((c) => c.id);

    // Input node
    nodes.set("Input", {
        id: "Input",
        type: "input",
        name: "Input",
        config: { name: "text" },
        depth: 0,
        dependencies: [],
        dependents: llmIds
    });

    // Parallel LLM nodes
    for (const config of llmConfigs) {
        nodes.set(config.id, {
            id: config.id,
            type: "llm",
            name: config.id,
            config: {
                provider: config.provider,
                model: config.provider === "openai" ? "gpt-4" : "claude-3-5-sonnet-20241022",
                prompt: "Analyze: {{Input.text}}"
            },
            depth: 1,
            dependencies: ["Input"],
            dependents: ["Merge"]
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

    // Merge node
    nodes.set("Merge", {
        id: "Merge",
        type: "transform",
        name: "Merge",
        config: {
            operation: "merge",
            sources: llmIds
        },
        depth: 2,
        dependencies: llmIds,
        dependents: ["Output"]
    });

    for (const llmId of llmIds) {
        edges.set(`${llmId}-Merge`, {
            id: `${llmId}-Merge`,
            source: llmId,
            target: "Merge",
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
        config: { name: "result" },
        depth: 3,
        dependencies: ["Merge"],
        dependents: []
    });

    edges.set("Merge-Output", {
        id: "Merge-Output",
        source: "Merge",
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
        executionLevels: [["Input"], llmIds, ["Merge"], ["Output"]],
        triggerNodeId: "Input",
        outputNodeIds: ["Output"],
        loopContexts: new Map(),
        maxConcurrentNodes: 10
    };
}

/**
 * Simulate workflow execution with mock activities
 */
async function simulateWorkflowExecution(
    workflow: BuiltWorkflow,
    mockActivities: ReturnType<typeof createMockActivities>,
    inputs: JsonObject = {}
): Promise<{
    context: ReturnType<typeof createContext>;
    finalOutputs: JsonObject;
    executionOrder: string[];
}> {
    let context = createContext(inputs);
    let queueState = initializeQueue(workflow);
    const executionOrder: string[] = [];

    while (!isExecutionComplete(queueState)) {
        const readyNodes = getReadyNodes(queueState, workflow.maxConcurrentNodes || 10);

        if (readyNodes.length === 0) {
            break;
        }

        // Execute ready nodes (simulating parallel execution)
        queueState = markExecuting(queueState, readyNodes);

        // Process each node
        for (const nodeId of readyNodes) {
            const node = workflow.nodes.get(nodeId)!;
            executionOrder.push(nodeId);

            try {
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
                } else {
                    queueState = markFailed(
                        queueState,
                        nodeId,
                        result.error || "Unknown error",
                        workflow
                    );
                }
            } catch (error) {
                queueState = markFailed(
                    queueState,
                    nodeId,
                    error instanceof Error ? error.message : "Unknown error",
                    workflow
                );
            }
        }
    }

    const finalOutputs = buildFinalOutputs(context, workflow.outputNodeIds);

    return {
        context,
        finalOutputs,
        executionOrder
    };
}

// ============================================================================
// TESTS
// ============================================================================

describe("AI Pipeline Orchestration", () => {
    beforeEach(() => {
        nock.cleanAll();
    });

    afterEach(() => {
        nock.cleanAll();
    });

    describe("sequential LLM chain", () => {
        it("should execute two-step LLM chain with variable passing", async () => {
            const workflow = createLLMPipelineWorkflow(2, ["openai", "openai"]);
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { text: "Original article content here..." },
                    LLM1: { content: "Summarized content", tokens: 50 },
                    LLM2: { content: "Refined and polished summary", tokens: 75 },
                    Output: { result: "Refined and polished summary" }
                })
            );

            const { executionOrder, finalOutputs } = await simulateWorkflowExecution(
                workflow,
                mockActivities,
                { text: "Original article content here..." }
            );

            expect(executionOrder).toEqual(["Input", "LLM1", "LLM2", "Output"]);
            expect(finalOutputs.result).toBe("Refined and polished summary");
        });

        it("should execute three-step summarize-refine-format pipeline", async () => {
            const workflow = createLLMPipelineWorkflow(3, ["openai", "openai", "openai"]);
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { text: "Long document with lots of details..." },
                    LLM1: { content: "Summary of document", step: "summarize" },
                    LLM2: { content: "Refined summary with better flow", step: "refine" },
                    LLM3: { content: "# Final Report\n\nRefined summary...", step: "format" },
                    Output: { result: "# Final Report\n\nRefined summary..." }
                })
            );

            const { executionOrder } = await simulateWorkflowExecution(workflow, mockActivities, {
                text: "Long document with lots of details..."
            });

            expect(executionOrder).toEqual(["Input", "LLM1", "LLM2", "LLM3", "Output"]);
            expect(mockActivities.executeNode).toHaveBeenCalledTimes(5);
        });

        it("should pass context between LLM nodes correctly", async () => {
            const workflow = createLLMPipelineWorkflow(2, ["openai", "openai"]);
            const capturedContexts: JsonObject[] = [];

            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: { customOutput: { text: "Input text" } },
                    LLM1: {
                        customOutput: { content: "First response" },
                        onExecute: (input) => {
                            capturedContexts.push(getExecutionContext(input.context));
                        }
                    },
                    LLM2: {
                        customOutput: { content: "Second response" },
                        onExecute: (input) => {
                            capturedContexts.push(getExecutionContext(input.context));
                        }
                    },
                    Output: { customOutput: { result: "done" } }
                }
            });

            await simulateWorkflowExecution(workflow, mockActivities, { text: "Input text" });

            // LLM1 should see Input
            expect(capturedContexts[0].Input).toEqual({ text: "Input text" });

            // LLM2 should see Input and LLM1
            expect(capturedContexts[1].Input).toEqual({ text: "Input text" });
            expect(capturedContexts[1].LLM1).toEqual({ content: "First response" });
        });
    });

    describe("multi-provider pipelines", () => {
        it("should execute OpenAI -> Anthropic pipeline", async () => {
            const workflow = createLLMPipelineWorkflow(2, ["openai", "anthropic"]);
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { text: "Compare these two approaches..." },
                    LLM1: { content: "OpenAI analysis", provider: "openai" },
                    LLM2: { content: "Anthropic refined analysis", provider: "anthropic" },
                    Output: { result: "Anthropic refined analysis" }
                })
            );

            const { executionOrder } = await simulateWorkflowExecution(workflow, mockActivities, {
                text: "Compare these two approaches..."
            });

            expect(executionOrder).toEqual(["Input", "LLM1", "LLM2", "Output"]);

            // Verify provider configs were passed
            const llm1Call = mockActivities.executeNode.mock.calls.find(
                (call) => call[3].nodeId === "LLM1"
            );
            const llm2Call = mockActivities.executeNode.mock.calls.find(
                (call) => call[3].nodeId === "LLM2"
            );

            expect(llm1Call?.[1].provider).toBe("openai");
            expect(llm2Call?.[1].provider).toBe("anthropic");
        });

        it("should execute Anthropic -> OpenAI -> Anthropic chain", async () => {
            const workflow = createLLMPipelineWorkflow(3, ["anthropic", "openai", "anthropic"]);
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { text: "Multi-provider test" },
                    LLM1: { content: "Claude initial", provider: "anthropic" },
                    LLM2: { content: "GPT middle", provider: "openai" },
                    LLM3: { content: "Claude final", provider: "anthropic" },
                    Output: { result: "Claude final" }
                })
            );

            const { executionOrder } = await simulateWorkflowExecution(workflow, mockActivities);

            expect(executionOrder).toEqual(["Input", "LLM1", "LLM2", "LLM3", "Output"]);
        });
    });

    describe("parallel LLM comparison", () => {
        it("should execute multiple LLMs in parallel for comparison", async () => {
            const workflow = createParallelLLMWorkflow([
                { id: "LLM_OpenAI", provider: "openai" },
                { id: "LLM_Anthropic", provider: "anthropic" }
            ]);

            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { text: "Analyze this topic" },
                    LLM_OpenAI: { content: "OpenAI perspective", confidence: 0.9 },
                    LLM_Anthropic: { content: "Anthropic perspective", confidence: 0.85 },
                    Merge: {
                        openai: { content: "OpenAI perspective", confidence: 0.9 },
                        anthropic: { content: "Anthropic perspective", confidence: 0.85 }
                    },
                    Output: { result: "merged" }
                })
            );

            const { executionOrder } = await simulateWorkflowExecution(workflow, mockActivities);

            // Input first, then parallel LLMs (order may vary), then Merge, then Output
            expect(executionOrder[0]).toBe("Input");
            expect(executionOrder).toContain("LLM_OpenAI");
            expect(executionOrder).toContain("LLM_Anthropic");
            expect(executionOrder[executionOrder.length - 2]).toBe("Merge");
            expect(executionOrder[executionOrder.length - 1]).toBe("Output");
        });

        it("should execute three parallel LLMs and merge results", async () => {
            const workflow = createParallelLLMWorkflow([
                { id: "GPT4", provider: "openai" },
                { id: "Claude", provider: "anthropic" },
                { id: "GPT35", provider: "openai" }
            ]);

            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { text: "Compare AI responses" },
                    GPT4: { content: "GPT-4 response", model: "gpt-4" },
                    Claude: { content: "Claude response", model: "claude-3" },
                    GPT35: { content: "GPT-3.5 response", model: "gpt-3.5-turbo" },
                    Merge: { responses: 3 },
                    Output: { result: "comparison complete" }
                })
            );

            const { executionOrder } = await simulateWorkflowExecution(workflow, mockActivities);

            expect(executionOrder).toContain("GPT4");
            expect(executionOrder).toContain("Claude");
            expect(executionOrder).toContain("GPT35");
        });
    });

    describe("error handling in LLM pipelines", () => {
        it("should handle LLM failure in middle of chain", async () => {
            const workflow = createLLMPipelineWorkflow(3, ["openai", "openai", "openai"]);
            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: { customOutput: { text: "Test input" } },
                    LLM1: { customOutput: { content: "First step success" } },
                    LLM2: { shouldFail: true, errorMessage: "API rate limit exceeded" },
                    LLM3: { customOutput: { content: "Should not execute" } },
                    Output: { customOutput: { result: "Should not execute" } }
                }
            });

            const { executionOrder } = await simulateWorkflowExecution(workflow, mockActivities);

            // Should stop at LLM2 failure
            expect(executionOrder).toContain("Input");
            expect(executionOrder).toContain("LLM1");
            expect(executionOrder).toContain("LLM2");
            // LLM3 and Output should not be reached due to dependency failure
        });

        it("should handle first LLM failure", async () => {
            const workflow = createLLMPipelineWorkflow(2, ["openai", "openai"]);
            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: { customOutput: { text: "Test input" } },
                    LLM1: { shouldFail: true, errorMessage: "Invalid API key" },
                    LLM2: { customOutput: { content: "Should not execute" } },
                    Output: { customOutput: { result: "Should not execute" } }
                }
            });

            const { executionOrder } = await simulateWorkflowExecution(workflow, mockActivities);

            expect(executionOrder).toContain("Input");
            expect(executionOrder).toContain("LLM1");
            // Pipeline should stop after first failure
        });

        it("should continue parallel LLMs when one fails", async () => {
            const workflow = createParallelLLMWorkflow([
                { id: "LLM_A", provider: "openai" },
                { id: "LLM_B", provider: "anthropic" },
                { id: "LLM_C", provider: "openai" }
            ]);

            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: { customOutput: { text: "Parallel test" } },
                    LLM_A: { customOutput: { content: "A success" } },
                    LLM_B: { shouldFail: true, errorMessage: "Provider unavailable" },
                    LLM_C: { customOutput: { content: "C success" } },
                    Merge: { customOutput: { partial: true } },
                    Output: { customOutput: { result: "partial" } }
                }
            });

            const { executionOrder } = await simulateWorkflowExecution(workflow, mockActivities);

            // All parallel nodes should be attempted
            expect(executionOrder).toContain("LLM_A");
            expect(executionOrder).toContain("LLM_B");
            expect(executionOrder).toContain("LLM_C");
        });
    });

    describe("context accumulation", () => {
        it("should accumulate all LLM outputs in context", async () => {
            const workflow = createLLMPipelineWorkflow(3, ["openai", "openai", "openai"]);
            let finalContext: JsonObject = {};

            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: { customOutput: { text: "Start" } },
                    LLM1: { customOutput: { content: "Step 1 output", step: 1 } },
                    LLM2: { customOutput: { content: "Step 2 output", step: 2 } },
                    LLM3: {
                        customOutput: { content: "Step 3 output", step: 3 },
                        onExecute: (input) => {
                            finalContext = getExecutionContext(input.context);
                        }
                    },
                    Output: { customOutput: { result: "done" } }
                }
            });

            await simulateWorkflowExecution(workflow, mockActivities);

            // Final context should have all previous outputs
            expect(finalContext.Input).toBeDefined();
            expect(finalContext.LLM1).toBeDefined();
            expect(finalContext.LLM2).toBeDefined();
            expect((finalContext.LLM1 as JsonObject).step).toBe(1);
            expect((finalContext.LLM2 as JsonObject).step).toBe(2);
        });

        it("should preserve token usage across chain", async () => {
            const workflow = createLLMPipelineWorkflow(2, ["openai", "openai"]);
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { text: "Token tracking test" },
                    LLM1: { content: "First", promptTokens: 100, completionTokens: 50 },
                    LLM2: { content: "Second", promptTokens: 150, completionTokens: 75 },
                    Output: { result: "done" }
                })
            );

            const { context } = await simulateWorkflowExecution(workflow, mockActivities);

            const execContext = getExecutionContext(context);
            expect((execContext.LLM1 as JsonObject).promptTokens).toBe(100);
            expect((execContext.LLM2 as JsonObject).promptTokens).toBe(150);
        });
    });

    describe("execution timing", () => {
        it("should execute sequential LLMs in order", async () => {
            const workflow = createLLMPipelineWorkflow(3, ["openai", "openai", "openai"]);
            const executionTimestamps: Record<string, number> = {};

            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: {
                        customOutput: { text: "Timing test" },
                        onExecute: () => {
                            executionTimestamps.Input = Date.now();
                        }
                    },
                    LLM1: {
                        customOutput: { content: "1" },
                        delay: 10,
                        onExecute: () => {
                            executionTimestamps.LLM1 = Date.now();
                        }
                    },
                    LLM2: {
                        customOutput: { content: "2" },
                        delay: 10,
                        onExecute: () => {
                            executionTimestamps.LLM2 = Date.now();
                        }
                    },
                    LLM3: {
                        customOutput: { content: "3" },
                        delay: 10,
                        onExecute: () => {
                            executionTimestamps.LLM3 = Date.now();
                        }
                    },
                    Output: {
                        customOutput: { result: "done" },
                        onExecute: () => {
                            executionTimestamps.Output = Date.now();
                        }
                    }
                }
            });

            await simulateWorkflowExecution(workflow, mockActivities);

            // Verify sequential execution order
            expect(executionTimestamps.Input).toBeLessThanOrEqual(executionTimestamps.LLM1);
            expect(executionTimestamps.LLM1).toBeLessThanOrEqual(executionTimestamps.LLM2);
            expect(executionTimestamps.LLM2).toBeLessThanOrEqual(executionTimestamps.LLM3);
            expect(executionTimestamps.LLM3).toBeLessThanOrEqual(executionTimestamps.Output);
        });

        it("should execute parallel LLMs concurrently", async () => {
            const workflow = createParallelLLMWorkflow([
                { id: "LLM_A", provider: "openai" },
                { id: "LLM_B", provider: "openai" }
            ]);

            const startTimes: Record<string, number> = {};
            const endTimes: Record<string, number> = {};

            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: { customOutput: { text: "Parallel timing" } },
                    LLM_A: {
                        customOutput: { content: "A" },
                        delay: 50,
                        onExecute: () => {
                            startTimes.LLM_A = Date.now();
                            setTimeout(() => {
                                endTimes.LLM_A = Date.now();
                            }, 50);
                        }
                    },
                    LLM_B: {
                        customOutput: { content: "B" },
                        delay: 50,
                        onExecute: () => {
                            startTimes.LLM_B = Date.now();
                            setTimeout(() => {
                                endTimes.LLM_B = Date.now();
                            }, 50);
                        }
                    },
                    Merge: { customOutput: { merged: true } },
                    Output: { customOutput: { result: "done" } }
                }
            });

            await simulateWorkflowExecution(workflow, mockActivities);

            // Parallel nodes should start at nearly the same time
            // Using larger tolerance to account for test environment variability
            const timeDiff = Math.abs(startTimes.LLM_A - startTimes.LLM_B);
            expect(timeDiff).toBeLessThan(100); // Within 100ms of each other
        });
    });

    describe("real-world scenarios", () => {
        it("should execute content generation pipeline", async () => {
            // Simulate: Research -> Draft -> Edit -> Publish
            const workflow = createLLMPipelineWorkflow(4, [
                "openai",
                "openai",
                "anthropic",
                "openai"
            ]);
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { topic: "AI in healthcare", audience: "general" },
                    LLM1: {
                        content: "Research findings on AI healthcare applications",
                        type: "research"
                    },
                    LLM2: { content: "Draft article about AI healthcare", type: "draft" },
                    LLM3: { content: "Edited article with improved clarity", type: "edit" },
                    LLM4: {
                        content: "Final polished article ready for publishing",
                        type: "publish"
                    },
                    Output: { result: "Final polished article ready for publishing" }
                })
            );

            const { executionOrder, finalOutputs } = await simulateWorkflowExecution(
                workflow,
                mockActivities,
                { topic: "AI in healthcare", audience: "general" }
            );

            expect(executionOrder).toHaveLength(6);
            expect(finalOutputs.result).toBeDefined();
        });

        it("should execute translation pipeline with quality check", async () => {
            // Simulate: Translate -> Back-translate -> Compare -> Final
            const workflow = createLLMPipelineWorkflow(3, ["openai", "openai", "anthropic"]);
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { text: "Hello world", sourceLang: "en", targetLang: "es" },
                    LLM1: { content: "Hola mundo", type: "translation" },
                    LLM2: { content: "Hello world", type: "back-translation" },
                    LLM3: { content: "Hola mundo (verified)", quality: 0.95 },
                    Output: { result: "Hola mundo (verified)" }
                })
            );

            const { finalOutputs } = await simulateWorkflowExecution(workflow, mockActivities);

            expect(finalOutputs.result).toBeDefined();
        });
    });
});
