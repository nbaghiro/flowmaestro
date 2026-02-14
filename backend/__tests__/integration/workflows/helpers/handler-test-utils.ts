/**
 * Handler Test Utilities
 *
 * Helpers for creating handler inputs, executing handlers, and making assertions.
 * Used by all handler unit tests.
 */

import type { JsonObject, JsonValue } from "@flowmaestro/shared";
import { createSharedMemory } from "../../../../src/temporal/core/services/context";
import type {
    NodeHandlerInput,
    NodeHandlerOutput,
    NodeExecutionMetadata
} from "../../../../src/temporal/activities/execution/types";
import type {
    ContextSnapshot,
    LoopIterationState,
    ParallelBranchState
} from "../../../../src/temporal/core/types";

// ============================================================================
// CONTEXT BUILDERS
// ============================================================================

/**
 * Detect the type of a JSON value for shared memory metadata.
 */
function detectValueType(value: JsonValue): "string" | "number" | "boolean" | "json" {
    if (typeof value === "string") return "string";
    if (typeof value === "number") return "number";
    if (typeof value === "boolean") return "boolean";
    return "json";
}

/**
 * Create an empty context snapshot for testing
 */
export function createTestContext(
    options: {
        inputs?: JsonObject;
        nodeOutputs?: Record<string, JsonObject>;
        variables?: Record<string, JsonValue>;
        sharedMemory?: Record<string, JsonValue>;
    } = {}
): ContextSnapshot {
    const { inputs = {}, nodeOutputs = {}, variables = {}, sharedMemory = {} } = options;

    // Create base shared memory state
    const sharedMemoryState = createSharedMemory();

    // Pre-populate shared memory entries if provided
    for (const [key, value] of Object.entries(sharedMemory)) {
        sharedMemoryState.entries.set(key, {
            key,
            value,
            metadata: {
                createdAt: Date.now(),
                updatedAt: Date.now(),
                nodeId: "test-setup",
                valueType: detectValueType(value),
                sizeBytes: JSON.stringify(value).length
            }
        });
    }

    return {
        nodeOutputs: new Map(Object.entries(nodeOutputs)),
        workflowVariables: new Map(Object.entries(variables)),
        sharedMemory: sharedMemoryState,
        inputs,
        metadata: {
            totalSizeBytes: 0,
            nodeCount: Object.keys(nodeOutputs).length,
            createdAt: Date.now()
        }
    };
}

/**
 * Create a context with common upstream node outputs
 */
export function createContextWithUpstream(
    upstreamOutputs: Record<string, JsonObject>,
    inputs: JsonObject = {}
): ContextSnapshot {
    return createTestContext({
        inputs,
        nodeOutputs: upstreamOutputs
    });
}

// ============================================================================
// HANDLER INPUT BUILDERS
// ============================================================================

/**
 * Create default execution metadata
 */
export function createTestMetadata(
    overrides: Partial<NodeExecutionMetadata> = {}
): NodeExecutionMetadata {
    return {
        executionId: "test-execution-123",
        workflowName: "Test Workflow",
        userId: "test-user-456",
        nodeId: "test-node-789",
        nodeName: "Test Node",
        attemptNumber: 1,
        maxRetries: 3,
        ...overrides
    };
}

/**
 * Create a NodeHandlerInput for testing
 */
export function createHandlerInput(options: {
    nodeType: string;
    nodeConfig: JsonObject;
    context?: ContextSnapshot;
    metadata?: Partial<NodeExecutionMetadata>;
    loopState?: LoopIterationState;
    parallelState?: ParallelBranchState;
}): NodeHandlerInput {
    return {
        nodeType: options.nodeType,
        nodeConfig: options.nodeConfig,
        context: options.context || createTestContext(),
        metadata: createTestMetadata(options.metadata),
        loopState: options.loopState,
        parallelState: options.parallelState
    };
}

/**
 * Create handler input with upstream data (convenience function)
 */
export function createHandlerInputWithUpstream(options: {
    nodeType: string;
    nodeConfig: JsonObject;
    upstreamOutputs: Record<string, JsonObject>;
    inputs?: JsonObject;
    metadata?: Partial<NodeExecutionMetadata>;
}): NodeHandlerInput {
    return createHandlerInput({
        nodeType: options.nodeType,
        nodeConfig: options.nodeConfig,
        context: createContextWithUpstream(options.upstreamOutputs, options.inputs),
        metadata: options.metadata
    });
}

// ============================================================================
// LOOP & PARALLEL STATE BUILDERS
// ============================================================================

/**
 * Create a loop iteration state for testing
 */
export function createTestLoopState(
    options: {
        index?: number;
        total?: number;
        item?: JsonValue;
        results?: JsonValue[];
    } = {}
): LoopIterationState {
    return {
        index: options.index ?? 0,
        total: options.total ?? 5,
        item: options.item,
        results: options.results ?? []
    };
}

/**
 * Create a parallel branch state for testing
 */
export function createTestParallelState(
    options: {
        index?: number;
        branchId?: string;
        currentItem?: JsonValue;
    } = {}
): ParallelBranchState {
    return {
        index: options.index ?? 0,
        branchId: options.branchId ?? "branch-0",
        currentItem: options.currentItem
    };
}

// ============================================================================
// OUTPUT ASSERTIONS
// ============================================================================

/**
 * Assert handler output structure is valid
 */
export function assertValidOutput(output: NodeHandlerOutput): void {
    expect(output).toBeDefined();
    expect(output.result).toBeDefined();
    expect(typeof output.result).toBe("object");
    expect(output.signals).toBeDefined();
    expect(typeof output.signals).toBe("object");
}

/**
 * Assert handler succeeded with expected result structure
 */
export function assertSuccessOutput(output: NodeHandlerOutput, expectedKeys?: string[]): void {
    assertValidOutput(output);
    expect(output.signals.isTerminal).not.toBe(true);

    if (expectedKeys) {
        for (const key of expectedKeys) {
            expect(output.result).toHaveProperty(key);
        }
    }
}

/**
 * Assert handler returned branch selection signal
 */
export function assertBranchSelection(output: NodeHandlerOutput, expectedRoute: string): void {
    assertValidOutput(output);
    expect(output.signals.selectedRoute).toBe(expectedRoute);
}

/**
 * Assert handler returned pause signal
 */
export function assertPauseSignal(output: NodeHandlerOutput, expectedReason?: string): void {
    assertValidOutput(output);
    expect(output.signals.pause).toBe(true);
    expect(output.signals.pauseContext).toBeDefined();

    if (expectedReason) {
        expect(output.signals.pauseContext?.reason).toBe(expectedReason);
    }
}

/**
 * Assert handler returned loop metadata
 */
export function assertLoopMetadata(
    output: NodeHandlerOutput,
    expectations: {
        shouldContinue?: boolean;
        currentIndex?: number;
        totalItems?: number;
    }
): void {
    assertValidOutput(output);
    expect(output.signals.loopMetadata).toBeDefined();

    if (expectations.shouldContinue !== undefined) {
        expect(output.signals.loopMetadata?.shouldContinue).toBe(expectations.shouldContinue);
    }
    if (expectations.currentIndex !== undefined) {
        expect(output.signals.loopMetadata?.currentIndex).toBe(expectations.currentIndex);
    }
    if (expectations.totalItems !== undefined) {
        expect(output.signals.loopMetadata?.totalItems).toBe(expectations.totalItems);
    }
}

/**
 * Assert handler metrics were recorded
 */
export function assertMetricsRecorded(
    output: NodeHandlerOutput,
    expectations?: {
        minDurationMs?: number;
        maxDurationMs?: number;
        hasTokenUsage?: boolean;
    }
): void {
    assertValidOutput(output);
    expect(output.metrics).toBeDefined();
    expect(output.metrics?.durationMs).toBeGreaterThanOrEqual(0);

    if (expectations?.minDurationMs !== undefined) {
        expect(output.metrics?.durationMs).toBeGreaterThanOrEqual(expectations.minDurationMs);
    }
    if (expectations?.maxDurationMs !== undefined) {
        expect(output.metrics?.durationMs).toBeLessThanOrEqual(expectations.maxDurationMs);
    }
    if (expectations?.hasTokenUsage) {
        expect(output.metrics?.tokenUsage).toBeDefined();
    }
}

// ============================================================================
// VARIABLE REFERENCE HELPERS
// ============================================================================

/**
 * Create a variable reference string (e.g., "${nodeId.field}")
 */
export function varRef(nodeIdOrPath: string, field?: string): string {
    if (field) {
        return `\${${nodeIdOrPath}.${field}}`;
    }
    return `\${${nodeIdOrPath}}`;
}

/**
 * Create a mustache variable reference (e.g., "{{nodeId.field}}")
 */
export function mustacheRef(nodeIdOrPath: string, field?: string): string {
    if (field) {
        return `{{${nodeIdOrPath}.${field}}}`;
    }
    return `{{${nodeIdOrPath}}}`;
}

// ============================================================================
// COMMON NODE CONFIGS
// ============================================================================

export const CommonConfigs = {
    transform: {
        map: (inputVar: string, expression: string, outputVar: string = "result") => ({
            operation: "map" as const,
            inputData: inputVar,
            expression,
            outputVariable: outputVar
        }),
        filter: (inputVar: string, expression: string, outputVar: string = "result") => ({
            operation: "filter" as const,
            inputData: inputVar,
            expression,
            outputVariable: outputVar
        }),
        reduce: (inputVar: string, expression: string, outputVar: string = "result") => ({
            operation: "reduce" as const,
            inputData: inputVar,
            expression,
            outputVariable: outputVar
        }),
        sort: (inputVar: string, expression: string, outputVar: string = "result") => ({
            operation: "sort" as const,
            inputData: inputVar,
            expression,
            outputVariable: outputVar
        }),
        extract: (inputVar: string, path: string, outputVar: string = "result") => ({
            operation: "extract" as const,
            inputData: inputVar,
            expression: path,
            outputVariable: outputVar
        }),
        parseJSON: (inputVar: string, outputVar: string = "result") => ({
            operation: "parseJSON" as const,
            inputData: inputVar,
            expression: "unused", // Required by schema but not used for parseJSON
            outputVariable: outputVar
        }),
        parseXML: (inputVar: string, outputVar: string = "result") => ({
            operation: "parseXML" as const,
            inputData: inputVar,
            expression: "unused", // Required by schema but not used for parseXML
            outputVariable: outputVar
        }),
        passthrough: (inputVar: string, outputVar: string = "result") => ({
            operation: "passthrough" as const,
            inputData: inputVar,
            expression: "", // Not used for passthrough
            outputVariable: outputVar
        })
    },

    conditional: {
        equals: (left: string, right: string) => ({
            leftValue: left,
            operator: "==" as const,
            rightValue: right
        }),
        notEquals: (left: string, right: string) => ({
            leftValue: left,
            operator: "!=" as const,
            rightValue: right
        }),
        greaterThan: (left: string, right: string) => ({
            leftValue: left,
            operator: ">" as const,
            rightValue: right
        }),
        lessThan: (left: string, right: string) => ({
            leftValue: left,
            operator: "<" as const,
            rightValue: right
        }),
        contains: (left: string, right: string) => ({
            leftValue: left,
            operator: "contains" as const,
            rightValue: right
        })
    },

    loop: {
        forEach: (arrayPath: string, itemVar: string = "item", indexVar: string = "index") => ({
            loopType: "forEach" as const,
            arrayPath,
            itemVariable: itemVar,
            indexVariable: indexVar,
            maxIterations: 100
        }),
        while: (condition: string, maxIterations: number = 100) => ({
            loopType: "while" as const,
            condition,
            maxIterations
        }),
        count: (count: number, indexVar: string = "i") => ({
            loopType: "count" as const,
            count,
            indexVariable: indexVar
        })
    },

    sharedMemory: {
        store: (key: string, value: string, enableSemanticSearch = true) => ({
            operation: "store" as const,
            key,
            value,
            enableSemanticSearch
        }),
        search: (query: string, topK = 5, threshold = 0.7) => ({
            operation: "search" as const,
            searchQuery: query,
            topK,
            similarityThreshold: threshold
        })
    },

    code: {
        javascript: (code: string, timeout: number = 5000) => ({
            language: "javascript" as const,
            code,
            timeout
        }),
        python: (code: string, timeout: number = 5000) => ({
            language: "python" as const,
            code,
            timeout
        })
    },

    wait: {
        duration: (durationMs: number) => ({
            waitType: "duration" as const,
            durationMs
        }),
        until: (timestamp: string) => ({
            waitType: "until" as const,
            untilTimestamp: timestamp
        })
    }
};

// ============================================================================
// TEST DATA GENERATORS
// ============================================================================

/**
 * Generate test array data
 */
export function generateTestArray(
    size: number,
    template: (index: number) => JsonValue
): JsonValue[] {
    return Array.from({ length: size }, (_, i) => template(i));
}

/**
 * Generate test object with fields
 */
export function generateTestObject(fields: string[], values: JsonValue[]): JsonObject {
    const obj: JsonObject = {};
    fields.forEach((field, i) => {
        obj[field] = values[i] ?? null;
    });
    return obj;
}

/**
 * Generate test user data
 */
export function generateTestUsers(count: number): JsonObject[] {
    return generateTestArray(count, (i) => ({
        id: i + 1,
        name: `User ${i + 1}`,
        email: `user${i + 1}@test.com`,
        age: 20 + (i % 50),
        active: i % 2 === 0
    })) as JsonObject[];
}
