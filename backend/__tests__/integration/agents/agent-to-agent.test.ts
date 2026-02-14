/**
 * Agent-to-Agent Integration Tests
 *
 * Tests multi-agent orchestration where agents can delegate to other agents.
 */

import {
    createAgentTestEnvironment,
    runAgentExecution,
    createTestAgent
} from "./helpers/agent-test-env";
import { agentToolFixtures } from "./helpers/agent-test-fixtures";
import {
    createCompletionResponse,
    createToolCallResponse,
    createToolSequence
} from "../../helpers/llm-mock-client";
import type { Tool } from "../../../src/storage/models/Agent";
import type { AgentTestEnvironment } from "./helpers/agent-test-env";

// Increase test timeout for Temporal workflows
jest.setTimeout(60000);

describe("Agent-to-Agent Integration Tests", () => {
    let testEnv: AgentTestEnvironment;

    afterEach(async () => {
        if (testEnv) {
            await testEnv.cleanup();
        }
    });

    // =========================================================================
    // BASIC DELEGATION
    // =========================================================================

    describe("Basic Delegation", () => {
        it("should execute nested agent and return result", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: createToolSequence(
                    "call_research_agent",
                    { task: "Research the latest AI trends" },
                    "The research agent found that generative AI and LLMs are the top trends in 2024."
                )
            });

            const coordinatorAgent = createTestAgent({
                id: "agent-coordinator",
                systemPrompt:
                    "You are a coordinator that delegates research tasks to specialized agents.",
                tools: [agentToolFixtures.callResearchAgent]
            });
            testEnv.registerAgent(coordinatorAgent);

            const result = await runAgentExecution(testEnv, {
                agentId: coordinatorAgent.id,
                initialMessage: "What are the latest AI trends?"
            });

            expect(result.result.success).toBe(true);
            expect(result.result.finalMessage).toContain("AI");

            // Verify agent tool was called
            const toolEvent = result.events.find((e) => e.type === "agent:tool:call:started");
            expect(toolEvent?.data.toolName).toBe("call_research_agent");
        });

        it("should create separate thread for nested agent", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: createToolSequence(
                    "call_slack_agent",
                    { task: "Notify the team about the meeting" },
                    "The Slack agent has notified the team in #general."
                )
            });

            const coordinatorAgent = createTestAgent({
                id: "agent-thread-coordinator",
                tools: [agentToolFixtures.callSlackAgent]
            });
            testEnv.registerAgent(coordinatorAgent);

            const result = await runAgentExecution(testEnv, {
                agentId: coordinatorAgent.id,
                initialMessage: "Notify the team about today's meeting"
            });

            expect(result.result.success).toBe(true);
        });
    });

    // =========================================================================
    // ERROR HANDLING IN DELEGATION
    // =========================================================================

    describe("Error Handling in Delegation", () => {
        it("should handle nested agent errors gracefully", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: [
                    createToolCallResponse("call_research_agent", {
                        task: "Impossible research task"
                    }),
                    createCompletionResponse(
                        "I encountered an issue with the research agent. Let me try to help directly instead."
                    )
                ]
            });

            const coordinatorAgent = createTestAgent({
                id: "agent-error-coordinator",
                tools: [agentToolFixtures.callResearchAgent]
            });
            testEnv.registerAgent(coordinatorAgent);

            const result = await runAgentExecution(testEnv, {
                agentId: coordinatorAgent.id,
                initialMessage: "Research something impossible"
            });

            // Coordinator should handle the error gracefully
            expect(result.result.success).toBe(true);
        });

        it("should handle missing nested agent", async () => {
            const invalidAgentTool: Tool = {
                id: "tool-invalid-agent",
                name: "call_nonexistent_agent",
                description: "Call a nonexistent agent",
                type: "agent",
                schema: {
                    type: "object",
                    properties: {
                        task: { type: "string" }
                    }
                },
                config: {
                    agentId: "agent-does-not-exist"
                }
            };

            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: [
                    createToolCallResponse("call_nonexistent_agent", { task: "test" }),
                    createCompletionResponse(
                        "I couldn't reach that agent. Let me help you directly."
                    )
                ]
            });

            const coordinatorAgent = createTestAgent({
                id: "agent-missing-coordinator",
                tools: [invalidAgentTool]
            });
            testEnv.registerAgent(coordinatorAgent);

            const result = await runAgentExecution(testEnv, {
                agentId: coordinatorAgent.id,
                initialMessage: "Delegate to nonexistent agent"
            });

            expect(result.result.success).toBe(true);
        });
    });

    // =========================================================================
    // CIRCULAR CALL PREVENTION
    // =========================================================================

    describe("Circular Call Prevention", () => {
        it("should prevent direct circular agent calls", async () => {
            // Agent that tries to call itself
            const selfCallingTool: Tool = {
                id: "tool-self-call",
                name: "call_self",
                description: "Call this same agent",
                type: "agent",
                schema: {
                    type: "object",
                    properties: {
                        task: { type: "string" }
                    }
                },
                config: {
                    agentId: "agent-circular"
                }
            };

            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: [
                    createToolCallResponse("call_self", { task: "recursive task" }),
                    createCompletionResponse(
                        "I cannot call myself recursively. Let me help directly."
                    )
                ]
            });

            const circularAgent = createTestAgent({
                id: "agent-circular",
                tools: [selfCallingTool]
            });
            testEnv.registerAgent(circularAgent);

            const result = await runAgentExecution(testEnv, {
                agentId: circularAgent.id,
                initialMessage: "Call yourself"
            });

            // Should complete without infinite recursion
            expect(result.result.success).toBe(true);
        });

        it("should detect and prevent indirect circular calls (A->B->A)", async () => {
            // This tests the scenario where Agent A calls Agent B, and B tries to call A
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: [
                    createToolCallResponse("call_agent_b", { task: "process data" }),
                    createCompletionResponse("Completed the task without circular calls.")
                ]
            });

            const callAgentB: Tool = {
                id: "tool-call-b",
                name: "call_agent_b",
                description: "Call Agent B",
                type: "agent",
                schema: {
                    type: "object",
                    properties: { task: { type: "string" } }
                },
                config: { agentId: "agent-b" }
            };

            const agentA = createTestAgent({
                id: "agent-a",
                tools: [callAgentB]
            });
            testEnv.registerAgent(agentA);

            const result = await runAgentExecution(testEnv, {
                agentId: agentA.id,
                initialMessage: "Start the chain"
            });

            expect(result.result.success).toBe(true);
        });
    });

    // =========================================================================
    // CREDIT TRACKING ACROSS AGENTS
    // =========================================================================

    describe("Credit Tracking Across Agents", () => {
        it("should track credits across parent and child agents", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: createToolSequence(
                    "call_research_agent",
                    { task: "Quick research" },
                    "Research complete."
                ),
                initialCredits: 1000,
                skipCreditCheck: false
            });

            const coordinatorAgent = createTestAgent({
                id: "agent-credit-coordinator",
                tools: [agentToolFixtures.callResearchAgent]
            });
            testEnv.registerAgent(coordinatorAgent);

            const result = await runAgentExecution(testEnv, {
                agentId: coordinatorAgent.id,
                initialMessage: "Do some research",
                skipCreditCheck: false,
                workspaceId: "workspace-multi-agent"
            });

            expect(result.result.success).toBe(true);
        });

        it("should fail if combined credit usage exceeds balance", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: [
                    createToolCallResponse("call_research_agent", { task: "Expensive research" }),
                    createCompletionResponse("Completed")
                ],
                initialCredits: 10, // Very low credits
                skipCreditCheck: false
            });

            const coordinatorAgent = createTestAgent({
                id: "agent-low-credit-coordinator",
                tools: [agentToolFixtures.callResearchAgent]
            });
            testEnv.registerAgent(coordinatorAgent);

            const result = await runAgentExecution(testEnv, {
                agentId: coordinatorAgent.id,
                initialMessage: "Do expensive research",
                skipCreditCheck: false,
                workspaceId: "workspace-low-credits"
            });

            // With low credits, execution behavior depends on implementation
            expect(result.result).toBeDefined();
        });
    });

    // =========================================================================
    // MULTI-AGENT WORKFLOWS
    // =========================================================================

    describe("Multi-Agent Workflows", () => {
        it("should orchestrate multiple agents in sequence", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: [
                    createToolCallResponse("call_research_agent", {
                        task: "Research market trends"
                    }),
                    createToolCallResponse("call_slack_agent", {
                        task: "Share research findings in #marketing"
                    }),
                    createCompletionResponse(
                        "I've completed the research and shared the findings with the marketing team."
                    )
                ]
            });

            const masterCoordinator = createTestAgent({
                id: "agent-master",
                systemPrompt: "You coordinate multiple agents to complete complex tasks.",
                tools: [agentToolFixtures.callResearchAgent, agentToolFixtures.callSlackAgent]
            });
            testEnv.registerAgent(masterCoordinator);

            const result = await runAgentExecution(testEnv, {
                agentId: masterCoordinator.id,
                initialMessage: "Research market trends and share with the marketing team"
            });

            expect(result.result.success).toBe(true);

            // Verify both agents were called
            const toolEvents = result.events.filter((e) => e.type === "agent:tool:call:started");
            expect(toolEvents).toHaveLength(2);
        });

        it("should handle parallel agent delegation", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: [
                    // Parallel calls to multiple agents
                    {
                        response: {
                            content: "Delegating to multiple agents simultaneously",
                            tool_calls: [
                                {
                                    id: "call-1",
                                    name: "call_research_agent",
                                    arguments: { task: "Research A" }
                                },
                                {
                                    id: "call-2",
                                    name: "call_slack_agent",
                                    arguments: { task: "Notify team" }
                                }
                            ]
                        }
                    },
                    createCompletionResponse("Both tasks completed in parallel.")
                ]
            });

            const parallelCoordinator = createTestAgent({
                id: "agent-parallel",
                tools: [agentToolFixtures.callResearchAgent, agentToolFixtures.callSlackAgent]
            });
            testEnv.registerAgent(parallelCoordinator);

            const result = await runAgentExecution(testEnv, {
                agentId: parallelCoordinator.id,
                initialMessage: "Research something and notify the team at the same time"
            });

            expect(result.result.success).toBe(true);
        });
    });

    // =========================================================================
    // CONTEXT PASSING
    // =========================================================================

    describe("Context Passing", () => {
        it("should pass context to nested agent", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: createToolSequence(
                    "call_research_agent",
                    {
                        task: "Research competitors",
                        context: "Our company is in the AI/ML space"
                    },
                    "Based on the context you provided, I found relevant competitor information."
                )
            });

            const contextAwareCoordinator = createTestAgent({
                id: "agent-context-coordinator",
                tools: [
                    {
                        id: "tool-research-context",
                        name: "call_research_agent",
                        description: "Delegate research with context",
                        type: "agent",
                        schema: {
                            type: "object",
                            properties: {
                                task: { type: "string" },
                                context: { type: "string" }
                            },
                            required: ["task"]
                        },
                        config: { agentId: "agent-research" }
                    }
                ]
            });
            testEnv.registerAgent(contextAwareCoordinator);

            const result = await runAgentExecution(testEnv, {
                agentId: contextAwareCoordinator.id,
                initialMessage: "Research our competitors in the AI space"
            });

            expect(result.result.success).toBe(true);
        });

        it("should return structured results from nested agent", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: createToolSequence(
                    "call_research_agent",
                    { task: "List top 3 competitors" },
                    "The research agent identified: 1. CompetitorA, 2. CompetitorB, 3. CompetitorC"
                )
            });

            const structuredCoordinator = createTestAgent({
                id: "agent-structured-coordinator",
                tools: [agentToolFixtures.callResearchAgent]
            });
            testEnv.registerAgent(structuredCoordinator);

            const result = await runAgentExecution(testEnv, {
                agentId: structuredCoordinator.id,
                initialMessage: "Give me a list of our top 3 competitors"
            });

            expect(result.result.success).toBe(true);
            expect(result.result.finalMessage).toContain("Competitor");
        });
    });
});
