/**
 * Mock Activities for Testing
 *
 * Provides mock implementations of all node executors for integration testing.
 * These mocks allow testing workflow execution behavior without external dependencies.
 */

import type { JsonObject } from "@flowmaestro/shared";
import { sandboxDataService } from "../../src/integrations/sandbox";
import type {
    NodeHandlerInput,
    NodeExecutionMetadata
} from "../../src/temporal/activities/execution/types";
import type { ContextSnapshot } from "../../src/temporal/core/types";

// ============================================================================
// TYPES
// ============================================================================

export interface MockNodeConfig {
    /** Simulated delay in ms */
    delay?: number;
    /** If true, execution will fail */
    shouldFail?: boolean;
    /** Error message when failing */
    errorMessage?: string;
    /** Custom output to return */
    customOutput?: JsonObject;
    /** Custom signals to return */
    customSignals?: JsonObject;
    /** Track execution calls */
    onExecute?: (input: NodeHandlerInput) => void;
}

export interface MockActivityConfig {
    /** Per-node configuration */
    nodeConfigs?: Record<string, MockNodeConfig>;
    /** Default delay for all nodes */
    defaultDelay?: number;
    /** Track all executions */
    executionLog?: ExecutionLogEntry[];
}

export interface ExecutionLogEntry {
    nodeId: string;
    nodeType: string;
    timestamp: number;
    success: boolean;
    output?: JsonObject;
    error?: string;
}

// ============================================================================
// MOCK ACTIVITY FACTORY
// ============================================================================

/**
 * Create mock activities with configurable behavior
 */
export function createMockActivities(config: MockActivityConfig = {}) {
    const executionLog: ExecutionLogEntry[] = config.executionLog || [];

    // ExecuteNode activity signature supports TWO calling conventions:
    // 1. Object-based (used by Temporal workflow orchestrator):
    //    executeNode({ nodeType, nodeConfig, context, executionContext })
    // 2. Positional (used by unit tests):
    //    executeNode(nodeType, nodeConfig, context, metadata)
    const mockExecuteNode = jest.fn(
        async (
            inputOrNodeType:
                | {
                      nodeType: string;
                      nodeConfig: JsonObject;
                      context: JsonObject;
                      executionContext?: {
                          executionId: string;
                          workflowName: string;
                          userId?: string;
                          nodeId: string;
                      };
                  }
                | string,
            nodeConfigArg?: JsonObject,
            contextArg?: JsonObject | ContextSnapshot,
            metadataArg?: {
                nodeId: string;
                nodeName?: string;
                executionId?: string;
                workflowName?: string;
            }
        ): Promise<{
            result: JsonObject;
            signals: {
                pause?: boolean;
                pauseContext?: JsonObject;
                branchesToSkip?: string[];
            };
            metrics?: {
                durationMs?: number;
                tokenUsage?: {
                    promptTokens?: number;
                    completionTokens?: number;
                    totalTokens?: number;
                    model?: string;
                };
            };
            // Legacy fields for backward compatibility with unit tests
            success: boolean;
            output: JsonObject;
            error?: string;
        }> => {
            // Normalize arguments - detect which calling convention is being used
            let nodeId: string;
            let nodeType: string;
            let nodeConfig: JsonObject;
            let context: JsonObject;

            if (typeof inputOrNodeType === "string") {
                // Positional calling convention: executeNode(nodeType, nodeConfig, context, metadata)
                nodeType = inputOrNodeType;
                nodeConfig = nodeConfigArg || {};
                context = (contextArg as JsonObject) || {};
                nodeId = metadataArg?.nodeId || "unknown";
            } else {
                // Object calling convention: executeNode({ nodeType, nodeConfig, context, executionContext })
                nodeType = inputOrNodeType.nodeType;
                nodeConfig = inputOrNodeType.nodeConfig;
                context = inputOrNodeType.context;
                nodeId = inputOrNodeType.executionContext?.nodeId || "unknown";
            }

            const mockConfig = config.nodeConfigs?.[nodeId] || {};

            // Simulate delay
            const delay = mockConfig.delay ?? config.defaultDelay ?? 0;
            if (delay > 0) {
                await new Promise((resolve) => setTimeout(resolve, delay));
            }

            // Log execution
            const logEntry: ExecutionLogEntry = {
                nodeId,
                nodeType,
                timestamp: Date.now(),
                success: true
            };

            // Check if should fail (explicit mock config)
            if (mockConfig.shouldFail) {
                logEntry.success = false;
                logEntry.error = mockConfig.errorMessage || `Node ${nodeId} failed`;
                executionLog.push(logEntry);

                // Throw error to simulate activity failure
                throw new Error(logEntry.error);
            }

            // For integration nodes, check sandboxDataService for scenarios and fixtures
            if (nodeType === "integration" && nodeConfig) {
                const provider = nodeConfig.provider as string;
                const operation = nodeConfig.operation as string;
                const inputs = (nodeConfig.inputs as Record<string, unknown>) || {};

                // Resolve input templates against the context
                const resolvedInputs: Record<string, unknown> = {};
                for (const [key, value] of Object.entries(inputs)) {
                    if (
                        typeof value === "string" &&
                        value.startsWith("{{") &&
                        value.endsWith("}}")
                    ) {
                        // Extract variable path from template
                        const path = value.slice(2, -2).trim();
                        const parts = path.split(".");
                        // Look up in context
                        let resolved: unknown = context;
                        for (const part of parts) {
                            if (resolved && typeof resolved === "object") {
                                resolved = (resolved as Record<string, unknown>)[part];
                            } else {
                                resolved = undefined;
                                break;
                            }
                        }
                        resolvedInputs[key] = resolved;
                    } else {
                        resolvedInputs[key] = value;
                    }
                }

                if (provider && operation) {
                    const sandboxResponse = await sandboxDataService.getSandboxResponse(
                        provider,
                        operation,
                        resolvedInputs
                    );

                    if (sandboxResponse) {
                        if (!sandboxResponse.success) {
                            logEntry.success = false;
                            logEntry.error = sandboxResponse.error?.message || "Operation failed";
                            executionLog.push(logEntry);
                            throw new Error(logEntry.error);
                        }

                        logEntry.output = sandboxResponse.data as JsonObject;
                        executionLog.push(logEntry);

                        const outputData = sandboxResponse.data as JsonObject;
                        return {
                            result: outputData,
                            signals: {},
                            // Legacy fields for backward compatibility
                            success: true,
                            output: outputData
                        };
                    }
                }
            }

            // Generate output from mock config or default
            const outputResult = mockConfig.customOutput || {
                result: `executed-${nodeId}`,
                nodeType,
                timestamp: Date.now()
            };

            logEntry.output = outputResult;
            executionLog.push(logEntry);

            // Call custom handler if provided
            if (mockConfig.onExecute) {
                mockConfig.onExecute({
                    nodeType,
                    nodeConfig,
                    context,
                    metadata: metadataArg as NodeExecutionMetadata
                } as unknown as NodeHandlerInput);
            }

            // Use custom signals or default empty object
            const signals = mockConfig.customSignals || {};

            return {
                result: outputResult,
                signals: signals as {
                    pause?: boolean;
                    pauseContext?: JsonObject;
                    branchesToSkip?: string[];
                },
                // Legacy fields for backward compatibility
                success: true,
                output: outputResult
            };
        }
    );

    const mockValidateInputs = jest.fn(async (_schema: JsonObject, _inputs: JsonObject) => {
        // Return format expected by workflow-orchestrator: { success: boolean, error?: { message: string } }
        return { success: true, error: null };
    });

    const mockValidateOutputs = jest.fn(async (_schema: JsonObject, _outputs: JsonObject) => {
        // Return format expected by workflow-orchestrator: { success: boolean, error?: { message: string } }
        return { success: true, error: null };
    });

    const mockEmitEvent = jest.fn(async (_event: string, _data: JsonObject) => {
        // No-op for tests
    });

    return {
        executeNode: mockExecuteNode,
        validateInputsActivity: mockValidateInputs,
        validateOutputsActivity: mockValidateOutputs,
        emitExecutionStarted: mockEmitEvent,
        emitExecutionCompleted: mockEmitEvent,
        emitExecutionFailed: mockEmitEvent,
        emitNodeStarted: mockEmitEvent,
        emitNodeCompleted: mockEmitEvent,
        emitNodeFailed: mockEmitEvent,

        // Test utilities
        getExecutionLog: () => executionLog,
        clearExecutionLog: () => {
            executionLog.length = 0;
        },
        getNodeExecutions: (nodeId: string) => executionLog.filter((e) => e.nodeId === nodeId),
        getExecutionOrder: () => executionLog.map((e) => e.nodeId),
        wasNodeExecuted: (nodeId: string) => executionLog.some((e) => e.nodeId === nodeId),
        getNodeExecutionCount: (nodeId: string) =>
            executionLog.filter((e) => e.nodeId === nodeId).length
    };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a mock config that fails a specific node
 */
export function failNode(nodeId: string, errorMessage?: string): MockActivityConfig {
    return {
        nodeConfigs: {
            [nodeId]: {
                shouldFail: true,
                errorMessage: errorMessage || `Node ${nodeId} failed`
            }
        }
    };
}

/**
 * Create a mock config with delays for parallel testing
 */
export function withDelays(delays: Record<string, number>): MockActivityConfig {
    const nodeConfigs: Record<string, MockNodeConfig> = {};
    for (const [nodeId, delay] of Object.entries(delays)) {
        nodeConfigs[nodeId] = { delay };
    }
    return { nodeConfigs };
}

/**
 * Create a mock config with custom outputs
 */
export function withOutputs(outputs: Record<string, JsonObject>): MockActivityConfig {
    const nodeConfigs: Record<string, MockNodeConfig> = {};
    for (const [nodeId, customOutput] of Object.entries(outputs)) {
        nodeConfigs[nodeId] = { customOutput };
    }
    return { nodeConfigs };
}

/**
 * Create a mock config with custom signals (for pause, branch selection, etc.)
 */
export function withSignals(signals: Record<string, JsonObject>): MockActivityConfig {
    const nodeConfigs: Record<string, MockNodeConfig> = {};
    for (const [nodeId, customSignals] of Object.entries(signals)) {
        nodeConfigs[nodeId] = { customSignals };
    }
    return { nodeConfigs };
}

/**
 * Create a mock config with outputs and signals
 */
export function withOutputsAndSignals(
    outputs: Record<string, JsonObject>,
    signals: Record<string, JsonObject>
): MockActivityConfig {
    const nodeConfigs: Record<string, MockNodeConfig> = {};
    for (const [nodeId, customOutput] of Object.entries(outputs)) {
        nodeConfigs[nodeId] = { customOutput };
    }
    for (const [nodeId, customSignals] of Object.entries(signals)) {
        if (nodeConfigs[nodeId]) {
            nodeConfigs[nodeId].customSignals = customSignals;
        } else {
            nodeConfigs[nodeId] = { customSignals };
        }
    }
    return { nodeConfigs };
}

/**
 * Merge multiple mock configs
 */
export function mergeConfigs(...configs: MockActivityConfig[]): MockActivityConfig {
    const merged: MockActivityConfig = {
        nodeConfigs: {},
        executionLog: []
    };

    for (const config of configs) {
        if (config.nodeConfigs) {
            merged.nodeConfigs = { ...merged.nodeConfigs, ...config.nodeConfigs };
        }
        if (config.defaultDelay !== undefined) {
            merged.defaultDelay = config.defaultDelay;
        }
    }

    return merged;
}

// ============================================================================
// CREDIT ACTIVITY MOCKS
// ============================================================================

export interface MockCreditConfig {
    /** Initial credit balance */
    initialBalance?: number;
    /** Should credit check pass? */
    allowExecution?: boolean;
    /** Should reservation succeed? */
    allowReservation?: boolean;
    /** Fixed credit cost per LLM call */
    llmCreditCost?: number;
    /** Fixed credit cost per node */
    nodeCreditCost?: number;
    /** Estimated total credits for workflow */
    estimatedCredits?: number;
}

/**
 * Create mock credit activities with configurable behavior
 */
export function createMockCreditActivities(config: MockCreditConfig = {}) {
    const {
        initialBalance = 1000,
        allowExecution = true,
        allowReservation = true,
        llmCreditCost = 10,
        nodeCreditCost = 1,
        estimatedCredits = 100
    } = config;

    let balance = initialBalance;
    let reserved = 0;
    const transactions: Array<{
        type: string;
        amount: number;
        timestamp: number;
    }> = [];

    return {
        shouldAllowExecution: jest.fn().mockResolvedValue(allowExecution),

        reserveCredits: jest.fn().mockImplementation(async ({ estimatedCredits: amount }) => {
            if (!allowReservation) return false;
            if (balance - reserved < amount) return false;
            reserved += amount;
            transactions.push({ type: "reserve", amount, timestamp: Date.now() });
            return true;
        }),

        releaseCredits: jest.fn().mockImplementation(async ({ amount }) => {
            reserved -= amount;
            transactions.push({ type: "release", amount, timestamp: Date.now() });
        }),

        finalizeCredits: jest.fn().mockImplementation(async ({ reservedAmount, actualAmount }) => {
            reserved -= reservedAmount;
            balance -= actualAmount;
            transactions.push({ type: "finalize", amount: actualAmount, timestamp: Date.now() });
        }),

        calculateLLMCredits: jest.fn().mockResolvedValue(llmCreditCost),

        calculateNodeCredits: jest.fn().mockResolvedValue(nodeCreditCost),

        estimateWorkflowCredits: jest.fn().mockResolvedValue({
            totalCredits: estimatedCredits,
            breakdown: [],
            confidence: "estimate"
        }),

        getCreditsBalance: jest.fn().mockImplementation(async () => ({
            available: balance - reserved,
            subscription: Math.floor(balance * 0.5),
            purchased: Math.floor(balance * 0.5),
            bonus: 0,
            reserved,
            subscriptionExpiresAt: null,
            usedThisMonth: 0,
            usedAllTime: initialBalance - balance
        })),

        // Test utilities
        getBalance: () => balance,
        getReserved: () => reserved,
        getTransactions: () => transactions,
        reset: () => {
            balance = initialBalance;
            reserved = 0;
            transactions.length = 0;
        }
    };
}

/**
 * Create credit activities that deny all execution (insufficient credits)
 */
export function createInsufficientCreditActivities() {
    return createMockCreditActivities({
        initialBalance: 0,
        allowExecution: false,
        allowReservation: false
    });
}

/**
 * Create credit activities with a specific balance
 */
export function createCreditActivitiesWithBalance(balance: number) {
    return createMockCreditActivities({ initialBalance: balance });
}

/**
 * Create credit activities that fail on reservation (e.g., concurrent access)
 */
export function createFailingReservationActivities() {
    return createMockCreditActivities({
        allowExecution: true,
        allowReservation: false
    });
}
