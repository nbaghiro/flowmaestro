/**
 * Simple Chat Pattern Integration Tests
 *
 * Tests the simplest workflow pattern: input → llm → output
 * Pattern: simple-chat (3 nodes)
 */

import {
    simulatePatternExecution,
    loadPattern,
    validatePatternStructure,
    createMockLLMOutput,
    assertPatternSuccess,
    assertExecutionOrder,
    assertNodeOutput
} from "../helpers/pattern-test-utils";

describe("Simple Chat Pattern", () => {
    const PATTERN_ID = "simple-chat";

    describe("pattern structure validation", () => {
        it("should have valid pattern structure", () => {
            const validation = validatePatternStructure(PATTERN_ID);
            expect(validation.valid).toBe(true);
            expect(validation.errors).toHaveLength(0);
        });

        it("should have exactly 3 nodes", () => {
            const pattern = loadPattern(PATTERN_ID);
            expect(pattern.nodeCount).toBe(3);
            expect(Object.keys(pattern.definition.nodes)).toHaveLength(3);
        });

        it("should have correct node types", () => {
            const pattern = loadPattern(PATTERN_ID);
            const nodeTypes = Object.values(pattern.definition.nodes).map((n) => n.type);
            expect(nodeTypes).toContain("input");
            expect(nodeTypes).toContain("llm");
            expect(nodeTypes).toContain("output");
        });

        it("should have input-1 as entry point", () => {
            const pattern = loadPattern(PATTERN_ID);
            expect(pattern.definition.entryPoint).toBe("input-1");
        });

        it("should have correct edge connections", () => {
            const pattern = loadPattern(PATTERN_ID);
            const edges = pattern.definition.edges;

            // input-1 → llm-1
            expect(edges.some((e) => e.source === "input-1" && e.target === "llm-1")).toBe(true);
            // llm-1 → output-1
            expect(edges.some((e) => e.source === "llm-1" && e.target === "output-1")).toBe(true);
        });
    });

    describe("happy path execution", () => {
        it("should execute all nodes in correct order", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { userQuestion: "What is the capital of France?" },
                mockOutputs: {
                    "llm-1": createMockLLMOutput("The capital of France is Paris.")
                }
            });

            assertPatternSuccess(result);
            assertExecutionOrder(result, ["input-1", "llm-1", "output-1"]);
        });

        it("should pass user input to LLM node", async () => {
            const userQuestion = "Explain quantum computing in simple terms";

            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { userQuestion },
                mockOutputs: {
                    "llm-1": createMockLLMOutput("Quantum computing uses qubits...")
                }
            });

            assertPatternSuccess(result);

            // Input node should store the user question
            const inputOutput = result.context.nodeOutputs.get("input-1");
            expect(inputOutput).toMatchObject({ value: userQuestion });
        });

        it("should produce LLM output with expected structure", async () => {
            const llmResponse = "This is the AI response";

            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { userQuestion: "Hello" },
                mockOutputs: {
                    "llm-1": createMockLLMOutput(llmResponse)
                }
            });

            assertPatternSuccess(result);
            assertNodeOutput(result, "llm-1", {
                text: llmResponse,
                model: "gpt-4o"
            });
        });

        it("should handle long user questions", async () => {
            const longQuestion = "A".repeat(10000);

            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { userQuestion: longQuestion },
                mockOutputs: {
                    "llm-1": createMockLLMOutput("Response to long question")
                }
            });

            assertPatternSuccess(result);
            expect(result.executionOrder).toHaveLength(3);
        });

        it("should handle special characters in input", async () => {
            const specialInput = "What's the meaning of 日本語? <script>alert('xss')</script>";

            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { userQuestion: specialInput },
                mockOutputs: {
                    "llm-1": createMockLLMOutput("Japanese characters response")
                }
            });

            assertPatternSuccess(result);
        });
    });

    describe("edge cases", () => {
        it("should handle empty user question", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { userQuestion: "" },
                mockOutputs: {
                    "llm-1": createMockLLMOutput("Please provide a question.")
                }
            });

            assertPatternSuccess(result);

            // Input should capture empty string
            const inputOutput = result.context.nodeOutputs.get("input-1");
            expect(inputOutput).toMatchObject({ value: "" });
        });

        it("should handle whitespace-only input", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { userQuestion: "   \n\t  " },
                mockOutputs: {
                    "llm-1": createMockLLMOutput("Please provide a valid question.")
                }
            });

            assertPatternSuccess(result);
        });

        it("should handle numeric input coerced to string", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { userQuestion: 42 as unknown as string },
                mockOutputs: {
                    "llm-1": createMockLLMOutput("42 is the answer to everything.")
                }
            });

            assertPatternSuccess(result);
        });

        it("should handle null input gracefully", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { userQuestion: null as unknown as string },
                mockOutputs: {
                    "llm-1": createMockLLMOutput("No input provided.")
                }
            });

            assertPatternSuccess(result);
        });
    });

    describe("LLM response variations", () => {
        it("should handle multiline LLM responses", async () => {
            const multilineResponse = `Here's a list:
1. First item
2. Second item
3. Third item

And a conclusion.`;

            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { userQuestion: "Give me a list" },
                mockOutputs: {
                    "llm-1": createMockLLMOutput(multilineResponse)
                }
            });

            assertPatternSuccess(result);
            assertNodeOutput(result, "llm-1", { text: multilineResponse });
        });

        it("should handle JSON in LLM response", async () => {
            const jsonResponse = '{"answer": "Paris", "confidence": 0.99}';

            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { userQuestion: "What is the capital of France? Reply in JSON." },
                mockOutputs: {
                    "llm-1": createMockLLMOutput(jsonResponse)
                }
            });

            assertPatternSuccess(result);
            assertNodeOutput(result, "llm-1", { text: jsonResponse });
        });

        it("should handle markdown in LLM response", async () => {
            const markdownResponse = `# Answer

Here's the **bold** answer with *italics* and \`code\`.

\`\`\`python
print("Hello")
\`\`\``;

            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { userQuestion: "Show me code" },
                mockOutputs: {
                    "llm-1": createMockLLMOutput(markdownResponse)
                }
            });

            assertPatternSuccess(result);
        });

        it("should include token usage in LLM output", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { userQuestion: "Brief question" },
                mockOutputs: {
                    "llm-1": createMockLLMOutput("Brief answer", {
                        tokens: { prompt: 50, completion: 20 }
                    })
                }
            });

            assertPatternSuccess(result);

            const llmOutput = result.context.nodeOutputs.get("llm-1") as Record<string, unknown>;
            expect(llmOutput.tokens).toEqual({ prompt: 50, completion: 20 });
        });
    });

    describe("context flow", () => {
        it("should maintain input in context after LLM execution", async () => {
            const question = "Test question";

            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { userQuestion: question },
                mockOutputs: {
                    "llm-1": createMockLLMOutput("Test answer")
                }
            });

            assertPatternSuccess(result);

            // All node outputs should be in context
            expect(result.context.nodeOutputs.has("input-1")).toBe(true);
            expect(result.context.nodeOutputs.has("llm-1")).toBe(true);
            expect(result.context.nodeOutputs.has("output-1")).toBe(true);
        });

        it("should have correct final outputs in result", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { userQuestion: "Final test" },
                mockOutputs: {
                    "llm-1": createMockLLMOutput("Final answer")
                }
            });

            assertPatternSuccess(result);

            // finalOutputs should contain all executed nodes
            expect(result.finalOutputs["input-1"]).toBeDefined();
            expect(result.finalOutputs["llm-1"]).toBeDefined();
            expect(result.finalOutputs["output-1"]).toBeDefined();
        });
    });
});
