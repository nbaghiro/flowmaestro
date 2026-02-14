/**
 * Custom Jest Assertion Helpers
 *
 * Extends Jest with custom matchers for workflow testing.
 * Provides semantic assertions for queue state, context, and execution order.
 */

import type { JsonObject, JsonValue } from "@flowmaestro/shared";
import type { ExecutionQueueState, ContextSnapshot } from "../../../../src/temporal/core/types";
import type { ExecutionLogEntry } from "../../../fixtures/activities";

// ============================================================================
// TYPE DECLARATIONS FOR CUSTOM MATCHERS
// ============================================================================

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace jest {
        interface Matchers<R> {
            // Queue state matchers
            toHaveCompletedNodes(expectedNodeIds: string[]): R;
            toHaveFailedNode(nodeId: string, errorMessage?: string | RegExp): R;
            toHaveSkippedNodes(expectedNodeIds: string[]): R;
            toHavePendingNodes(expectedNodeIds: string[]): R;
            toHaveReadyNodes(expectedNodeIds: string[]): R;
            toHaveExecutingNodes(expectedNodeIds: string[]): R;
            toBeComplete(): R;

            // Context matchers
            toHaveContextVariable(name: string, value?: JsonValue): R;
            toHaveNodeOutput(nodeId: string, expectedOutput?: Partial<JsonObject>): R;
            toHaveContextSize(maxSizeBytes: number): R;

            // Execution order matchers
            toHaveExecutedInOrder(expectedOrder: string[]): R;
            toHaveExecutedAfter(nodeId: string, afterNodeId: string): R;
            toHaveExecutedBefore(nodeId: string, beforeNodeId: string): R;

            // Output matchers
            toHaveSuccessOutput(expectedOutputs?: Partial<JsonObject>): R;
            toHaveFailureOutput(errorPattern?: string | RegExp): R;
        }
    }
}

// ============================================================================
// QUEUE STATE MATCHERS
// ============================================================================

/**
 * Check if specific nodes are in the completed set
 */
function toHaveCompletedNodes(
    received: ExecutionQueueState,
    expectedNodeIds: string[]
): jest.CustomMatcherResult {
    const completedNodes = Array.from(received.completed);
    const missingNodes = expectedNodeIds.filter((id) => !completedNodes.includes(id));

    const pass = missingNodes.length === 0;

    return {
        pass,
        message: () =>
            pass
                ? `Expected queue to not have completed nodes [${expectedNodeIds.join(", ")}], but they were completed`
                : `Expected queue to have completed nodes [${expectedNodeIds.join(", ")}], but missing: [${missingNodes.join(", ")}]. Completed: [${completedNodes.join(", ")}]`
    };
}

/**
 * Check if a specific node failed with an optional error message
 */
function toHaveFailedNode(
    received: ExecutionQueueState,
    nodeId: string,
    errorMessage?: string | RegExp
): jest.CustomMatcherResult {
    const hasFailed = received.failed.has(nodeId);
    const nodeState = received.nodeStates.get(nodeId);
    const actualError = nodeState?.error;

    let pass = hasFailed;
    let messageDetail = "";

    if (hasFailed && errorMessage) {
        if (typeof errorMessage === "string") {
            pass = actualError?.includes(errorMessage) ?? false;
            messageDetail = ` with error containing "${errorMessage}"`;
        } else {
            pass = errorMessage.test(actualError ?? "");
            messageDetail = ` with error matching ${errorMessage}`;
        }
    }

    return {
        pass,
        message: () =>
            pass
                ? `Expected node "${nodeId}" to not have failed${messageDetail}`
                : `Expected node "${nodeId}" to have failed${messageDetail}, but ${
                      hasFailed ? `got error: "${actualError}"` : "it did not fail"
                  }`
    };
}

/**
 * Check if specific nodes are skipped
 */
function toHaveSkippedNodes(
    received: ExecutionQueueState,
    expectedNodeIds: string[]
): jest.CustomMatcherResult {
    const skippedNodes = Array.from(received.skipped);
    const missingNodes = expectedNodeIds.filter((id) => !skippedNodes.includes(id));

    const pass = missingNodes.length === 0;

    return {
        pass,
        message: () =>
            pass
                ? `Expected queue to not have skipped nodes [${expectedNodeIds.join(", ")}]`
                : `Expected queue to have skipped nodes [${expectedNodeIds.join(", ")}], but missing: [${missingNodes.join(", ")}]`
    };
}

/**
 * Check if specific nodes are pending
 */
function toHavePendingNodes(
    received: ExecutionQueueState,
    expectedNodeIds: string[]
): jest.CustomMatcherResult {
    const pendingNodes = Array.from(received.pending);
    const missingNodes = expectedNodeIds.filter((id) => !pendingNodes.includes(id));

    const pass = missingNodes.length === 0;

    return {
        pass,
        message: () =>
            pass
                ? `Expected queue to not have pending nodes [${expectedNodeIds.join(", ")}]`
                : `Expected queue to have pending nodes [${expectedNodeIds.join(", ")}], but missing: [${missingNodes.join(", ")}]`
    };
}

/**
 * Check if specific nodes are ready
 */
function toHaveReadyNodes(
    received: ExecutionQueueState,
    expectedNodeIds: string[]
): jest.CustomMatcherResult {
    const readyNodes = Array.from(received.ready);
    const missingNodes = expectedNodeIds.filter((id) => !readyNodes.includes(id));

    const pass = missingNodes.length === 0;

    return {
        pass,
        message: () =>
            pass
                ? `Expected queue to not have ready nodes [${expectedNodeIds.join(", ")}]`
                : `Expected queue to have ready nodes [${expectedNodeIds.join(", ")}], but missing: [${missingNodes.join(", ")}]`
    };
}

/**
 * Check if specific nodes are executing
 */
function toHaveExecutingNodes(
    received: ExecutionQueueState,
    expectedNodeIds: string[]
): jest.CustomMatcherResult {
    const executingNodes = Array.from(received.executing);
    const missingNodes = expectedNodeIds.filter((id) => !executingNodes.includes(id));

    const pass = missingNodes.length === 0;

    return {
        pass,
        message: () =>
            pass
                ? `Expected queue to not have executing nodes [${expectedNodeIds.join(", ")}]`
                : `Expected queue to have executing nodes [${expectedNodeIds.join(", ")}], but missing: [${missingNodes.join(", ")}]`
    };
}

/**
 * Check if execution is complete (no pending, ready, or executing nodes)
 */
function toBeComplete(received: ExecutionQueueState): jest.CustomMatcherResult {
    const pass =
        received.pending.size === 0 && received.ready.size === 0 && received.executing.size === 0;

    return {
        pass,
        message: () =>
            pass
                ? "Expected execution to not be complete, but it is"
                : `Expected execution to be complete, but pending: [${Array.from(received.pending).join(", ")}], ready: [${Array.from(received.ready).join(", ")}], executing: [${Array.from(received.executing).join(", ")}]`
    };
}

// ============================================================================
// CONTEXT MATCHERS
// ============================================================================

/**
 * Check if context has a specific variable
 */
function toHaveContextVariable(
    received: ContextSnapshot,
    name: string,
    value?: JsonValue
): jest.CustomMatcherResult {
    const hasVariable = received.workflowVariables.has(name);
    const actualValue = received.workflowVariables.get(name);

    let pass = hasVariable;
    let messageDetail = "";

    if (hasVariable && value !== undefined) {
        pass = JSON.stringify(actualValue) === JSON.stringify(value);
        messageDetail = ` with value ${JSON.stringify(value)}`;
    }

    return {
        pass,
        message: () =>
            pass
                ? `Expected context to not have variable "${name}"${messageDetail}`
                : `Expected context to have variable "${name}"${messageDetail}, but ${
                      hasVariable ? `got: ${JSON.stringify(actualValue)}` : "it does not exist"
                  }`
    };
}

/**
 * Check if context has output for a specific node
 */
function toHaveNodeOutput(
    received: ContextSnapshot,
    nodeId: string,
    expectedOutput?: Partial<JsonObject>
): jest.CustomMatcherResult {
    const hasOutput = received.nodeOutputs.has(nodeId);
    const actualOutput = received.nodeOutputs.get(nodeId);

    let pass = hasOutput;
    let messageDetail = "";

    if (hasOutput && expectedOutput) {
        // Check if expected output is a subset of actual output
        pass = Object.entries(expectedOutput).every(([key, value]) => {
            const actualValue = actualOutput?.[key];
            return JSON.stringify(actualValue) === JSON.stringify(value);
        });
        messageDetail = ` containing ${JSON.stringify(expectedOutput)}`;
    }

    return {
        pass,
        message: () =>
            pass
                ? `Expected context to not have output for node "${nodeId}"${messageDetail}`
                : `Expected context to have output for node "${nodeId}"${messageDetail}, but ${
                      hasOutput ? `got: ${JSON.stringify(actualOutput)}` : "it does not exist"
                  }`
    };
}

/**
 * Check if context size is within limits
 */
function toHaveContextSize(
    received: ContextSnapshot,
    maxSizeBytes: number
): jest.CustomMatcherResult {
    const actualSize = received.metadata.totalSizeBytes;
    const pass = actualSize <= maxSizeBytes;

    return {
        pass,
        message: () =>
            pass
                ? `Expected context size to exceed ${maxSizeBytes} bytes, but it is ${actualSize} bytes`
                : `Expected context size to be at most ${maxSizeBytes} bytes, but it is ${actualSize} bytes`
    };
}

// ============================================================================
// EXECUTION ORDER MATCHERS
// ============================================================================

/**
 * Check if nodes executed in a specific order
 */
function toHaveExecutedInOrder(
    received: ExecutionLogEntry[],
    expectedOrder: string[]
): jest.CustomMatcherResult {
    const actualOrder = received.map((e) => e.nodeId);
    const pass = JSON.stringify(actualOrder) === JSON.stringify(expectedOrder);

    return {
        pass,
        message: () =>
            pass
                ? `Expected execution order to not be [${expectedOrder.join(", ")}]`
                : `Expected execution order [${expectedOrder.join(", ")}], but got [${actualOrder.join(", ")}]`
    };
}

/**
 * Check if a node executed after another node
 */
function toHaveExecutedAfter(
    received: ExecutionLogEntry[],
    nodeId: string,
    afterNodeId: string
): jest.CustomMatcherResult {
    const nodeIndex = received.findIndex((e) => e.nodeId === nodeId);
    const afterIndex = received.findIndex((e) => e.nodeId === afterNodeId);

    const pass = nodeIndex > afterIndex && nodeIndex !== -1 && afterIndex !== -1;

    return {
        pass,
        message: () =>
            pass
                ? `Expected node "${nodeId}" to not execute after "${afterNodeId}"`
                : `Expected node "${nodeId}" to execute after "${afterNodeId}", but ${
                      nodeIndex === -1
                          ? `"${nodeId}" was not executed`
                          : afterIndex === -1
                            ? `"${afterNodeId}" was not executed`
                            : `"${nodeId}" was at index ${nodeIndex} and "${afterNodeId}" was at index ${afterIndex}`
                  }`
    };
}

/**
 * Check if a node executed before another node
 */
function toHaveExecutedBefore(
    received: ExecutionLogEntry[],
    nodeId: string,
    beforeNodeId: string
): jest.CustomMatcherResult {
    const nodeIndex = received.findIndex((e) => e.nodeId === nodeId);
    const beforeIndex = received.findIndex((e) => e.nodeId === beforeNodeId);

    const pass = nodeIndex < beforeIndex && nodeIndex !== -1 && beforeIndex !== -1;

    return {
        pass,
        message: () =>
            pass
                ? `Expected node "${nodeId}" to not execute before "${beforeNodeId}"`
                : `Expected node "${nodeId}" to execute before "${beforeNodeId}", but ${
                      nodeIndex === -1
                          ? `"${nodeId}" was not executed`
                          : beforeIndex === -1
                            ? `"${beforeNodeId}" was not executed`
                            : `"${nodeId}" was at index ${nodeIndex} and "${beforeNodeId}" was at index ${beforeIndex}`
                  }`
    };
}

// ============================================================================
// OUTPUT MATCHERS
// ============================================================================

interface WorkflowResult {
    success: boolean;
    outputs: JsonObject;
    error?: string;
}

/**
 * Check if workflow result indicates success with expected outputs
 */
function toHaveSuccessOutput(
    received: WorkflowResult,
    expectedOutputs?: Partial<JsonObject>
): jest.CustomMatcherResult {
    let pass = received.success === true;
    let messageDetail = "";

    if (pass && expectedOutputs) {
        pass = Object.entries(expectedOutputs).every(([key, value]) => {
            const actualValue = received.outputs[key];
            return JSON.stringify(actualValue) === JSON.stringify(value);
        });
        messageDetail = ` with outputs containing ${JSON.stringify(expectedOutputs)}`;
    }

    return {
        pass,
        message: () =>
            pass
                ? `Expected workflow to not succeed${messageDetail}`
                : `Expected workflow to succeed${messageDetail}, but ${
                      received.success
                          ? `got outputs: ${JSON.stringify(received.outputs)}`
                          : `failed with: ${received.error}`
                  }`
    };
}

/**
 * Check if workflow result indicates failure with expected error
 */
function toHaveFailureOutput(
    received: WorkflowResult,
    errorPattern?: string | RegExp
): jest.CustomMatcherResult {
    let pass = received.success === false;
    let messageDetail = "";

    if (pass && errorPattern) {
        if (typeof errorPattern === "string") {
            pass = received.error?.includes(errorPattern) ?? false;
            messageDetail = ` with error containing "${errorPattern}"`;
        } else {
            pass = errorPattern.test(received.error ?? "");
            messageDetail = ` with error matching ${errorPattern}`;
        }
    }

    return {
        pass,
        message: () =>
            pass
                ? `Expected workflow to not fail${messageDetail}`
                : `Expected workflow to fail${messageDetail}, but ${
                      received.success ? "it succeeded" : `got error: "${received.error}"`
                  }`
    };
}

// ============================================================================
// EXTEND JEST WITH CUSTOM MATCHERS
// ============================================================================

export function extendJestWithWorkflowMatchers(): void {
    expect.extend({
        // Queue state matchers
        toHaveCompletedNodes,
        toHaveFailedNode,
        toHaveSkippedNodes,
        toHavePendingNodes,
        toHaveReadyNodes,
        toHaveExecutingNodes,
        toBeComplete,

        // Context matchers
        toHaveContextVariable,
        toHaveNodeOutput,
        toHaveContextSize,

        // Execution order matchers
        toHaveExecutedInOrder,
        toHaveExecutedAfter,
        toHaveExecutedBefore,

        // Output matchers
        toHaveSuccessOutput,
        toHaveFailureOutput
    });
}

// ============================================================================
// UTILITY ASSERTIONS
// ============================================================================

/**
 * Assert that a value is defined and return it with proper typing
 */
export function assertDefined<T>(value: T | undefined | null, message?: string): T {
    if (value === undefined || value === null) {
        throw new Error(message || "Expected value to be defined");
    }
    return value;
}

/**
 * Assert that an array has a specific length
 */
export function assertLength<T>(array: T[], expectedLength: number, message?: string): void {
    if (array.length !== expectedLength) {
        throw new Error(
            message || `Expected array to have length ${expectedLength}, but got ${array.length}`
        );
    }
}

/**
 * Assert that two sets contain the same elements
 */
export function assertSetsEqual(
    actual: Set<string>,
    expected: Set<string>,
    message?: string
): void {
    const actualArray = Array.from(actual).sort();
    const expectedArray = Array.from(expected).sort();

    if (JSON.stringify(actualArray) !== JSON.stringify(expectedArray)) {
        throw new Error(
            message ||
                `Expected sets to be equal. Actual: [${actualArray.join(", ")}], Expected: [${expectedArray.join(", ")}]`
        );
    }
}

/**
 * Assert that execution completed within a time limit
 */
export function assertDurationWithin(actualMs: number, maxMs: number, message?: string): void {
    if (actualMs > maxMs) {
        throw new Error(
            message || `Expected execution to complete within ${maxMs}ms, but took ${actualMs}ms`
        );
    }
}
