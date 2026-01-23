/**
 * Persona Orchestrator Workflow Tests
 *
 * Comprehensive tests for the persona orchestrator covering:
 * - Persona configuration loading
 * - Credit check and reservation
 * - ReAct pattern execution loop
 * - Tool execution (success and failure)
 * - Safety validation (input and output)
 * - Continue-as-new functionality
 * - Progress tracking
 * - Max iterations handling
 * - Message state management
 */

import type { JsonObject } from "@flowmaestro/shared";
import type { SafetyCheckResult } from "../../../core/safety/types";
import type { SerializedThread } from "../../../services/agents/ThreadManager";
import type { ThreadMessage, ToolCall } from "../../../storage/models/AgentExecution";
import type { ValidateInputResult, ValidateOutputResult } from "../../activities";

// ============================================================================
// MOCK SETUP
// ============================================================================

interface PersonaConfig {
    id: string;
    name: string;
    model: string;
    provider: string;
    connection_id: string;
    system_prompt: string;
    temperature: number;
    max_tokens: number;
    max_iterations: number;
    available_tools: Array<{
        name: string;
        description: string;
        schema: object;
    }>;
    memory_config: {
        type: string;
        max_messages: number;
    };
    safety_config: {
        enablePiiDetection: boolean;
        enablePromptInjectionDetection: boolean;
        enableContentModeration: boolean;
        piiRedactionEnabled: boolean;
        promptInjectionAction: string;
    };
}

interface LLMResponse {
    content: string;
    tool_calls?: ToolCall[];
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}

interface MockActivityResults {
    getPersonaConfig: PersonaConfig | null;
    callLLM: LLMResponse[];
    callLLMIndex: number;
    executeToolCall: Map<string, JsonObject>;
    validateInput: ValidateInputResult;
    validateOutput: ValidateOutputResult;
    shouldAllowExecution: boolean;
    reserveCredits: boolean;
    calculateLLMCredits: number;
    spans: Array<{ spanId: string; name: string; ended: boolean; error?: Error }>;
    savedMessages: ThreadMessage[];
    personaStatus: Array<{ status: string; reason?: string }>;
    personaProgress: Array<{ iteration: number; credits: number }>;
}

const mockActivityResults: MockActivityResults = {
    getPersonaConfig: null,
    callLLM: [],
    callLLMIndex: 0,
    executeToolCall: new Map(),
    validateInput: { content: "", shouldProceed: true, violations: [] },
    validateOutput: { content: "", shouldProceed: true, violations: [] },
    shouldAllowExecution: true,
    reserveCredits: true,
    calculateLLMCredits: 5,
    spans: [],
    savedMessages: [],
    personaStatus: [],
    personaProgress: []
};

function resetMocks(): void {
    mockActivityResults.getPersonaConfig = null;
    mockActivityResults.callLLM = [];
    mockActivityResults.callLLMIndex = 0;
    mockActivityResults.executeToolCall.clear();
    mockActivityResults.validateInput = { content: "", shouldProceed: true, violations: [] };
    mockActivityResults.validateOutput = { content: "", shouldProceed: true, violations: [] };
    mockActivityResults.shouldAllowExecution = true;
    mockActivityResults.reserveCredits = true;
    mockActivityResults.calculateLLMCredits = 5;
    mockActivityResults.spans = [];
    mockActivityResults.savedMessages = [];
    mockActivityResults.personaStatus = [];
    mockActivityResults.personaProgress = [];
}

// ============================================================================
// MOCK ACTIVITIES
// ============================================================================

const mockGetPersonaConfig = jest.fn().mockImplementation(() => {
    if (!mockActivityResults.getPersonaConfig) {
        throw new Error("Persona not found");
    }
    return Promise.resolve(mockActivityResults.getPersonaConfig);
});

const mockCallLLM = jest.fn().mockImplementation(() => {
    const response = mockActivityResults.callLLM[mockActivityResults.callLLMIndex];
    mockActivityResults.callLLMIndex++;
    if (!response) {
        throw new Error("No LLM response configured");
    }
    return Promise.resolve(response);
});

const mockExecuteToolCall = jest.fn().mockImplementation((input: { toolCall: ToolCall }) => {
    const result = mockActivityResults.executeToolCall.get(input.toolCall.name);
    if (result === undefined) {
        throw new Error(`Tool ${input.toolCall.name} execution failed`);
    }
    return Promise.resolve(result);
});

const mockValidateInput = jest.fn().mockImplementation((input: { content: string }) => {
    return Promise.resolve({
        ...mockActivityResults.validateInput,
        content: mockActivityResults.validateInput.content || input.content
    });
});

const mockValidateOutput = jest.fn().mockImplementation((input: { content: string }) => {
    return Promise.resolve({
        ...mockActivityResults.validateOutput,
        content: mockActivityResults.validateOutput.content || input.content
    });
});

const mockCreateSpan = jest.fn().mockImplementation((input: { name: string }) => {
    const spanId = `span-${mockActivityResults.spans.length}`;
    mockActivityResults.spans.push({ spanId, name: input.name, ended: false });
    return Promise.resolve({ spanId });
});

const mockEndSpan = jest.fn().mockImplementation((input: { spanId: string; error?: Error }) => {
    const span = mockActivityResults.spans.find((s) => s.spanId === input.spanId);
    if (span) {
        span.ended = true;
        span.error = input.error;
    }
    return Promise.resolve();
});

const mockSaveThreadIncremental = jest
    .fn()
    .mockImplementation((input: { messages: ThreadMessage[] }) => {
        mockActivityResults.savedMessages.push(...input.messages);
        return Promise.resolve();
    });

const mockUpdateThreadTokens = jest.fn().mockImplementation(() => Promise.resolve());

const mockUpdatePersonaInstanceStatus = jest
    .fn()
    .mockImplementation((input: { status: string; completionReason?: string }) => {
        mockActivityResults.personaStatus.push({
            status: input.status,
            reason: input.completionReason
        });
        return Promise.resolve();
    });

const mockUpdatePersonaInstanceProgress = jest
    .fn()
    .mockImplementation((input: { iterationCount: number; accumulatedCostCredits: number }) => {
        mockActivityResults.personaProgress.push({
            iteration: input.iterationCount,
            credits: input.accumulatedCostCredits
        });
        return Promise.resolve();
    });

const mockShouldAllowExecution = jest
    .fn()
    .mockImplementation(() => Promise.resolve(mockActivityResults.shouldAllowExecution));

const mockReserveCredits = jest
    .fn()
    .mockImplementation(() => Promise.resolve(mockActivityResults.reserveCredits));

const mockFinalizeCredits = jest.fn().mockImplementation(() => Promise.resolve());

const mockCalculateLLMCredits = jest
    .fn()
    .mockImplementation(() => Promise.resolve(mockActivityResults.calculateLLMCredits));

// ============================================================================
// WORKFLOW SIMULATION
// ============================================================================

interface PersonaOrchestratorInput {
    executionId: string;
    personaInstanceId: string;
    userId: string;
    workspaceId: string;
    threadId: string;
    initialMessage?: string;
    serializedThread?: SerializedThread;
    iterations?: number;
    accumulatedCredits?: number;
    reservedCredits?: number;
}

interface PersonaOrchestratorResult {
    success: boolean;
    serializedThread: SerializedThread;
    iterations: number;
    finalMessage?: string;
    error?: string;
    totalCreditsUsed?: number;
    continueAsNew?: boolean;
}

interface WorkflowMessageState {
    messages: ThreadMessage[];
    savedMessageIds: string[];
    metadata: JsonObject;
}

/**
 * Simulates the persona orchestrator workflow execution
 */
async function simulatePersonaOrchestrator(
    input: PersonaOrchestratorInput,
    options: {
        maxIterationsOverride?: number;
        continueAsNewThreshold?: number;
    } = {}
): Promise<PersonaOrchestratorResult> {
    const {
        executionId,
        personaInstanceId,
        userId,
        workspaceId,
        threadId,
        initialMessage,
        serializedThread,
        iterations = 0,
        accumulatedCredits: previousCredits = 0,
        reservedCredits: previousReserved = 0
    } = input;

    let reservedCredits = previousReserved;
    let accumulatedCredits = previousCredits;

    // Load persona configuration
    const persona = await mockGetPersonaConfig({
        personaInstanceId,
        userId,
        workspaceId
    });

    // Update status to running (only on first run)
    if (iterations === 0) {
        await mockUpdatePersonaInstanceStatus({
            personaInstanceId,
            status: "running",
            startedAt: new Date()
        });
    }

    // Credit check and reservation (only on first run)
    if (iterations === 0) {
        const estimatedCredits = Math.ceil(persona.max_iterations * 15 * 1.2);

        const allowed = await mockShouldAllowExecution({
            workspaceId,
            estimatedCredits
        });

        if (!allowed) {
            const errorMessage = `Insufficient credits for persona execution. Estimated need: ${estimatedCredits} credits`;

            await mockUpdatePersonaInstanceStatus({
                personaInstanceId,
                status: "failed",
                completionReason: "max_cost",
                completedAt: new Date()
            });

            return {
                success: false,
                serializedThread: { messages: [], savedMessageIds: [], metadata: {} },
                iterations: 0,
                error: errorMessage
            };
        }

        const reserved = await mockReserveCredits({
            workspaceId,
            estimatedCredits
        });

        if (!reserved) {
            const errorMessage = "Failed to reserve credits for persona execution";

            await mockUpdatePersonaInstanceStatus({
                personaInstanceId,
                status: "failed",
                completionReason: "failed",
                completedAt: new Date()
            });

            return {
                success: false,
                serializedThread: { messages: [], savedMessageIds: [], metadata: {} },
                iterations: 0,
                error: errorMessage
            };
        }

        reservedCredits = estimatedCredits;
    }

    // Create span for persona execution (only on first run)
    let personaRunSpanId: string | undefined;
    if (iterations === 0) {
        const spanContext = await mockCreateSpan({
            traceId: executionId,
            parentSpanId: undefined,
            name: `Persona: ${persona.name}`,
            spanType: "AGENT_RUN",
            entityId: personaInstanceId,
            input: { personaInstanceId, threadId, initialMessage },
            attributes: { userId, personaName: persona.name, model: persona.model }
        });
        personaRunSpanId = spanContext.spanId;
    }

    // Initialize message state
    let messageState: WorkflowMessageState;

    if (serializedThread) {
        messageState = {
            messages: serializedThread.messages,
            savedMessageIds: serializedThread.savedMessageIds,
            metadata: serializedThread.metadata
        };
    } else {
        messageState = {
            messages: [],
            savedMessageIds: [],
            metadata: {}
        };

        // Add system prompt
        const systemMessage: ThreadMessage = {
            id: `sys-${Date.now()}`,
            role: "system",
            content: persona.system_prompt,
            timestamp: new Date()
        };
        messageState.messages.push(systemMessage);
        messageState.savedMessageIds.push(systemMessage.id);

        // Add initial message if provided
        if (initialMessage) {
            const safetyResult = await mockValidateInput({
                content: initialMessage,
                context: {
                    userId,
                    agentId: personaInstanceId,
                    executionId,
                    threadId,
                    direction: "input",
                    messageRole: "user"
                },
                config: persona.safety_config
            });

            if (!safetyResult.shouldProceed) {
                const blockReasons = safetyResult.violations
                    .filter((v: SafetyCheckResult) => v.action === "block")
                    .map((v: SafetyCheckResult) => v.message || v.type)
                    .join(", ");

                await mockUpdatePersonaInstanceStatus({
                    personaInstanceId,
                    status: "failed",
                    completionReason: "failed",
                    completedAt: new Date()
                });

                throw new Error(`Input blocked by safety check: ${blockReasons}`);
            }

            const userMessage: ThreadMessage = {
                id: `user-${Date.now()}`,
                role: "user",
                content: safetyResult.content,
                timestamp: new Date()
            };
            messageState.messages.push(userMessage);
        }
    }

    const maxIterations = options.maxIterationsOverride || persona.max_iterations || 100;
    const continueAsNewThreshold = options.continueAsNewThreshold || 50;
    const progressUpdateInterval = 5;
    let currentIterations = iterations;

    // Track failed tools
    const failedToolNames = new Set<string>();

    // Main execution loop (ReAct pattern)
    while (currentIterations < maxIterations) {
        // Continue-as-new check
        if (currentIterations > 0 && currentIterations % continueAsNewThreshold === 0) {
            // Save unsaved messages
            const unsavedMessages = getUnsavedMessages(messageState);
            if (unsavedMessages.length > 0) {
                await mockSaveThreadIncremental({
                    executionId,
                    threadId,
                    messages: unsavedMessages
                });
                unsavedMessages.forEach((msg) => messageState.savedMessageIds.push(msg.id));
            }

            // Summarize message state
            const summarizedState = summarizeMessageState(
                messageState,
                persona.memory_config.max_messages
            );

            return {
                success: true,
                serializedThread: summarizedState,
                iterations: currentIterations,
                totalCreditsUsed: accumulatedCredits,
                continueAsNew: true
            };
        }

        // Update progress periodically
        if (currentIterations > 0 && currentIterations % progressUpdateInterval === 0) {
            await mockUpdatePersonaInstanceProgress({
                personaInstanceId,
                iterationCount: currentIterations,
                accumulatedCostCredits: accumulatedCredits,
                progress: {
                    current_step: currentIterations,
                    total_steps: maxIterations,
                    percentage: Math.round((currentIterations / maxIterations) * 100)
                }
            });
        }

        // Create iteration span
        const iterationContext = await mockCreateSpan({
            traceId: executionId,
            parentSpanId: personaRunSpanId,
            name: `Iteration ${currentIterations + 1}`,
            spanType: "AGENT_ITERATION",
            entityId: personaInstanceId,
            input: { iteration: currentIterations },
            attributes: { iteration: currentIterations, maxIterations }
        });
        const iterationSpanId = iterationContext.spanId;

        // Filter out failed tools
        const availableTools = persona.available_tools.filter(
            (tool: { name: string; description: string; schema: object }) =>
                !failedToolNames.has(tool.name)
        );

        // Call LLM
        let llmResponse: LLMResponse;
        try {
            llmResponse = await mockCallLLM({
                model: persona.model,
                provider: persona.provider,
                connectionId: persona.connection_id,
                messages: messageState.messages,
                tools: availableTools,
                temperature: persona.temperature,
                maxTokens: persona.max_tokens,
                executionId,
                threadId
            });

            // Track credit usage
            if (llmResponse.usage) {
                const callCredits = await mockCalculateLLMCredits({
                    model: persona.model,
                    inputTokens: llmResponse.usage.promptTokens,
                    outputTokens: llmResponse.usage.completionTokens
                });
                accumulatedCredits += callCredits;
            }

            await mockUpdateThreadTokens({
                threadId,
                executionId,
                usage: llmResponse.usage,
                provider: persona.provider,
                model: persona.model
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown LLM error";

            await mockEndSpan({
                spanId: iterationSpanId,
                error: error instanceof Error ? error : new Error(errorMessage)
            });

            await mockUpdatePersonaInstanceStatus({
                personaInstanceId,
                status: "failed",
                completionReason: "failed",
                completedAt: new Date()
            });

            // Finalize credits
            if (reservedCredits > 0) {
                await mockFinalizeCredits({
                    workspaceId,
                    userId,
                    reservedAmount: reservedCredits,
                    actualAmount: accumulatedCredits,
                    operationType: "persona_execution",
                    operationId: executionId,
                    description: `Persona: ${persona.name} (LLM failed)`
                });
            }

            return {
                success: false,
                serializedThread: messageState,
                iterations: currentIterations,
                error: errorMessage,
                totalCreditsUsed: accumulatedCredits
            };
        }

        // Safety validation on output
        const outputSafetyResult = await mockValidateOutput({
            content: llmResponse.content,
            context: {
                userId,
                agentId: personaInstanceId,
                executionId,
                threadId,
                direction: "output",
                messageRole: "assistant"
            },
            config: persona.safety_config
        });

        if (!outputSafetyResult.shouldProceed) {
            const blockReasons = outputSafetyResult.violations
                .filter((v: SafetyCheckResult) => v.action === "block")
                .map((v: SafetyCheckResult) => v.message || v.type)
                .join(", ");

            await mockUpdatePersonaInstanceStatus({
                personaInstanceId,
                status: "failed",
                completionReason: "failed",
                completedAt: new Date()
            });

            throw new Error(`Output blocked by safety check: ${blockReasons}`);
        }

        // Add assistant message
        const assistantMessage: ThreadMessage = {
            id: `asst-${Date.now()}-${currentIterations}`,
            role: "assistant",
            content: outputSafetyResult.content,
            tool_calls: llmResponse.tool_calls,
            timestamp: new Date()
        };
        messageState.messages.push(assistantMessage);

        // Check if done (no tool calls)
        const hasToolCalls = llmResponse.tool_calls && llmResponse.tool_calls.length > 0;

        if (!hasToolCalls) {
            // Persona task completed
            const unsavedMessages = getUnsavedMessages(messageState);
            if (unsavedMessages.length > 0) {
                await mockSaveThreadIncremental({
                    executionId,
                    threadId,
                    messages: unsavedMessages,
                    markCompleted: true
                });
                unsavedMessages.forEach((msg) => messageState.savedMessageIds.push(msg.id));
            }

            await mockUpdatePersonaInstanceStatus({
                personaInstanceId,
                status: "completed",
                completionReason: "success",
                completedAt: new Date(),
                iterationCount: currentIterations,
                accumulatedCostCredits: accumulatedCredits
            });

            await mockEndSpan({
                spanId: iterationSpanId,
                output: { completed: true, finalMessage: llmResponse.content }
            });

            if (personaRunSpanId) {
                await mockEndSpan({
                    spanId: personaRunSpanId,
                    output: { success: true, iterations: currentIterations }
                });
            }

            // Finalize credits
            if (reservedCredits > 0) {
                await mockFinalizeCredits({
                    workspaceId,
                    userId,
                    reservedAmount: reservedCredits,
                    actualAmount: accumulatedCredits,
                    operationType: "persona_execution",
                    operationId: executionId,
                    description: `Persona: ${persona.name}`
                });
            }

            return {
                success: true,
                serializedThread: messageState,
                iterations: currentIterations,
                finalMessage: llmResponse.content,
                totalCreditsUsed: accumulatedCredits
            };
        }

        // Execute tool calls
        for (const toolCall of llmResponse.tool_calls!) {
            const toolContext = await mockCreateSpan({
                traceId: executionId,
                parentSpanId: iterationSpanId,
                name: `Tool: ${toolCall.name}`,
                spanType: "TOOL_EXECUTION",
                entityId: personaInstanceId,
                input: { toolName: toolCall.name, arguments: toolCall.arguments },
                attributes: { toolName: toolCall.name, toolCallId: toolCall.id }
            });
            const toolSpanId = toolContext.spanId;

            try {
                const toolResult = await mockExecuteToolCall({
                    executionId,
                    toolCall,
                    availableTools: persona.available_tools,
                    userId,
                    workspaceId
                });

                const toolMessage: ThreadMessage = {
                    id: `tool-${Date.now()}-${toolCall.id}`,
                    role: "tool",
                    content: JSON.stringify(toolResult),
                    tool_name: toolCall.name,
                    tool_call_id: toolCall.id,
                    timestamp: new Date()
                };
                messageState.messages.push(toolMessage);

                await mockEndSpan({
                    spanId: toolSpanId,
                    output: toolResult,
                    attributes: { success: true }
                });
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : "Unknown tool error";

                failedToolNames.add(toolCall.name);

                const toolMessage: ThreadMessage = {
                    id: `tool-${Date.now()}-${toolCall.id}`,
                    role: "tool",
                    content: JSON.stringify({ error: errorMessage }),
                    tool_name: toolCall.name,
                    tool_call_id: toolCall.id,
                    timestamp: new Date()
                };
                messageState.messages.push(toolMessage);

                await mockEndSpan({
                    spanId: toolSpanId,
                    error: error instanceof Error ? error : new Error(errorMessage)
                });
            }
        }

        // Save periodically
        if (currentIterations > 0 && currentIterations % 10 === 0) {
            const unsavedMessages = getUnsavedMessages(messageState);
            if (unsavedMessages.length > 0) {
                await mockSaveThreadIncremental({
                    executionId,
                    threadId,
                    messages: unsavedMessages
                });
                unsavedMessages.forEach((msg) => messageState.savedMessageIds.push(msg.id));
            }
        }

        await mockEndSpan({
            spanId: iterationSpanId,
            output: { toolCallCount: llmResponse.tool_calls?.length || 0 }
        });

        currentIterations++;
    }

    // Max iterations reached
    const maxIterError = `Max iterations (${maxIterations}) reached`;

    const unsavedMessages = getUnsavedMessages(messageState);
    if (unsavedMessages.length > 0) {
        await mockSaveThreadIncremental({
            executionId,
            threadId,
            messages: unsavedMessages
        });
    }

    await mockUpdatePersonaInstanceStatus({
        personaInstanceId,
        status: "timeout",
        completionReason: "max_duration",
        completedAt: new Date(),
        iterationCount: currentIterations,
        accumulatedCostCredits: accumulatedCredits
    });

    if (personaRunSpanId) {
        await mockEndSpan({
            spanId: personaRunSpanId,
            error: new Error(maxIterError)
        });
    }

    // Finalize credits
    if (reservedCredits > 0) {
        await mockFinalizeCredits({
            workspaceId,
            userId,
            reservedAmount: reservedCredits,
            actualAmount: accumulatedCredits,
            operationType: "persona_execution",
            operationId: executionId,
            description: `Persona: ${persona.name} (max iterations)`
        });
    }

    return {
        success: false,
        serializedThread: messageState,
        iterations: currentIterations,
        error: maxIterError,
        totalCreditsUsed: accumulatedCredits
    };
}

function getUnsavedMessages(state: WorkflowMessageState): ThreadMessage[] {
    const savedIds = new Set(state.savedMessageIds);
    return state.messages.filter((msg) => !savedIds.has(msg.id));
}

function summarizeMessageState(state: WorkflowMessageState, maxMessages: number): SerializedThread {
    if (state.messages.length <= maxMessages) {
        return {
            messages: state.messages,
            savedMessageIds: state.savedMessageIds,
            metadata: state.metadata
        };
    }

    const systemPrompt = state.messages.find((msg) => msg.role === "system");
    const recentMessages = state.messages.slice(-(maxMessages - 1));

    const summarizedMessages = systemPrompt
        ? [systemPrompt, ...recentMessages.filter((msg) => msg.id !== systemPrompt.id)]
        : recentMessages;

    const keptMessageIds = new Set(summarizedMessages.map((m) => m.id));
    const savedIds = state.savedMessageIds.filter((id) => keptMessageIds.has(id));

    return {
        messages: summarizedMessages,
        savedMessageIds: savedIds,
        metadata: state.metadata
    };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function createTestPersona(overrides: Partial<PersonaConfig> = {}): PersonaConfig {
    return {
        id: "persona-123",
        name: "Test Persona",
        model: "gpt-4",
        provider: "openai",
        connection_id: "conn-123",
        system_prompt: "You are a helpful background assistant.",
        temperature: 0.7,
        max_tokens: 4096,
        max_iterations: 100,
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

function createTestInput(
    overrides: Partial<PersonaOrchestratorInput> = {}
): PersonaOrchestratorInput {
    return {
        executionId: "exec-123",
        personaInstanceId: "persona-inst-123",
        userId: "user-123",
        workspaceId: "ws-123",
        threadId: "thread-123",
        initialMessage: "Please complete this task.",
        ...overrides
    };
}

function createTool(name: string): { name: string; description: string; schema: object } {
    return {
        name,
        description: `Tool ${name} description`,
        schema: {
            type: "object",
            properties: {
                input: { type: "string" }
            },
            required: ["input"]
        }
    };
}

function createLLMResponse(overrides: Partial<LLMResponse> = {}): LLMResponse {
    return {
        content: "Task completed successfully.",
        tool_calls: undefined,
        usage: {
            promptTokens: 100,
            completionTokens: 50,
            totalTokens: 150
        },
        ...overrides
    };
}

function createToolCall(name: string, args: JsonObject = {}): ToolCall {
    return {
        id: `call-${name}-${Date.now()}`,
        name,
        arguments: args
    };
}

// ============================================================================
// TESTS
// ============================================================================

describe("Persona Orchestrator Workflow", () => {
    beforeEach(() => {
        resetMocks();
        jest.clearAllMocks();
    });

    describe("initialization", () => {
        it("should load persona configuration", async () => {
            mockActivityResults.getPersonaConfig = createTestPersona();
            mockActivityResults.callLLM = [createLLMResponse()];

            const input = createTestInput();
            const result = await simulatePersonaOrchestrator(input);

            expect(result.success).toBe(true);
            expect(mockGetPersonaConfig).toHaveBeenCalledWith({
                personaInstanceId: "persona-inst-123",
                userId: "user-123",
                workspaceId: "ws-123"
            });
        });

        it("should fail if persona not found", async () => {
            mockActivityResults.getPersonaConfig = null;

            const input = createTestInput();

            await expect(simulatePersonaOrchestrator(input)).rejects.toThrow("Persona not found");
        });

        it("should update status to running on first iteration", async () => {
            mockActivityResults.getPersonaConfig = createTestPersona();
            mockActivityResults.callLLM = [createLLMResponse()];

            const input = createTestInput();
            await simulatePersonaOrchestrator(input);

            expect(mockUpdatePersonaInstanceStatus).toHaveBeenCalledWith(
                expect.objectContaining({ status: "running" })
            );
        });

        it("should not update status to running on continued iteration", async () => {
            mockActivityResults.getPersonaConfig = createTestPersona();
            mockActivityResults.callLLM = [createLLMResponse()];

            const input = createTestInput({
                iterations: 5,
                serializedThread: {
                    messages: [
                        {
                            id: "sys-1",
                            role: "system",
                            content: "System prompt",
                            timestamp: new Date()
                        }
                    ],
                    savedMessageIds: ["sys-1"],
                    metadata: {}
                },
                reservedCredits: 100
            });
            await simulatePersonaOrchestrator(input);

            // Status update to "running" should not be called since iterations > 0
            const runningCalls = mockUpdatePersonaInstanceStatus.mock.calls.filter(
                (call) => call[0].status === "running"
            );
            expect(runningCalls.length).toBe(0);
        });

        it("should add system prompt to message state", async () => {
            mockActivityResults.getPersonaConfig = createTestPersona({
                system_prompt: "Custom system prompt"
            });
            mockActivityResults.callLLM = [createLLMResponse()];

            const input = createTestInput();
            const result = await simulatePersonaOrchestrator(input);

            const systemMessage = result.serializedThread.messages.find((m) => m.role === "system");
            expect(systemMessage?.content).toBe("Custom system prompt");
        });

        it("should add initial message to state", async () => {
            mockActivityResults.getPersonaConfig = createTestPersona();
            mockActivityResults.callLLM = [createLLMResponse()];

            const input = createTestInput({ initialMessage: "Start task" });
            const result = await simulatePersonaOrchestrator(input);

            const userMessages = result.serializedThread.messages.filter((m) => m.role === "user");
            expect(userMessages.length).toBe(1);
            expect(userMessages[0].content).toBe("Start task");
        });
    });

    describe("credit management", () => {
        it("should check and reserve credits on first run", async () => {
            mockActivityResults.getPersonaConfig = createTestPersona();
            mockActivityResults.callLLM = [createLLMResponse()];

            const input = createTestInput();
            await simulatePersonaOrchestrator(input);

            expect(mockShouldAllowExecution).toHaveBeenCalled();
            expect(mockReserveCredits).toHaveBeenCalled();
        });

        it("should fail if insufficient credits", async () => {
            mockActivityResults.getPersonaConfig = createTestPersona();
            mockActivityResults.shouldAllowExecution = false;

            const input = createTestInput();
            const result = await simulatePersonaOrchestrator(input);

            expect(result.success).toBe(false);
            expect(result.error).toContain("Insufficient credits");
            expect(mockActivityResults.personaStatus).toContainEqual(
                expect.objectContaining({ status: "failed", reason: "max_cost" })
            );
        });

        it("should fail if credit reservation fails", async () => {
            mockActivityResults.getPersonaConfig = createTestPersona();
            mockActivityResults.reserveCredits = false;

            const input = createTestInput();
            const result = await simulatePersonaOrchestrator(input);

            expect(result.success).toBe(false);
            expect(result.error).toContain("Failed to reserve credits");
        });

        it("should track accumulated credits", async () => {
            mockActivityResults.getPersonaConfig = createTestPersona();
            mockActivityResults.callLLM = [
                createLLMResponse({
                    content: "Using tool",
                    tool_calls: [createToolCall("test_tool")]
                }),
                createLLMResponse({ content: "Done" })
            ];
            mockActivityResults.executeToolCall.set("test_tool", { result: "ok" });
            mockActivityResults.calculateLLMCredits = 10;

            const input = createTestInput();
            const result = await simulatePersonaOrchestrator(input);

            expect(result.success).toBe(true);
            expect(result.totalCreditsUsed).toBe(20); // 2 LLM calls * 10 credits each
        });

        it("should finalize credits on completion", async () => {
            mockActivityResults.getPersonaConfig = createTestPersona();
            mockActivityResults.callLLM = [createLLMResponse()];

            const input = createTestInput();
            await simulatePersonaOrchestrator(input);

            expect(mockFinalizeCredits).toHaveBeenCalled();
        });
    });

    describe("simple task completion", () => {
        it("should complete successfully with final answer", async () => {
            mockActivityResults.getPersonaConfig = createTestPersona();
            mockActivityResults.callLLM = [createLLMResponse({ content: "Task completed!" })];

            const input = createTestInput();
            const result = await simulatePersonaOrchestrator(input);

            expect(result.success).toBe(true);
            expect(result.finalMessage).toBe("Task completed!");
            expect(result.iterations).toBe(0);
        });

        it("should update status to completed", async () => {
            mockActivityResults.getPersonaConfig = createTestPersona();
            mockActivityResults.callLLM = [createLLMResponse()];

            const input = createTestInput();
            await simulatePersonaOrchestrator(input);

            expect(mockActivityResults.personaStatus).toContainEqual(
                expect.objectContaining({ status: "completed", reason: "success" })
            );
        });

        it("should save messages on completion", async () => {
            mockActivityResults.getPersonaConfig = createTestPersona();
            mockActivityResults.callLLM = [createLLMResponse()];

            const input = createTestInput();
            await simulatePersonaOrchestrator(input);

            expect(mockSaveThreadIncremental).toHaveBeenCalled();
        });
    });

    describe("tool execution", () => {
        it("should execute tool calls and continue loop", async () => {
            const tool = createTool("search");
            mockActivityResults.getPersonaConfig = createTestPersona({
                available_tools: [tool]
            });
            mockActivityResults.callLLM = [
                createLLMResponse({
                    content: "Let me search.",
                    tool_calls: [createToolCall("search", { query: "test" })]
                }),
                createLLMResponse({ content: "Found results." })
            ];
            mockActivityResults.executeToolCall.set("search", { results: ["result1"] });

            const input = createTestInput();
            const result = await simulatePersonaOrchestrator(input);

            expect(result.success).toBe(true);
            expect(result.iterations).toBe(1);
            expect(mockExecuteToolCall).toHaveBeenCalledTimes(1);
        });

        it("should handle tool execution failure", async () => {
            const tool = createTool("failing_tool");
            mockActivityResults.getPersonaConfig = createTestPersona({
                available_tools: [tool]
            });
            mockActivityResults.callLLM = [
                createLLMResponse({
                    content: "Trying tool",
                    tool_calls: [createToolCall("failing_tool")]
                }),
                createLLMResponse({ content: "Recovered" })
            ];
            // Don't set executeToolCall result - it will throw

            const input = createTestInput();
            const result = await simulatePersonaOrchestrator(input);

            expect(result.success).toBe(true);
            // Tool failure message should be in the thread
            const toolMessages = result.serializedThread.messages.filter((m) => m.role === "tool");
            expect(toolMessages.length).toBe(1);
            expect(toolMessages[0].content).toContain("error");
        });

        it("should track failed tools and exclude from subsequent calls", async () => {
            const tool1 = createTool("failing_tool");
            const tool2 = createTool("working_tool");
            mockActivityResults.getPersonaConfig = createTestPersona({
                available_tools: [tool1, tool2]
            });
            mockActivityResults.callLLM = [
                createLLMResponse({
                    content: "Trying failing",
                    tool_calls: [createToolCall("failing_tool")]
                }),
                createLLMResponse({
                    content: "Trying working",
                    tool_calls: [createToolCall("working_tool")]
                }),
                createLLMResponse({ content: "Done" })
            ];
            mockActivityResults.executeToolCall.set("working_tool", { success: true });

            const input = createTestInput();
            const result = await simulatePersonaOrchestrator(input);

            expect(result.success).toBe(true);
        });

        it("should execute multiple tool calls in sequence", async () => {
            const tool1 = createTool("tool1");
            const tool2 = createTool("tool2");
            mockActivityResults.getPersonaConfig = createTestPersona({
                available_tools: [tool1, tool2]
            });
            mockActivityResults.callLLM = [
                createLLMResponse({
                    content: "Using both",
                    tool_calls: [
                        createToolCall("tool1", { input: "a" }),
                        createToolCall("tool2", { input: "b" })
                    ]
                }),
                createLLMResponse({ content: "Done" })
            ];
            mockActivityResults.executeToolCall.set("tool1", { result: "r1" });
            mockActivityResults.executeToolCall.set("tool2", { result: "r2" });

            const input = createTestInput();
            const result = await simulatePersonaOrchestrator(input);

            expect(result.success).toBe(true);
            expect(mockExecuteToolCall).toHaveBeenCalledTimes(2);
        });
    });

    describe("safety validation", () => {
        it("should validate initial input", async () => {
            mockActivityResults.getPersonaConfig = createTestPersona();
            mockActivityResults.callLLM = [createLLMResponse()];

            const input = createTestInput({ initialMessage: "Hello" });
            await simulatePersonaOrchestrator(input);

            expect(mockValidateInput).toHaveBeenCalled();
        });

        it("should block execution if input fails safety check", async () => {
            mockActivityResults.getPersonaConfig = createTestPersona();
            mockActivityResults.validateInput = {
                content: "",
                shouldProceed: false,
                violations: [
                    {
                        passed: false,
                        type: "prompt_injection",
                        action: "block",
                        message: "Blocked"
                    }
                ]
            };

            const input = createTestInput({ initialMessage: "Malicious input" });

            await expect(simulatePersonaOrchestrator(input)).rejects.toThrow("blocked");
        });

        it("should validate LLM output", async () => {
            mockActivityResults.getPersonaConfig = createTestPersona();
            mockActivityResults.callLLM = [createLLMResponse()];

            const input = createTestInput();
            await simulatePersonaOrchestrator(input);

            expect(mockValidateOutput).toHaveBeenCalled();
        });

        it("should block execution if output fails safety check", async () => {
            mockActivityResults.getPersonaConfig = createTestPersona();
            mockActivityResults.callLLM = [createLLMResponse({ content: "Bad output" })];
            mockActivityResults.validateOutput = {
                content: "",
                shouldProceed: false,
                violations: [
                    {
                        passed: false,
                        type: "content_moderation",
                        action: "block",
                        message: "Blocked"
                    }
                ]
            };

            const input = createTestInput();

            await expect(simulatePersonaOrchestrator(input)).rejects.toThrow("blocked");
        });
    });

    describe("iteration limits", () => {
        it("should fail when max iterations reached", async () => {
            mockActivityResults.getPersonaConfig = createTestPersona({ max_iterations: 2 });
            mockActivityResults.callLLM = [
                createLLMResponse({ content: "Loop", tool_calls: [createToolCall("tool")] }),
                createLLMResponse({ content: "Loop", tool_calls: [createToolCall("tool")] }),
                createLLMResponse({ content: "Loop", tool_calls: [createToolCall("tool")] })
            ];
            mockActivityResults.executeToolCall.set("tool", { result: "ok" });

            const input = createTestInput();
            const result = await simulatePersonaOrchestrator(input, { maxIterationsOverride: 2 });

            expect(result.success).toBe(false);
            expect(result.error).toContain("Max iterations");
            expect(result.iterations).toBe(2);
        });

        it("should update status to timeout when max iterations reached", async () => {
            mockActivityResults.getPersonaConfig = createTestPersona();
            mockActivityResults.callLLM = [
                createLLMResponse({ content: "Loop", tool_calls: [createToolCall("tool")] }),
                createLLMResponse({ content: "Loop", tool_calls: [createToolCall("tool")] })
            ];
            mockActivityResults.executeToolCall.set("tool", { result: "ok" });

            const input = createTestInput();
            await simulatePersonaOrchestrator(input, { maxIterationsOverride: 1 });

            expect(mockActivityResults.personaStatus).toContainEqual(
                expect.objectContaining({ status: "timeout", reason: "max_duration" })
            );
        });
    });

    describe("continue-as-new", () => {
        it("should trigger continue-as-new at threshold", async () => {
            mockActivityResults.getPersonaConfig = createTestPersona();
            // Create enough responses to reach continue-as-new threshold
            const responses: LLMResponse[] = [];
            for (let i = 0; i < 6; i++) {
                responses.push(
                    createLLMResponse({
                        content: `Iteration ${i}`,
                        tool_calls: [createToolCall("tool")]
                    })
                );
            }
            mockActivityResults.callLLM = responses;
            mockActivityResults.executeToolCall.set("tool", { result: "ok" });

            const input = createTestInput();
            const result = await simulatePersonaOrchestrator(input, { continueAsNewThreshold: 5 });

            expect(result.continueAsNew).toBe(true);
            expect(result.iterations).toBe(5);
        });

        it("should summarize message state at continue-as-new", async () => {
            mockActivityResults.getPersonaConfig = createTestPersona({
                memory_config: { type: "buffer", max_messages: 10 }
            });
            const responses: LLMResponse[] = [];
            for (let i = 0; i < 4; i++) {
                responses.push(
                    createLLMResponse({
                        content: `Iteration ${i}`,
                        tool_calls: [createToolCall("tool")]
                    })
                );
            }
            mockActivityResults.callLLM = responses;
            mockActivityResults.executeToolCall.set("tool", { result: "ok" });

            const input = createTestInput();
            const result = await simulatePersonaOrchestrator(input, { continueAsNewThreshold: 3 });

            expect(result.continueAsNew).toBe(true);
            expect(result.serializedThread).toBeDefined();
        });
    });

    describe("progress tracking", () => {
        it("should update progress at intervals", async () => {
            mockActivityResults.getPersonaConfig = createTestPersona();
            const responses: LLMResponse[] = [];
            for (let i = 0; i < 7; i++) {
                responses.push(
                    createLLMResponse({
                        content: `Iteration ${i}`,
                        tool_calls: [createToolCall("tool")]
                    })
                );
            }
            responses.push(createLLMResponse({ content: "Done" }));
            mockActivityResults.callLLM = responses;
            mockActivityResults.executeToolCall.set("tool", { result: "ok" });

            const input = createTestInput();
            await simulatePersonaOrchestrator(input, { maxIterationsOverride: 100 });

            // Progress should be updated at iteration 5
            expect(mockActivityResults.personaProgress.length).toBeGreaterThan(0);
        });
    });

    describe("LLM error handling", () => {
        it("should handle LLM call failure gracefully", async () => {
            mockActivityResults.getPersonaConfig = createTestPersona();
            mockCallLLM.mockRejectedValueOnce(new Error("LLM API error"));

            const input = createTestInput();
            const result = await simulatePersonaOrchestrator(input);

            expect(result.success).toBe(false);
            expect(result.error).toContain("LLM API error");
        });

        it("should update status to failed on LLM error", async () => {
            mockActivityResults.getPersonaConfig = createTestPersona();
            mockCallLLM.mockRejectedValueOnce(new Error("LLM error"));

            const input = createTestInput();
            await simulatePersonaOrchestrator(input);

            expect(mockActivityResults.personaStatus).toContainEqual(
                expect.objectContaining({ status: "failed" })
            );
        });

        it("should finalize credits on LLM error", async () => {
            mockActivityResults.getPersonaConfig = createTestPersona();
            mockCallLLM.mockRejectedValueOnce(new Error("LLM error"));

            const input = createTestInput();
            await simulatePersonaOrchestrator(input);

            expect(mockFinalizeCredits).toHaveBeenCalled();
        });
    });

    describe("message state management", () => {
        it("should track all messages in order", async () => {
            const tool = createTool("test_tool");
            mockActivityResults.getPersonaConfig = createTestPersona({
                available_tools: [tool]
            });
            mockActivityResults.callLLM = [
                createLLMResponse({
                    content: "Using tool",
                    tool_calls: [createToolCall("test_tool")]
                }),
                createLLMResponse({ content: "Final" })
            ];
            mockActivityResults.executeToolCall.set("test_tool", { result: "tool result" });

            const input = createTestInput({ initialMessage: "Start" });
            const result = await simulatePersonaOrchestrator(input);

            const messages = result.serializedThread.messages;
            expect(messages[0].role).toBe("system");
            expect(messages[1].role).toBe("user");
            expect(messages[2].role).toBe("assistant");
            expect(messages[3].role).toBe("tool");
            expect(messages[4].role).toBe("assistant");
        });

        it("should include tool call info in assistant messages", async () => {
            const tool = createTool("my_tool");
            mockActivityResults.getPersonaConfig = createTestPersona({
                available_tools: [tool]
            });
            const toolCall = createToolCall("my_tool", { input: "test" });
            mockActivityResults.callLLM = [
                createLLMResponse({ content: "Calling", tool_calls: [toolCall] }),
                createLLMResponse({ content: "Done" })
            ];
            mockActivityResults.executeToolCall.set("my_tool", { result: "ok" });

            const input = createTestInput();
            const result = await simulatePersonaOrchestrator(input);

            const assistantWithTools = result.serializedThread.messages.find(
                (m) => m.role === "assistant" && m.tool_calls
            );
            expect(assistantWithTools?.tool_calls).toBeDefined();
            expect(assistantWithTools?.tool_calls?.[0].name).toBe("my_tool");
        });
    });

    describe("span lifecycle", () => {
        it("should create persona run span on first iteration", async () => {
            mockActivityResults.getPersonaConfig = createTestPersona();
            mockActivityResults.callLLM = [createLLMResponse()];

            const input = createTestInput();
            await simulatePersonaOrchestrator(input);

            const personaSpan = mockActivityResults.spans.find((s) => s.name.includes("Persona:"));
            expect(personaSpan).toBeDefined();
        });

        it("should create iteration spans", async () => {
            mockActivityResults.getPersonaConfig = createTestPersona();
            mockActivityResults.callLLM = [createLLMResponse()];

            const input = createTestInput();
            await simulatePersonaOrchestrator(input);

            const iterationSpans = mockActivityResults.spans.filter((s) =>
                s.name.includes("Iteration")
            );
            expect(iterationSpans.length).toBeGreaterThan(0);
        });

        it("should create tool execution spans", async () => {
            const tool = createTool("traced_tool");
            mockActivityResults.getPersonaConfig = createTestPersona({
                available_tools: [tool]
            });
            mockActivityResults.callLLM = [
                createLLMResponse({
                    content: "Using",
                    tool_calls: [createToolCall("traced_tool")]
                }),
                createLLMResponse({ content: "Done" })
            ];
            mockActivityResults.executeToolCall.set("traced_tool", { result: "ok" });

            const input = createTestInput();
            await simulatePersonaOrchestrator(input);

            const toolSpans = mockActivityResults.spans.filter((s) => s.name.includes("Tool:"));
            expect(toolSpans.length).toBe(1);
        });
    });

    describe("token usage tracking", () => {
        it("should track token usage from LLM responses", async () => {
            mockActivityResults.getPersonaConfig = createTestPersona();
            mockActivityResults.callLLM = [
                createLLMResponse({
                    content: "Response",
                    usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 }
                })
            ];

            const input = createTestInput();
            await simulatePersonaOrchestrator(input);

            expect(mockUpdateThreadTokens).toHaveBeenCalledWith(
                expect.objectContaining({
                    usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 }
                })
            );
        });
    });
});
