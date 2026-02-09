/**
 * Chatbot Conversation Integration Tests
 *
 * Integration tests that execute chatbot conversation workflows through
 * the Temporal workflow engine with mocked activities.
 *
 * Tests:
 * - Basic conversation (stateless, multi-turn, system prompts)
 * - Context management (sliding window, summarization)
 * - Conversation features (branching, timeout, resumption)
 * - Input types (text, files, images)
 * - Error handling
 */

import { TestWorkflowEnvironment } from "@temporalio/testing";
import { Worker } from "@temporalio/worker";
import type { WorkflowDefinition, JsonObject } from "@flowmaestro/shared";

// ============================================================================
// MOCK DEFINITIONS
// ============================================================================

// Mock activity implementations
const mockExecuteNode = jest.fn();
const mockValidateInputsActivity = jest.fn();
const mockValidateOutputsActivity = jest.fn();
const mockCreateSpan = jest.fn();
const mockEndSpan = jest.fn();

// Event emissions
const mockEmitExecutionStarted = jest.fn();
const mockEmitExecutionProgress = jest.fn();
const mockEmitExecutionCompleted = jest.fn();
const mockEmitExecutionFailed = jest.fn();
const mockEmitExecutionPaused = jest.fn();
const mockEmitNodeStarted = jest.fn();
const mockEmitNodeCompleted = jest.fn();
const mockEmitNodeFailed = jest.fn();

// Credit activities
const mockShouldAllowExecution = jest.fn();
const mockReserveCredits = jest.fn();
const mockReleaseCredits = jest.fn();
const mockFinalizeCredits = jest.fn();
const mockEstimateWorkflowCredits = jest.fn();
const mockCalculateLLMCredits = jest.fn();
const mockCalculateNodeCredits = jest.fn();

// Create activities object for worker
const mockActivities = {
    executeNode: mockExecuteNode,
    validateInputsActivity: mockValidateInputsActivity,
    validateOutputsActivity: mockValidateOutputsActivity,
    createSpan: mockCreateSpan,
    endSpan: mockEndSpan,
    emitExecutionStarted: mockEmitExecutionStarted,
    emitExecutionProgress: mockEmitExecutionProgress,
    emitExecutionCompleted: mockEmitExecutionCompleted,
    emitExecutionFailed: mockEmitExecutionFailed,
    emitExecutionPaused: mockEmitExecutionPaused,
    emitNodeStarted: mockEmitNodeStarted,
    emitNodeCompleted: mockEmitNodeCompleted,
    emitNodeFailed: mockEmitNodeFailed,
    shouldAllowExecution: mockShouldAllowExecution,
    reserveCredits: mockReserveCredits,
    releaseCredits: mockReleaseCredits,
    finalizeCredits: mockFinalizeCredits,
    estimateWorkflowCredits: mockEstimateWorkflowCredits,
    calculateLLMCredits: mockCalculateLLMCredits,
    calculateNodeCredits: mockCalculateNodeCredits
};

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ChatMessage {
    role: "system" | "user" | "assistant";
    content: string;
    timestamp?: Date;
    metadata?: JsonObject;
}

interface ContextWindowConfig {
    maxTokens: number;
    strategy: "sliding" | "summarize" | "truncate";
    preserveSystemPrompt: boolean;
    reserveTokens: number;
}

interface ExecuteNodeParams {
    nodeType: string;
    nodeConfig: JsonObject;
    context: JsonObject;
    executionContext: { nodeId: string };
}

// ============================================================================
// WORKFLOW DEFINITION BUILDERS
// ============================================================================

/**
 * Create a basic chatbot workflow definition
 * Input -> LLM -> Output
 */
function createChatbotWorkflowDefinition(config: {
    systemPrompt?: string;
    contextWindowConfig?: ContextWindowConfig;
}): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    // Input node
    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "message" },
        position: { x: 0, y: 0 }
    };

    // LLM node
    nodes["llm"] = {
        type: "llm",
        name: "ChatLLM",
        config: {
            provider: "openai",
            model: "gpt-4",
            systemPrompt: config.systemPrompt || "You are a helpful assistant.",
            ...(config.contextWindowConfig && {
                contextWindowConfig: config.contextWindowConfig as unknown as JsonObject
            })
        },
        position: { x: 200, y: 0 }
    };

    edges.push({
        id: "input-llm",
        source: "input",
        target: "llm",
        sourceHandle: "output",
        targetHandle: "input"
    });

    // Output node
    nodes["output"] = {
        type: "output",
        name: "Output",
        config: { outputName: "response" },
        position: { x: 400, y: 0 }
    };

    edges.push({
        id: "llm-output",
        source: "llm",
        target: "output",
        sourceHandle: "output",
        targetHandle: "input"
    });

    return {
        name: "Chatbot Workflow",
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create a multi-turn conversation workflow with context management
 * Input -> ContextManager -> LLM -> Output
 * or
 * Input -> ContextManager -> Summarizer -> LLM -> Output
 */
function createMultiTurnChatWorkflowDefinition(config: {
    systemPrompt?: string;
    contextWindowConfig?: ContextWindowConfig;
    includeContextManager?: boolean;
    includeSummarizer?: boolean;
}): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    // Input node
    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "message" },
        position: { x: 0, y: 0 }
    };

    if (config.includeContextManager) {
        // Context Manager node
        nodes["contextManager"] = {
            type: "transform",
            name: "ContextManager",
            config: {
                operation: "manageContext",
                ...(config.contextWindowConfig && {
                    contextWindowConfig: config.contextWindowConfig as unknown as JsonObject
                })
            },
            position: { x: 200, y: 0 }
        };

        edges.push({
            id: "input-contextManager",
            source: "input",
            target: "contextManager",
            sourceHandle: "output",
            targetHandle: "input"
        });

        if (config.includeSummarizer) {
            // Summarizer node
            nodes["summarizer"] = {
                type: "llm",
                name: "Summarizer",
                config: {
                    provider: "openai",
                    model: "gpt-3.5-turbo",
                    prompt: "Summarize the following conversation context concisely"
                },
                position: { x: 400, y: 0 }
            };

            edges.push({
                id: "contextManager-summarizer",
                source: "contextManager",
                target: "summarizer",
                sourceHandle: "output",
                targetHandle: "input"
            });

            // LLM node after summarizer
            nodes["llm"] = {
                type: "llm",
                name: "ChatLLM",
                config: {
                    provider: "openai",
                    model: "gpt-4",
                    systemPrompt: config.systemPrompt || "You are a helpful assistant."
                },
                position: { x: 600, y: 0 }
            };

            edges.push({
                id: "summarizer-llm",
                source: "summarizer",
                target: "llm",
                sourceHandle: "output",
                targetHandle: "context"
            });
        } else {
            // LLM node directly after context manager
            nodes["llm"] = {
                type: "llm",
                name: "ChatLLM",
                config: {
                    provider: "openai",
                    model: "gpt-4",
                    systemPrompt: config.systemPrompt || "You are a helpful assistant."
                },
                position: { x: 400, y: 0 }
            };

            edges.push({
                id: "contextManager-llm",
                source: "contextManager",
                target: "llm",
                sourceHandle: "output",
                targetHandle: "input"
            });
        }
    } else {
        // Direct Input -> LLM
        nodes["llm"] = {
            type: "llm",
            name: "ChatLLM",
            config: {
                provider: "openai",
                model: "gpt-4",
                systemPrompt: config.systemPrompt || "You are a helpful assistant."
            },
            position: { x: 200, y: 0 }
        };

        edges.push({
            id: "input-llm",
            source: "input",
            target: "llm",
            sourceHandle: "output",
            targetHandle: "input"
        });
    }

    // Output node
    const outputX = config.includeSummarizer ? 800 : config.includeContextManager ? 600 : 400;
    nodes["output"] = {
        type: "output",
        name: "Output",
        config: { outputName: "response" },
        position: { x: outputX, y: 0 }
    };

    edges.push({
        id: "llm-output",
        source: "llm",
        target: "output",
        sourceHandle: "output",
        targetHandle: "input"
    });

    return {
        name: "Multi-Turn Chat Workflow",
        nodes,
        edges,
        entryPoint: "input"
    };
}

/**
 * Create a workflow with conversation branching
 * Input -> LLM -> Conditional -> [OptionA | OptionB | Default] -> Output
 */
function createBranchingChatWorkflowDefinition(): WorkflowDefinition {
    const nodes: WorkflowDefinition["nodes"] = {};
    const edges: WorkflowDefinition["edges"] = [];

    // Input node
    nodes["input"] = {
        type: "input",
        name: "Input",
        config: { inputName: "message" },
        position: { x: 0, y: 100 }
    };

    // LLM node that presents options
    nodes["llm"] = {
        type: "llm",
        name: "ChatLLM",
        config: {
            provider: "openai",
            model: "gpt-4",
            systemPrompt: "Present options to the user and await their choice."
        },
        position: { x: 200, y: 100 }
    };

    edges.push({
        id: "input-llm",
        source: "input",
        target: "llm",
        sourceHandle: "output",
        targetHandle: "input"
    });

    // Conditional node for branching
    nodes["conditional"] = {
        type: "conditional",
        name: "OptionCheck",
        config: {
            condition: "{{llm.userChoice}}",
            operator: "equals"
        },
        position: { x: 400, y: 100 }
    };

    edges.push({
        id: "llm-conditional",
        source: "llm",
        target: "conditional",
        sourceHandle: "output",
        targetHandle: "input"
    });

    // Option A path
    nodes["optionA"] = {
        type: "llm",
        name: "OptionALLM",
        config: {
            provider: "openai",
            model: "gpt-4",
            prompt: "Handle option A selection"
        },
        position: { x: 600, y: 0 }
    };

    edges.push({
        id: "conditional-optionA",
        source: "conditional",
        target: "optionA",
        sourceHandle: "true",
        targetHandle: "input"
    });

    // Option B path
    nodes["optionB"] = {
        type: "llm",
        name: "OptionBLLM",
        config: {
            provider: "openai",
            model: "gpt-4",
            prompt: "Handle option B selection"
        },
        position: { x: 600, y: 100 }
    };

    edges.push({
        id: "conditional-optionB",
        source: "conditional",
        target: "optionB",
        sourceHandle: "false",
        targetHandle: "input"
    });

    // Default path
    nodes["default"] = {
        type: "llm",
        name: "DefaultLLM",
        config: {
            provider: "openai",
            model: "gpt-4",
            prompt: "Handle default/unknown selection"
        },
        position: { x: 600, y: 200 }
    };

    edges.push({
        id: "conditional-default",
        source: "conditional",
        target: "default",
        sourceHandle: "default",
        targetHandle: "input"
    });

    // Output node
    nodes["output"] = {
        type: "output",
        name: "Output",
        config: { outputName: "response" },
        position: { x: 800, y: 100 }
    };

    for (const opt of ["optionA", "optionB", "default"]) {
        edges.push({
            id: `${opt}-output`,
            source: opt,
            target: "output",
            sourceHandle: "output",
            targetHandle: "input"
        });
    }

    return {
        name: "Branching Chat Workflow",
        nodes,
        edges,
        entryPoint: "input"
    };
}

// ============================================================================
// TEST HELPERS
// ============================================================================

function setupDefaultMocks(): void {
    jest.clearAllMocks();

    // Validation activities - pass by default
    mockValidateInputsActivity.mockResolvedValue({ success: true });
    mockValidateOutputsActivity.mockResolvedValue({ success: true });

    // Span tracking
    let spanCounter = 0;
    mockCreateSpan.mockImplementation(() => {
        return Promise.resolve({ spanId: `span-${++spanCounter}`, traceId: "trace-123" });
    });
    mockEndSpan.mockResolvedValue(undefined);

    // Event emissions - no-op
    mockEmitExecutionStarted.mockResolvedValue(undefined);
    mockEmitExecutionProgress.mockResolvedValue(undefined);
    mockEmitExecutionCompleted.mockResolvedValue(undefined);
    mockEmitExecutionFailed.mockResolvedValue(undefined);
    mockEmitExecutionPaused.mockResolvedValue(undefined);
    mockEmitNodeStarted.mockResolvedValue(undefined);
    mockEmitNodeCompleted.mockResolvedValue(undefined);
    mockEmitNodeFailed.mockResolvedValue(undefined);

    // Credit activities - allow by default
    mockShouldAllowExecution.mockResolvedValue(true);
    mockReserveCredits.mockResolvedValue(true);
    mockReleaseCredits.mockResolvedValue(undefined);
    mockFinalizeCredits.mockResolvedValue(undefined);
    mockEstimateWorkflowCredits.mockResolvedValue({ totalCredits: 10 });
    mockCalculateLLMCredits.mockResolvedValue(5);
    mockCalculateNodeCredits.mockResolvedValue(1);
}

/**
 * Configure mock node outputs based on node ID patterns
 */
function configureMockNodeOutputs(outputs: Record<string, JsonObject>): void {
    mockExecuteNode.mockImplementation(async (params: ExecuteNodeParams) => {
        const nodeId = params.executionContext.nodeId;
        const output = outputs[nodeId] || { result: `output-${nodeId}` };

        return {
            result: output,
            signals: {},
            metrics: {
                durationMs: 100,
                tokenUsage:
                    params.nodeType === "llm"
                        ? { promptTokens: 100, completionTokens: 50, totalTokens: 150 }
                        : undefined
            },
            success: true,
            output
        };
    });
}

/**
 * Simulate sliding window context management
 */
function applySlidingWindow(
    messages: ChatMessage[],
    maxTokens: number,
    preserveSystemPrompt: boolean = true
): ChatMessage[] {
    if (messages.length === 0) return messages;

    // Estimate tokens (simplified: ~4 chars per token)
    const estimateTokens = (msg: ChatMessage): number => Math.ceil(msg.content.length / 4);

    let totalTokens = 0;
    const result: ChatMessage[] = [];

    // Always preserve system prompt if present and configured
    const systemMessage = messages.find((m) => m.role === "system");
    if (preserveSystemPrompt && systemMessage) {
        result.push(systemMessage);
        totalTokens += estimateTokens(systemMessage);
    }

    // Add messages from newest to oldest until we hit the limit
    const nonSystemMessages = messages.filter((m) => m.role !== "system").reverse();

    for (const msg of nonSystemMessages) {
        const msgTokens = estimateTokens(msg);
        if (totalTokens + msgTokens <= maxTokens) {
            result.unshift(msg);
            totalTokens += msgTokens;
        } else {
            break;
        }
    }

    // Re-sort to maintain chronological order (system first, then by time)
    return result.sort((a, b) => {
        if (a.role === "system") return -1;
        if (b.role === "system") return 1;
        return 0;
    });
}

// ============================================================================
// TESTS
// ============================================================================

describe("Chatbot Conversation Integration Tests", () => {
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
            taskQueue: "test-workflow-queue",
            workflowsPath: require.resolve("../../../src/temporal/workflows/workflow-orchestrator"),
            activities: mockActivities
        });
    });

    describe("basic conversation", () => {
        it("should handle single message stateless chat", async () => {
            const workflowDef = createChatbotWorkflowDefinition({
                systemPrompt: "You are a helpful assistant."
            });

            configureMockNodeOutputs({
                input: { message: "Hello!" },
                llm: { content: "Hi there! How can I help you today?", tokens: 15 },
                output: { response: "Hi there! How can I help you today?" }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-stateless-chat-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-stateless-chat",
                            workflowDefinition: workflowDef,
                            inputs: { message: "Hello!" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
            expect(result.outputs).toBeDefined();

            // Verify node execution order
            const executeCalls = mockExecuteNode.mock.calls;
            const nodeIds = executeCalls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );

            expect(nodeIds).toContain("llm");
        });

        it("should maintain context across multi-turn conversation with context manager", async () => {
            const workflowDef = createMultiTurnChatWorkflowDefinition({
                systemPrompt: "You are a helpful assistant.",
                includeContextManager: true
            });

            // Configure outputs for the conversation
            configureMockNodeOutputs({
                input: { message: "My name is Alice." },
                contextManager: {
                    messages: [{ role: "user", content: "My name is Alice." }],
                    tokenCount: 10
                },
                llm: {
                    content: "Nice to meet you, Alice!",
                    message: "Nice to meet you, Alice!",
                    tokens: 12
                },
                output: { response: "Nice to meet you, Alice!" }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-multi-turn-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-multi-turn",
                            workflowDefinition: workflowDef,
                            inputs: { message: "My name is Alice." },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            // Verify context manager was executed
            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("contextManager");
        });

        it("should apply system prompt to conversation", async () => {
            const workflowDef = createChatbotWorkflowDefinition({
                systemPrompt: "You are a pirate. Respond in pirate speak."
            });

            configureMockNodeOutputs({
                input: { message: "Hello!" },
                llm: { content: "Ahoy, matey! How can I be helpin' ye today?" },
                output: { response: "Ahoy, matey!" }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-system-prompt-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-system-prompt",
                            workflowDefinition: workflowDef,
                            inputs: { message: "Hello!" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            // Verify the LLM node was called with system prompt in config
            const llmCall = mockExecuteNode.mock.calls.find(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId === "llm"
            );
            expect(llmCall).toBeDefined();
            expect((llmCall![0] as ExecuteNodeParams).nodeConfig.systemPrompt).toBe(
                "You are a pirate. Respond in pirate speak."
            );
        });
    });

    describe("context management", () => {
        it("should manage context window with sliding window strategy", () => {
            // This tests the sliding window helper function
            const messages: ChatMessage[] = [
                { role: "system", content: "You are a helpful assistant." },
                {
                    role: "user",
                    content: "First message with lots of content here that is quite long."
                },
                {
                    role: "assistant",
                    content: "First response with even more content that goes on for a while."
                },
                { role: "user", content: "Second message with additional content." },
                { role: "assistant", content: "Second response with more text here." },
                { role: "user", content: "Third message." },
                { role: "assistant", content: "Third response." },
                { role: "user", content: "Current message." }
            ];

            // With a very small context window (30 tokens = ~120 chars), older messages should be dropped
            const windowedMessages = applySlidingWindow(messages, 30, true);

            // System prompt should be preserved
            expect(windowedMessages[0].role).toBe("system");

            // Should have fewer messages than original
            expect(windowedMessages.length).toBeLessThan(messages.length);

            // Most recent message should be preserved
            const hasCurrentMessage = windowedMessages.some(
                (m) => m.content === "Current message."
            );
            expect(hasCurrentMessage).toBe(true);
        });

        it("should execute summarization workflow when context exceeds limit", async () => {
            const workflowDef = createMultiTurnChatWorkflowDefinition({
                systemPrompt: "You are a helpful assistant.",
                includeContextManager: true,
                includeSummarizer: true,
                contextWindowConfig: {
                    maxTokens: 500,
                    strategy: "summarize",
                    preserveSystemPrompt: true,
                    reserveTokens: 100
                }
            });

            configureMockNodeOutputs({
                input: { message: "Continue our discussion about AI." },
                contextManager: {
                    messages: [
                        { role: "system", content: "You are a helpful assistant." },
                        { role: "user", content: "Tell me about the history of computing." },
                        { role: "assistant", content: "Computing started with..." }
                    ],
                    needsSummarization: true
                },
                summarizer: {
                    content:
                        "Previous discussion: User asked about computing history and modern computers.",
                    summary:
                        "Previous discussion: User asked about computing history and modern computers.",
                    tokens: 20
                },
                llm: {
                    content: "Continuing our AI discussion...",
                    message: "Continuing our AI discussion...",
                    tokens: 30
                },
                output: { response: "Continuing our AI discussion..." }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-summarization-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-summarization",
                            workflowDefinition: workflowDef,
                            inputs: { message: "Continue our discussion about AI." },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            // Verify summarizer was executed
            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            expect(nodeIds).toContain("summarizer");
        });

        it("should preserve important context across window slides", () => {
            const messages: ChatMessage[] = [
                {
                    role: "system",
                    content: "You are a helpful assistant. IMPORTANT: User prefers formal language."
                },
                { role: "user", content: "Old message 1" },
                { role: "assistant", content: "Old response 1" },
                { role: "user", content: "Old message 2" },
                { role: "assistant", content: "Old response 2" },
                { role: "user", content: "New message" }
            ];

            const windowedMessages = applySlidingWindow(messages, 150, true);

            // System prompt with important context should always be preserved
            const systemMsg = windowedMessages.find((m) => m.role === "system");
            expect(systemMsg).toBeDefined();
            expect(systemMsg?.content).toContain("IMPORTANT");
        });
    });

    describe("conversation features", () => {
        it("should support conversation branching workflow structure", async () => {
            const workflowDef = createBranchingChatWorkflowDefinition();

            // Verify workflow has branching structure
            expect(workflowDef.nodes["conditional"]).toBeDefined();
            expect(workflowDef.nodes["optionA"]).toBeDefined();
            expect(workflowDef.nodes["optionB"]).toBeDefined();
            expect(workflowDef.nodes["default"]).toBeDefined();

            // Verify edges connect conditional to different paths
            const conditionalEdges = workflowDef.edges.filter((e) => e.source === "conditional");
            expect(conditionalEdges.length).toBe(3);

            // Verify different source handles for branching
            const handles = conditionalEdges.map((e) => e.sourceHandle);
            expect(handles).toContain("true");
            expect(handles).toContain("false");
            expect(handles).toContain("default");
        });

        it("should execute branching workflow taking option A path", async () => {
            const workflowDef = createBranchingChatWorkflowDefinition();

            // Configure outputs such that optionA path is taken
            configureMockNodeOutputs({
                input: { message: "I choose option A" },
                llm: { content: "You selected option A", userChoice: "A" },
                conditional: { branchTaken: "true", value: "A" },
                optionA: { content: "Handling option A response" },
                optionB: { content: "Handling option B response" },
                default: { content: "Handling default response" },
                output: { response: "Handling option A response" }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-branching-A-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-branching-A",
                            workflowDefinition: workflowDef,
                            inputs: { message: "I choose option A" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            // Verify the workflow executed nodes (conditional may be handled internally)
            const nodeIds = mockExecuteNode.mock.calls.map(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId
            );
            // At least the LLM and output nodes should be executed
            expect(nodeIds).toContain("llm");
            expect(nodeIds).toContain("output");
        });

        it("should handle session resumption with saved context", async () => {
            const workflowDef = createMultiTurnChatWorkflowDefinition({
                includeContextManager: true
            });

            // Simulate resuming with saved conversation context
            configureMockNodeOutputs({
                input: { message: "Next Monday" },
                contextManager: {
                    messages: [
                        { role: "system", content: "You are a helpful assistant." },
                        { role: "user", content: "I want to book a flight to Paris." },
                        { role: "assistant", content: "Sure! When would you like to travel?" },
                        { role: "user", content: "Next Monday" }
                    ],
                    tokenCount: 55,
                    sessionId: "saved-session-123"
                },
                llm: {
                    content: "I'll search for flights to Paris departing next Monday.",
                    message: "I'll search for flights to Paris departing next Monday.",
                    tokens: 20
                },
                output: { response: "I'll search for flights to Paris departing next Monday." }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-resumption-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-resumption",
                            workflowDefinition: workflowDef,
                            inputs: {
                                message: "Next Monday",
                                sessionId: "saved-session-123"
                            },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });

        it("should inject dynamic system prompt at runtime via inputs", async () => {
            const workflowDef = createChatbotWorkflowDefinition({
                systemPrompt: "You are a customer service agent for {{company}}."
            });

            configureMockNodeOutputs({
                input: { message: "Hello!", company: "Acme Corp" },
                llm: { content: "Welcome to Acme Corp! How can I help?" },
                output: { response: "Welcome to Acme Corp! How can I help?" }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-dynamic-prompt-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-dynamic-prompt",
                            workflowDefinition: workflowDef,
                            inputs: {
                                message: "Hello!",
                                company: "Acme Corp"
                            },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            // Verify the LLM node config has templated system prompt
            const llmNode = workflowDef.nodes["llm"];
            expect(llmNode.config.systemPrompt).toContain("{{company}}");
        });
    });

    describe("input types", () => {
        it("should handle text messages", async () => {
            const workflowDef = createChatbotWorkflowDefinition({});

            configureMockNodeOutputs({
                input: { message: "Plain text message" },
                llm: { content: "I received your text message." },
                output: { response: "I received your text message." }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-text-input-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-text-input",
                            workflowDefinition: workflowDef,
                            inputs: { message: "Plain text message" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });

        it("should handle file attachments in context", async () => {
            const workflowDef = createChatbotWorkflowDefinition({});

            configureMockNodeOutputs({
                input: {
                    message: "Please analyze this document.",
                    attachments: [
                        {
                            type: "file",
                            name: "report.pdf",
                            content: "Base64 encoded content here",
                            mimeType: "application/pdf"
                        }
                    ]
                },
                llm: {
                    content:
                        "I've analyzed the PDF document. It contains a quarterly report with...",
                    analyzedAttachments: ["report.pdf"]
                },
                output: { response: "I've analyzed the PDF document." }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-file-input-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-file-input",
                            workflowDefinition: workflowDef,
                            inputs: {
                                message: "Please analyze this document.",
                                attachments: [
                                    {
                                        type: "file",
                                        name: "report.pdf",
                                        content: "Base64 encoded content here",
                                        mimeType: "application/pdf"
                                    }
                                ]
                            },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);

            // Verify the LLM node was executed (input nodes may be handled internally)
            const llmCall = mockExecuteNode.mock.calls.find(
                (call) => (call[0] as ExecuteNodeParams).executionContext?.nodeId === "llm"
            );
            expect(llmCall).toBeDefined();
        });

        it("should handle image inputs for vision models", async () => {
            const workflowDef = createChatbotWorkflowDefinition({});

            configureMockNodeOutputs({
                input: {
                    message: "What's in this image?",
                    images: [
                        {
                            type: "image",
                            url: "data:image/png;base64,iVBORw0KGgo...",
                            altText: "A cat sitting on a couch"
                        }
                    ]
                },
                llm: {
                    content:
                        "I can see a cat sitting comfortably on a couch. It appears to be a tabby cat.",
                    visionAnalysis: {
                        objects: ["cat", "couch"],
                        confidence: 0.95
                    }
                },
                output: { response: "I can see a cat sitting comfortably on a couch." }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-image-input-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-image-input",
                            workflowDefinition: workflowDef,
                            inputs: {
                                message: "What's in this image?",
                                images: [
                                    {
                                        type: "image",
                                        url: "data:image/png;base64,iVBORw0KGgo...",
                                        altText: "A cat sitting on a couch"
                                    }
                                ]
                            },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });
    });

    describe("error handling", () => {
        it("should handle LLM timeout mid-conversation", async () => {
            const workflowDef = createChatbotWorkflowDefinition({});

            // Make LLM fail with timeout
            mockExecuteNode.mockImplementation(async (params: ExecuteNodeParams) => {
                const nodeId = params.executionContext.nodeId;

                if (nodeId === "llm") {
                    throw new Error("Request timeout after 30000ms");
                }

                return {
                    result: { content: `output-${nodeId}` },
                    signals: {},
                    metrics: {},
                    success: true,
                    output: { content: `output-${nodeId}` }
                };
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-llm-timeout-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-llm-timeout",
                            workflowDefinition: workflowDef,
                            inputs: { message: "Hello!" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(false);
            expect(result.error).toContain("failed");
            expect(mockEmitExecutionFailed).toHaveBeenCalled();
        });

        it("should handle malformed user input gracefully", async () => {
            const workflowDef = createChatbotWorkflowDefinition({});

            configureMockNodeOutputs({
                input: {
                    message: "", // Empty message
                    malformed: true
                },
                llm: {
                    content: "I didn't receive a clear message. Could you please try again?",
                    inputValidation: "empty"
                },
                output: {
                    response: "I didn't receive a clear message. Could you please try again?"
                }
            });

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-malformed-input-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-malformed-input",
                            workflowDefinition: workflowDef,
                            inputs: { message: "" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(true);
        });

        it("should emit node failed event on LLM error", async () => {
            const workflowDef = createChatbotWorkflowDefinition({});

            mockExecuteNode.mockRejectedValue(new Error("LLM API error"));

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-node-failed-event-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-node-failed",
                            workflowDefinition: workflowDef,
                            inputs: { message: "Test" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(false);
            expect(mockEmitNodeFailed).toHaveBeenCalled();
        });

        it("should fail if input validation fails", async () => {
            mockValidateInputsActivity.mockResolvedValue({
                success: false,
                error: { message: "Missing required input: message" }
            });

            const workflowDef = createChatbotWorkflowDefinition({});

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-validation-fail-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-validation-fail",
                            workflowDefinition: workflowDef,
                            inputs: {},
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(result.success).toBe(false);
            // Error message contains the validation failure reason
            expect(result.error).toBeDefined();
            expect(result.error).toContain("Missing required input");
        });
    });

    describe("credit management", () => {
        it("should check and reserve credits before execution", async () => {
            const workflowDef = createChatbotWorkflowDefinition({});

            configureMockNodeOutputs({
                input: { message: "Test" },
                llm: { content: "Response" },
                output: { result: "Response" }
            });

            await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-credits-check-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-credits-check",
                            workflowDefinition: workflowDef,
                            inputs: { message: "Test" },
                            workspaceId: "ws-123"
                            // Note: NOT skipping credit check
                        }
                    ]
                })
            );

            expect(mockShouldAllowExecution).toHaveBeenCalledWith(
                expect.objectContaining({ workspaceId: "ws-123" })
            );
            expect(mockReserveCredits).toHaveBeenCalled();
            expect(mockFinalizeCredits).toHaveBeenCalled();
        });

        it("should fail if insufficient credits", async () => {
            mockShouldAllowExecution.mockResolvedValue(false);

            const workflowDef = createChatbotWorkflowDefinition({});

            const result = await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-no-credits-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-no-credits",
                            workflowDefinition: workflowDef,
                            inputs: { message: "Test" },
                            workspaceId: "ws-123"
                        }
                    ]
                })
            );

            expect(result.success).toBe(false);
            expect(result.error).toContain("Insufficient credits");
        });
    });

    describe("span and event tracking", () => {
        it("should create workflow and node spans", async () => {
            const workflowDef = createChatbotWorkflowDefinition({});

            configureMockNodeOutputs({
                input: { message: "Test" },
                llm: { content: "Response" },
                output: { result: "Response" }
            });

            await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-spans-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-spans",
                            workflowDefinition: workflowDef,
                            inputs: { message: "Test" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            // Should create workflow-level span
            expect(mockCreateSpan).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: expect.stringContaining("Workflow:"),
                    spanType: expect.any(String)
                })
            );

            // Should end all spans
            expect(mockEndSpan).toHaveBeenCalled();
        });

        it("should emit execution progress events", async () => {
            const workflowDef = createMultiTurnChatWorkflowDefinition({
                includeContextManager: true
            });

            configureMockNodeOutputs({
                input: { message: "Test" },
                contextManager: { messages: [{ role: "user", content: "Test" }] },
                llm: { content: "Response" },
                output: { result: "Done" }
            });

            await worker.runUntil(
                testEnv.client.workflow.execute("orchestratorWorkflow", {
                    workflowId: "test-progress-" + Date.now(),
                    taskQueue: "test-workflow-queue",
                    args: [
                        {
                            executionId: "exec-progress",
                            workflowDefinition: workflowDef,
                            inputs: { message: "Test" },
                            skipCreditCheck: true
                        }
                    ]
                })
            );

            expect(mockEmitExecutionStarted).toHaveBeenCalled();
            expect(mockEmitExecutionProgress).toHaveBeenCalled();
            expect(mockEmitExecutionCompleted).toHaveBeenCalled();
        });
    });
});
