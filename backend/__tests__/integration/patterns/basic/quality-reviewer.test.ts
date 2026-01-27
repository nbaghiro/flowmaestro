/**
 * Quality Reviewer Pattern Tests
 *
 * Tests content generation with quality evaluation and conditional branching.
 * Pattern: input-1 → llm-generate → llm-evaluate → conditional-quality → output-1
 */

import {
    simulatePatternExecution,
    loadPattern,
    validatePatternStructure,
    createMockLLMOutput,
    createMockConditionalOutput,
    assertPatternSuccess,
    assertNodesExecuted,
    getPatternNodeIds
} from "../helpers/pattern-test-utils";

describe("Quality Reviewer Pattern", () => {
    const PATTERN_ID = "quality-reviewer";

    describe("pattern structure validation", () => {
        it("should have valid pattern structure", () => {
            const validation = validatePatternStructure(PATTERN_ID);
            expect(validation.valid).toBe(true);
            expect(validation.errors).toHaveLength(0);
        });

        it("should have correct node count", () => {
            const nodeIds = getPatternNodeIds(PATTERN_ID);
            expect(nodeIds.length).toBeGreaterThanOrEqual(4);
        });

        it("should have generation and evaluation LLM nodes", () => {
            const pattern = loadPattern(PATTERN_ID);
            const llmNodes = Object.entries(pattern.definition.nodes)
                .filter(([_, node]) => node.type === "llm")
                .map(([id]) => id);
            expect(llmNodes.length).toBeGreaterThanOrEqual(2);
        });

        it("should have a conditional node", () => {
            const pattern = loadPattern(PATTERN_ID);
            const conditionalNodes = Object.values(pattern.definition.nodes).filter(
                (n) => n.type === "conditional"
            );
            expect(conditionalNodes.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe("content passes quality check", () => {
        it("should output when quality score exceeds threshold", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { request: "Write a product description for headphones" },
                mockOutputs: {
                    "llm-generate": createMockLLMOutput(
                        "Premium wireless headphones with active noise cancellation, 30-hour battery life, and crystal-clear sound. Perfect for audiophiles and commuters alike."
                    ),
                    "llm-evaluate": createMockLLMOutput(
                        JSON.stringify({
                            score: 9,
                            feedback: "Excellent description with key features highlighted",
                            passesThreshold: true
                        })
                    ),
                    "conditional-quality": createMockConditionalOutput(true)
                }
            });

            assertPatternSuccess(result);
            const conditionalOutput = result.context.nodeOutputs.get("conditional-quality");
            expect(conditionalOutput).toMatchObject({ result: true });
        });

        it("should execute the output branch when quality passes", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { request: "Write a tagline" },
                mockOutputs: {
                    "llm-generate": createMockLLMOutput("Innovation meets simplicity."),
                    "llm-evaluate": createMockLLMOutput(
                        JSON.stringify({ score: 8, passesThreshold: true })
                    ),
                    "conditional-quality": createMockConditionalOutput(true)
                }
            });

            assertPatternSuccess(result);
            assertNodesExecuted(result, ["output-1"]);
        });
    });

    describe("content fails quality check", () => {
        it("should flag when quality score below threshold", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { request: "Write a product description" },
                mockOutputs: {
                    "llm-generate": createMockLLMOutput("This is a product. It does stuff."),
                    "llm-evaluate": createMockLLMOutput(
                        JSON.stringify({
                            score: 3,
                            feedback: "Too vague, lacks specific features",
                            passesThreshold: false
                        })
                    ),
                    "conditional-quality": createMockConditionalOutput(false)
                }
            });

            assertPatternSuccess(result);
            const conditionalOutput = result.context.nodeOutputs.get("conditional-quality");
            expect(conditionalOutput).toMatchObject({ result: false });
        });
    });

    describe("evaluation criteria", () => {
        it("should evaluate based on multiple criteria", async () => {
            const evaluationResult = {
                score: 7,
                criteria: {
                    clarity: 8,
                    relevance: 7,
                    engagement: 6,
                    grammar: 9
                },
                passesThreshold: true,
                feedback: "Good overall, could improve engagement"
            };

            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { request: "Write an email subject line" },
                mockOutputs: {
                    "llm-generate": createMockLLMOutput("Important: Your account update"),
                    "llm-evaluate": createMockLLMOutput(JSON.stringify(evaluationResult)),
                    "conditional-quality": createMockConditionalOutput(true)
                }
            });

            assertPatternSuccess(result);
            const llmEvalOutput = result.context.nodeOutputs.get("llm-evaluate") as Record<
                string,
                unknown
            >;
            const parsed = JSON.parse(llmEvalOutput.text as string);
            expect(parsed.criteria.clarity).toBe(8);
        });

        it("should use threshold from configuration", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { request: "Write content" },
                mockOutputs: {
                    "llm-generate": createMockLLMOutput("Generated content"),
                    "llm-evaluate": createMockLLMOutput(
                        JSON.stringify({ score: 6, threshold: 7, passesThreshold: false })
                    ),
                    "conditional-quality": createMockConditionalOutput(false)
                }
            });

            assertPatternSuccess(result);
            const conditionalOutput = result.context.nodeOutputs.get("conditional-quality");
            expect(conditionalOutput).toMatchObject({ result: false });
        });
    });

    describe("edge cases", () => {
        it("should handle borderline quality score", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { request: "Write something" },
                mockOutputs: {
                    "llm-generate": createMockLLMOutput("Borderline content"),
                    "llm-evaluate": createMockLLMOutput(
                        JSON.stringify({ score: 7, threshold: 7, passesThreshold: true })
                    ),
                    "conditional-quality": createMockConditionalOutput(true)
                }
            });

            assertPatternSuccess(result);
            const conditionalOutput = result.context.nodeOutputs.get("conditional-quality");
            expect(conditionalOutput).toMatchObject({ result: true });
        });

        it("should handle empty content generation", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { request: "Generate nothing" },
                mockOutputs: {
                    "llm-generate": createMockLLMOutput(""),
                    "llm-evaluate": createMockLLMOutput(
                        JSON.stringify({
                            score: 0,
                            passesThreshold: false,
                            feedback: "Empty content"
                        })
                    ),
                    "conditional-quality": createMockConditionalOutput(false)
                }
            });

            assertPatternSuccess(result);
            const conditionalOutput = result.context.nodeOutputs.get("conditional-quality");
            expect(conditionalOutput).toMatchObject({ result: false });
        });

        it("should handle very long generated content", async () => {
            const longContent = "This is a detailed product description. ".repeat(100);

            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { request: "Write a detailed description" },
                mockOutputs: {
                    "llm-generate": createMockLLMOutput(longContent),
                    "llm-evaluate": createMockLLMOutput(
                        JSON.stringify({ score: 8, passesThreshold: true })
                    ),
                    "conditional-quality": createMockConditionalOutput(true)
                }
            });

            assertPatternSuccess(result);
        });
    });

    describe("execution flow", () => {
        it("should execute nodes in correct order for passing content", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { request: "Test request" },
                mockOutputs: {
                    "llm-generate": createMockLLMOutput("Good content"),
                    "llm-evaluate": createMockLLMOutput(
                        JSON.stringify({ score: 9, passesThreshold: true })
                    ),
                    "conditional-quality": createMockConditionalOutput(true)
                }
            });

            assertPatternSuccess(result);
            // Verify key nodes executed
            assertNodesExecuted(result, ["input-1", "llm-generate", "llm-evaluate"]);
        });

        it("should execute nodes in correct order for failing content", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { request: "Test request" },
                mockOutputs: {
                    "llm-generate": createMockLLMOutput("Bad content"),
                    "llm-evaluate": createMockLLMOutput(
                        JSON.stringify({ score: 2, passesThreshold: false })
                    ),
                    "conditional-quality": createMockConditionalOutput(false)
                }
            });

            assertPatternSuccess(result);
            assertNodesExecuted(result, ["input-1", "llm-generate", "llm-evaluate"]);
        });
    });

    describe("token tracking", () => {
        it("should track tokens for both LLM calls", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { request: "Token tracking test" },
                mockOutputs: {
                    "llm-generate": createMockLLMOutput("Generated content", {
                        tokens: { prompt: 50, completion: 100 }
                    }),
                    "llm-evaluate": createMockLLMOutput(
                        JSON.stringify({ score: 8, passesThreshold: true }),
                        { tokens: { prompt: 150, completion: 50 } }
                    ),
                    "conditional-quality": createMockConditionalOutput(true)
                }
            });

            assertPatternSuccess(result);

            const generateOutput = result.context.nodeOutputs.get("llm-generate") as Record<
                string,
                unknown
            >;
            const evaluateOutput = result.context.nodeOutputs.get("llm-evaluate") as Record<
                string,
                unknown
            >;

            expect(generateOutput.tokens).toEqual({ prompt: 50, completion: 100 });
            expect(evaluateOutput.tokens).toEqual({ prompt: 150, completion: 50 });
        });
    });
});
