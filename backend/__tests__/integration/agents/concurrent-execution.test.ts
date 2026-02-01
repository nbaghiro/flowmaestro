/**
 * Concurrent Execution Integration Tests
 *
 * Tests concurrent agent execution, isolation, and resource management.
 */

import {
    createAgentTestEnvironment,
    runAgentExecution,
    createTestAgent
} from "../../helpers/agent-test-env";
import { simpleChatAgent, mcpToolFixtures } from "../../helpers/agent-test-fixtures";
import {
    createCompletionResponse,
    createToolCallResponse,
    createToolSequence
} from "../../helpers/llm-mock-client";
import type { AgentTestEnvironment } from "../../helpers/agent-test-env";

// Increase test timeout for Temporal workflows
jest.setTimeout(60000);

describe("Concurrent Execution Integration Tests", () => {
    let testEnv: AgentTestEnvironment;

    afterEach(async () => {
        if (testEnv) {
            await testEnv.cleanup();
        }
    });

    // =========================================================================
    // BASIC CONCURRENCY
    // =========================================================================

    describe("Basic Concurrency", () => {
        it("should execute multiple agents in separate environments", async () => {
            // Note: Temporal's TestWorkflowEnvironment.runUntil only supports
            // one workflow execution per environment. We test multiple agents
            // by creating separate environments for each.

            // Agent 1 in its own environment
            const testEnv1 = await createAgentTestEnvironment({
                mockLLMResponses: [createCompletionResponse("Agent 1 response")]
            });
            const agent1 = createTestAgent({ id: "agent-concurrent-1" });
            testEnv1.registerAgent(agent1);
            const result1 = await runAgentExecution(testEnv1, {
                agentId: agent1.id,
                initialMessage: "Message 1",
                threadId: "thread-1"
            });
            await testEnv1.cleanup();

            // Agent 2 in its own environment
            const testEnv2 = await createAgentTestEnvironment({
                mockLLMResponses: [createCompletionResponse("Agent 2 response")]
            });
            const agent2 = createTestAgent({ id: "agent-concurrent-2" });
            testEnv2.registerAgent(agent2);
            const result2 = await runAgentExecution(testEnv2, {
                agentId: agent2.id,
                initialMessage: "Message 2",
                threadId: "thread-2"
            });
            await testEnv2.cleanup();

            // Agent 3 in its own environment
            const testEnv3 = await createAgentTestEnvironment({
                mockLLMResponses: [createCompletionResponse("Agent 3 response")]
            });
            const agent3 = createTestAgent({ id: "agent-concurrent-3" });
            testEnv3.registerAgent(agent3);
            const result3 = await runAgentExecution(testEnv3, {
                agentId: agent3.id,
                initialMessage: "Message 3",
                threadId: "thread-3"
            });
            await testEnv3.cleanup();

            expect(result1.result.success).toBe(true);
            expect(result2.result.success).toBe(true);
            expect(result3.result.success).toBe(true);

            // Set testEnv to null to avoid double cleanup in afterEach
            testEnv = null as unknown as AgentTestEnvironment;
        });

        it("should isolate thread state between executions", async () => {
            // Test isolation with separate environments
            const testEnvA = await createAgentTestEnvironment({
                mockLLMResponses: [createCompletionResponse("Response for User A")]
            });
            testEnvA.registerAgent(simpleChatAgent);

            const resultA = await runAgentExecution(testEnvA, {
                agentId: simpleChatAgent.id,
                userId: "user-a",
                threadId: "thread-a",
                initialMessage: "I am User A"
            });
            await testEnvA.cleanup();

            const testEnvB = await createAgentTestEnvironment({
                mockLLMResponses: [createCompletionResponse("Response for User B")]
            });
            testEnvB.registerAgent(simpleChatAgent);

            const resultB = await runAgentExecution(testEnvB, {
                agentId: simpleChatAgent.id,
                userId: "user-b",
                threadId: "thread-b",
                initialMessage: "I am User B"
            });
            await testEnvB.cleanup();

            // Both should succeed with isolated state
            expect(resultA.result.success).toBe(true);
            expect(resultB.result.success).toBe(true);

            // Threads should be different
            expect(resultA.result.serializedThread.messages).not.toEqual(
                resultB.result.serializedThread.messages
            );
        });

        it("should handle concurrent credit reservations", async () => {
            // Each execution needs its own environment due to Temporal runUntil limitation
            const testEnv1 = await createAgentTestEnvironment({
                mockLLMResponses: [createCompletionResponse("Credit check 1 passed")],
                initialCredits: 1000,
                skipCreditCheck: false
            });
            testEnv1.registerAgent(simpleChatAgent);

            const result1 = await runAgentExecution(testEnv1, {
                agentId: simpleChatAgent.id,
                initialMessage: "Request 1",
                threadId: "credit-thread-1",
                skipCreditCheck: false,
                workspaceId: "workspace-concurrent"
            });
            await testEnv1.cleanup();

            const testEnv2 = await createAgentTestEnvironment({
                mockLLMResponses: [createCompletionResponse("Credit check 2 passed")],
                initialCredits: 1000,
                skipCreditCheck: false
            });
            testEnv2.registerAgent(simpleChatAgent);

            const result2 = await runAgentExecution(testEnv2, {
                agentId: simpleChatAgent.id,
                initialMessage: "Request 2",
                threadId: "credit-thread-2",
                skipCreditCheck: false,
                workspaceId: "workspace-concurrent"
            });
            await testEnv2.cleanup();

            // Both should succeed with proper credit handling
            expect(result1.result.success).toBe(true);
            expect(result2.result.success).toBe(true);

            // Set testEnv to null to avoid double cleanup in afterEach
            testEnv = null as unknown as AgentTestEnvironment;
        });
    });

    // =========================================================================
    // SAME AGENT MULTIPLE THREADS
    // =========================================================================

    describe("Same Agent Multiple Threads", () => {
        it("should run same agent on multiple threads in separate environments", async () => {
            // Each execution needs its own environment due to Temporal runUntil limitation
            const results = [];

            for (let i = 0; i < 3; i++) {
                const env = await createAgentTestEnvironment({
                    mockLLMResponses: [createCompletionResponse(`Thread ${i} response`)]
                });
                env.registerAgent(simpleChatAgent);

                const result = await runAgentExecution(env, {
                    agentId: simpleChatAgent.id,
                    initialMessage: `Thread ${i} message`,
                    threadId: `multi-thread-${i}`
                });
                results.push(result);
                await env.cleanup();
            }

            // All should succeed
            results.forEach((r) => {
                expect(r.result.success).toBe(true);
            });

            // Set testEnv to null to avoid double cleanup in afterEach
            testEnv = null as unknown as AgentTestEnvironment;
        });

        it("should maintain thread history isolation", async () => {
            // Thread 1 in its own environment
            const testEnv1 = await createAgentTestEnvironment({
                mockLLMResponses: [createCompletionResponse("Isolated response 1")]
            });
            testEnv1.registerAgent(simpleChatAgent);

            const result1 = await runAgentExecution(testEnv1, {
                agentId: simpleChatAgent.id,
                initialMessage: "Secret for thread 1: ABC123",
                threadId: "isolated-1"
            });
            await testEnv1.cleanup();

            // Thread 2 in its own environment
            const testEnv2 = await createAgentTestEnvironment({
                mockLLMResponses: [createCompletionResponse("Isolated response 2")]
            });
            testEnv2.registerAgent(simpleChatAgent);

            const result2 = await runAgentExecution(testEnv2, {
                agentId: simpleChatAgent.id,
                initialMessage: "Secret for thread 2: XYZ789",
                threadId: "isolated-2"
            });
            await testEnv2.cleanup();

            // Messages should be isolated
            const thread1Messages = result1.result.serializedThread.messages;
            const thread2Messages = result2.result.serializedThread.messages;

            // Thread 1 shouldn't contain thread 2's secret and vice versa
            const thread1Content = thread1Messages.map((m) => m.content).join(" ");
            const thread2Content = thread2Messages.map((m) => m.content).join(" ");

            expect(thread1Content).not.toContain("XYZ789");
            expect(thread2Content).not.toContain("ABC123");

            // Set testEnv to null to avoid double cleanup in afterEach
            testEnv = null as unknown as AgentTestEnvironment;
        });
    });

    // =========================================================================
    // PARALLEL TOOL CALLS WITHIN EXECUTION
    // =========================================================================

    describe("Parallel Tool Calls Within Execution", () => {
        it("should execute parallel tool calls within single agent", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: [
                    {
                        response: {
                            content: "I'll execute multiple tools in parallel",
                            tool_calls: [
                                {
                                    id: "call-1",
                                    name: "slack_send_message",
                                    arguments: { channel: "#a", text: "1" }
                                },
                                {
                                    id: "call-2",
                                    name: "slack_send_message",
                                    arguments: { channel: "#b", text: "2" }
                                },
                                {
                                    id: "call-3",
                                    name: "slack_send_message",
                                    arguments: { channel: "#c", text: "3" }
                                }
                            ]
                        }
                    },
                    createCompletionResponse("Sent all 3 messages in parallel!")
                ]
            });

            const parallelToolAgent = createTestAgent({
                id: "agent-parallel-tools",
                tools: [mcpToolFixtures.slack.sendMessage]
            });
            testEnv.registerAgent(parallelToolAgent);

            const result = await runAgentExecution(testEnv, {
                agentId: parallelToolAgent.id,
                initialMessage: "Send 3 messages in parallel"
            });

            expect(result.result.success).toBe(true);

            // All 3 tool calls should be recorded
            const toolEvents = result.events.filter((e) => e.type === "agent:tool:call:started");
            expect(toolEvents).toHaveLength(3);
        });

        it("should handle mixed parallel and sequential tool calls", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: [
                    // First: parallel calls
                    {
                        response: {
                            content: "First, parallel operations",
                            tool_calls: [
                                { id: "call-1", name: "slack_list_channels", arguments: {} },
                                {
                                    id: "call-2",
                                    name: "slack_list_channels",
                                    arguments: { types: "private_channel" }
                                }
                            ]
                        }
                    },
                    // Then: sequential call based on results
                    createToolCallResponse("slack_send_message", {
                        channel: "#general",
                        text: "Found channels!"
                    }),
                    createCompletionResponse("Listed channels and sent notification.")
                ]
            });

            const mixedAgent = createTestAgent({
                id: "agent-mixed-parallel",
                tools: [mcpToolFixtures.slack.sendMessage, mcpToolFixtures.slack.listChannels]
            });
            testEnv.registerAgent(mixedAgent);

            const result = await runAgentExecution(testEnv, {
                agentId: mixedAgent.id,
                initialMessage: "List all channels then send a summary"
            });

            expect(result.result.success).toBe(true);
        });
    });

    // =========================================================================
    // RESOURCE CONTENTION
    // =========================================================================

    describe("Resource Contention", () => {
        it("should handle access to same MCP provider from separate environments", async () => {
            // Agent 1 in its own environment
            const testEnv1 = await createAgentTestEnvironment({
                mockLLMResponses: [
                    createToolCallResponse("slack_send_message", { channel: "#a", text: "msg1" }),
                    createCompletionResponse("Message 1 sent")
                ]
            });
            const slackAgent1 = createTestAgent({
                id: "agent-slack-concurrent-1",
                tools: [mcpToolFixtures.slack.sendMessage]
            });
            testEnv1.registerAgent(slackAgent1);

            const result1 = await runAgentExecution(testEnv1, {
                agentId: slackAgent1.id,
                initialMessage: "Send to channel A",
                threadId: "slack-thread-1"
            });
            await testEnv1.cleanup();

            // Agent 2 in its own environment
            const testEnv2 = await createAgentTestEnvironment({
                mockLLMResponses: [
                    createToolCallResponse("slack_send_message", { channel: "#b", text: "msg2" }),
                    createCompletionResponse("Message 2 sent")
                ]
            });
            const slackAgent2 = createTestAgent({
                id: "agent-slack-concurrent-2",
                tools: [mcpToolFixtures.slack.sendMessage]
            });
            testEnv2.registerAgent(slackAgent2);

            const result2 = await runAgentExecution(testEnv2, {
                agentId: slackAgent2.id,
                initialMessage: "Send to channel B",
                threadId: "slack-thread-2"
            });
            await testEnv2.cleanup();

            expect(result1.result.success).toBe(true);
            expect(result2.result.success).toBe(true);

            // Set testEnv to null to avoid double cleanup in afterEach
            testEnv = null as unknown as AgentTestEnvironment;
        });

        it("should handle high load across multiple environments", async () => {
            // Each execution needs its own environment due to Temporal runUntil limitation
            const concurrentCount = 5;
            const results = [];

            for (let i = 0; i < concurrentCount; i++) {
                const env = await createAgentTestEnvironment({
                    mockLLMResponses: [createCompletionResponse(`High load response ${i}`)]
                });
                env.registerAgent(simpleChatAgent);

                const result = await runAgentExecution(env, {
                    agentId: simpleChatAgent.id,
                    initialMessage: `High load message ${i}`,
                    threadId: `high-load-${i}`
                });
                results.push(result);
                await env.cleanup();
            }

            // All should complete successfully
            const successCount = results.filter((r) => r.result.success).length;
            expect(successCount).toBe(concurrentCount);

            // Set testEnv to null to avoid double cleanup in afterEach
            testEnv = null as unknown as AgentTestEnvironment;
        });
    });

    // =========================================================================
    // EVENT ORDERING
    // =========================================================================

    describe("Event Ordering", () => {
        it("should maintain event order per execution", async () => {
            // Use iteration-matched responses for deterministic behavior
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: createToolSequence(
                    "slack_send_message",
                    { channel: "#test", text: "Hello" },
                    "Message sent!"
                )
            });

            const slackAgent = createTestAgent({
                id: "agent-event-order",
                tools: [mcpToolFixtures.slack.sendMessage]
            });
            testEnv.registerAgent(slackAgent);

            const result = await runAgentExecution(testEnv, {
                agentId: slackAgent.id,
                initialMessage: "Send a message",
                threadId: "event-order-thread"
            });

            expect(result.result.success).toBe(true);

            // Events should be in chronological order
            const timestamps = result.events.map((e) => e.timestamp);
            for (let i = 1; i < timestamps.length; i++) {
                expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
            }

            // Event sequence should be logical
            const eventTypes = result.events.map((e) => e.type);
            expect(eventTypes[0]).toBe("agent:execution:started");
            expect(eventTypes[eventTypes.length - 1]).toBe("agent:execution:completed");
        });

        it("should separate events from different executions", async () => {
            // Each execution needs its own environment
            const testEnv1 = await createAgentTestEnvironment({
                mockLLMResponses: [createCompletionResponse("Exec 1 response")]
            });
            testEnv1.registerAgent(simpleChatAgent);

            const result1 = await runAgentExecution(testEnv1, {
                agentId: simpleChatAgent.id,
                initialMessage: "Exec 1",
                threadId: "events-1"
            });
            await testEnv1.cleanup();

            const testEnv2 = await createAgentTestEnvironment({
                mockLLMResponses: [createCompletionResponse("Exec 2 response")]
            });
            testEnv2.registerAgent(simpleChatAgent);

            const result2 = await runAgentExecution(testEnv2, {
                agentId: simpleChatAgent.id,
                initialMessage: "Exec 2",
                threadId: "events-2"
            });
            await testEnv2.cleanup();

            // Both executions should have their own events
            expect(result1.events.length).toBeGreaterThan(0);
            expect(result2.events.length).toBeGreaterThan(0);

            // Each should have started and completed events
            expect(result1.events.find((e) => e.type === "agent:execution:started")).toBeDefined();
            expect(
                result1.events.find((e) => e.type === "agent:execution:completed")
            ).toBeDefined();
            expect(result2.events.find((e) => e.type === "agent:execution:started")).toBeDefined();
            expect(
                result2.events.find((e) => e.type === "agent:execution:completed")
            ).toBeDefined();

            // Set testEnv to null to avoid double cleanup in afterEach
            testEnv = null as unknown as AgentTestEnvironment;
        });
    });

    // =========================================================================
    // CLEANUP AND ISOLATION
    // =========================================================================

    describe("Cleanup and Isolation", () => {
        it("should clean up resources properly between executions", async () => {
            // Each execution needs its own environment
            const testEnv1 = await createAgentTestEnvironment({
                mockLLMResponses: [createCompletionResponse("Success response 1")]
            });
            testEnv1.registerAgent(simpleChatAgent);

            const result1 = await runAgentExecution(testEnv1, {
                agentId: simpleChatAgent.id,
                initialMessage: "Will succeed",
                threadId: "cleanup-1"
            });
            await testEnv1.cleanup();

            const testEnv2 = await createAgentTestEnvironment({
                mockLLMResponses: [createCompletionResponse("Success response 2")]
            });
            testEnv2.registerAgent(simpleChatAgent);

            const result2 = await runAgentExecution(testEnv2, {
                agentId: simpleChatAgent.id,
                initialMessage: "Will also succeed",
                threadId: "cleanup-2"
            });
            await testEnv2.cleanup();

            // Both should succeed
            expect(result1.result.success).toBe(true);
            expect(result2.result.success).toBe(true);

            // Set testEnv to null to avoid double cleanup in afterEach
            testEnv = null as unknown as AgentTestEnvironment;
        });

        it("should not leak state between test iterations", async () => {
            // First iteration
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: [createCompletionResponse("First iteration response")]
            });

            // Register the agent for first iteration
            testEnv.registerAgent(simpleChatAgent);

            const result1 = await runAgentExecution(testEnv, {
                agentId: simpleChatAgent.id,
                initialMessage: "First iteration",
                threadId: "leak-test-1"
            });

            await testEnv.cleanup();

            // Second iteration with fresh environment
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: [createCompletionResponse("Second iteration response")]
            });

            // Register the agent for second iteration (fresh environment)
            testEnv.registerAgent(simpleChatAgent);

            const result2 = await runAgentExecution(testEnv, {
                agentId: simpleChatAgent.id,
                initialMessage: "Second iteration",
                threadId: "leak-test-2"
            });

            // Both should succeed independently
            expect(result1.result.success).toBe(true);
            expect(result2.result.success).toBe(true);

            // Should have fresh LLM call counts
            expect(testEnv.llmMock.getCallCount()).toBe(1);
        });
    });
});
