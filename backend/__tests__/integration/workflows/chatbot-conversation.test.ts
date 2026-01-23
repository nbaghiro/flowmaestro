/**
 * Chatbot Conversation Workflow Tests
 *
 * Tests for conversational AI patterns including:
 * - Basic conversation (stateless, multi-turn, system prompts)
 * - Context management (sliding window, summarization)
 * - Conversation features (branching, timeout, resumption)
 * - Input types (text, files, images)
 * - Error handling
 */

import {
    createContext,
    storeNodeOutput,
    getExecutionContext,
    initializeQueue,
    getReadyNodes,
    markExecuting,
    markCompleted,
    markFailed,
    isExecutionComplete,
    buildFinalOutputs,
    setVariable
} from "../../../src/temporal/core/services/context";
import { createMockActivities, withOutputs } from "../../fixtures/activities";
import type {
    BuiltWorkflow,
    ExecutableNode,
    TypedEdge
} from "../../../src/temporal/activities/execution/types";
import type { JsonObject } from "../../../src/temporal/core/types";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ChatMessage {
    role: "system" | "user" | "assistant";
    content: string;
    timestamp?: Date;
    metadata?: JsonObject;
    [key: string]: unknown;
}

interface ConversationState {
    messages: ChatMessage[];
    contextWindow: number;
    totalTokens: number;
    sessionId: string;
    lastActivity: Date;
    [key: string]: unknown;
}

interface ContextWindowConfig {
    maxTokens: number;
    strategy: "sliding" | "summarize" | "truncate";
    preserveSystemPrompt: boolean;
    reserveTokens: number;
    [key: string]: unknown;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a basic chatbot workflow
 * Input -> LLM -> Output
 */
function createChatbotWorkflow(config: {
    systemPrompt?: string;
    contextWindowConfig?: ContextWindowConfig;
}): BuiltWorkflow {
    const nodes = new Map<string, ExecutableNode>();
    const edges = new Map<string, TypedEdge>();

    // Input node
    nodes.set("Input", {
        id: "Input",
        type: "input",
        name: "Input",
        config: { name: "message" },
        depth: 0,
        dependencies: [],
        dependents: ["LLM"]
    });

    // LLM node
    nodes.set("LLM", {
        id: "LLM",
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
        depth: 1,
        dependencies: ["Input"],
        dependents: ["Output"]
    });

    edges.set("Input-LLM", {
        id: "Input-LLM",
        source: "Input",
        target: "LLM",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });

    // Output node
    nodes.set("Output", {
        id: "Output",
        type: "output",
        name: "Output",
        config: { name: "response" },
        depth: 2,
        dependencies: ["LLM"],
        dependents: []
    });

    edges.set("LLM-Output", {
        id: "LLM-Output",
        source: "LLM",
        target: "Output",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });

    return {
        originalDefinition: {} as never,
        buildTimestamp: Date.now(),
        nodes,
        edges,
        executionLevels: [["Input"], ["LLM"], ["Output"]],
        triggerNodeId: "Input",
        outputNodeIds: ["Output"],
        loopContexts: new Map(),
        maxConcurrentNodes: 10
    };
}

/**
 * Create a multi-turn conversation workflow with context management
 */
function createMultiTurnChatWorkflow(config: {
    systemPrompt?: string;
    contextWindowConfig?: ContextWindowConfig;
    includeContextManager?: boolean;
    includeSummarizer?: boolean;
}): BuiltWorkflow {
    const nodes = new Map<string, ExecutableNode>();
    const edges = new Map<string, TypedEdge>();

    // Input node
    nodes.set("Input", {
        id: "Input",
        type: "input",
        name: "Input",
        config: { name: "message" },
        depth: 0,
        dependencies: [],
        dependents: config.includeContextManager ? ["ContextManager"] : ["LLM"]
    });

    if (config.includeContextManager) {
        // Context Manager node - manages conversation history
        nodes.set("ContextManager", {
            id: "ContextManager",
            type: "transform",
            name: "ContextManager",
            config: {
                operation: "manageContext",
                ...(config.contextWindowConfig && {
                    contextWindowConfig: config.contextWindowConfig as unknown as JsonObject
                })
            },
            depth: 1,
            dependencies: ["Input"],
            dependents: config.includeSummarizer ? ["Summarizer"] : ["LLM"]
        });

        edges.set("Input-ContextManager", {
            id: "Input-ContextManager",
            source: "Input",
            target: "ContextManager",
            sourceHandle: "output",
            targetHandle: "input",
            handleType: "default"
        });

        if (config.includeSummarizer) {
            // Summarizer node - summarizes old messages
            nodes.set("Summarizer", {
                id: "Summarizer",
                type: "llm",
                name: "Summarizer",
                config: {
                    provider: "openai",
                    model: "gpt-3.5-turbo",
                    prompt: "Summarize the following conversation context concisely"
                },
                depth: 2,
                dependencies: ["ContextManager"],
                dependents: ["LLM"]
            });

            edges.set("ContextManager-Summarizer", {
                id: "ContextManager-Summarizer",
                source: "ContextManager",
                target: "Summarizer",
                sourceHandle: "output",
                targetHandle: "input",
                handleType: "default"
            });

            edges.set("Summarizer-LLM", {
                id: "Summarizer-LLM",
                source: "Summarizer",
                target: "LLM",
                sourceHandle: "output",
                targetHandle: "context",
                handleType: "default"
            });

            nodes.set("LLM", {
                id: "LLM",
                type: "llm",
                name: "ChatLLM",
                config: {
                    provider: "openai",
                    model: "gpt-4",
                    systemPrompt: config.systemPrompt || "You are a helpful assistant."
                },
                depth: 3,
                dependencies: ["Summarizer"],
                dependents: ["Output"]
            });
        } else {
            edges.set("ContextManager-LLM", {
                id: "ContextManager-LLM",
                source: "ContextManager",
                target: "LLM",
                sourceHandle: "output",
                targetHandle: "input",
                handleType: "default"
            });

            nodes.set("LLM", {
                id: "LLM",
                type: "llm",
                name: "ChatLLM",
                config: {
                    provider: "openai",
                    model: "gpt-4",
                    systemPrompt: config.systemPrompt || "You are a helpful assistant."
                },
                depth: 2,
                dependencies: ["ContextManager"],
                dependents: ["Output"]
            });
        }
    } else {
        // Direct Input -> LLM
        nodes.set("LLM", {
            id: "LLM",
            type: "llm",
            name: "ChatLLM",
            config: {
                provider: "openai",
                model: "gpt-4",
                systemPrompt: config.systemPrompt || "You are a helpful assistant."
            },
            depth: 1,
            dependencies: ["Input"],
            dependents: ["Output"]
        });

        edges.set("Input-LLM", {
            id: "Input-LLM",
            source: "Input",
            target: "LLM",
            sourceHandle: "output",
            targetHandle: "input",
            handleType: "default"
        });
    }

    // Output node
    const llmDepth = config.includeSummarizer ? 3 : config.includeContextManager ? 2 : 1;
    nodes.set("Output", {
        id: "Output",
        type: "output",
        name: "Output",
        config: { name: "response" },
        depth: llmDepth + 1,
        dependencies: ["LLM"],
        dependents: []
    });

    edges.set("LLM-Output", {
        id: "LLM-Output",
        source: "LLM",
        target: "Output",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });

    return {
        originalDefinition: {} as never,
        buildTimestamp: Date.now(),
        nodes,
        edges,
        executionLevels: config.includeSummarizer
            ? [["Input"], ["ContextManager"], ["Summarizer"], ["LLM"], ["Output"]]
            : config.includeContextManager
              ? [["Input"], ["ContextManager"], ["LLM"], ["Output"]]
              : [["Input"], ["LLM"], ["Output"]],
        triggerNodeId: "Input",
        outputNodeIds: ["Output"],
        loopContexts: new Map(),
        maxConcurrentNodes: 10
    };
}

/**
 * Create a workflow with conversation branching
 */
function createBranchingChatWorkflow(): BuiltWorkflow {
    const nodes = new Map<string, ExecutableNode>();
    const edges = new Map<string, TypedEdge>();

    // Input node
    nodes.set("Input", {
        id: "Input",
        type: "input",
        name: "Input",
        config: { name: "message" },
        depth: 0,
        dependencies: [],
        dependents: ["LLM"]
    });

    // LLM node that presents options
    nodes.set("LLM", {
        id: "LLM",
        type: "llm",
        name: "ChatLLM",
        config: {
            provider: "openai",
            model: "gpt-4",
            systemPrompt: "Present options to the user and await their choice."
        },
        depth: 1,
        dependencies: ["Input"],
        dependents: ["Conditional"]
    });

    edges.set("Input-LLM", {
        id: "Input-LLM",
        source: "Input",
        target: "LLM",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });

    // Conditional node for branching
    nodes.set("Conditional", {
        id: "Conditional",
        type: "conditional",
        name: "OptionCheck",
        config: {
            condition: "{{LLM.userChoice}}",
            operator: "equals"
        },
        depth: 2,
        dependencies: ["LLM"],
        dependents: ["OptionA", "OptionB", "Default"]
    });

    edges.set("LLM-Conditional", {
        id: "LLM-Conditional",
        source: "LLM",
        target: "Conditional",
        sourceHandle: "output",
        targetHandle: "input",
        handleType: "default"
    });

    // Option A path
    nodes.set("OptionA", {
        id: "OptionA",
        type: "llm",
        name: "OptionALLM",
        config: {
            provider: "openai",
            model: "gpt-4",
            prompt: "Handle option A selection"
        },
        depth: 3,
        dependencies: ["Conditional"],
        dependents: ["Output"]
    });

    edges.set("Conditional-OptionA", {
        id: "Conditional-OptionA",
        source: "Conditional",
        target: "OptionA",
        sourceHandle: "A",
        targetHandle: "input",
        handleType: "true"
    });

    // Option B path
    nodes.set("OptionB", {
        id: "OptionB",
        type: "llm",
        name: "OptionBLLM",
        config: {
            provider: "openai",
            model: "gpt-4",
            prompt: "Handle option B selection"
        },
        depth: 3,
        dependencies: ["Conditional"],
        dependents: ["Output"]
    });

    edges.set("Conditional-OptionB", {
        id: "Conditional-OptionB",
        source: "Conditional",
        target: "OptionB",
        sourceHandle: "B",
        targetHandle: "input",
        handleType: "false"
    });

    // Default path
    nodes.set("Default", {
        id: "Default",
        type: "llm",
        name: "DefaultLLM",
        config: {
            provider: "openai",
            model: "gpt-4",
            prompt: "Handle default/unknown selection"
        },
        depth: 3,
        dependencies: ["Conditional"],
        dependents: ["Output"]
    });

    edges.set("Conditional-Default", {
        id: "Conditional-Default",
        source: "Conditional",
        target: "Default",
        sourceHandle: "default",
        targetHandle: "input",
        handleType: "default"
    });

    // Output node
    nodes.set("Output", {
        id: "Output",
        type: "output",
        name: "Output",
        config: { name: "response" },
        depth: 4,
        dependencies: ["OptionA", "OptionB", "Default"],
        dependents: []
    });

    for (const opt of ["OptionA", "OptionB", "Default"]) {
        edges.set(`${opt}-Output`, {
            id: `${opt}-Output`,
            source: opt,
            target: "Output",
            sourceHandle: "output",
            targetHandle: "input",
            handleType: "default"
        });
    }

    return {
        originalDefinition: {} as never,
        buildTimestamp: Date.now(),
        nodes,
        edges,
        executionLevels: [
            ["Input"],
            ["LLM"],
            ["Conditional"],
            ["OptionA", "OptionB", "Default"],
            ["Output"]
        ],
        triggerNodeId: "Input",
        outputNodeIds: ["Output"],
        loopContexts: new Map(),
        maxConcurrentNodes: 10
    };
}

/**
 * Simulate workflow execution with conversation state
 */
async function simulateChatExecution(
    workflow: BuiltWorkflow,
    mockActivities: ReturnType<typeof createMockActivities>,
    inputs: JsonObject = {},
    conversationState?: ConversationState
): Promise<{
    context: ReturnType<typeof createContext>;
    finalOutputs: JsonObject;
    executionOrder: string[];
    conversationState: ConversationState;
}> {
    let context = createContext(inputs);

    // Initialize or restore conversation state
    const state: ConversationState = conversationState || {
        messages: [],
        contextWindow: 4096,
        totalTokens: 0,
        sessionId: `session-${Date.now()}`,
        lastActivity: new Date()
    };

    // Set conversation state in context
    context = setVariable(context, "conversationState", state as unknown as JsonObject);

    let queueState = initializeQueue(workflow);
    const executionOrder: string[] = [];

    while (!isExecutionComplete(queueState)) {
        const readyNodes = getReadyNodes(queueState, workflow.maxConcurrentNodes || 10);

        if (readyNodes.length === 0) {
            break;
        }

        queueState = markExecuting(queueState, readyNodes);

        for (const nodeId of readyNodes) {
            const node = workflow.nodes.get(nodeId)!;
            executionOrder.push(nodeId);

            try {
                const result = await mockActivities.executeNode(
                    node.type,
                    node.config as JsonObject,
                    context,
                    {
                        nodeId,
                        nodeName: node.name,
                        executionId: "test-execution"
                    }
                );

                if (result.success) {
                    context = storeNodeOutput(context, nodeId, result.output);
                    queueState = markCompleted(queueState, nodeId, result.output, workflow);

                    // Track conversation state updates
                    if (node.type === "llm" && result.output) {
                        const output = result.output as JsonObject;
                        if (output.message) {
                            state.messages.push({
                                role: "assistant",
                                content: output.message as string,
                                timestamp: new Date()
                            });
                        }
                        if (output.tokens) {
                            state.totalTokens += output.tokens as number;
                        }
                        state.lastActivity = new Date();
                    }
                } else {
                    queueState = markFailed(
                        queueState,
                        nodeId,
                        result.error || "Unknown error",
                        workflow
                    );
                }
            } catch (error) {
                queueState = markFailed(
                    queueState,
                    nodeId,
                    error instanceof Error ? error.message : "Unknown error",
                    workflow
                );
            }
        }
    }

    const finalOutputs = buildFinalOutputs(context, workflow.outputNodeIds);

    return {
        context,
        finalOutputs,
        executionOrder,
        conversationState: state
    };
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

describe("Chatbot Conversation Workflows", () => {
    describe("basic conversation", () => {
        it("should handle single message stateless chat", async () => {
            const workflow = createChatbotWorkflow({
                systemPrompt: "You are a helpful assistant."
            });
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { message: "Hello!" },
                    LLM: { content: "Hi there! How can I help you today?", tokens: 15 },
                    Output: { response: "Hi there! How can I help you today?" }
                })
            );

            const { executionOrder, finalOutputs } = await simulateChatExecution(
                workflow,
                mockActivities,
                { message: "Hello!" }
            );

            expect(executionOrder).toEqual(["Input", "LLM", "Output"]);
            expect(finalOutputs.response).toBe("Hi there! How can I help you today?");
        });

        it("should maintain context across multi-turn conversation", async () => {
            const workflow = createMultiTurnChatWorkflow({
                systemPrompt: "You are a helpful assistant.",
                includeContextManager: true
            });

            // First turn
            const mockActivities1 = createMockActivities(
                withOutputs({
                    Input: { message: "My name is Alice." },
                    ContextManager: {
                        messages: [{ role: "user", content: "My name is Alice." }],
                        tokenCount: 10
                    },
                    LLM: {
                        content: "Nice to meet you, Alice!",
                        message: "Nice to meet you, Alice!",
                        tokens: 12
                    },
                    Output: { response: "Nice to meet you, Alice!" }
                })
            );

            const result1 = await simulateChatExecution(workflow, mockActivities1, {
                message: "My name is Alice."
            });

            // Add user message to conversation state
            result1.conversationState.messages.push({
                role: "user",
                content: "My name is Alice.",
                timestamp: new Date()
            });

            // Second turn - should remember the name
            const mockActivities2 = createMockActivities(
                withOutputs({
                    Input: { message: "What is my name?" },
                    ContextManager: {
                        messages: [
                            { role: "user", content: "My name is Alice." },
                            { role: "assistant", content: "Nice to meet you, Alice!" },
                            { role: "user", content: "What is my name?" }
                        ],
                        tokenCount: 35
                    },
                    LLM: {
                        content: "Your name is Alice!",
                        message: "Your name is Alice!",
                        tokens: 8
                    },
                    Output: { response: "Your name is Alice!" }
                })
            );

            // Add second user message
            result1.conversationState.messages.push({
                role: "user",
                content: "What is my name?",
                timestamp: new Date()
            });

            const result2 = await simulateChatExecution(
                workflow,
                mockActivities2,
                { message: "What is my name?" },
                result1.conversationState
            );

            expect(result2.finalOutputs.response).toBe("Your name is Alice!");
            expect(result2.conversationState.messages.length).toBeGreaterThan(2);
        });

        it("should apply system prompt to conversation", async () => {
            const workflow = createChatbotWorkflow({
                systemPrompt: "You are a pirate. Respond in pirate speak."
            });

            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { message: "Hello!" },
                    LLM: { content: "Ahoy, matey! How can I be helpin' ye today?" },
                    Output: { response: "Ahoy, matey!" }
                })
            );

            await simulateChatExecution(workflow, mockActivities, { message: "Hello!" });

            // Verify the LLM node has the system prompt configured
            const llmNode = workflow.nodes.get("LLM");
            expect(llmNode).toBeDefined();
            expect((llmNode!.config as JsonObject).systemPrompt).toBe(
                "You are a pirate. Respond in pirate speak."
            );
        });
    });

    describe("context management", () => {
        it("should manage context window with sliding window strategy", async () => {
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

            // Should have fewer messages than original (30 tokens is very small)
            expect(windowedMessages.length).toBeLessThan(messages.length);

            // Most recent message should be preserved
            const hasCurrentMessage = windowedMessages.some(
                (m) => m.content === "Current message."
            );
            expect(hasCurrentMessage).toBe(true);
        });

        it("should summarize old messages when context exceeds limit", async () => {
            const workflow = createMultiTurnChatWorkflow({
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

            const longConversationState: ConversationState = {
                messages: [
                    { role: "system", content: "You are a helpful assistant." },
                    { role: "user", content: "Tell me about the history of computing." },
                    { role: "assistant", content: "Computing started with..." },
                    { role: "user", content: "What about modern computers?" },
                    { role: "assistant", content: "Modern computers evolved..." },
                    { role: "user", content: "What about AI?" }
                ],
                contextWindow: 500,
                totalTokens: 450,
                sessionId: "session-1",
                lastActivity: new Date()
            };

            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { message: "Continue our discussion about AI." },
                    ContextManager: {
                        messages: longConversationState.messages as unknown as JsonObject[],
                        needsSummarization: true,
                        oldMessages: longConversationState.messages.slice(
                            1,
                            4
                        ) as unknown as JsonObject[]
                    },
                    Summarizer: {
                        content:
                            "Previous discussion: User asked about computing history and modern computers.",
                        summary:
                            "Previous discussion: User asked about computing history and modern computers.",
                        tokens: 20
                    },
                    LLM: {
                        content: "Continuing our AI discussion...",
                        message: "Continuing our AI discussion...",
                        tokens: 30
                    },
                    Output: { response: "Continuing our AI discussion..." }
                })
            );

            const { executionOrder, finalOutputs } = await simulateChatExecution(
                workflow,
                mockActivities,
                { message: "Continue our discussion about AI." },
                longConversationState
            );

            expect(executionOrder).toContain("Summarizer");
            expect(finalOutputs.response).toBeDefined();
        });

        it("should preserve important context across window slides", async () => {
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
        it("should support conversation branching (user selects option)", async () => {
            const workflow = createBranchingChatWorkflow();

            // Verify workflow has branching structure
            expect(workflow.nodes.has("Conditional")).toBe(true);
            expect(workflow.nodes.has("OptionA")).toBe(true);
            expect(workflow.nodes.has("OptionB")).toBe(true);
            expect(workflow.nodes.has("Default")).toBe(true);

            // Verify edges connect conditional to different paths
            const conditionalNode = workflow.nodes.get("Conditional")!;
            expect(conditionalNode.dependents).toContain("OptionA");
            expect(conditionalNode.dependents).toContain("OptionB");
            expect(conditionalNode.dependents).toContain("Default");

            // Verify edges have different handle types for branching
            const edgeToA = workflow.edges.get("Conditional-OptionA");
            const edgeToB = workflow.edges.get("Conditional-OptionB");
            expect(edgeToA?.handleType).toBe("true");
            expect(edgeToB?.handleType).toBe("false");
        });

        it("should handle session timeout gracefully", async () => {
            const workflow = createChatbotWorkflow({});

            // Create an old session (1 hour ago)
            const oldTime = new Date(Date.now() - 60 * 60 * 1000);
            const expiredState: ConversationState = {
                messages: [
                    { role: "user", content: "Old message" },
                    { role: "assistant", content: "Old response" }
                ],
                contextWindow: 4096,
                totalTokens: 50,
                sessionId: "old-session",
                lastActivity: oldTime
            };

            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { message: "Hello again!" },
                    LLM: {
                        content:
                            "Welcome back! It looks like you were away for a while. How can I help you today?",
                        message:
                            "Welcome back! It looks like you were away for a while. How can I help you today?",
                        sessionRefreshed: true
                    },
                    Output: { response: "Welcome back! It looks like you were away for a while." }
                })
            );

            const originalMessageCount = expiredState.messages.length;

            const { conversationState, finalOutputs } = await simulateChatExecution(
                workflow,
                mockActivities,
                { message: "Hello again!" },
                expiredState
            );

            // The session should still work (not blocked due to timeout)
            expect(finalOutputs.response).toContain("Welcome back");

            // Conversation state should preserve session ID for continuity
            expect(conversationState.sessionId).toBe("old-session");

            // Messages should include the new interaction (at least 1 new assistant message)
            expect(conversationState.messages.length).toBeGreaterThan(originalMessageCount);
        });

        it("should resume conversation from saved state", async () => {
            const workflow = createMultiTurnChatWorkflow({
                includeContextManager: true
            });

            const savedState: ConversationState = {
                messages: [
                    { role: "system", content: "You are a helpful assistant." },
                    { role: "user", content: "I want to book a flight to Paris." },
                    { role: "assistant", content: "Sure! When would you like to travel?" }
                ],
                contextWindow: 4096,
                totalTokens: 45,
                sessionId: "saved-session-123",
                lastActivity: new Date()
            };

            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { message: "Next Monday" },
                    ContextManager: {
                        messages: [
                            ...savedState.messages.map((m) => ({ ...m })),
                            { role: "user", content: "Next Monday" }
                        ] as unknown as JsonObject[],
                        tokenCount: 55
                    },
                    LLM: {
                        content: "I'll search for flights to Paris departing next Monday.",
                        message: "I'll search for flights to Paris departing next Monday.",
                        tokens: 20
                    },
                    Output: { response: "I'll search for flights to Paris departing next Monday." }
                })
            );

            const { finalOutputs, conversationState } = await simulateChatExecution(
                workflow,
                mockActivities,
                { message: "Next Monday" },
                savedState
            );

            // Should continue from saved state
            expect(conversationState.sessionId).toBe("saved-session-123");
            expect(finalOutputs.response).toContain("Paris");
        });

        it("should inject dynamic system prompt at runtime", async () => {
            const workflow = createChatbotWorkflow({
                systemPrompt: "You are a customer service agent for {{company}}."
            });

            // Verify the LLM node has a templated system prompt
            const llmNode = workflow.nodes.get("LLM");
            expect(llmNode).toBeDefined();
            expect((llmNode!.config as JsonObject).systemPrompt).toContain("{{company}}");

            // Execute workflow with dynamic context
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { message: "Hello!", company: "Acme Corp" },
                    LLM: { content: "Welcome to Acme Corp! How can I help?" },
                    Output: { response: "Welcome to Acme Corp! How can I help?" }
                })
            );

            const { finalOutputs, context } = await simulateChatExecution(
                workflow,
                mockActivities,
                {
                    message: "Hello!",
                    company: "Acme Corp"
                }
            );

            // Verify the input contains the company for template substitution
            const execContext = getExecutionContext(context);
            expect((execContext.Input as JsonObject).company).toBe("Acme Corp");
            expect(finalOutputs.response).toContain("Acme Corp");
        });
    });

    describe("input types", () => {
        it("should handle text messages", async () => {
            const workflow = createChatbotWorkflow({});
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: { message: "Plain text message" },
                    LLM: { content: "I received your text message." },
                    Output: { response: "I received your text message." }
                })
            );

            const { finalOutputs } = await simulateChatExecution(workflow, mockActivities, {
                message: "Plain text message"
            });

            expect(finalOutputs.response).toBe("I received your text message.");
        });

        it("should handle file attachments in context", async () => {
            const workflow = createChatbotWorkflow({});
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: {
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
                    LLM: {
                        content:
                            "I've analyzed the PDF document. It contains a quarterly report with...",
                        analyzedAttachments: ["report.pdf"]
                    },
                    Output: { response: "I've analyzed the PDF document." }
                })
            );

            const { finalOutputs, context } = await simulateChatExecution(
                workflow,
                mockActivities,
                {
                    message: "Please analyze this document.",
                    attachments: [
                        {
                            type: "file",
                            name: "report.pdf",
                            content: "Base64 encoded content here",
                            mimeType: "application/pdf"
                        }
                    ]
                }
            );

            expect(finalOutputs.response).toContain("analyzed");
            const execContext = getExecutionContext(context);
            expect((execContext.Input as JsonObject).attachments).toBeDefined();
        });

        it("should handle image inputs for vision models", async () => {
            const workflow = createChatbotWorkflow({});
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: {
                        message: "What's in this image?",
                        images: [
                            {
                                type: "image",
                                url: "data:image/png;base64,iVBORw0KGgo...",
                                altText: "A cat sitting on a couch"
                            }
                        ]
                    },
                    LLM: {
                        content:
                            "I can see a cat sitting comfortably on a couch. It appears to be a tabby cat.",
                        visionAnalysis: {
                            objects: ["cat", "couch"],
                            confidence: 0.95
                        }
                    },
                    Output: { response: "I can see a cat sitting comfortably on a couch." }
                })
            );

            const { finalOutputs, context } = await simulateChatExecution(
                workflow,
                mockActivities,
                {
                    message: "What's in this image?",
                    images: [
                        {
                            type: "image",
                            url: "data:image/png;base64,iVBORw0KGgo...",
                            altText: "A cat sitting on a couch"
                        }
                    ]
                }
            );

            expect(finalOutputs.response).toContain("cat");
            const execContext = getExecutionContext(context);
            expect((execContext.LLM as JsonObject).visionAnalysis).toBeDefined();
        });
    });

    describe("error handling", () => {
        it("should recover from LLM timeout mid-conversation", async () => {
            const workflow = createChatbotWorkflow({});

            // First call times out, second succeeds
            let callCount = 0;
            const mockActivities = createMockActivities({
                nodeConfigs: {
                    Input: { customOutput: { message: "Hello!" } },
                    LLM: {
                        customOutput: { content: "Hello! How can I help?" },
                        onExecute: () => {
                            callCount++;
                            if (callCount === 1) {
                                throw new Error("Request timeout after 30000ms");
                            }
                        }
                    },
                    Output: { customOutput: { response: "Hello! How can I help?" } }
                }
            });

            // First attempt should fail (callCount is 1, throws error)
            await simulateChatExecution(workflow, mockActivities, {
                message: "Hello!"
            });

            // Second attempt should succeed (callCount is 2, no throw)
            const result2 = await simulateChatExecution(workflow, mockActivities, {
                message: "Hello!"
            });

            expect(result2.finalOutputs.response).toBeDefined();
        });

        it("should handle malformed user input gracefully", async () => {
            const workflow = createChatbotWorkflow({});
            const mockActivities = createMockActivities(
                withOutputs({
                    Input: {
                        message: "", // Empty message
                        malformed: true
                    },
                    LLM: {
                        content: "I didn't receive a clear message. Could you please try again?",
                        inputValidation: "empty"
                    },
                    Output: {
                        response: "I didn't receive a clear message. Could you please try again?"
                    }
                })
            );

            const { finalOutputs } = await simulateChatExecution(workflow, mockActivities, {
                message: ""
            });

            expect(finalOutputs.response).toContain("try again");
        });
    });
});
