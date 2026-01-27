/**
 * Chain of Thought Pattern Integration Tests
 *
 * Tests multi-step reasoning workflow: input → llm (analyze) → llm (reason) → llm (synthesize) → output
 * Pattern: chain-of-thought (5 nodes)
 */

import {
    simulatePatternExecution,
    loadPattern,
    validatePatternStructure,
    createMockLLMOutput,
    assertPatternSuccess,
    assertExecutionOrder,
    assertNodeOutput,
    assertNodesExecuted
} from "../helpers/pattern-test-utils";

describe("Chain of Thought Pattern", () => {
    const PATTERN_ID = "chain-of-thought";

    describe("pattern structure validation", () => {
        it("should have valid pattern structure", () => {
            const validation = validatePatternStructure(PATTERN_ID);
            expect(validation.valid).toBe(true);
            expect(validation.errors).toHaveLength(0);
        });

        it("should have exactly 5 nodes", () => {
            const pattern = loadPattern(PATTERN_ID);
            expect(pattern.nodeCount).toBe(5);
            expect(Object.keys(pattern.definition.nodes)).toHaveLength(5);
        });

        it("should have 3 LLM nodes for the reasoning chain", () => {
            const pattern = loadPattern(PATTERN_ID);
            const llmNodes = Object.values(pattern.definition.nodes).filter(
                (n) => n.type === "llm"
            );
            expect(llmNodes).toHaveLength(3);
        });

        it("should have sequential edge connections", () => {
            const pattern = loadPattern(PATTERN_ID);
            const edges = pattern.definition.edges;

            // Verify the chain: input → analyze → reason → synthesize → output
            expect(edges.some((e) => e.source === "input-1" && e.target === "llm-analyze")).toBe(
                true
            );
            expect(edges.some((e) => e.source === "llm-analyze" && e.target === "llm-reason")).toBe(
                true
            );
            expect(
                edges.some((e) => e.source === "llm-reason" && e.target === "llm-synthesize")
            ).toBe(true);
            expect(
                edges.some((e) => e.source === "llm-synthesize" && e.target === "output-1")
            ).toBe(true);
        });

        it("should have different system prompts for each LLM", () => {
            const pattern = loadPattern(PATTERN_ID);
            const llmConfigs = Object.values(pattern.definition.nodes)
                .filter((n) => n.type === "llm")
                .map((n) => (n.config as Record<string, unknown>).systemPrompt);

            // All prompts should be unique
            const uniquePrompts = new Set(llmConfigs);
            expect(uniquePrompts.size).toBe(3);
        });
    });

    describe("happy path execution", () => {
        it("should execute all 5 nodes in correct order", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { problem: "How can we reduce climate change?" },
                mockOutputs: {
                    "llm-analyze": createMockLLMOutput(
                        "Key components: 1. Carbon emissions 2. Deforestation 3. Industrial processes"
                    ),
                    "llm-reason": createMockLLMOutput(
                        "Reducing carbon emissions requires: renewable energy, efficiency improvements..."
                    ),
                    "llm-synthesize": createMockLLMOutput(
                        "Conclusion: A multi-pronged approach combining policy, technology, and behavior change."
                    )
                }
            });

            assertPatternSuccess(result);
            assertExecutionOrder(result, [
                "input-1",
                "llm-analyze",
                "llm-reason",
                "llm-synthesize",
                "output-1"
            ]);
        });

        it("should pass problem input through the chain", async () => {
            const problem = "Solve the traveling salesman problem for 5 cities";

            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { problem },
                mockOutputs: {
                    "llm-analyze": createMockLLMOutput("Analysis: NP-hard optimization problem..."),
                    "llm-reason": createMockLLMOutput("Reasoning: Can use heuristics like..."),
                    "llm-synthesize": createMockLLMOutput("Solution: Use genetic algorithm...")
                }
            });

            assertPatternSuccess(result);

            // Input should capture the problem
            const inputOutput = result.context.nodeOutputs.get("input-1");
            expect(inputOutput).toMatchObject({ value: problem });
        });

        it("should accumulate context through the chain", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { problem: "Design a recommendation system" },
                mockOutputs: {
                    "llm-analyze": createMockLLMOutput(
                        "Analysis: collaborative filtering, content-based..."
                    ),
                    "llm-reason": createMockLLMOutput(
                        "Reasoning: hybrid approach combines strengths..."
                    ),
                    "llm-synthesize": createMockLLMOutput(
                        "Synthesis: Implement hybrid system with cold-start handling"
                    )
                }
            });

            assertPatternSuccess(result);

            // All nodes should have outputs in context
            expect(result.context.nodeOutputs.has("input-1")).toBe(true);
            expect(result.context.nodeOutputs.has("llm-analyze")).toBe(true);
            expect(result.context.nodeOutputs.has("llm-reason")).toBe(true);
            expect(result.context.nodeOutputs.has("llm-synthesize")).toBe(true);
            expect(result.context.nodeOutputs.has("output-1")).toBe(true);
        });
    });

    describe("reasoning chain quality", () => {
        it("should produce analysis in first LLM step", async () => {
            const analysisText =
                "Key components identified:\n1. User requirements\n2. Technical constraints\n3. Budget limitations";

            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { problem: "Build a mobile app" },
                mockOutputs: {
                    "llm-analyze": createMockLLMOutput(analysisText),
                    "llm-reason": createMockLLMOutput("Based on analysis..."),
                    "llm-synthesize": createMockLLMOutput("Final recommendation...")
                }
            });

            assertPatternSuccess(result);
            assertNodeOutput(result, "llm-analyze", { text: analysisText });
        });

        it("should produce reasoning that builds on analysis", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { problem: "Optimize database queries" },
                mockOutputs: {
                    "llm-analyze": createMockLLMOutput("Analysis: N+1 queries, missing indexes..."),
                    "llm-reason": createMockLLMOutput(
                        "Step 1: Add indexes. Step 2: Use eager loading. Step 3: Cache results."
                    ),
                    "llm-synthesize": createMockLLMOutput("Implementation plan ready.")
                }
            });

            assertPatternSuccess(result);

            const reasoningOutput = result.context.nodeOutputs.get("llm-reason") as Record<
                string,
                unknown
            >;
            expect(reasoningOutput.text).toContain("Step");
        });

        it("should produce synthesis that combines previous outputs", async () => {
            const synthesis = "Based on the analysis and reasoning, the recommended approach is...";

            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { problem: "Complex decision" },
                mockOutputs: {
                    "llm-analyze": createMockLLMOutput("Analysis complete"),
                    "llm-reason": createMockLLMOutput("Reasoning complete"),
                    "llm-synthesize": createMockLLMOutput(synthesis)
                }
            });

            assertPatternSuccess(result);
            assertNodeOutput(result, "llm-synthesize", { text: synthesis });
        });
    });

    describe("complex problem handling", () => {
        it("should handle multi-paragraph problem descriptions", async () => {
            const complexProblem = `
                Our company is facing multiple challenges:
                
                1. Revenue is declining by 15% YoY
                2. Customer churn has increased to 25%
                3. Employee satisfaction scores are at an all-time low
                
                We need a comprehensive strategy to address all these issues
                while maintaining our core product development roadmap.
            `;

            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { problem: complexProblem },
                mockOutputs: {
                    "llm-analyze": createMockLLMOutput(
                        "Three interconnected issues identified: revenue, retention, culture..."
                    ),
                    "llm-reason": createMockLLMOutput(
                        "Root cause analysis suggests correlation between employee satisfaction and churn..."
                    ),
                    "llm-synthesize": createMockLLMOutput(
                        "Prioritized action plan: 1. Address employee concerns 2. Improve product 3. Retention campaigns"
                    )
                }
            });

            assertPatternSuccess(result);
            assertNodesExecuted(result, [
                "input-1",
                "llm-analyze",
                "llm-reason",
                "llm-synthesize",
                "output-1"
            ]);
        });

        it("should handle technical problems with code snippets", async () => {
            const technicalProblem = `
                Debug this code:
                \`\`\`python
                def fib(n):
                    return fib(n-1) + fib(n-2)
                \`\`\`
                It causes a RecursionError.
            `;

            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { problem: technicalProblem },
                mockOutputs: {
                    "llm-analyze": createMockLLMOutput(
                        "Issues: Missing base case, infinite recursion"
                    ),
                    "llm-reason": createMockLLMOutput("Base case needed when n <= 1"),
                    "llm-synthesize": createMockLLMOutput(
                        "Fixed code with base case: if n <= 1: return n"
                    )
                }
            });

            assertPatternSuccess(result);
        });

        it("should handle problems requiring ethical reasoning", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { problem: "Should AI be used in hiring decisions?" },
                mockOutputs: {
                    "llm-analyze": createMockLLMOutput(
                        "Stakeholders: candidates, employers, society. Trade-offs: efficiency vs bias."
                    ),
                    "llm-reason": createMockLLMOutput(
                        "Ethical considerations: fairness, transparency, human oversight..."
                    ),
                    "llm-synthesize": createMockLLMOutput(
                        "Recommendation: Use AI as a tool with human oversight and bias auditing."
                    )
                }
            });

            assertPatternSuccess(result);
        });
    });

    describe("edge cases", () => {
        it("should handle empty problem", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { problem: "" },
                mockOutputs: {
                    "llm-analyze": createMockLLMOutput("No problem provided to analyze."),
                    "llm-reason": createMockLLMOutput("Cannot reason without input."),
                    "llm-synthesize": createMockLLMOutput("Please provide a problem to solve.")
                }
            });

            assertPatternSuccess(result);
        });

        it("should handle very short problem", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { problem: "Why?" },
                mockOutputs: {
                    "llm-analyze": createMockLLMOutput("The question is ambiguous..."),
                    "llm-reason": createMockLLMOutput("Need more context..."),
                    "llm-synthesize": createMockLLMOutput(
                        "Please clarify what you want to understand."
                    )
                }
            });

            assertPatternSuccess(result);
        });

        it("should handle problem with only special characters", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { problem: "!@#$%^&*()" },
                mockOutputs: {
                    "llm-analyze": createMockLLMOutput("Input contains only special characters."),
                    "llm-reason": createMockLLMOutput("No meaningful content to process."),
                    "llm-synthesize": createMockLLMOutput(
                        "Unable to provide analysis for this input."
                    )
                }
            });

            assertPatternSuccess(result);
        });
    });

    describe("token usage tracking", () => {
        it("should track tokens across all LLM calls", async () => {
            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { problem: "Token test" },
                mockOutputs: {
                    "llm-analyze": createMockLLMOutput("Analysis", {
                        tokens: { prompt: 100, completion: 50 }
                    }),
                    "llm-reason": createMockLLMOutput("Reasoning", {
                        tokens: { prompt: 150, completion: 75 }
                    }),
                    "llm-synthesize": createMockLLMOutput("Synthesis", {
                        tokens: { prompt: 200, completion: 100 }
                    })
                }
            });

            assertPatternSuccess(result);

            // Each LLM node should have token counts
            const analyzeOutput = result.context.nodeOutputs.get("llm-analyze") as Record<
                string,
                unknown
            >;
            const reasonOutput = result.context.nodeOutputs.get("llm-reason") as Record<
                string,
                unknown
            >;
            const synthesizeOutput = result.context.nodeOutputs.get("llm-synthesize") as Record<
                string,
                unknown
            >;

            expect(analyzeOutput.tokens).toEqual({ prompt: 100, completion: 50 });
            expect(reasonOutput.tokens).toEqual({ prompt: 150, completion: 75 });
            expect(synthesizeOutput.tokens).toEqual({ prompt: 200, completion: 100 });
        });
    });

    describe("output formatting", () => {
        it("should preserve formatting in final outputs", async () => {
            const formattedSynthesis = `
## Conclusion

### Key Findings
- Finding 1
- Finding 2

### Recommendations
1. Do this
2. Then this
            `.trim();

            const result = await simulatePatternExecution({
                patternId: PATTERN_ID,
                inputs: { problem: "Format test" },
                mockOutputs: {
                    "llm-analyze": createMockLLMOutput("Analysis"),
                    "llm-reason": createMockLLMOutput("Reasoning"),
                    "llm-synthesize": createMockLLMOutput(formattedSynthesis)
                }
            });

            assertPatternSuccess(result);
            assertNodeOutput(result, "llm-synthesize", { text: formattedSynthesis });
        });
    });
});
