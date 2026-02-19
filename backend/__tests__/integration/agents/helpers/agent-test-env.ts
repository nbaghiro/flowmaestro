/**
 * Agent Test Environment Helper
 *
 * Provides utilities for testing agent workflows with mocked LLM responses
 * but REAL activity implementations for everything else (tool execution, safety, etc.)
 *
 * This enables true integration testing of the agent orchestrator workflow.
 */

import { Client } from "@temporalio/client";
import { TestWorkflowEnvironment } from "@temporalio/testing";
import { Worker, Runtime } from "@temporalio/worker";
import { nanoid } from "nanoid";
import type { JsonObject } from "@flowmaestro/shared";
import { createLLMMockClient, createCompletionResponse } from "../../../helpers/llm-mock-client";
import type { SafetyContext, SafetyConfig } from "../../../../src/core/safety/types";
import type { Tool, MemoryConfig } from "../../../../src/storage/models/Agent";
import type { ThreadMessage, ToolCall } from "../../../../src/storage/models/AgentExecution";
import type {
    AgentOrchestratorInput,
    AgentOrchestratorResult,
    AgentConfig,
    LLMResponse
} from "../../../../src/temporal/workflows/agent-orchestrator";
import type { LLMMockConfig } from "../../../helpers/llm-mock-client";

// ============================================================================
// TYPES
// ============================================================================

export interface AgentTestEnvironment {
    env: TestWorkflowEnvironment;
    worker: Worker;
    client: Client;
    cleanup: () => Promise<void>;
    /** Access to captured events for assertions */
    capturedEvents: CapturedEvent[];
    /** Access to LLM mock for verification */
    llmMock: {
        getCalls: () => LLMCallRecord[];
        getCallCount: () => number;
    };
    /** Register a test agent so getAgentConfig can find it */
    registerAgent: (agent: AgentConfig) => void;
    /** Clear all registered agents */
    clearAgents: () => void;
}

export interface CapturedEvent {
    type: string;
    timestamp: number;
    data: JsonObject;
}

export interface LLMCallRecord {
    input: {
        model: string;
        provider: string;
        messages: ThreadMessage[];
        tools: Tool[];
    };
    response: LLMResponse;
    timestamp: number;
}

export interface AgentTestOptions {
    /** Mock LLM responses - matched in order or by criteria */
    mockLLMResponses?: LLMMockConfig[];
    /** Initial credit balance for the workspace */
    initialCredits?: number;
    /** Whether to skip credit checks (default: true for tests) */
    skipCreditCheck?: boolean;
    /** Enable sandbox mode for MCP tools (default: true) */
    enableSandbox?: boolean;
    /** Custom safety config override */
    safetyConfig?: Partial<SafetyConfig>;
    /** Timeout for workflow execution in ms */
    timeout?: number;
}

export interface AgentTestResult {
    result: AgentOrchestratorResult;
    events: CapturedEvent[];
    llmCalls: LLMCallRecord[];
    durationMs: number;
}

export interface TestAgentConfig {
    id?: string;
    name?: string;
    model?: string;
    provider?: string;
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    maxIterations?: number;
    tools?: Tool[];
    memoryConfig?: Partial<MemoryConfig>;
    safetyConfig?: Partial<SafetyConfig>;
}

// ============================================================================
// DEFAULT CONFIGURATIONS
// ============================================================================

const DEFAULT_SAFETY_CONFIG: SafetyConfig = {
    enablePiiDetection: false,
    enablePromptInjectionDetection: false,
    enableContentModeration: false,
    piiRedactionEnabled: false,
    promptInjectionAction: "allow"
};

const DEFAULT_MEMORY_CONFIG: MemoryConfig = {
    max_messages: 100,
    embeddings_enabled: true,
    working_memory_enabled: true
};

// Track if Runtime has been installed
let runtimeInstalled = false;

// ============================================================================
// TEST ENVIRONMENT SETUP
// ============================================================================

/**
 * Create an agent test environment with mocked LLM but real activities
 *
 * @param options - Configuration options for the test environment
 * @returns AgentTestEnvironment with worker, client, and cleanup
 */
export async function createAgentTestEnvironment(
    options: AgentTestOptions = {}
): Promise<AgentTestEnvironment> {
    const {
        mockLLMResponses = [createCompletionResponse("I understand. How can I help you?")],
        initialCredits = 10000,
        skipCreditCheck = true,
        enableSandbox = true,
        timeout: _timeout = 60000
    } = options;

    // Suppress noisy Temporal logs during tests (only install once)
    if (!runtimeInstalled) {
        try {
            Runtime.install({
                logger: {
                    log: () => {},
                    trace: () => {},
                    debug: () => {},
                    info: () => {},
                    warn: () => {},
                    error: () => {}
                }
            });
            runtimeInstalled = true;
        } catch {
            // Runtime was already installed (e.g., in another test file)
            runtimeInstalled = true;
        }
    }

    const env = await TestWorkflowEnvironment.createLocal();

    // Create state containers for captured data
    const capturedEvents: CapturedEvent[] = [];
    const llmCalls: LLMCallRecord[] = [];

    // Agent registry - shared between test and activities
    const agentRegistry = new Map<string, AgentConfig>();

    // Create LLM mock client
    const llmMockClient = createLLMMockClient(mockLLMResponses);

    // Create mock activities that combine real implementations with mocked LLM
    const activities = createAgentTestActivities({
        llmMockClient,
        llmCalls,
        capturedEvents,
        initialCredits,
        skipCreditCheck,
        enableSandbox,
        safetyConfig: options.safetyConfig,
        agentRegistry
    });

    const worker = await Worker.create({
        connection: env.nativeConnection,
        taskQueue: "test-agent-queue",
        workflowsPath: require.resolve("../../../../src/temporal/workflows"),
        activities
    });

    const cleanup = async () => {
        try {
            await worker.shutdown();
        } catch {
            // Ignore shutdown errors - worker may already be stopped
        }
        await env.teardown();
    };

    return {
        env,
        worker,
        client: env.client,
        cleanup,
        capturedEvents,
        llmMock: {
            getCalls: () => llmCalls,
            getCallCount: () => llmCalls.length
        },
        registerAgent: (agent: AgentConfig) => {
            agentRegistry.set(agent.id, agent);
        },
        clearAgents: () => {
            agentRegistry.clear();
        }
    };
}

// ============================================================================
// ACTIVITY FACTORIES
// ============================================================================

interface ActivityFactoryOptions {
    llmMockClient: ReturnType<typeof createLLMMockClient>;
    llmCalls: LLMCallRecord[];
    capturedEvents: CapturedEvent[];
    initialCredits: number;
    skipCreditCheck: boolean;
    enableSandbox: boolean;
    safetyConfig?: Partial<SafetyConfig>;
    agentRegistry: Map<string, AgentConfig>;
}

/**
 * Create activities for agent testing
 * Uses mocked LLM but real implementations for everything else
 */
function createAgentTestActivities(options: ActivityFactoryOptions) {
    const {
        llmMockClient,
        llmCalls,
        capturedEvents,
        initialCredits,
        skipCreditCheck,
        safetyConfig: customSafetyConfig,
        agentRegistry
    } = options;

    // Credit tracking state
    let creditBalance = initialCredits;
    let reservedCredits = 0;

    return {
        // ==========================================
        // Agent Configuration (Mock)
        // ==========================================
        getAgentConfig: jest
            .fn()
            .mockImplementation(async (input: { agentId: string; userId: string }) => {
                const stored = agentRegistry.get(input.agentId);
                if (stored) return stored;

                // Return default test agent config
                return createDefaultTestAgentConfig(input.agentId, customSafetyConfig);
            }),

        // ==========================================
        // LLM Calls (Mocked)
        // ==========================================
        callLLM: jest
            .fn()
            .mockImplementation(
                async (input: {
                    model: string;
                    provider: string;
                    connectionId: string | null;
                    messages: ThreadMessage[];
                    tools: Tool[];
                    temperature: number;
                    maxTokens: number;
                    executionId?: string;
                    threadId: string;
                }): Promise<LLMResponse> => {
                    const response = llmMockClient.getResponse(input.messages, input.tools);

                    // Record the call
                    llmCalls.push({
                        input: {
                            model: input.model,
                            provider: input.provider,
                            messages: input.messages,
                            tools: input.tools
                        },
                        response,
                        timestamp: Date.now()
                    });

                    return response;
                }
            ),

        // ==========================================
        // Tool Execution (Mock implementation for tests)
        // ==========================================
        executeToolCall: jest
            .fn()
            .mockImplementation(
                async (input: {
                    executionId: string;
                    toolCall: ToolCall;
                    availableTools: Tool[];
                    userId: string;
                    workspaceId: string;
                    agentId?: string;
                }): Promise<JsonObject> => {
                    const { toolCall, availableTools } = input;

                    // Find tool definition
                    const tool = availableTools.find((t) => t.name === toolCall.name);
                    if (!tool) {
                        // Return error result instead of throwing
                        return {
                            success: false,
                            error: `Tool "${toolCall.name}" not found in available tools`
                        };
                    }

                    // For MCP tools, try sandbox first, then fall back to mock
                    if (tool.type === "mcp") {
                        try {
                            const { sandboxDataService } = await import(
                                "../../../../src/integrations/sandbox"
                            );

                            const provider = tool.config?.provider as string;
                            // Derive operation from tool name (e.g., "slack_send_message" -> "send_message")
                            const operation = tool.name.includes("_")
                                ? tool.name.substring(tool.name.indexOf("_") + 1)
                                : tool.name;

                            if (provider && operation) {
                                const sandboxResponse = await sandboxDataService.getSandboxResponse(
                                    provider,
                                    operation,
                                    toolCall.arguments as Record<string, unknown>
                                );

                                if (sandboxResponse && sandboxResponse.success) {
                                    return sandboxResponse.data as JsonObject;
                                }
                            }
                        } catch {
                            // Sandbox not available, fall through to mock
                        }

                        // Return mock response for MCP tools
                        return {
                            success: true,
                            message: `Mock response for ${tool.name}`,
                            result: toolCall.arguments,
                            provider: tool.config?.provider ?? "unknown"
                        };
                    }

                    // For builtin tools, return mock response
                    if (tool.type === "builtin") {
                        return {
                            success: true,
                            result: `Executed ${tool.name}`,
                            data: toolCall.arguments
                        };
                    }

                    // For knowledge base tools
                    if (tool.type === "knowledge_base") {
                        return {
                            success: true,
                            results: [
                                { content: "Mock KB result 1", score: 0.95 },
                                { content: "Mock KB result 2", score: 0.85 }
                            ],
                            query: toolCall.arguments.query as string,
                            totalResults: 2
                        };
                    }

                    // For agent tools
                    if (tool.type === "agent") {
                        return {
                            success: true,
                            result: `Agent ${tool.config?.agentId} completed task`,
                            message: "Task completed by nested agent"
                        };
                    }

                    // Default mock response
                    return {
                        success: true,
                        result: `Executed ${tool.name}`,
                        data: toolCall.arguments
                    };
                }
            ),

        // ==========================================
        // Thread/Memory Activities (Mock)
        // ==========================================
        loadThreadHistory: jest.fn().mockResolvedValue({ messages: [] }),

        saveThreadIncremental: jest.fn().mockResolvedValue(undefined),

        updateThreadTokens: jest.fn().mockResolvedValue(undefined),

        storeThreadEmbeddings: jest.fn().mockResolvedValue(undefined),

        // ==========================================
        // Safety Validation (Real with optional override)
        // ==========================================
        validateInput: jest
            .fn()
            .mockImplementation(
                async (input: {
                    content: string;
                    context: SafetyContext;
                    config: SafetyConfig;
                }) => {
                    // Use real safety pipeline if enabled in config
                    const mergedConfig = {
                        ...DEFAULT_SAFETY_CONFIG,
                        ...customSafetyConfig,
                        ...input.config
                    };

                    if (
                        mergedConfig.enablePiiDetection ||
                        mergedConfig.enablePromptInjectionDetection ||
                        mergedConfig.enableContentModeration
                    ) {
                        // Import and use real safety pipeline
                        const { SafetyPipeline } = await import(
                            "../../../../src/core/safety/safety-pipeline"
                        );
                        const pipeline = new SafetyPipeline(mergedConfig);
                        const result = await pipeline.process(input.content, input.context);
                        return {
                            content: result.content,
                            shouldProceed: result.shouldProceed,
                            violations: result.results
                        };
                    }

                    // Default: allow everything
                    return {
                        content: input.content,
                        shouldProceed: true,
                        violations: []
                    };
                }
            ),

        validateOutput: jest
            .fn()
            .mockImplementation(
                async (input: {
                    content: string;
                    context: SafetyContext;
                    config: SafetyConfig;
                }) => {
                    // Same logic as validateInput
                    const mergedConfig = {
                        ...DEFAULT_SAFETY_CONFIG,
                        ...customSafetyConfig,
                        ...input.config
                    };

                    if (
                        mergedConfig.enablePiiDetection ||
                        mergedConfig.enablePromptInjectionDetection ||
                        mergedConfig.enableContentModeration
                    ) {
                        const { SafetyPipeline } = await import(
                            "../../../../src/core/safety/safety-pipeline"
                        );
                        const pipeline = new SafetyPipeline(mergedConfig);
                        const result = await pipeline.process(input.content, input.context);
                        return {
                            content: result.content,
                            shouldProceed: result.shouldProceed,
                            violations: result.results
                        };
                    }

                    return {
                        content: input.content,
                        shouldProceed: true,
                        violations: []
                    };
                }
            ),

        logSafetyEvent: jest.fn().mockResolvedValue(undefined),

        // ==========================================
        // Event Emission (Captured for assertions)
        // ==========================================
        emitAgentExecutionStarted: jest.fn().mockImplementation(async (input: JsonObject) => {
            capturedEvents.push({
                type: "agent:execution:started",
                timestamp: Date.now(),
                data: input
            });
        }),

        emitAgentMessage: jest.fn().mockImplementation(async (input: JsonObject) => {
            capturedEvents.push({
                type: "agent:message:new",
                timestamp: Date.now(),
                data: input
            });
        }),

        emitAgentThinking: jest.fn().mockImplementation(async (input: JsonObject) => {
            capturedEvents.push({
                type: "agent:thinking",
                timestamp: Date.now(),
                data: input
            });
        }),

        emitAgentToolCallStarted: jest.fn().mockImplementation(async (input: JsonObject) => {
            capturedEvents.push({
                type: "agent:tool:call:started",
                timestamp: Date.now(),
                data: input
            });
        }),

        emitAgentToolCallCompleted: jest.fn().mockImplementation(async (input: JsonObject) => {
            capturedEvents.push({
                type: "agent:tool:call:completed",
                timestamp: Date.now(),
                data: input
            });
        }),

        emitAgentToolCallFailed: jest.fn().mockImplementation(async (input: JsonObject) => {
            capturedEvents.push({
                type: "agent:tool:call:failed",
                timestamp: Date.now(),
                data: input
            });
        }),

        emitAgentExecutionCompleted: jest.fn().mockImplementation(async (input: JsonObject) => {
            capturedEvents.push({
                type: "agent:execution:completed",
                timestamp: Date.now(),
                data: input
            });
        }),

        emitAgentExecutionFailed: jest.fn().mockImplementation(async (input: JsonObject) => {
            capturedEvents.push({
                type: "agent:execution:failed",
                timestamp: Date.now(),
                data: input
            });
        }),

        // ==========================================
        // Tracing (No-op for tests)
        // ==========================================
        createSpan: jest.fn().mockResolvedValue({
            spanId: `test-span-${nanoid()}`,
            traceId: `test-trace-${nanoid()}`
        }),

        endSpan: jest.fn().mockResolvedValue(undefined),

        endSpanWithError: jest.fn().mockResolvedValue(undefined),

        setSpanAttributes: jest.fn().mockResolvedValue(undefined),

        // ==========================================
        // Credit Activities
        // ==========================================
        shouldAllowExecution: jest
            .fn()
            .mockImplementation(
                async (input: { workspaceId: string; estimatedCredits: number }) => {
                    if (skipCreditCheck) return true;
                    return creditBalance >= input.estimatedCredits;
                }
            ),

        reserveCredits: jest
            .fn()
            .mockImplementation(
                async (input: { workspaceId: string; estimatedCredits: number }) => {
                    if (skipCreditCheck) return true;
                    if (creditBalance - reservedCredits < input.estimatedCredits) return false;
                    reservedCredits += input.estimatedCredits;
                    return true;
                }
            ),

        releaseCredits: jest.fn().mockImplementation(async (input: { amount: number }) => {
            reservedCredits -= input.amount;
        }),

        finalizeCredits: jest
            .fn()
            .mockImplementation(async (input: { reservedAmount: number; actualAmount: number }) => {
                reservedCredits -= input.reservedAmount;
                creditBalance -= input.actualAmount;
            }),

        calculateLLMCredits: jest.fn().mockResolvedValue(5),

        calculateNodeCredits: jest.fn().mockResolvedValue(1),

        estimateWorkflowCredits: jest.fn().mockResolvedValue({
            totalCredits: 100,
            breakdown: [],
            confidence: "estimate"
        }),

        getCreditsBalance: jest.fn().mockImplementation(async () => ({
            available: creditBalance - reservedCredits,
            subscription: Math.floor(creditBalance * 0.5),
            purchased: Math.floor(creditBalance * 0.5),
            bonus: 0,
            reserved: reservedCredits,
            subscriptionExpiresAt: null,
            usedThisMonth: 0,
            usedAllTime: initialCredits - creditBalance
        }))
    };
}

/**
 * Create a default test agent configuration
 */
function createDefaultTestAgentConfig(
    agentId: string,
    safetyConfig?: Partial<SafetyConfig>
): AgentConfig {
    return {
        id: agentId,
        name: "Test Agent",
        model: "gpt-4",
        provider: "openai",
        connection_id: null,
        system_prompt: "You are a helpful assistant for testing purposes.",
        temperature: 0.7,
        max_tokens: 1000,
        max_iterations: 10,
        available_tools: [],
        memory_config: DEFAULT_MEMORY_CONFIG,
        safety_config: { ...DEFAULT_SAFETY_CONFIG, ...safetyConfig }
    };
}

// ============================================================================
// WORKFLOW EXECUTION HELPERS
// ============================================================================

/**
 * Run an agent execution and return detailed results
 */
export async function runAgentExecution(
    testEnv: AgentTestEnvironment,
    input: Partial<AgentOrchestratorInput> & { agentId: string }
): Promise<AgentTestResult> {
    const executionId = input.executionId || `test-exec-${nanoid()}`;
    const workflowId = `test-agent-workflow-${nanoid()}`;

    const orchestratorInput: AgentOrchestratorInput = {
        executionId,
        agentId: input.agentId,
        userId: input.userId || "test-user",
        threadId: input.threadId || `test-thread-${nanoid()}`,
        initialMessage: input.initialMessage,
        connectionId: input.connectionId,
        model: input.model,
        serializedThread: input.serializedThread,
        iterations: input.iterations || 0,
        workspaceId: input.workspaceId || "test-workspace",
        skipCreditCheck: input.skipCreditCheck ?? true,
        accumulatedCredits: input.accumulatedCredits,
        reservedCredits: input.reservedCredits
    };

    const startTime = Date.now();

    try {
        const result = await testEnv.worker.runUntil(
            testEnv.client.workflow.execute("agentOrchestratorWorkflow", {
                workflowId,
                taskQueue: "test-agent-queue",
                args: [orchestratorInput],
                workflowExecutionTimeout: 60000
            })
        );

        const durationMs = Date.now() - startTime;

        return {
            result: result as AgentOrchestratorResult,
            events: [...testEnv.capturedEvents],
            llmCalls: testEnv.llmMock.getCalls(),
            durationMs
        };
    } catch (error) {
        const durationMs = Date.now() - startTime;

        return {
            result: {
                success: false,
                serializedThread: { messages: [], savedMessageIds: [], metadata: {} },
                iterations: 0,
                error: error instanceof Error ? error.message : String(error)
            },
            events: [...testEnv.capturedEvents],
            llmCalls: testEnv.llmMock.getCalls(),
            durationMs
        };
    }
}

// ============================================================================
// TEST DATA FACTORIES
// ============================================================================

/**
 * Create a test agent configuration
 */
export function createTestAgent(config: TestAgentConfig = {}): AgentConfig {
    return {
        id: config.id || `agent-${nanoid()}`,
        name: config.name || "Test Agent",
        model: config.model || "gpt-4",
        provider: config.provider || "openai",
        connection_id: null,
        system_prompt: config.systemPrompt || "You are a helpful assistant.",
        temperature: config.temperature ?? 0.7,
        max_tokens: config.maxTokens ?? 1000,
        max_iterations: config.maxIterations ?? 10,
        available_tools: config.tools || [],
        memory_config: { ...DEFAULT_MEMORY_CONFIG, ...config.memoryConfig },
        safety_config: { ...DEFAULT_SAFETY_CONFIG, ...config.safetyConfig }
    };
}

/**
 * Create a test MCP tool definition
 * Note: The operation is derived from the tool name (e.g., "slack_send_message" -> "send_message")
 */
export function createTestMCPTool(config: {
    name: string;
    description: string;
    provider: string;
    schema?: JsonObject;
}): Tool {
    return {
        id: `tool-${nanoid()}`,
        name: config.name,
        description: config.description,
        type: "mcp",
        schema: config.schema || {
            type: "object",
            properties: {},
            required: []
        },
        config: {
            provider: config.provider
        }
    };
}

/**
 * Create a test builtin tool definition
 */
export function createTestBuiltinTool(config: {
    name: string;
    description: string;
    schema?: JsonObject;
}): Tool {
    return {
        id: `tool-${nanoid()}`,
        name: config.name,
        description: config.description,
        type: "builtin",
        schema: config.schema || {
            type: "object",
            properties: {},
            required: []
        },
        config: {}
    };
}

/**
 * Create a test knowledge base tool definition
 */
export function createTestKBTool(config: {
    knowledgeBaseId: string;
    name?: string;
    description?: string;
}): Tool {
    return {
        id: `tool-${nanoid()}`,
        name: config.name || `search_kb_${config.knowledgeBaseId}`,
        description: config.description || "Search the knowledge base",
        type: "knowledge_base",
        schema: {
            type: "object",
            properties: {
                query: { type: "string", description: "Search query" },
                topK: { type: "number", description: "Number of results", default: 5 }
            },
            required: ["query"]
        },
        config: {
            knowledgeBaseId: config.knowledgeBaseId
        }
    };
}

// ============================================================================
// Note: waitFor and delay utilities are exported from temporal-test-env.ts
