/**
 * Smart Router Pattern Integration Tests
 *
 * Tests dynamic routing workflow: input → router → [technical|general|creative LLM] → output
 * Pattern: smart-router (6 nodes)
 */

import {
    simulateRouterPatternExecution,
    loadPattern,
    validatePatternStructure,
    createMockLLMOutput,
    createMockRouterOutput,
    assertPatternSuccess,
    assertNodesExecuted,
    assertNodesNotExecuted,
    assertNodeOutput,
    getOutgoingEdges,
    getSandboxDataService,
    getFixtureRegistry
} from "../helpers/pattern-test-utils";

describe("Smart Router Pattern", () => {
    const PATTERN_ID = "smart-router";
    const sandboxDataService = getSandboxDataService();

    beforeEach(() => {
        sandboxDataService.clearScenarios();
    });

    describe("pattern structure validation", () => {
        it("should have valid pattern structure", () => {
            const validation = validatePatternStructure(PATTERN_ID);
            expect(validation.valid).toBe(true);
            expect(validation.errors).toHaveLength(0);
        });

        it("should have exactly 6 nodes", () => {
            const pattern = loadPattern(PATTERN_ID);
            expect(pattern.nodeCount).toBe(6);
            expect(Object.keys(pattern.definition.nodes)).toHaveLength(6);
        });

        it("should have a router node", () => {
            const pattern = loadPattern(PATTERN_ID);
            const routerNodes = Object.values(pattern.definition.nodes).filter(
                (n) => n.type === "router"
            );
            expect(routerNodes).toHaveLength(1);
        });

        it("should have 3 specialized LLM nodes", () => {
            const pattern = loadPattern(PATTERN_ID);
            const llmNodes = Object.values(pattern.definition.nodes).filter(
                (n) => n.type === "llm"
            );
            expect(llmNodes).toHaveLength(3);

            // Check for different specializations
            const llmNames = llmNodes.map((n) => n.name);
            expect(llmNames).toContain("Technical Expert");
            expect(llmNames).toContain("General Assistant");
            expect(llmNames).toContain("Creative Writer");
        });

        it("should have router with 3 outgoing routes", () => {
            const pattern = loadPattern(PATTERN_ID);
            const routerEdges = getOutgoingEdges(pattern.definition, "router-1");

            expect(routerEdges).toHaveLength(3);

            const handles = routerEdges.map((e) => e.sourceHandle);
            expect(handles).toContain("technical");
            expect(handles).toContain("general");
            expect(handles).toContain("creative");
        });

        it("should have all LLM nodes connecting to output", () => {
            const pattern = loadPattern(PATTERN_ID);
            const edges = pattern.definition.edges;

            expect(edges.some((e) => e.source === "llm-technical" && e.target === "output-1")).toBe(
                true
            );
            expect(edges.some((e) => e.source === "llm-general" && e.target === "output-1")).toBe(
                true
            );
            expect(edges.some((e) => e.source === "llm-creative" && e.target === "output-1")).toBe(
                true
            );
        });
    });

    describe("technical route", () => {
        it("should route technical questions to technical expert", async () => {
            const result = await simulateRouterPatternExecution({
                patternId: PATTERN_ID,
                routerNodeId: "router-1",
                selectedRoute: "technical",
                inputs: { request: "How do I fix a null pointer exception in Java?" },
                mockOutputs: {
                    "router-1": createMockRouterOutput("technical"),
                    "llm-technical": createMockLLMOutput(
                        "A NullPointerException occurs when you try to use a reference that points to null. Here's how to fix it: 1. Check for null before accessing..."
                    )
                }
            });

            assertPatternSuccess(result);
            assertNodesExecuted(result, ["input-1", "router-1", "llm-technical", "output-1"]);
            assertNodesNotExecuted(result, ["llm-general", "llm-creative"]);
        });

        it("should handle debugging requests", async () => {
            const result = await simulateRouterPatternExecution({
                patternId: PATTERN_ID,
                routerNodeId: "router-1",
                selectedRoute: "technical",
                inputs: { request: "Debug this code: for(i=0; i<10; i++) { console.log(i) }" },
                mockOutputs: {
                    "router-1": createMockRouterOutput("technical"),
                    "llm-technical": createMockLLMOutput(
                        "The issue is missing 'let' or 'var' before 'i'. Use: for(let i=0; i<10; i++)"
                    )
                }
            });

            assertPatternSuccess(result);
            assertNodesExecuted(result, ["llm-technical"]);
        });

        it("should handle architecture questions", async () => {
            const result = await simulateRouterPatternExecution({
                patternId: PATTERN_ID,
                routerNodeId: "router-1",
                selectedRoute: "technical",
                inputs: { request: "What's the difference between microservices and monolith?" },
                mockOutputs: {
                    "router-1": createMockRouterOutput("technical"),
                    "llm-technical": createMockLLMOutput(
                        "Microservices: distributed, scalable, complex. Monolith: simpler, coupled, easier to deploy initially."
                    )
                }
            });

            assertPatternSuccess(result);
        });

        it("should use lower temperature for technical responses", () => {
            const pattern = loadPattern(PATTERN_ID);
            const technicalNode = pattern.definition.nodes["llm-technical"];
            const config = technicalNode.config as Record<string, unknown>;

            expect(config.temperature).toBeLessThanOrEqual(0.5);
        });
    });

    describe("general route", () => {
        it("should route general questions to general assistant", async () => {
            const result = await simulateRouterPatternExecution({
                patternId: PATTERN_ID,
                routerNodeId: "router-1",
                selectedRoute: "general",
                inputs: { request: "What time is it in Tokyo?" },
                mockOutputs: {
                    "router-1": createMockRouterOutput("general"),
                    "llm-general": createMockLLMOutput(
                        "I cannot tell you the current time, but Tokyo is in JST (UTC+9). If it's noon in UTC, it's 9 PM in Tokyo."
                    )
                }
            });

            assertPatternSuccess(result);
            assertNodesExecuted(result, ["input-1", "router-1", "llm-general", "output-1"]);
            assertNodesNotExecuted(result, ["llm-technical", "llm-creative"]);
        });

        it("should handle informational requests", async () => {
            const result = await simulateRouterPatternExecution({
                patternId: PATTERN_ID,
                routerNodeId: "router-1",
                selectedRoute: "general",
                inputs: { request: "Tell me about the history of the Eiffel Tower" },
                mockOutputs: {
                    "router-1": createMockRouterOutput("general"),
                    "llm-general": createMockLLMOutput(
                        "The Eiffel Tower was built in 1889 for the World's Fair, designed by Gustave Eiffel..."
                    )
                }
            });

            assertPatternSuccess(result);
        });

        it("should handle how-to questions", async () => {
            const result = await simulateRouterPatternExecution({
                patternId: PATTERN_ID,
                routerNodeId: "router-1",
                selectedRoute: "general",
                inputs: { request: "How do I make a good cup of coffee?" },
                mockOutputs: {
                    "router-1": createMockRouterOutput("general"),
                    "llm-general": createMockLLMOutput(
                        "For a great cup of coffee: 1. Use fresh beans 2. Grind just before brewing 3. Use water at 195-205°F..."
                    )
                }
            });

            assertPatternSuccess(result);
        });

        it("should be the default route", () => {
            const pattern = loadPattern(PATTERN_ID);
            const routerNode = pattern.definition.nodes["router-1"];
            const config = routerNode.config as Record<string, unknown>;

            expect(config.defaultRoute).toBe("general");
        });
    });

    describe("creative route", () => {
        it("should route creative requests to creative writer", async () => {
            const result = await simulateRouterPatternExecution({
                patternId: PATTERN_ID,
                routerNodeId: "router-1",
                selectedRoute: "creative",
                inputs: { request: "Write me a haiku about coding" },
                mockOutputs: {
                    "router-1": createMockRouterOutput("creative"),
                    "llm-creative": createMockLLMOutput(
                        "Fingers on keyboard\nBugs hide in the logic maze\nCoffee fuels the fix"
                    )
                }
            });

            assertPatternSuccess(result);
            assertNodesExecuted(result, ["input-1", "router-1", "llm-creative", "output-1"]);
            assertNodesNotExecuted(result, ["llm-technical", "llm-general"]);
        });

        it("should handle story requests", async () => {
            const result = await simulateRouterPatternExecution({
                patternId: PATTERN_ID,
                routerNodeId: "router-1",
                selectedRoute: "creative",
                inputs: { request: "Write a short story about a robot learning to love" },
                mockOutputs: {
                    "router-1": createMockRouterOutput("creative"),
                    "llm-creative": createMockLLMOutput(
                        "Unit-7 had processed 3.2 million emotion datasets, yet none prepared it for the warmth spreading through its circuits when Sarah smiled..."
                    )
                }
            });

            assertPatternSuccess(result);
        });

        it("should handle brainstorming requests", async () => {
            const result = await simulateRouterPatternExecution({
                patternId: PATTERN_ID,
                routerNodeId: "router-1",
                selectedRoute: "creative",
                inputs: { request: "Give me 5 creative names for a coffee shop" },
                mockOutputs: {
                    "router-1": createMockRouterOutput("creative"),
                    "llm-creative": createMockLLMOutput(
                        "1. The Daily Grind Chronicles\n2. Bean There, Brewed That\n3. Espresso Yourself\n4. The Percolating Poet\n5. Grounds for Celebration"
                    )
                }
            });

            assertPatternSuccess(result);
        });

        it("should use higher temperature for creative responses", () => {
            const pattern = loadPattern(PATTERN_ID);
            const creativeNode = pattern.definition.nodes["llm-creative"];
            const config = creativeNode.config as Record<string, unknown>;

            expect(config.temperature).toBeGreaterThanOrEqual(0.7);
        });
    });

    describe("router classification", () => {
        it("should include confidence in router output", async () => {
            const result = await simulateRouterPatternExecution({
                patternId: PATTERN_ID,
                routerNodeId: "router-1",
                selectedRoute: "technical",
                inputs: { request: "Explain React hooks" },
                mockOutputs: {
                    "router-1": createMockRouterOutput("technical"),
                    "llm-technical": createMockLLMOutput("React hooks are...")
                }
            });

            assertPatternSuccess(result);
            assertNodeOutput(result, "router-1", {
                selectedRoute: "technical",
                confidence: 0.95
            });
        });

        it("should route ambiguous requests to default (general)", async () => {
            const result = await simulateRouterPatternExecution({
                patternId: PATTERN_ID,
                routerNodeId: "router-1",
                selectedRoute: "general",
                inputs: { request: "Hello, how are you?" },
                mockOutputs: {
                    "router-1": createMockRouterOutput("general"),
                    "llm-general": createMockLLMOutput(
                        "Hello! I'm doing well, thank you for asking. How can I help you today?"
                    )
                }
            });

            assertPatternSuccess(result);
            assertNodesExecuted(result, ["llm-general"]);
        });
    });

    describe("edge cases", () => {
        it("should handle empty request", async () => {
            const result = await simulateRouterPatternExecution({
                patternId: PATTERN_ID,
                routerNodeId: "router-1",
                selectedRoute: "general",
                inputs: { request: "" },
                mockOutputs: {
                    "router-1": createMockRouterOutput("general"),
                    "llm-general": createMockLLMOutput(
                        "I notice you haven't provided a request. How can I help you?"
                    )
                }
            });

            assertPatternSuccess(result);
        });

        it("should handle mixed content requests", async () => {
            // A request that could be routed multiple ways
            const result = await simulateRouterPatternExecution({
                patternId: PATTERN_ID,
                routerNodeId: "router-1",
                selectedRoute: "technical",
                inputs: { request: "Write a creative story about debugging code" },
                mockOutputs: {
                    "router-1": createMockRouterOutput("technical"),
                    "llm-technical": createMockLLMOutput(
                        "Here's a technical perspective on debugging narratives..."
                    )
                }
            });

            assertPatternSuccess(result);
        });

        it("should handle very long requests", async () => {
            const longRequest = "Technical question: " + "explain ".repeat(1000) + "recursion";

            const result = await simulateRouterPatternExecution({
                patternId: PATTERN_ID,
                routerNodeId: "router-1",
                selectedRoute: "technical",
                inputs: { request: longRequest },
                mockOutputs: {
                    "router-1": createMockRouterOutput("technical"),
                    "llm-technical": createMockLLMOutput(
                        "Recursion is a function calling itself..."
                    )
                }
            });

            assertPatternSuccess(result);
        });

        it("should handle special characters in request", async () => {
            const result = await simulateRouterPatternExecution({
                patternId: PATTERN_ID,
                routerNodeId: "router-1",
                selectedRoute: "technical",
                inputs: { request: "What does `const x = () => {}` mean in JavaScript?" },
                mockOutputs: {
                    "router-1": createMockRouterOutput("technical"),
                    "llm-technical": createMockLLMOutput(
                        "This is an arrow function expression assigned to a constant..."
                    )
                }
            });

            assertPatternSuccess(result);
        });
    });

    describe("output aggregation", () => {
        it("should produce output regardless of route taken", async () => {
            // Test all three routes produce valid output
            const routes = ["technical", "general", "creative"] as const;
            const llmNodes = ["llm-technical", "llm-general", "llm-creative"];

            for (let i = 0; i < routes.length; i++) {
                const route = routes[i];
                const llmNode = llmNodes[i];

                const result = await simulateRouterPatternExecution({
                    patternId: PATTERN_ID,
                    routerNodeId: "router-1",
                    selectedRoute: route,
                    inputs: { request: `Test ${route} route` },
                    mockOutputs: {
                        "router-1": createMockRouterOutput(route),
                        [llmNode]: createMockLLMOutput(`Response from ${route} expert`)
                    }
                });

                assertPatternSuccess(result);
                expect(result.finalOutputs["output-1"]).toBeDefined();
            }
        });

        it("should include router decision in context", async () => {
            const result = await simulateRouterPatternExecution({
                patternId: PATTERN_ID,
                routerNodeId: "router-1",
                selectedRoute: "creative",
                inputs: { request: "Write a poem" },
                mockOutputs: {
                    "router-1": createMockRouterOutput("creative"),
                    "llm-creative": createMockLLMOutput("Roses are red...")
                }
            });

            assertPatternSuccess(result);

            // Router output should be in context
            const routerOutput = result.context.nodeOutputs.get("router-1");
            expect(routerOutput).toBeDefined();
        });
    });

    describe("sandbox data integration", () => {
        it("should have fixture registry available", () => {
            const fixtureRegistry = getFixtureRegistry();
            const providers = fixtureRegistry.getProviders();
            expect(providers.length).toBeGreaterThan(0);
        });

        it("should be ready for extending pattern with integrations", () => {
            const fixtureRegistry = getFixtureRegistry();
            // Router pattern could be extended with Slack notifications for routing decisions
            expect(fixtureRegistry.has("slack", "sendMessage")).toBe(true);
        });
    });
});
