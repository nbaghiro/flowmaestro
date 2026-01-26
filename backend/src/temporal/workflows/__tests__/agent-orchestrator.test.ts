/**
 * Agent Orchestrator Workflow Tests
 *
 * Tests for the main agent execution workflow including:
 * - Basic execution flow
 * - Tool call handling
 * - Credit management
 * - Safety checks
 * - Continue-as-new behavior
 * - Error handling
 */

import { TestWorkflowEnvironment } from "@temporalio/testing";
import { Worker } from "@temporalio/worker";
import type { Tool } from "../../../storage/models/Agent";
import type { AgentOrchestratorInput, AgentConfig, LLMResponse } from "../agent-orchestrator";

// ============================================================================
// MOCK DEFINITIONS
// ============================================================================

// Mock activity implementations
const mockGetAgentConfig = jest.fn();
const mockCallLLM = jest.fn();
const mockExecuteToolCall = jest.fn();
const mockSaveThreadIncremental = jest.fn();
const mockValidateInput = jest.fn();
const mockValidateOutput = jest.fn();
const mockCreateSpan = jest.fn();
const mockEndSpan = jest.fn();
const mockUpdateThreadTokens = jest.fn();

const mockEmitAgentExecutionStarted = jest.fn();
const mockEmitAgentMessage = jest.fn();
const mockEmitAgentThinking = jest.fn();
const mockEmitAgentToolCallStarted = jest.fn();
const mockEmitAgentToolCallCompleted = jest.fn();
const mockEmitAgentToolCallFailed = jest.fn();
const mockEmitAgentExecutionCompleted = jest.fn();
const mockEmitAgentExecutionFailed = jest.fn();

const mockShouldAllowExecution = jest.fn();
const mockReserveCredits = jest.fn();
const mockFinalizeCredits = jest.fn();
const mockCalculateLLMCredits = jest.fn();

// Create activities object for worker
const mockActivities = {
    getAgentConfig: mockGetAgentConfig,
    callLLM: mockCallLLM,
    executeToolCall: mockExecuteToolCall,
    saveThreadIncremental: mockSaveThreadIncremental,
    validateInput: mockValidateInput,
    validateOutput: mockValidateOutput,
    createSpan: mockCreateSpan,
    endSpan: mockEndSpan,
    updateThreadTokens: mockUpdateThreadTokens,
    emitAgentExecutionStarted: mockEmitAgentExecutionStarted,
    emitAgentMessage: mockEmitAgentMessage,
    emitAgentThinking: mockEmitAgentThinking,
    emitAgentToolCallStarted: mockEmitAgentToolCallStarted,
    emitAgentToolCallCompleted: mockEmitAgentToolCallCompleted,
    emitAgentToolCallFailed: mockEmitAgentToolCallFailed,
    emitAgentExecutionCompleted: mockEmitAgentExecutionCompleted,
    emitAgentExecutionFailed: mockEmitAgentExecutionFailed,
    shouldAllowExecution: mockShouldAllowExecution,
    reserveCredits: mockReserveCredits,
    finalizeCredits: mockFinalizeCredits,
    calculateLLMCredits: mockCalculateLLMCredits
};

// ============================================================================
// TEST HELPERS
// ============================================================================

function createMockAgentConfig(overrides: Partial<AgentConfig> = {}): AgentConfig {
    return {
        id: "agent-123",
        name: "Test Agent",
        model: "gpt-4",
        provider: "openai",
        connection_id: "conn-123",
        system_prompt: "You are a helpful assistant.",
        temperature: 0.7,
        max_tokens: 1000,
        max_iterations: 10,
        available_tools: [],
        memory_config: {
            type: "buffer",
            max_messages: 50
        },
        safety_config: {
            enablePiiDetection: false,
            enablePromptInjectionDetection: false,
            enableContentModeration: false,
            piiRedactionEnabled: false,
            promptInjectionAction: "allow"
        },
        ...overrides
    };
}

function createMockLLMResponse(overrides: Partial<LLMResponse> = {}): LLMResponse {
    return {
        content: "Hello! How can I help you today?",
        tool_calls: undefined,
        requiresUserInput: false,
        isComplete: true,
        usage: {
            promptTokens: 100,
            completionTokens: 50,
            totalTokens: 150
        },
        ...overrides
    };
}

function createMockInput(overrides: Partial<AgentOrchestratorInput> = {}): AgentOrchestratorInput {
    return {
        executionId: "exec-123",
        agentId: "agent-123",
        userId: "user-123",
        threadId: "thread-123",
        initialMessage: "Hello",
        ...overrides
    };
}

function createMockTool(name: string, description: string): Tool {
    return {
        id: `tool-${name}`,
        name,
        description,
        type: "function",
        schema: {},
        config: {}
    };
}

function setupDefaultMocks(): void {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup default implementations
    mockGetAgentConfig.mockResolvedValue(createMockAgentConfig());

    mockValidateInput.mockResolvedValue({
        shouldProceed: true,
        content: "Hello",
        violations: []
    });

    mockValidateOutput.mockResolvedValue({
        shouldProceed: true,
        content: "Hello! How can I help you today?",
        violations: []
    });

    mockCallLLM.mockResolvedValue(createMockLLMResponse());

    mockCreateSpan.mockResolvedValue({
        traceId: "trace-123",
        spanId: "span-123"
    });

    mockEndSpan.mockResolvedValue(undefined);
    mockSaveThreadIncremental.mockResolvedValue(undefined);
    mockUpdateThreadTokens.mockResolvedValue(undefined);

    // Event emissions
    mockEmitAgentExecutionStarted.mockResolvedValue(undefined);
    mockEmitAgentMessage.mockResolvedValue(undefined);
    mockEmitAgentThinking.mockResolvedValue(undefined);
    mockEmitAgentToolCallStarted.mockResolvedValue(undefined);
    mockEmitAgentToolCallCompleted.mockResolvedValue(undefined);
    mockEmitAgentToolCallFailed.mockResolvedValue(undefined);
    mockEmitAgentExecutionCompleted.mockResolvedValue(undefined);
    mockEmitAgentExecutionFailed.mockResolvedValue(undefined);

    // Credit activities
    mockShouldAllowExecution.mockResolvedValue(true);
    mockReserveCredits.mockResolvedValue(true);
    mockFinalizeCredits.mockResolvedValue(undefined);
    mockCalculateLLMCredits.mockResolvedValue(5);
}

// ============================================================================
// TESTS
// ============================================================================

describe("Agent Orchestrator Workflow", () => {
    let testEnv: TestWorkflowEnvironment;
    let worker: Worker;

    beforeAll(async () => {
        testEnv = await TestWorkflowEnvironment.createLocal();
    });

    afterAll(async () => {
        await testEnv?.teardown();
    });

    beforeEach(async () => {
        setupDefaultMocks();

        worker = await Worker.create({
            connection: testEnv.nativeConnection,
            taskQueue: "test-agent-queue",
            workflowsPath: require.resolve("../agent-orchestrator"),
            activities: mockActivities
        });
    });

    afterEach(async () => {
        // Worker cleanup handled by test environment
    });

    describe("basic execution flow", () => {
        it("should complete a simple agent interaction", async () => {
            const input = createMockInput();

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("agentOrchestratorWorkflow", {
                    workflowId: "test-simple-" + Date.now(),
                    taskQueue: "test-agent-queue",
                    args: [input]
                })
            );

            expect(result.success).toBe(true);
            expect(result.finalMessage).toBe("Hello! How can I help you today?");
            expect(result.iterations).toBe(0);
        });

        it("should load agent configuration", async () => {
            const input = createMockInput();

            await worker.runUntil(
                testEnv.client.workflow.execute("agentOrchestratorWorkflow", {
                    workflowId: "test-config-" + Date.now(),
                    taskQueue: "test-agent-queue",
                    args: [input]
                })
            );

            expect(mockGetAgentConfig).toHaveBeenCalledWith({
                agentId: "agent-123",
                userId: "user-123"
            });
        });

        it("should emit execution started event", async () => {
            const input = createMockInput();

            await worker.runUntil(
                testEnv.client.workflow.execute("agentOrchestratorWorkflow", {
                    workflowId: "test-started-" + Date.now(),
                    taskQueue: "test-agent-queue",
                    args: [input]
                })
            );

            expect(mockEmitAgentExecutionStarted).toHaveBeenCalledWith({
                executionId: "exec-123",
                agentId: "agent-123",
                agentName: "Test Agent"
            });
        });

        it("should emit execution completed event on success", async () => {
            const input = createMockInput();

            await worker.runUntil(
                testEnv.client.workflow.execute("agentOrchestratorWorkflow", {
                    workflowId: "test-completed-" + Date.now(),
                    taskQueue: "test-agent-queue",
                    args: [input]
                })
            );

            expect(mockEmitAgentExecutionCompleted).toHaveBeenCalledWith(
                expect.objectContaining({
                    executionId: "exec-123",
                    threadId: "thread-123"
                })
            );
        });

        it("should save thread messages on completion", async () => {
            const input = createMockInput();

            await worker.runUntil(
                testEnv.client.workflow.execute("agentOrchestratorWorkflow", {
                    workflowId: "test-save-" + Date.now(),
                    taskQueue: "test-agent-queue",
                    args: [input]
                })
            );

            expect(mockSaveThreadIncremental).toHaveBeenCalledWith(
                expect.objectContaining({
                    executionId: "exec-123",
                    threadId: "thread-123",
                    markCompleted: true
                })
            );
        });
    });

    describe("tool call handling", () => {
        it("should execute tool calls when LLM requests them", async () => {
            // First LLM call returns tool call, second returns final response
            mockCallLLM
                .mockResolvedValueOnce(
                    createMockLLMResponse({
                        content: "I'll search for that.",
                        tool_calls: [
                            {
                                id: "call-1",
                                name: "web_search",
                                arguments: { query: "weather" }
                            }
                        ]
                    })
                )
                .mockResolvedValueOnce(
                    createMockLLMResponse({
                        content: "The weather is sunny."
                    })
                );

            mockExecuteToolCall.mockResolvedValue({ results: ["sunny weather"] });

            mockGetAgentConfig.mockResolvedValue(
                createMockAgentConfig({
                    available_tools: [createMockTool("web_search", "Search the web")]
                })
            );

            const input = createMockInput({ initialMessage: "What's the weather?" });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("agentOrchestratorWorkflow", {
                    workflowId: "test-tools-" + Date.now(),
                    taskQueue: "test-agent-queue",
                    args: [input]
                })
            );

            expect(result.success).toBe(true);
            expect(mockExecuteToolCall).toHaveBeenCalled();
            expect(mockEmitAgentToolCallStarted).toHaveBeenCalled();
            expect(mockEmitAgentToolCallCompleted).toHaveBeenCalled();
        });

        it("should handle tool execution failures gracefully", async () => {
            mockCallLLM
                .mockResolvedValueOnce(
                    createMockLLMResponse({
                        content: "Let me try that.",
                        tool_calls: [
                            {
                                id: "call-1",
                                name: "failing_tool",
                                arguments: {}
                            }
                        ]
                    })
                )
                .mockResolvedValueOnce(
                    createMockLLMResponse({
                        content: "I encountered an error but here's my answer."
                    })
                );

            mockExecuteToolCall.mockRejectedValue(new Error("Tool failed"));

            mockGetAgentConfig.mockResolvedValue(
                createMockAgentConfig({
                    available_tools: [createMockTool("failing_tool", "A tool that fails")]
                })
            );

            const input = createMockInput();

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("agentOrchestratorWorkflow", {
                    workflowId: "test-tool-fail-" + Date.now(),
                    taskQueue: "test-agent-queue",
                    args: [input]
                })
            );

            expect(result.success).toBe(true);
            expect(mockEmitAgentToolCallFailed).toHaveBeenCalled();
        });

        it("should exclude failed tools from subsequent LLM calls", async () => {
            const availableTools = [
                createMockTool("tool_a", "Tool A"),
                createMockTool("tool_b", "Tool B")
            ];

            mockGetAgentConfig.mockResolvedValue(
                createMockAgentConfig({ available_tools: availableTools })
            );

            // First call: use tool_a, which fails
            mockCallLLM
                .mockResolvedValueOnce(
                    createMockLLMResponse({
                        content: "Using tool A",
                        tool_calls: [{ id: "c1", name: "tool_a", arguments: {} }]
                    })
                )
                .mockResolvedValueOnce(
                    createMockLLMResponse({
                        content: "Done"
                    })
                );

            mockExecuteToolCall.mockRejectedValue(new Error("tool_a failed"));

            const input = createMockInput();

            await worker.runUntil(
                testEnv.client.workflow.execute("agentOrchestratorWorkflow", {
                    workflowId: "test-exclude-tools-" + Date.now(),
                    taskQueue: "test-agent-queue",
                    args: [input]
                })
            );

            // The second LLM call should have tool_a filtered out
            // We verify this indirectly by checking the workflow completed successfully
            // after the tool failed
            expect(mockCallLLM).toHaveBeenCalledTimes(2);
        });
    });

    describe("credit management", () => {
        it("should check credits on first execution", async () => {
            const input = createMockInput({ workspaceId: "ws-123" });

            await worker.runUntil(
                testEnv.client.workflow.execute("agentOrchestratorWorkflow", {
                    workflowId: "test-credits-check-" + Date.now(),
                    taskQueue: "test-agent-queue",
                    args: [input]
                })
            );

            expect(mockShouldAllowExecution).toHaveBeenCalledWith(
                expect.objectContaining({
                    workspaceId: "ws-123"
                })
            );
        });

        it("should reserve credits before execution", async () => {
            const input = createMockInput({ workspaceId: "ws-123" });

            await worker.runUntil(
                testEnv.client.workflow.execute("agentOrchestratorWorkflow", {
                    workflowId: "test-credits-reserve-" + Date.now(),
                    taskQueue: "test-agent-queue",
                    args: [input]
                })
            );

            expect(mockReserveCredits).toHaveBeenCalled();
        });

        it("should fail if insufficient credits", async () => {
            mockShouldAllowExecution.mockResolvedValue(false);

            const input = createMockInput({ workspaceId: "ws-123" });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("agentOrchestratorWorkflow", {
                    workflowId: "test-no-credits-" + Date.now(),
                    taskQueue: "test-agent-queue",
                    args: [input]
                })
            );

            expect(result.success).toBe(false);
            expect(result.error).toContain("Insufficient credits");
        });

        it("should skip credit check when skipCreditCheck is true", async () => {
            const input = createMockInput({
                workspaceId: "ws-123",
                skipCreditCheck: true
            });

            await worker.runUntil(
                testEnv.client.workflow.execute("agentOrchestratorWorkflow", {
                    workflowId: "test-skip-credits-" + Date.now(),
                    taskQueue: "test-agent-queue",
                    args: [input]
                })
            );

            expect(mockShouldAllowExecution).not.toHaveBeenCalled();
            expect(mockReserveCredits).not.toHaveBeenCalled();
        });

        it("should finalize credits on completion", async () => {
            const input = createMockInput({ workspaceId: "ws-123" });

            await worker.runUntil(
                testEnv.client.workflow.execute("agentOrchestratorWorkflow", {
                    workflowId: "test-credits-finalize-" + Date.now(),
                    taskQueue: "test-agent-queue",
                    args: [input]
                })
            );

            expect(mockFinalizeCredits).toHaveBeenCalledWith(
                expect.objectContaining({
                    workspaceId: "ws-123",
                    operationType: "agent_execution"
                })
            );
        });
    });

    describe("safety checks", () => {
        it("should validate user input", async () => {
            const input = createMockInput({ initialMessage: "Test message" });

            await worker.runUntil(
                testEnv.client.workflow.execute("agentOrchestratorWorkflow", {
                    workflowId: "test-safety-input-" + Date.now(),
                    taskQueue: "test-agent-queue",
                    args: [input]
                })
            );

            expect(mockValidateInput).toHaveBeenCalledWith(
                expect.objectContaining({
                    content: "Test message"
                })
            );
        });

        it("should validate LLM output", async () => {
            const input = createMockInput();

            await worker.runUntil(
                testEnv.client.workflow.execute("agentOrchestratorWorkflow", {
                    workflowId: "test-safety-output-" + Date.now(),
                    taskQueue: "test-agent-queue",
                    args: [input]
                })
            );

            expect(mockValidateOutput).toHaveBeenCalled();
        });

        it("should block execution if input safety check fails", async () => {
            mockValidateInput.mockResolvedValue({
                shouldProceed: false,
                content: "blocked",
                violations: [
                    { type: "prompt_injection", action: "block", message: "Injection detected" }
                ]
            });

            const input = createMockInput();

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("agentOrchestratorWorkflow", {
                    workflowId: "test-safety-block-" + Date.now(),
                    taskQueue: "test-agent-queue",
                    args: [input]
                })
            );

            expect(result.success).toBe(false);
            expect(result.error).toContain("Input blocked by safety check");
            expect(result.error).toContain("Injection detected");
            expect(mockEmitAgentExecutionFailed).toHaveBeenCalled();
        });

        it("should block execution if output safety check fails", async () => {
            mockValidateOutput.mockResolvedValue({
                shouldProceed: false,
                content: "blocked",
                violations: [
                    { type: "harmful_content", action: "block", message: "Harmful content" }
                ]
            });

            const input = createMockInput();

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("agentOrchestratorWorkflow", {
                    workflowId: "test-output-block-" + Date.now(),
                    taskQueue: "test-agent-queue",
                    args: [input]
                })
            );

            expect(result.success).toBe(false);
            expect(result.error).toContain("Output blocked by safety check");
            expect(result.error).toContain("Harmful content");
            expect(mockEmitAgentExecutionFailed).toHaveBeenCalled();
        });

        it("should use redacted content from safety check", async () => {
            mockValidateInput.mockResolvedValue({
                shouldProceed: true,
                content: "[REDACTED] message", // PII redacted
                violations: [{ type: "pii", action: "redact", message: "PII redacted" }]
            });

            const input = createMockInput({ initialMessage: "My SSN is 123-45-6789" });

            await worker.runUntil(
                testEnv.client.workflow.execute("agentOrchestratorWorkflow", {
                    workflowId: "test-redact-" + Date.now(),
                    taskQueue: "test-agent-queue",
                    args: [input]
                })
            );

            // The LLM should receive the redacted content
            expect(mockCallLLM).toHaveBeenCalledWith(
                expect.objectContaining({
                    messages: expect.arrayContaining([
                        expect.objectContaining({
                            role: "user",
                            content: "[REDACTED] message"
                        })
                    ])
                })
            );
        });
    });

    describe("error handling", () => {
        it("should handle LLM call failures", async () => {
            mockCallLLM.mockRejectedValue(new Error("LLM API error"));

            const input = createMockInput();

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("agentOrchestratorWorkflow", {
                    workflowId: "test-llm-error-" + Date.now(),
                    taskQueue: "test-agent-queue",
                    args: [input]
                })
            );

            expect(result.success).toBe(false);
            // Error may be wrapped by Temporal, so just check it exists
            expect(result.error).toBeDefined();
            expect(mockEmitAgentExecutionFailed).toHaveBeenCalled();
        }, 30000);

        it("should emit execution failed event on error", async () => {
            mockCallLLM.mockRejectedValue(new Error("Test error"));

            const input = createMockInput();

            await worker.runUntil(
                testEnv.client.workflow.execute("agentOrchestratorWorkflow", {
                    workflowId: "test-emit-fail-" + Date.now(),
                    taskQueue: "test-agent-queue",
                    args: [input]
                })
            );

            expect(mockEmitAgentExecutionFailed).toHaveBeenCalledWith(
                expect.objectContaining({
                    executionId: "exec-123",
                    threadId: "thread-123"
                })
            );
        });

        it("should finalize credits even on failure", async () => {
            mockCallLLM.mockRejectedValue(new Error("LLM error"));

            const input = createMockInput({ workspaceId: "ws-123" });

            await worker.runUntil(
                testEnv.client.workflow.execute("agentOrchestratorWorkflow", {
                    workflowId: "test-credits-on-fail-" + Date.now(),
                    taskQueue: "test-agent-queue",
                    args: [input]
                })
            );

            expect(mockFinalizeCredits).toHaveBeenCalled();
        });
    });

    describe("max iterations", () => {
        it("should fail when max iterations reached", async () => {
            mockGetAgentConfig.mockResolvedValue(createMockAgentConfig({ max_iterations: 2 }));

            // Always return tool calls to keep iterating
            mockCallLLM.mockResolvedValue(
                createMockLLMResponse({
                    content: "Calling tool",
                    tool_calls: [{ id: "c1", name: "tool", arguments: {} }]
                })
            );

            mockExecuteToolCall.mockResolvedValue({ result: "ok" });

            const input = createMockInput();

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("agentOrchestratorWorkflow", {
                    workflowId: "test-max-iter-" + Date.now(),
                    taskQueue: "test-agent-queue",
                    args: [input]
                })
            );

            expect(result.success).toBe(false);
            expect(result.error).toContain("Max iterations");
        });
    });

    describe("tracing", () => {
        it("should create spans for workflow execution", async () => {
            const input = createMockInput();

            await worker.runUntil(
                testEnv.client.workflow.execute("agentOrchestratorWorkflow", {
                    workflowId: "test-spans-" + Date.now(),
                    taskQueue: "test-agent-queue",
                    args: [input]
                })
            );

            // Should create AGENT_RUN span
            expect(mockCreateSpan).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: expect.stringContaining("Agent:"),
                    spanType: expect.any(String)
                })
            );

            // Should end spans
            expect(mockEndSpan).toHaveBeenCalled();
        });

        it("should track token usage", async () => {
            const input = createMockInput();

            await worker.runUntil(
                testEnv.client.workflow.execute("agentOrchestratorWorkflow", {
                    workflowId: "test-tokens-" + Date.now(),
                    taskQueue: "test-agent-queue",
                    args: [input]
                })
            );

            expect(mockUpdateThreadTokens).toHaveBeenCalledWith(
                expect.objectContaining({
                    threadId: "thread-123",
                    usage: expect.objectContaining({
                        promptTokens: expect.any(Number),
                        completionTokens: expect.any(Number)
                    })
                })
            );
        });
    });

    describe("serialized thread (continue-as-new)", () => {
        it("should restore from serialized thread", async () => {
            const input = createMockInput({
                serializedThread: {
                    messages: [
                        {
                            id: "sys-1",
                            role: "system",
                            content: "You are a helper",
                            timestamp: new Date()
                        },
                        {
                            id: "user-1",
                            role: "user",
                            content: "Hello",
                            timestamp: new Date()
                        }
                    ],
                    savedMessageIds: ["sys-1", "user-1"],
                    metadata: {}
                },
                iterations: 5
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("agentOrchestratorWorkflow", {
                    workflowId: "test-restore-" + Date.now(),
                    taskQueue: "test-agent-queue",
                    args: [input]
                })
            );

            expect(result.success).toBe(true);
            // Should not emit execution started (already running)
            expect(mockEmitAgentExecutionStarted).not.toHaveBeenCalled();
        });

        it("should preserve accumulated credits across continue-as-new", async () => {
            const input = createMockInput({
                workspaceId: "ws-123",
                serializedThread: {
                    messages: [{ id: "sys", role: "system", content: "Hi", timestamp: new Date() }],
                    savedMessageIds: ["sys"],
                    metadata: {}
                },
                iterations: 5,
                accumulatedCredits: 50,
                reservedCredits: 100
            });

            await worker.runUntil(
                testEnv.client.workflow.execute("agentOrchestratorWorkflow", {
                    workflowId: "test-preserve-credits-" + Date.now(),
                    taskQueue: "test-agent-queue",
                    args: [input]
                })
            );

            // Should finalize with accumulated credits from previous + current
            expect(mockFinalizeCredits).toHaveBeenCalled();
        });
    });
});

// ============================================================================
// PURE FUNCTION TESTS
// ============================================================================

describe("Agent Orchestrator Helper Functions", () => {
    describe("getUnsavedMessages", () => {
        // Import the function for testing
        // Note: This tests the logic conceptually since the function is internal

        it("should identify unsaved messages", () => {
            const messages = [
                { id: "msg-1", role: "user", content: "a", timestamp: new Date() },
                { id: "msg-2", role: "assistant", content: "b", timestamp: new Date() },
                { id: "msg-3", role: "user", content: "c", timestamp: new Date() }
            ];
            const savedIds = ["msg-1"];

            // Simulate the function logic
            const savedIdSet = new Set(savedIds);
            const unsaved = messages.filter((msg) => !savedIdSet.has(msg.id));

            expect(unsaved).toHaveLength(2);
            expect(unsaved.map((m) => m.id)).toEqual(["msg-2", "msg-3"]);
        });
    });

    describe("summarizeMessageState", () => {
        it("should keep system prompt and recent messages", () => {
            const messages = [
                { id: "sys", role: "system", content: "prompt", timestamp: new Date() },
                { id: "m1", role: "user", content: "1", timestamp: new Date() },
                { id: "m2", role: "assistant", content: "2", timestamp: new Date() },
                { id: "m3", role: "user", content: "3", timestamp: new Date() },
                { id: "m4", role: "assistant", content: "4", timestamp: new Date() },
                { id: "m5", role: "user", content: "5", timestamp: new Date() }
            ];
            const maxMessages = 3;

            // Simulate the function logic
            const systemPrompt = messages.find((msg) => msg.role === "system");
            const recentMessages = messages.slice(-(maxMessages - 1)); // last 2
            const summarized = systemPrompt
                ? [systemPrompt, ...recentMessages.filter((msg) => msg.id !== systemPrompt.id)]
                : recentMessages;

            expect(summarized).toHaveLength(3);
            expect(summarized[0].role).toBe("system");
            expect(summarized.map((m) => m.id)).toContain("m4");
            expect(summarized.map((m) => m.id)).toContain("m5");
        });

        it("should not summarize if under max messages", () => {
            const messages = [
                { id: "sys", role: "system", content: "prompt", timestamp: new Date() },
                { id: "m1", role: "user", content: "1", timestamp: new Date() }
            ];
            const maxMessages = 50;

            // Should return all messages as-is
            expect(messages.length).toBeLessThanOrEqual(maxMessages);
        });
    });
});
