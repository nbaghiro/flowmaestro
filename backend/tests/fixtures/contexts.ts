/**
 * Test Context Fixtures
 *
 * Pre-built context snapshots for testing context management functions.
 */

import type { JsonValue } from "@flowmaestro/shared";
import type {
    ContextSnapshot,
    LoopIterationState,
    ParallelBranchState
} from "../../src/temporal/core/types";

/**
 * Create an empty context with default metadata
 */
export function createEmptyContext(inputs: Record<string, JsonValue> = {}): ContextSnapshot {
    return {
        nodeOutputs: new Map(),
        workflowVariables: new Map(),
        inputs,
        metadata: {
            totalSizeBytes: JSON.stringify(inputs).length * 2,
            nodeCount: 0,
            createdAt: Date.now()
        }
    };
}

/**
 * Create a context with sample node outputs
 */
export function createContextWithOutputs(): ContextSnapshot {
    const nodeOutputs = new Map([
        ["node1", { result: "first output", value: 42 }],
        ["node2", { result: "second output", items: [1, 2, 3] }],
        ["node3", { result: "third output", nested: { deep: { value: "found" } } }]
    ]);

    const workflowVariables = new Map<string, JsonValue>([
        ["counter", 5],
        ["message", "hello world"],
        ["config", { enabled: true, threshold: 0.8 }]
    ]);

    const inputs = {
        userId: "user123",
        inputData: { name: "test", count: 10 }
    };

    return {
        nodeOutputs,
        workflowVariables,
        inputs,
        metadata: {
            totalSizeBytes: 1024,
            nodeCount: 3,
            createdAt: Date.now()
        }
    };
}

/**
 * Create a context approaching the size limit (for pruning tests)
 */
export function createLargeContext(
    targetSizeBytes: number = 40 * 1024 * 1024 // 40MB (approaching 50MB limit)
): ContextSnapshot {
    const nodeOutputs = new Map<string, Record<string, JsonValue>>();

    // Create large outputs to approach limit
    const outputSize = 1024 * 1024; // 1MB per output
    const numOutputs = Math.floor(targetSizeBytes / outputSize);

    for (let i = 0; i < numOutputs; i++) {
        // Create a ~1MB string
        const largeData = "x".repeat(outputSize / 2); // /2 because of UTF-16
        nodeOutputs.set(`large-node-${i}`, {
            index: i,
            data: largeData,
            timestamp: Date.now()
        });
    }

    return {
        nodeOutputs,
        workflowVariables: new Map(),
        inputs: {},
        metadata: {
            totalSizeBytes: targetSizeBytes,
            nodeCount: numOutputs,
            createdAt: Date.now()
        }
    };
}

/**
 * Create context with parallel branch outputs (for merge testing)
 */
export function createParallelMergeContext(): ContextSnapshot {
    const nodeOutputs = new Map([
        // Parent node
        ["parent", { data: "initial", shared: "parent-value" }],
        // Branch outputs (should be merged correctly)
        ["branch1", { branchId: 1, result: "branch1-result", shared: "branch1-override" }],
        ["branch2", { branchId: 2, result: "branch2-result", shared: "branch2-override" }],
        ["branch3", { branchId: 3, result: "branch3-result", shared: "branch3-override" }]
    ]);

    return {
        nodeOutputs,
        workflowVariables: new Map([["branchCount", 3]]),
        inputs: { mode: "parallel" },
        metadata: {
            totalSizeBytes: 512,
            nodeCount: 4,
            createdAt: Date.now()
        }
    };
}

/**
 * Create a loop iteration state
 */
export function createLoopState(
    index: number = 0,
    total: number = 5,
    item?: JsonValue
): LoopIterationState & { isFirst: boolean; isLast: boolean } {
    return {
        index,
        item,
        total,
        results: [],
        isFirst: index === 0,
        isLast: index === total - 1
    };
}

/**
 * Create a loop state with accumulated results
 */
export function createLoopStateWithResults(
    index: number,
    total: number,
    item: JsonValue | undefined,
    results: JsonValue[]
): LoopIterationState & { isFirst: boolean; isLast: boolean } {
    return {
        index,
        item,
        total,
        results,
        isFirst: index === 0,
        isLast: index === total - 1
    };
}

/**
 * Create a parallel branch state
 */
export function createParallelState(
    index: number = 0,
    branchId: string = "branch-0",
    currentItem?: JsonValue
): ParallelBranchState {
    return {
        index,
        branchId,
        currentItem
    };
}

/**
 * Create a context with variable collision potential
 * (tests namespace isolation)
 */
export function createCollisionContext(): ContextSnapshot {
    // Set up a scenario where node output keys could collide with variables
    const nodeOutputs = new Map([["processor", { result: "from-node", count: 100 }]]);

    const workflowVariables = new Map<string, JsonValue>([
        // Same key as a field in processor output
        ["result", "from-variable"],
        ["count", 200]
    ]);

    const inputs = {
        // Same keys again
        result: "from-input",
        count: 300
    };

    return {
        nodeOutputs,
        workflowVariables,
        inputs,
        metadata: {
            totalSizeBytes: 256,
            nodeCount: 1,
            createdAt: Date.now()
        }
    };
}

/**
 * Create a deep clone of a context (for immutability testing)
 */
export function deepCloneContext(context: ContextSnapshot): ContextSnapshot {
    return {
        nodeOutputs: new Map(
            [...context.nodeOutputs].map(([k, v]) => [k, JSON.parse(JSON.stringify(v))])
        ),
        workflowVariables: new Map(
            [...context.workflowVariables].map(([k, v]) => [k, JSON.parse(JSON.stringify(v))])
        ),
        inputs: JSON.parse(JSON.stringify(context.inputs)),
        metadata: { ...context.metadata }
    };
}

/**
 * Compare two contexts for equality (for immutability testing)
 */
export function contextsAreEqual(a: ContextSnapshot, b: ContextSnapshot): boolean {
    // Compare inputs
    if (JSON.stringify(a.inputs) !== JSON.stringify(b.inputs)) {
        return false;
    }

    // Compare nodeOutputs
    if (a.nodeOutputs.size !== b.nodeOutputs.size) {
        return false;
    }
    for (const [key, value] of a.nodeOutputs) {
        const bValue = b.nodeOutputs.get(key);
        if (JSON.stringify(value) !== JSON.stringify(bValue)) {
            return false;
        }
    }

    // Compare workflowVariables
    if (a.workflowVariables.size !== b.workflowVariables.size) {
        return false;
    }
    for (const [key, value] of a.workflowVariables) {
        const bValue = b.workflowVariables.get(key);
        if (JSON.stringify(value) !== JSON.stringify(bValue)) {
            return false;
        }
    }

    return true;
}
