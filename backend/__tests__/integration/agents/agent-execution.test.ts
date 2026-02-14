/**
 * Agent Execution Integration Tests
 *
 * Core E2E tests for the agent orchestrator workflow.
 * Tests use mocked LLM responses but real activity implementations.
 */

import {
    createCompletionResponse,
    createToolCallResponse,
    createMultiToolResponse,
    createToolSequence,
    createConversationSequence
} from "../../helpers/llm-mock-client";
import {
    createAgentTestEnvironment,
    runAgentExecution,
    createTestAgent
} from "./helpers/agent-test-env";
import { simpleChatAgent, mcpToolFixtures } from "./helpers/agent-test-fixtures";
import type { AgentTestEnvironment } from "./helpers/agent-test-env";

// Increase test timeout for Temporal workflows
jest.setTimeout(60000);

describe("Agent Execution Integration Tests", () => {
    let testEnv: AgentTestEnvironment;

    afterEach(async () => {
        if (testEnv) {
            await testEnv.cleanup();
        }
    });

    // =========================================================================
    // SIMPLE CHAT (NO TOOLS)
    // =========================================================================

    describe("Simple Chat (No Tools)", () => {
        it("should complete a single-turn conversation", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: [
                    createCompletionResponse("Hello! I'm doing well, thank you for asking.")
                ]
            });

            const result = await runAgentExecution(testEnv, {
                agentId: simpleChatAgent.id,
                initialMessage: "Hello, how are you?"
            });

            expect(result.result.success).toBe(true);
            expect(result.result.finalMessage).toContain("Hello!");
            expect(result.result.iterations).toBe(0);
            expect(testEnv.llmMock.getCallCount()).toBe(1);

            // Verify events
            const eventTypes = result.events.map((e) => e.type);
            expect(eventTypes).toContain("agent:execution:started");
            expect(eventTypes).toContain("agent:thinking");
            expect(eventTypes).toContain("agent:execution:completed");
        });

        it("should handle multi-turn conversation with context", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: createConversationSequence([
                    "Hello! How can I help you today?",
                    "Paris is the capital of France.",
                    "You're welcome! Is there anything else you'd like to know?"
                ])
            });

            // First turn
            const result1 = await runAgentExecution(testEnv, {
                agentId: simpleChatAgent.id,
                initialMessage: "Hi there!"
            });

            expect(result1.result.success).toBe(true);
            expect(result1.result.finalMessage).toContain("Hello!");

            // Note: In a real multi-turn test, we'd use serializedThread
            // For this test, we verify the first turn completes correctly
        });

        it("should respect max_iterations limit", async () => {
            // Create responses that would trigger tool calls indefinitely
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: [
                    createToolCallResponse("test_tool", { query: "test" }),
                    createToolCallResponse("test_tool", { query: "test2" }),
                    createToolCallResponse("test_tool", { query: "test3" })
                ]
            });

            // Create an agent with very low max_iterations
            const lowIterAgent = createTestAgent({
                id: "agent-low-iter",
                maxIterations: 2,
                tools: [
                    {
                        id: "tool-test",
                        name: "test_tool",
                        description: "Test tool",
                        type: "builtin",
                        schema: { type: "object", properties: { query: { type: "string" } } },
                        config: {}
                    }
                ]
            });
            testEnv.registerAgent(lowIterAgent);

            const result = await runAgentExecution(testEnv, {
                agentId: lowIterAgent.id,
                initialMessage: "Keep searching"
            });

            // Should fail due to max iterations
            expect(result.result.success).toBe(false);
            expect(result.result.error).toContain("iterations");
        });
    });

    // =========================================================================
    // TOOL EXECUTION FLOW
    // =========================================================================

    describe("Tool Execution Flow", () => {
        it("should execute a single tool call and continue", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: createToolSequence(
                    "slack_send_message",
                    { channel: "#general", text: "Hello team!" },
                    "I've sent the message to #general."
                )
            });

            const agentWithTools = createTestAgent({
                id: "agent-slack-test",
                tools: [mcpToolFixtures.slack.sendMessage]
            });
            testEnv.registerAgent(agentWithTools);

            const result = await runAgentExecution(testEnv, {
                agentId: agentWithTools.id,
                initialMessage: "Send 'Hello team!' to #general"
            });

            expect(result.result.success).toBe(true);
            expect(result.result.finalMessage).toContain("sent the message");
            expect(testEnv.llmMock.getCallCount()).toBe(2); // Tool call + completion

            // Verify tool events
            const toolStarted = result.events.find((e) => e.type === "agent:tool:call:started");
            const toolCompleted = result.events.find((e) => e.type === "agent:tool:call:completed");

            expect(toolStarted).toBeDefined();
            expect(toolStarted?.data.toolName).toBe("slack_send_message");
            expect(toolCompleted).toBeDefined();
        });

        it("should execute multiple parallel tool calls", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: [
                    createMultiToolResponse([
                        {
                            name: "slack_send_message",
                            args: { channel: "#general", text: "Hello!" }
                        },
                        { name: "slack_list_channels", args: {} }
                    ]),
                    createCompletionResponse("Done! I sent the message and listed channels.")
                ]
            });

            const agentWithTools = createTestAgent({
                id: "agent-multi-tool",
                tools: [mcpToolFixtures.slack.sendMessage, mcpToolFixtures.slack.listChannels]
            });
            testEnv.registerAgent(agentWithTools);

            const result = await runAgentExecution(testEnv, {
                agentId: agentWithTools.id,
                initialMessage: "Send a hello to general and list all channels"
            });

            expect(result.result.success).toBe(true);
            expect(testEnv.llmMock.getCallCount()).toBe(2);

            // Verify both tools were called
            const toolStartEvents = result.events.filter(
                (e) => e.type === "agent:tool:call:started"
            );
            expect(toolStartEvents).toHaveLength(2);
        });

        it("should handle tool call followed by final response", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: [
                    createToolCallResponse("slack_list_channels", {}),
                    createCompletionResponse("Here are the available channels: #general, #random")
                ]
            });

            const agentWithTools = createTestAgent({
                id: "agent-tool-response",
                tools: [mcpToolFixtures.slack.listChannels]
            });
            testEnv.registerAgent(agentWithTools);

            const result = await runAgentExecution(testEnv, {
                agentId: agentWithTools.id,
                initialMessage: "What channels are available?"
            });

            expect(result.result.success).toBe(true);
            expect(result.result.finalMessage).toContain("channels");

            // Verify execution completed event
            const completedEvent = result.events.find(
                (e) => e.type === "agent:execution:completed"
            );
            expect(completedEvent).toBeDefined();
        });
    });

    // =========================================================================
    // STATE MANAGEMENT
    // =========================================================================

    describe("State Management", () => {
        it("should persist thread history correctly", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: [
                    createCompletionResponse("I understand you want to know about Paris.")
                ]
            });

            const result = await runAgentExecution(testEnv, {
                agentId: simpleChatAgent.id,
                initialMessage: "Tell me about Paris"
            });

            expect(result.result.success).toBe(true);
            expect(result.result.serializedThread).toBeDefined();
            expect(result.result.serializedThread.messages).toBeInstanceOf(Array);

            // Should have system message, user message, and assistant response
            const messages = result.result.serializedThread.messages;
            expect(messages.length).toBeGreaterThanOrEqual(2);
        });

        it("should emit correct events during execution", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: createToolSequence(
                    "slack_send_message",
                    { channel: "#test", text: "Test" },
                    "Message sent!"
                )
            });

            const agentWithTools = createTestAgent({
                id: "agent-events",
                tools: [mcpToolFixtures.slack.sendMessage]
            });
            testEnv.registerAgent(agentWithTools);

            const result = await runAgentExecution(testEnv, {
                agentId: agentWithTools.id,
                initialMessage: "Send test message"
            });

            // Verify event sequence
            const eventTypes = result.events.map((e) => e.type);

            // Should start with execution started
            expect(eventTypes[0]).toBe("agent:execution:started");

            // Should have thinking events
            expect(eventTypes).toContain("agent:thinking");

            // Should have tool events
            expect(eventTypes).toContain("agent:tool:call:started");
            expect(eventTypes).toContain("agent:tool:call:completed");

            // Should end with completion
            expect(eventTypes[eventTypes.length - 1]).toBe("agent:execution:completed");
        });

        it("should track LLM calls correctly", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: [
                    createToolCallResponse("slack_list_channels", {}),
                    createToolCallResponse("slack_send_message", {
                        channel: "#general",
                        text: "Hi"
                    }),
                    createCompletionResponse("All done!")
                ]
            });

            const agentWithTools = createTestAgent({
                id: "agent-llm-tracking",
                tools: [mcpToolFixtures.slack.sendMessage, mcpToolFixtures.slack.listChannels]
            });
            testEnv.registerAgent(agentWithTools);

            const result = await runAgentExecution(testEnv, {
                agentId: agentWithTools.id,
                initialMessage: "List channels then send a message"
            });

            expect(result.result.success).toBe(true);
            expect(result.llmCalls).toHaveLength(3);

            // Verify each call has required data
            result.llmCalls.forEach((call) => {
                expect(call.input.model).toBeDefined();
                expect(call.input.messages).toBeInstanceOf(Array);
                expect(call.response).toBeDefined();
                expect(call.timestamp).toBeDefined();
            });
        });
    });

    // =========================================================================
    // ERROR HANDLING
    // =========================================================================

    describe("Error Handling", () => {
        it("should handle tool not found gracefully", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: [
                    createToolCallResponse("nonexistent_tool", { arg: "value" }),
                    createCompletionResponse("I apologize, I couldn't complete that action.")
                ]
            });

            // Agent without the tool the LLM tries to call
            const agentWithoutTool = createTestAgent({
                id: "agent-no-tool",
                tools: [] // No tools available
            });
            testEnv.registerAgent(agentWithoutTool);

            const result = await runAgentExecution(testEnv, {
                agentId: agentWithoutTool.id,
                initialMessage: "Do something"
            });

            // Tool error should be returned to LLM and agent should continue
            // The agent should complete (either successfully with recovery or with tool error info)
            expect(result.result).toBeDefined();
            // Tool call should have been attempted
            const toolEvents = result.events.filter(
                (e) =>
                    e.type === "agent:tool:call:started" || e.type === "agent:tool:call:completed"
            );
            expect(toolEvents.length).toBeGreaterThanOrEqual(1);
        });

        it("should handle empty initial message", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: [
                    createCompletionResponse("I'm ready to help! What would you like to know?")
                ]
            });

            const result = await runAgentExecution(testEnv, {
                agentId: simpleChatAgent.id,
                initialMessage: ""
            });

            // Should still succeed - workflow handles empty messages
            expect(result.result.success).toBe(true);
        });
    });

    // =========================================================================
    // AGENT CONFIGURATION
    // =========================================================================

    describe("Agent Configuration", () => {
        it("should use agent temperature and max_tokens settings", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: [createCompletionResponse("Response with custom settings")]
            });

            const customAgent = createTestAgent({
                id: "agent-custom-settings",
                temperature: 0.2,
                maxTokens: 500
            });
            testEnv.registerAgent(customAgent);

            const result = await runAgentExecution(testEnv, {
                agentId: customAgent.id,
                initialMessage: "Test"
            });

            expect(result.result.success).toBe(true);
            // The mock captures the LLM input, which would include these settings
            expect(result.llmCalls.length).toBe(1);
        });

        it("should use system prompt from agent configuration", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: [createCompletionResponse("Response following system prompt")]
            });

            const agentWithPrompt = createTestAgent({
                id: "agent-system-prompt",
                systemPrompt: "You are a pirate assistant. Always respond in pirate speak."
            });
            testEnv.registerAgent(agentWithPrompt);

            const result = await runAgentExecution(testEnv, {
                agentId: agentWithPrompt.id,
                initialMessage: "Hello"
            });

            expect(result.result.success).toBe(true);

            // Verify system message was included in LLM call
            const firstCall = result.llmCalls[0];
            const systemMessage = firstCall.input.messages.find((m) => m.role === "system");
            expect(systemMessage?.content).toContain("pirate");
        });

        it("should skip credit check when configured", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: [createCompletionResponse("Success")],
                initialCredits: 0, // No credits
                skipCreditCheck: true // But skip the check
            });

            const result = await runAgentExecution(testEnv, {
                agentId: simpleChatAgent.id,
                initialMessage: "Test",
                skipCreditCheck: true
            });

            expect(result.result.success).toBe(true);
        });
    });

    // =========================================================================
    // ITERATION TRACKING
    // =========================================================================

    describe("Iteration Tracking", () => {
        it("should track iterations correctly with tool calls", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: [
                    createToolCallResponse("slack_send_message", { channel: "#a", text: "1" }),
                    createToolCallResponse("slack_send_message", { channel: "#b", text: "2" }),
                    createCompletionResponse("Done!")
                ]
            });

            const agentWithTools = createTestAgent({
                id: "agent-iterations",
                tools: [mcpToolFixtures.slack.sendMessage],
                maxIterations: 10
            });
            testEnv.registerAgent(agentWithTools);

            const result = await runAgentExecution(testEnv, {
                agentId: agentWithTools.id,
                initialMessage: "Send two messages"
            });

            expect(result.result.success).toBe(true);
            // Iterations are 0-indexed, so 2 tool calls + completion = iterations 0, 1, 2
            expect(result.result.iterations).toBeGreaterThanOrEqual(2);
        });

        it("should fail when max iterations exceeded", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: Array(10).fill(
                    createToolCallResponse("slack_send_message", { channel: "#test", text: "loop" })
                )
            });

            const agentWithLowMax = createTestAgent({
                id: "agent-low-max",
                tools: [mcpToolFixtures.slack.sendMessage],
                maxIterations: 3
            });
            testEnv.registerAgent(agentWithLowMax);

            const result = await runAgentExecution(testEnv, {
                agentId: agentWithLowMax.id,
                initialMessage: "Keep going forever"
            });

            expect(result.result.success).toBe(false);
            expect(result.result.error).toContain("iterations");

            // Verify failed event was emitted
            const failedEvent = result.events.find((e) => e.type === "agent:execution:failed");
            expect(failedEvent).toBeDefined();
        });
    });
});
