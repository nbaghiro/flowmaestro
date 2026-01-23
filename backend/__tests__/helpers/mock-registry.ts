/**
 * Mock Registry Helpers
 *
 * Utilities for mocking the node handler registry in tests.
 * Allows tests to control node execution behavior without external dependencies.
 */

import type { JsonObject } from "@flowmaestro/shared";
import {
    registerHandler,
    clearHandlers,
    getAllHandlers
} from "../../src/temporal/activities/execution/registry";
import type {
    NodeHandler,
    NodeHandlerInput,
    NodeHandlerOutput,
    NodeHandlerCategory
} from "../../src/temporal/activities/execution/types";

// ============================================================================
// TYPES
// ============================================================================

export interface MockHandlerConfig {
    /** Node types this handler supports */
    nodeTypes: string[];
    /** Custom execution function */
    executeFn?: (input: NodeHandlerInput) => Promise<NodeHandlerOutput>;
    /** Default output to return */
    defaultOutput?: JsonObject;
    /** If true, handler will throw an error */
    shouldFail?: boolean;
    /** Error message when failing */
    errorMessage?: string;
    /** Delay in ms before returning */
    delay?: number;
    /** Track execution calls */
    onExecute?: (input: NodeHandlerInput) => void;
}

export interface MockHandlerResult {
    handler: NodeHandler;
    executionLog: Array<{
        nodeType: string;
        nodeId: string;
        timestamp: number;
        input: NodeHandlerInput;
    }>;
    getExecutionCount: () => number;
    getLastExecution: () => NodeHandlerInput | undefined;
    reset: () => void;
}

// Store original handlers for restoration
let originalHandlers: typeof getAllHandlers extends () => infer R ? R : never = [];

// ============================================================================
// MOCK HANDLER CREATION
// ============================================================================

/**
 * Create a mock handler with configurable behavior
 */
export function createMockHandler(name: string, config: MockHandlerConfig): MockHandlerResult {
    const executionLog: MockHandlerResult["executionLog"] = [];

    const handler: NodeHandler = {
        name,
        supportedNodeTypes: config.nodeTypes,

        canHandle(nodeType: string): boolean {
            return config.nodeTypes.includes(nodeType);
        },

        async execute(input: NodeHandlerInput): Promise<NodeHandlerOutput> {
            // Log execution
            executionLog.push({
                nodeType: input.nodeType,
                nodeId: input.metadata.nodeId,
                timestamp: Date.now(),
                input
            });

            // Call custom callback if provided
            if (config.onExecute) {
                config.onExecute(input);
            }

            // Simulate delay
            if (config.delay && config.delay > 0) {
                await new Promise((resolve) => setTimeout(resolve, config.delay));
            }

            // Check if should fail
            if (config.shouldFail) {
                throw new Error(config.errorMessage || `Mock handler ${name} failed`);
            }

            // Use custom execute function if provided
            if (config.executeFn) {
                return config.executeFn(input);
            }

            // Return default output
            return {
                result: config.defaultOutput || {
                    nodeId: input.metadata.nodeId,
                    nodeType: input.nodeType,
                    executed: true
                },
                signals: {},
                metrics: {
                    durationMs: config.delay || 0
                }
            };
        }
    };

    return {
        handler,
        executionLog,
        getExecutionCount: () => executionLog.length,
        getLastExecution: () =>
            executionLog.length > 0 ? executionLog[executionLog.length - 1].input : undefined,
        reset: () => {
            executionLog.length = 0;
        }
    };
}

/**
 * Create a handler that always fails with a specific error
 */
export function createFailingHandler(
    name: string,
    nodeTypes: string[],
    errorMessage: string = "Handler failed"
): MockHandlerResult {
    return createMockHandler(name, {
        nodeTypes,
        shouldFail: true,
        errorMessage
    });
}

/**
 * Create a handler that returns specific outputs
 */
export function createOutputHandler(
    name: string,
    nodeTypes: string[],
    output: JsonObject
): MockHandlerResult {
    return createMockHandler(name, {
        nodeTypes,
        defaultOutput: output
    });
}

/**
 * Create a handler with a delay (for testing parallel execution)
 */
export function createDelayedHandler(
    name: string,
    nodeTypes: string[],
    delayMs: number,
    output?: JsonObject
): MockHandlerResult {
    return createMockHandler(name, {
        nodeTypes,
        delay: delayMs,
        defaultOutput: output
    });
}

/**
 * Create a passthrough handler that returns node config as output
 */
export function createPassthroughHandler(name: string, nodeTypes: string[]): MockHandlerResult {
    return createMockHandler(name, {
        nodeTypes,
        executeFn: async (input) => ({
            result: {
                nodeId: input.metadata.nodeId,
                nodeType: input.nodeType,
                config: input.nodeConfig,
                passedThrough: true
            },
            signals: {}
        })
    });
}

// ============================================================================
// REGISTRY MANAGEMENT
// ============================================================================

/**
 * Save current handlers and clear the registry
 * Call restoreHandlers() to restore them
 */
export function saveAndClearHandlers(): void {
    originalHandlers = getAllHandlers();
    clearHandlers();
}

/**
 * Restore previously saved handlers
 */
export function restoreHandlers(): void {
    clearHandlers();
    for (const registration of originalHandlers) {
        registerHandler(registration.handler, registration.category, registration.priority);
    }
    originalHandlers = [];
}

/**
 * Clear registry and install mock handlers
 */
export function clearAndMockHandlers(
    handlers: Array<{
        result: MockHandlerResult;
        category?: NodeHandlerCategory;
        priority?: number;
    }>
): void {
    clearHandlers();

    for (const { result, category = "generic", priority = 100 } of handlers) {
        registerHandler(result.handler, category, priority);
    }
}

/**
 * Install a single mock handler (keeps existing handlers)
 */
export function installMockHandler(
    result: MockHandlerResult,
    category: NodeHandlerCategory = "generic",
    priority: number = 1
): void {
    registerHandler(result.handler, category, priority);
}

// ============================================================================
// PRESET MOCK HANDLERS
// ============================================================================

/**
 * Create a complete set of mock handlers for common node types
 */
export function createDefaultMockHandlers(): Map<string, MockHandlerResult> {
    const handlers = new Map<string, MockHandlerResult>();

    // Input/Output handlers
    handlers.set(
        "input",
        createMockHandler("mock-input", {
            nodeTypes: ["input", "trigger"],
            executeFn: async (input) => ({
                result: input.nodeConfig || {},
                signals: {}
            })
        })
    );

    handlers.set(
        "output",
        createMockHandler("mock-output", {
            nodeTypes: ["output"],
            executeFn: async (input) => ({
                result: input.nodeConfig || {},
                signals: { isTerminal: true }
            })
        })
    );

    // Transform handler
    handlers.set(
        "transform",
        createMockHandler("mock-transform", {
            nodeTypes: ["transform"],
            executeFn: async (input) => ({
                result: {
                    transformed: true,
                    input: input.nodeConfig
                },
                signals: {}
            })
        })
    );

    // LLM handler
    handlers.set(
        "llm",
        createMockHandler("mock-llm", {
            nodeTypes: ["llm"],
            defaultOutput: {
                text: "Mock LLM response",
                model: "mock-model",
                provider: "mock",
                usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 }
            }
        })
    );

    // HTTP handler
    handlers.set(
        "http",
        createMockHandler("mock-http", {
            nodeTypes: ["http"],
            defaultOutput: {
                status: 200,
                statusText: "OK",
                data: { success: true },
                responseTime: 100
            }
        })
    );

    // Code handler
    handlers.set(
        "code",
        createMockHandler("mock-code", {
            nodeTypes: ["code"],
            executeFn: async (input) => ({
                result: {
                    language: (input.nodeConfig as JsonObject)?.language || "javascript",
                    output: { executed: true },
                    logs: []
                },
                signals: {}
            })
        })
    );

    // Conditional handler
    handlers.set(
        "conditional",
        createMockHandler("mock-conditional", {
            nodeTypes: ["conditional", "condition", "if"],
            executeFn: async (input) => {
                const config = input.nodeConfig as JsonObject;
                const result = config?.mockResult ?? true;
                return {
                    result: { condition: result },
                    signals: {
                        branchesToSkip: result ? ["false"] : ["true"],
                        selectedRoute: result ? "true" : "false"
                    }
                };
            }
        })
    );

    // Wait handler
    handlers.set(
        "wait",
        createMockHandler("mock-wait", {
            nodeTypes: ["wait"],
            executeFn: async (input) => {
                const config = input.nodeConfig as JsonObject;
                const delay = (config?.duration as number) || 0;
                return {
                    result: { waited: delay },
                    signals: { waitDurationMs: delay }
                };
            }
        })
    );

    return handlers;
}

/**
 * Install default mock handlers for all common node types
 */
export function installDefaultMockHandlers(): Map<string, MockHandlerResult> {
    const handlers = createDefaultMockHandlers();

    clearHandlers();

    // Install in priority order
    const priorityMap: Record<string, number> = {
        input: 10,
        output: 10,
        conditional: 20,
        transform: 30,
        llm: 40,
        http: 40,
        code: 50,
        wait: 60
    };

    for (const [name, result] of handlers) {
        registerHandler(result.handler, "generic", priorityMap[name] || 100);
    }

    return handlers;
}

// ============================================================================
// ASSERTION HELPERS
// ============================================================================

/**
 * Check if a specific handler was invoked for a node type
 */
export function wasHandlerInvoked(mockResult: MockHandlerResult, nodeType: string): boolean {
    return mockResult.executionLog.some((log) => log.nodeType === nodeType);
}

/**
 * Get all invocations of a handler for a specific node ID
 */
export function getInvocationsForNode(
    mockResult: MockHandlerResult,
    nodeId: string
): MockHandlerResult["executionLog"] {
    return mockResult.executionLog.filter((log) => log.nodeId === nodeId);
}

/**
 * Check the execution order of handlers
 */
export function getExecutionOrder(
    ...mockResults: MockHandlerResult[]
): Array<{ handler: string; nodeId: string; timestamp: number }> {
    const allLogs: Array<{ handler: string; nodeId: string; timestamp: number }> = [];

    for (const result of mockResults) {
        for (const log of result.executionLog) {
            allLogs.push({
                handler: result.handler.name,
                nodeId: log.nodeId,
                timestamp: log.timestamp
            });
        }
    }

    return allLogs.sort((a, b) => a.timestamp - b.timestamp);
}
