import type { JsonObject, JsonValue } from "@flowmaestro/shared";

/**
 * ContextSnapshot - Immutable snapshot of execution context.
 * Passed to node handlers for variable resolution.
 */
export interface ContextSnapshot {
    /** Outputs from completed nodes */
    nodeOutputs: Record<string, JsonObject>;

    /** Workflow-level variables */
    workflowVariables: Record<string, JsonValue>;

    /** Initial inputs to the workflow */
    inputs: JsonObject;

    /** Current loop context, if inside a loop */
    loopContext?: {
        /** Current iteration index (0-based) */
        index: number;
        /** Current loop item (for forEach loops) */
        item?: JsonValue;
        /** Total iteration count (if known) */
        total?: number;
        /** Parent loop ID */
        loopId: string;
    };

    /** Current parallel context, if inside a parallel block */
    parallelContext?: {
        /** Branch index */
        branchIndex: number;
        /** Parent parallel node ID */
        parallelId: string;
    };
}

/**
 * ContextManager - Manages node outputs and workflow variables.
 *
 * Features:
 * - Stores node outputs with size limiting
 * - Manages workflow-level variables
 * - Provides immutable snapshots for node execution
 * - Supports context pruning to bound memory usage
 */
export class ContextManager {
    private nodeOutputs: Map<string, JsonObject> = new Map();
    private workflowVariables: Map<string, JsonValue> = new Map();
    private inputs: JsonObject;
    private loopStack: Array<{
        loopId: string;
        index: number;
        item?: JsonValue;
        total?: number;
    }> = [];
    private parallelStack: Array<{
        parallelId: string;
        branchIndex: number;
    }> = [];

    private readonly maxOutputSize: number;

    constructor(inputs: JsonObject, maxOutputSize = 100_000) {
        this.inputs = inputs;
        this.maxOutputSize = maxOutputSize;
    }

    /**
     * Set the output for a completed node.
     * Truncates if output exceeds max size.
     */
    setNodeOutput(nodeId: string, output: JsonObject): void {
        const serialized = JSON.stringify(output);

        if (serialized.length > this.maxOutputSize) {
            // Truncate large outputs
            const truncated: JsonObject = {
                __truncated: true,
                __originalSize: serialized.length,
                __preview: serialized.slice(0, 1000)
            };
            this.nodeOutputs.set(nodeId, truncated);
        } else {
            this.nodeOutputs.set(nodeId, output);
        }
    }

    /**
     * Get the output for a node.
     */
    getNodeOutput(nodeId: string): JsonObject | undefined {
        return this.nodeOutputs.get(nodeId);
    }

    /**
     * Check if a node has output.
     */
    hasNodeOutput(nodeId: string): boolean {
        return this.nodeOutputs.has(nodeId);
    }

    /**
     * Set a workflow variable.
     */
    setVariable(name: string, value: JsonValue): void {
        this.workflowVariables.set(name, value);
    }

    /**
     * Get a workflow variable.
     */
    getVariable(name: string): JsonValue | undefined {
        return this.workflowVariables.get(name);
    }

    /**
     * Get the initial inputs.
     */
    getInputs(): JsonObject {
        return this.inputs;
    }

    /**
     * Push a loop context onto the stack.
     */
    enterLoop(loopId: string, index: number, item?: JsonValue, total?: number): void {
        this.loopStack.push({ loopId, index, item, total });
    }

    /**
     * Pop a loop context from the stack.
     */
    exitLoop(): void {
        this.loopStack.pop();
    }

    /**
     * Update the current loop iteration.
     */
    updateLoopIteration(index: number, item?: JsonValue): void {
        const current = this.loopStack[this.loopStack.length - 1];
        if (current) {
            current.index = index;
            current.item = item;
        }
    }

    /**
     * Get the current loop context.
     */
    getLoopContext(): ContextSnapshot["loopContext"] {
        const current = this.loopStack[this.loopStack.length - 1];
        if (!current) return undefined;

        return {
            index: current.index,
            item: current.item,
            total: current.total,
            loopId: current.loopId
        };
    }

    /**
     * Push a parallel context onto the stack.
     */
    enterParallel(parallelId: string, branchIndex: number): void {
        this.parallelStack.push({ parallelId, branchIndex });
    }

    /**
     * Pop a parallel context from the stack.
     */
    exitParallel(): void {
        this.parallelStack.pop();
    }

    /**
     * Get the current parallel context.
     */
    getParallelContext(): ContextSnapshot["parallelContext"] {
        const current = this.parallelStack[this.parallelStack.length - 1];
        if (!current) return undefined;

        return {
            branchIndex: current.branchIndex,
            parallelId: current.parallelId
        };
    }

    /**
     * Get an immutable snapshot of the current context.
     */
    getSnapshot(): ContextSnapshot {
        return {
            nodeOutputs: Object.fromEntries(this.nodeOutputs),
            workflowVariables: Object.fromEntries(this.workflowVariables),
            inputs: this.inputs,
            loopContext: this.getLoopContext(),
            parallelContext: this.getParallelContext()
        };
    }

    /**
     * Prune unused outputs to reduce memory usage.
     * Keeps only outputs for nodes that are still needed.
     */
    pruneUnusedOutputs(neededNodes: Set<string>): void {
        for (const nodeId of this.nodeOutputs.keys()) {
            if (!neededNodes.has(nodeId)) {
                this.nodeOutputs.delete(nodeId);
            }
        }
    }

    /**
     * Get the final outputs for the workflow.
     * Returns outputs from terminal nodes.
     */
    getFinalOutputs(terminalNodeIds: string[]): JsonObject {
        const outputs: JsonObject = {};

        for (const nodeId of terminalNodeIds) {
            const output = this.nodeOutputs.get(nodeId);
            if (output) {
                outputs[nodeId] = output as JsonValue;
            }
        }

        // Also include workflow variables as outputs
        const variables = Object.fromEntries(this.workflowVariables);
        if (Object.keys(variables).length > 0) {
            outputs["__variables"] = variables as JsonValue;
        }

        return outputs;
    }

    /**
     * Merge outputs from parallel branches.
     */
    mergeParallelOutputs(
        branchOutputs: Array<{ branchIndex: number; outputs: JsonObject }>
    ): JsonObject {
        const merged: JsonObject = {};

        for (const { branchIndex, outputs } of branchOutputs) {
            merged[`branch_${branchIndex}`] = outputs as JsonValue;
        }

        return merged;
    }

    /**
     * Get the size of all stored outputs (for monitoring).
     */
    getOutputsSize(): number {
        let size = 0;
        for (const output of this.nodeOutputs.values()) {
            size += JSON.stringify(output).length;
        }
        return size;
    }

    /**
     * Clear all outputs (for re-execution).
     */
    clear(): void {
        this.nodeOutputs.clear();
        this.workflowVariables.clear();
        this.loopStack = [];
        this.parallelStack = [];
    }
}
