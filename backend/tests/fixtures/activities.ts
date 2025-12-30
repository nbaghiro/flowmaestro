/**
 * Mock Activities for Testing
 *
 * Provides mock implementations of all node executors for integration testing.
 * These mocks allow testing workflow execution behavior without external dependencies.
 */

import type { JsonObject } from "@flowmaestro/shared";
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

    const mockExecuteNode = jest.fn(
        async (
            nodeType: string,
            nodeConfig: JsonObject,
            _context: ContextSnapshot,
            metadata: NodeExecutionMetadata
        ): Promise<{
            success: boolean;
            output: JsonObject;
            signals: JsonObject;
            error?: string;
        }> => {
            const nodeId = metadata.nodeId;
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

            // Check if should fail
            if (mockConfig.shouldFail) {
                logEntry.success = false;
                logEntry.error = mockConfig.errorMessage || `Node ${nodeId} failed`;
                executionLog.push(logEntry);

                return {
                    success: false,
                    output: {},
                    signals: {},
                    error: logEntry.error
                };
            }

            // Generate output
            const output = mockConfig.customOutput || {
                result: `executed-${nodeId}`,
                nodeType,
                timestamp: Date.now()
            };

            logEntry.output = output;
            executionLog.push(logEntry);

            // Call custom handler if provided
            if (mockConfig.onExecute) {
                mockConfig.onExecute({
                    nodeType,
                    nodeConfig,
                    context: _context,
                    metadata
                } as NodeHandlerInput);
            }

            return {
                success: true,
                output,
                signals: {}
            };
        }
    );

    const mockValidateInputs = jest.fn(async (_schema: JsonObject, _inputs: JsonObject) => {
        return { valid: true, errors: [] };
    });

    const mockValidateOutputs = jest.fn(async (_schema: JsonObject, _outputs: JsonObject) => {
        return { valid: true, errors: [] };
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
