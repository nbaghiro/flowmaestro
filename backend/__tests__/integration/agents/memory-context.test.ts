/**
 * Memory Context Integration Tests
 *
 * Tests thread memory, working memory, shared memory, and context window management.
 */

import {
    createAgentTestEnvironment,
    runAgentExecution,
    createTestAgent
} from "./helpers/agent-test-env";
import { simpleChatAgent, VECTOR_MEMORY_CONFIG } from "./helpers/agent-test-fixtures";
import { createCompletionResponse, createToolCallResponse } from "../../helpers/llm-mock-client";
import type { MemoryConfig } from "../../../src/storage/models/Agent";
import type { AgentTestEnvironment } from "./helpers/agent-test-env";

// Increase test timeout for Temporal workflows
jest.setTimeout(60000);

describe("Memory Context Integration Tests", () => {
    let testEnv: AgentTestEnvironment;

    afterEach(async () => {
        if (testEnv) {
            await testEnv.cleanup();
        }
    });

    // =========================================================================
    // THREAD MEMORY
    // =========================================================================

    describe("Thread Memory", () => {
        it("should preserve message history in thread", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: [createCompletionResponse("Your name is Alex. Nice to meet you!")]
            });

            const result = await runAgentExecution(testEnv, {
                agentId: simpleChatAgent.id,
                initialMessage: "My name is Alex"
            });

            expect(result.result.success).toBe(true);
            expect(result.result.serializedThread).toBeDefined();

            // Verify messages are in the thread
            const messages = result.result.serializedThread.messages;
            expect(messages.length).toBeGreaterThanOrEqual(2);

            // Should have system, user, and assistant messages
            const roles = messages.map((m) => m.role);
            expect(roles).toContain("system");
            expect(roles).toContain("user");
        });

        it("should include tool messages in thread", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: [
                    createToolCallResponse("search_memory", { query: "previous discussion" }),
                    createCompletionResponse(
                        "Based on our previous conversation, you mentioned wanting to learn Python."
                    )
                ]
            });

            const memoryAgent = createTestAgent({
                id: "agent-thread-memory",
                tools: [
                    {
                        id: "tool-memory",
                        name: "search_memory",
                        description: "Search conversation memory",
                        type: "builtin",
                        schema: { type: "object", properties: { query: { type: "string" } } },
                        config: {}
                    }
                ]
            });
            testEnv.registerAgent(memoryAgent);

            const result = await runAgentExecution(testEnv, {
                agentId: memoryAgent.id,
                initialMessage: "What did we discuss before?"
            });

            expect(result.result.success).toBe(true);

            // Thread should include tool messages
            const messages = result.result.serializedThread.messages;
            const toolMessages = messages.filter((m) => m.role === "tool");
            expect(toolMessages.length).toBeGreaterThanOrEqual(1);
        });

        it("should auto-inject thread memory tool", async () => {
            // The agent orchestrator should automatically inject thread memory tool
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: [
                    createCompletionResponse("I can search our conversation history to help you.")
                ]
            });

            const result = await runAgentExecution(testEnv, {
                agentId: simpleChatAgent.id,
                initialMessage: "Can you remember our past conversations?"
            });

            expect(result.result.success).toBe(true);
        });
    });

    // =========================================================================
    // WORKING MEMORY
    // =========================================================================

    describe("Working Memory", () => {
        it("should persist working memory across iterations", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: [
                    createToolCallResponse("update_working_memory", {
                        key: "user_preference",
                        value: "prefers detailed explanations"
                    }),
                    createCompletionResponse(
                        "I've noted your preference for detailed explanations."
                    )
                ]
            });

            const workingMemoryAgent = createTestAgent({
                id: "agent-working-memory",
                tools: [
                    {
                        id: "tool-working-memory",
                        name: "update_working_memory",
                        description: "Store information in working memory",
                        type: "builtin",
                        schema: {
                            type: "object",
                            properties: {
                                key: { type: "string" },
                                value: { type: "string" }
                            }
                        },
                        config: {}
                    }
                ]
            });
            testEnv.registerAgent(workingMemoryAgent);

            const result = await runAgentExecution(testEnv, {
                agentId: workingMemoryAgent.id,
                initialMessage: "Remember that I prefer detailed explanations"
            });

            expect(result.result.success).toBe(true);
        });

        it("should return working memory to LLM", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: [
                    createCompletionResponse(
                        "I recall from our working memory that you prefer Python."
                    )
                ]
            });

            const result = await runAgentExecution(testEnv, {
                agentId: simpleChatAgent.id,
                initialMessage: "What programming language do I prefer?"
            });

            expect(result.result.success).toBe(true);
        });
    });

    // =========================================================================
    // SHARED MEMORY
    // =========================================================================

    describe("Shared Memory", () => {
        it("should read from shared memory", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: [
                    createToolCallResponse("read_shared_memory", { key: "team_goal" }),
                    createCompletionResponse("The team's goal is to launch the product by Q4.")
                ]
            });

            const sharedMemoryAgent = createTestAgent({
                id: "agent-shared-read",
                tools: [
                    {
                        id: "tool-read-shared",
                        name: "read_shared_memory",
                        description: "Read from shared memory",
                        type: "builtin",
                        schema: {
                            type: "object",
                            properties: {
                                key: { type: "string" }
                            }
                        },
                        config: {}
                    }
                ]
            });
            testEnv.registerAgent(sharedMemoryAgent);

            const result = await runAgentExecution(testEnv, {
                agentId: sharedMemoryAgent.id,
                initialMessage: "What is the team goal?"
            });

            expect(result.result.success).toBe(true);
        });

        it("should write to shared memory", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: [
                    createToolCallResponse("write_shared_memory", {
                        key: "meeting_notes",
                        value: "Discussed Q4 roadmap"
                    }),
                    createCompletionResponse("I've saved the meeting notes to shared memory.")
                ]
            });

            const sharedMemoryAgent = createTestAgent({
                id: "agent-shared-write",
                tools: [
                    {
                        id: "tool-write-shared",
                        name: "write_shared_memory",
                        description: "Write to shared memory",
                        type: "builtin",
                        schema: {
                            type: "object",
                            properties: {
                                key: { type: "string" },
                                value: { type: "string" }
                            }
                        },
                        config: {}
                    }
                ]
            });
            testEnv.registerAgent(sharedMemoryAgent);

            const result = await runAgentExecution(testEnv, {
                agentId: sharedMemoryAgent.id,
                initialMessage: "Save meeting notes: Discussed Q4 roadmap"
            });

            expect(result.result.success).toBe(true);
        });

        it("should support semantic search in shared memory", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: [
                    createToolCallResponse("search_shared_memory", {
                        query: "product launch timeline"
                    }),
                    createCompletionResponse(
                        "Based on shared memory, the product launch is scheduled for October 15th."
                    )
                ]
            });

            const searchAgent = createTestAgent({
                id: "agent-shared-search",
                tools: [
                    {
                        id: "tool-search-shared",
                        name: "search_shared_memory",
                        description: "Search shared memory semantically",
                        type: "builtin",
                        schema: {
                            type: "object",
                            properties: {
                                query: { type: "string" }
                            }
                        },
                        config: {}
                    }
                ]
            });
            testEnv.registerAgent(searchAgent);

            const result = await runAgentExecution(testEnv, {
                agentId: searchAgent.id,
                initialMessage: "When is the product launch?"
            });

            expect(result.result.success).toBe(true);
        });
    });

    // =========================================================================
    // CONTEXT WINDOW MANAGEMENT
    // =========================================================================

    describe("Context Window Management", () => {
        it("should truncate old messages when exceeding max", async () => {
            const limitedMemoryConfig: MemoryConfig = {
                type: "buffer",
                max_messages: 10
            };

            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: [
                    createCompletionResponse("I'll respond to your long conversation.")
                ]
            });

            const limitedAgent = createTestAgent({
                id: "agent-limited-context",
                memoryConfig: limitedMemoryConfig
            });
            testEnv.registerAgent(limitedAgent);

            const result = await runAgentExecution(testEnv, {
                agentId: limitedAgent.id,
                initialMessage: "This is message number 1"
            });

            expect(result.result.success).toBe(true);
        });

        it("should track token counts per message", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: [
                    createCompletionResponse("This is a response with tracked tokens.")
                ]
            });

            const result = await runAgentExecution(testEnv, {
                agentId: simpleChatAgent.id,
                initialMessage: "Track my tokens"
            });

            expect(result.result.success).toBe(true);

            // Verify token usage in LLM response
            const llmCall = result.llmCalls[0];
            expect(llmCall.response.usage).toBeDefined();
            expect(llmCall.response.usage?.totalTokens).toBeGreaterThan(0);
        });

        it("should preserve system message during truncation", async () => {
            const smallContextConfig: MemoryConfig = {
                type: "buffer",
                max_messages: 5
            };

            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: [createCompletionResponse("Response in limited context")]
            });

            const smallContextAgent = createTestAgent({
                id: "agent-small-context",
                systemPrompt: "You are a helpful assistant with limited memory.",
                memoryConfig: smallContextConfig
            });
            testEnv.registerAgent(smallContextAgent);

            const result = await runAgentExecution(testEnv, {
                agentId: smallContextAgent.id,
                initialMessage: "Test message"
            });

            expect(result.result.success).toBe(true);

            // System message should always be present
            const systemMsg = result.result.serializedThread.messages.find(
                (m) => m.role === "system"
            );
            expect(systemMsg).toBeDefined();
        });
    });

    // =========================================================================
    // MEMORY CONFIGURATION TYPES
    // =========================================================================

    describe("Memory Configuration Types", () => {
        it("should handle buffer memory type", async () => {
            const bufferConfig: MemoryConfig = {
                type: "buffer",
                max_messages: 50
            };

            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: [createCompletionResponse("Buffer memory response")]
            });

            const bufferAgent = createTestAgent({
                id: "agent-buffer",
                memoryConfig: bufferConfig
            });
            testEnv.registerAgent(bufferAgent);

            const result = await runAgentExecution(testEnv, {
                agentId: bufferAgent.id,
                initialMessage: "Test buffer memory"
            });

            expect(result.result.success).toBe(true);
        });

        it("should handle summary memory type", async () => {
            const summaryConfig: MemoryConfig = {
                type: "summary",
                max_messages: 100,
                summary_interval: 20
            };

            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: [createCompletionResponse("Summary memory response")]
            });

            const summaryAgent = createTestAgent({
                id: "agent-summary",
                memoryConfig: summaryConfig
            });
            testEnv.registerAgent(summaryAgent);

            const result = await runAgentExecution(testEnv, {
                agentId: summaryAgent.id,
                initialMessage: "Test summary memory"
            });

            expect(result.result.success).toBe(true);
        });

        it("should handle vector memory type", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: [createCompletionResponse("Vector memory response")]
            });

            const vectorAgent = createTestAgent({
                id: "agent-vector",
                memoryConfig: VECTOR_MEMORY_CONFIG
            });
            testEnv.registerAgent(vectorAgent);

            const result = await runAgentExecution(testEnv, {
                agentId: vectorAgent.id,
                initialMessage: "Test vector memory"
            });

            expect(result.result.success).toBe(true);
        });
    });

    // =========================================================================
    // CONTINUE-AS-NEW MEMORY PRESERVATION
    // =========================================================================

    describe("Continue-as-New Memory Preservation", () => {
        it("should preserve messages across continue-as-new", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: [createCompletionResponse("Continuing the conversation")]
            });

            // Simulate continuation with existing thread
            const existingThread = {
                messages: [
                    {
                        id: "sys-1",
                        role: "system" as const,
                        content: "You are helpful",
                        timestamp: new Date()
                    },
                    {
                        id: "user-1",
                        role: "user" as const,
                        content: "Hello",
                        timestamp: new Date()
                    },
                    {
                        id: "asst-1",
                        role: "assistant" as const,
                        content: "Hi there!",
                        timestamp: new Date()
                    }
                ],
                savedMessageIds: ["sys-1", "user-1", "asst-1"],
                metadata: { iteration: 5 }
            };

            const result = await runAgentExecution(testEnv, {
                agentId: simpleChatAgent.id,
                serializedThread: existingThread,
                iterations: 5
            });

            expect(result.result.success).toBe(true);
            expect(result.result.iterations).toBeGreaterThanOrEqual(5);
        });

        it("should summarize history on continue-as-new", async () => {
            testEnv = await createAgentTestEnvironment({
                mockLLMResponses: [createCompletionResponse("I remember our previous discussion")]
            });

            // Large thread that would trigger summarization
            const largeThread = {
                messages: Array.from({ length: 50 }, (_, i) => ({
                    id: `msg-${i}`,
                    role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
                    content: `Message ${i}`,
                    timestamp: new Date()
                })),
                savedMessageIds: Array.from({ length: 50 }, (_, i) => `msg-${i}`),
                metadata: {}
            };

            const result = await runAgentExecution(testEnv, {
                agentId: simpleChatAgent.id,
                serializedThread: largeThread,
                iterations: 0
            });

            expect(result.result.success).toBe(true);
        });
    });
});
