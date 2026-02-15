/**
 * Context & Execution Queue Management
 *
 * Manages workflow execution context and parallel node execution state.
 * All functions are pure and return new objects for Temporal determinism.
 */

import type { JsonObject, JsonValue } from "@flowmaestro/shared";
import type { BuiltWorkflow } from "../../activities/execution/types";
import type {
    ContextStorageConfig,
    ContextSnapshot,
    VariableResolution,
    LoopIterationState,
    ParallelBranchState,
    ExecutionQueueState,
    NodeExecutionState,
    NodeExecutionStatus,
    SharedMemoryConfig,
    SharedMemoryState,
    SharedMemoryEntry
} from "../types";

// ============================================================================
// CONTEXT MANAGER - Configuration & Creation
// ============================================================================

/**
 * Default configuration for context storage.
 */
export const DEFAULT_CONTEXT_CONFIG: ContextStorageConfig = {
    maxOutputSizeBytes: 1024 * 1024, // 1MB per node output
    maxTotalSizeBytes: 50 * 1024 * 1024, // 50MB total
    pruneThreshold: 0.8, // Prune at 80% capacity
    retainLastN: 10 // Always retain last 10 outputs
};

/**
 * Default configuration for shared memory.
 */
export const DEFAULT_SHARED_MEMORY_CONFIG: SharedMemoryConfig = {
    maxEntries: 1000,
    maxValueSizeBytes: 100 * 1024, // 100KB per value
    maxTotalSizeBytes: 10 * 1024 * 1024, // 10MB total
    embeddingModel: "text-embedding-3-small",
    embeddingDimensions: 1536,
    enableSemanticSearch: true
};

/**
 * Create empty shared memory state.
 */
export function createSharedMemory(config: Partial<SharedMemoryConfig> = {}): SharedMemoryState {
    return {
        entries: new Map(),
        config: { ...DEFAULT_SHARED_MEMORY_CONFIG, ...config },
        metadata: {
            totalSizeBytes: 0,
            entryCount: 0,
            createdAt: Date.now()
        }
    };
}

/**
 * Create initial context snapshot.
 */
export function createContext(
    inputs: JsonObject,
    _config: Partial<ContextStorageConfig> = {},
    sharedMemoryConfig: Partial<SharedMemoryConfig> = {}
): ContextSnapshot {
    return {
        nodeOutputs: new Map(),
        workflowVariables: new Map(),
        sharedMemory: createSharedMemory(sharedMemoryConfig),
        inputs,
        metadata: {
            totalSizeBytes: estimateSize(inputs),
            nodeCount: 0,
            createdAt: Date.now()
        }
    };
}

/**
 * Store node output in context.
 */
export function storeNodeOutput(
    context: ContextSnapshot,
    nodeId: string,
    output: JsonObject,
    config: ContextStorageConfig = DEFAULT_CONTEXT_CONFIG
): ContextSnapshot {
    const newContext = cloneContext(context);
    const outputSize = estimateSize(output);

    if (outputSize > config.maxOutputSizeBytes) {
        const truncated = truncateOutput(output, config.maxOutputSizeBytes);
        newContext.nodeOutputs.set(nodeId, truncated);
        newContext.metadata.totalSizeBytes += estimateSize(truncated);
    } else {
        newContext.nodeOutputs.set(nodeId, output);
        newContext.metadata.totalSizeBytes += outputSize;
    }

    newContext.metadata.nodeCount++;

    if (newContext.metadata.totalSizeBytes > config.maxTotalSizeBytes * config.pruneThreshold) {
        return pruneContext(newContext, config);
    }

    return newContext;
}

/**
 * Get node output from context.
 */
export function getNodeOutput(context: ContextSnapshot, nodeId: string): JsonObject | undefined {
    return context.nodeOutputs.get(nodeId);
}

/**
 * Set a workflow variable.
 */
export function setVariable(
    context: ContextSnapshot,
    name: string,
    value: JsonValue
): ContextSnapshot {
    const newContext = cloneContext(context);
    newContext.workflowVariables.set(name, value);
    return newContext;
}

/**
 * Get a workflow variable.
 */
export function getVariable(context: ContextSnapshot, name: string): JsonValue | undefined {
    return context.workflowVariables.get(name);
}

/**
 * Delete a workflow variable.
 */
export function deleteVariable(context: ContextSnapshot, name: string): ContextSnapshot {
    const newContext = cloneContext(context);
    newContext.workflowVariables.delete(name);
    return newContext;
}

// ============================================================================
// SHARED MEMORY OPERATIONS
// ============================================================================

/**
 * Set a value in shared memory.
 * Returns new context with updated shared memory state.
 */
export function setSharedMemoryValue(
    context: ContextSnapshot,
    key: string,
    value: JsonValue,
    nodeId: string,
    embedding?: number[]
): ContextSnapshot {
    const newContext = cloneContext(context);
    const state = newContext.sharedMemory;

    const valueStr = JSON.stringify(value);
    const sizeBytes = valueStr.length * 2;

    // Check value size limit
    if (sizeBytes > state.config.maxValueSizeBytes) {
        throw new Error(
            `Shared memory value size ${sizeBytes} bytes exceeds limit of ${state.config.maxValueSizeBytes} bytes`
        );
    }

    // Remove old entry size if updating
    const existingEntry = state.entries.get(key);
    if (existingEntry) {
        state.metadata.totalSizeBytes -= existingEntry.metadata.sizeBytes;
    } else {
        state.metadata.entryCount++;
    }

    // Check total size limit
    if (state.metadata.totalSizeBytes + sizeBytes > state.config.maxTotalSizeBytes) {
        throw new Error(
            `Shared memory total size would exceed limit of ${state.config.maxTotalSizeBytes} bytes`
        );
    }

    // Check entry count limit
    if (state.metadata.entryCount > state.config.maxEntries) {
        throw new Error(
            `Shared memory entry count would exceed limit of ${state.config.maxEntries}`
        );
    }

    const entry: SharedMemoryEntry = {
        key,
        value,
        embedding,
        metadata: {
            createdAt: existingEntry?.metadata.createdAt || Date.now(),
            updatedAt: Date.now(),
            nodeId,
            valueType: detectValueType(value),
            sizeBytes
        }
    };

    state.entries.set(key, entry);
    state.metadata.totalSizeBytes += sizeBytes;

    return newContext;
}

/**
 * Get a value from shared memory.
 */
export function getSharedMemoryValue(context: ContextSnapshot, key: string): JsonValue | undefined {
    const entry = context.sharedMemory.entries.get(key);
    return entry?.value;
}

/**
 * Get a shared memory entry (including metadata).
 */
export function getSharedMemoryEntry(
    context: ContextSnapshot,
    key: string
): SharedMemoryEntry | undefined {
    return context.sharedMemory.entries.get(key);
}

/**
 * Delete a value from shared memory.
 */
export function deleteSharedMemoryValue(context: ContextSnapshot, key: string): ContextSnapshot {
    const newContext = cloneContext(context);
    const state = newContext.sharedMemory;
    const entry = state.entries.get(key);

    if (entry) {
        state.entries.delete(key);
        state.metadata.totalSizeBytes -= entry.metadata.sizeBytes;
        state.metadata.entryCount--;
    }

    return newContext;
}

/**
 * Append to an existing shared memory value.
 * For arrays: appends the value to the array.
 * For strings: concatenates the value.
 */
export function appendSharedMemoryValue(
    context: ContextSnapshot,
    key: string,
    valueToAppend: JsonValue,
    nodeId: string
): ContextSnapshot {
    const existingEntry = context.sharedMemory.entries.get(key);

    if (!existingEntry) {
        // If doesn't exist, treat as set
        return setSharedMemoryValue(context, key, valueToAppend, nodeId);
    }

    let newValue: JsonValue;

    if (Array.isArray(existingEntry.value)) {
        // Append to array
        newValue = [...existingEntry.value, valueToAppend];
    } else if (typeof existingEntry.value === "string") {
        // Append to string
        newValue = existingEntry.value + String(valueToAppend);
    } else {
        throw new Error(
            `Cannot append to shared memory value of type ${typeof existingEntry.value}`
        );
    }

    return setSharedMemoryValue(context, key, newValue, nodeId, existingEntry.embedding);
}

/**
 * Get all keys in shared memory.
 */
export function getSharedMemoryKeys(context: ContextSnapshot): string[] {
    return Array.from(context.sharedMemory.entries.keys());
}

/**
 * Search shared memory by semantic similarity.
 * Returns entries sorted by similarity score (highest first).
 */
export function searchSharedMemory(
    context: ContextSnapshot,
    queryEmbedding: number[],
    topK: number = 5,
    similarityThreshold: number = 0.7
): Array<{ key: string; value: JsonValue; similarity: number }> {
    const results: Array<{ key: string; value: JsonValue; similarity: number }> = [];

    for (const [key, entry] of context.sharedMemory.entries) {
        if (entry.embedding && entry.embedding.length > 0) {
            const similarity = cosineSimilarity(queryEmbedding, entry.embedding);
            if (similarity >= similarityThreshold) {
                results.push({ key, value: entry.value, similarity });
            }
        }
    }

    // Sort by similarity descending and limit to topK
    return results.sort((a, b) => b.similarity - a.similarity).slice(0, topK);
}

/**
 * Get shared memory statistics.
 */
export function getSharedMemoryStats(context: ContextSnapshot): {
    entryCount: number;
    totalSizeBytes: number;
    maxEntries: number;
    maxTotalSizeBytes: number;
    entriesWithEmbeddings: number;
} {
    let entriesWithEmbeddings = 0;
    for (const entry of context.sharedMemory.entries.values()) {
        if (entry.embedding && entry.embedding.length > 0) {
            entriesWithEmbeddings++;
        }
    }

    return {
        entryCount: context.sharedMemory.metadata.entryCount,
        totalSizeBytes: context.sharedMemory.metadata.totalSizeBytes,
        maxEntries: context.sharedMemory.config.maxEntries,
        maxTotalSizeBytes: context.sharedMemory.config.maxTotalSizeBytes,
        entriesWithEmbeddings
    };
}

// ============================================================================
// SHARED MEMORY SERIALIZATION
// ============================================================================

/**
 * Serialized format for shared memory state.
 * Used for Temporal workflow state serialization and database persistence.
 */
export interface SerializedSharedMemoryState {
    entries: Array<{
        key: string;
        value: JsonValue;
        embedding?: number[];
        metadata: {
            createdAt: number;
            updatedAt: number;
            nodeId: string;
            valueType: "string" | "number" | "boolean" | "json";
            sizeBytes: number;
        };
    }>;
    config: SharedMemoryConfig;
    metadata: {
        totalSizeBytes: number;
        entryCount: number;
        createdAt: number;
    };
}

/**
 * Serialize shared memory state to JSON-compatible format.
 * Converts the entries Map to an array for serialization.
 */
export function serializeSharedMemoryState(state: SharedMemoryState): SerializedSharedMemoryState {
    const entries: SerializedSharedMemoryState["entries"] = [];

    for (const [key, entry] of state.entries) {
        entries.push({
            key,
            value: entry.value,
            embedding: entry.embedding,
            metadata: { ...entry.metadata }
        });
    }

    return {
        entries,
        config: { ...state.config },
        metadata: { ...state.metadata }
    };
}

/**
 * Deserialize shared memory state from JSON format.
 * Restores the entries Map from the array format.
 */
export function deserializeSharedMemoryState(
    serialized: SerializedSharedMemoryState
): SharedMemoryState {
    const entries = new Map<string, SharedMemoryEntry>();

    for (const entry of serialized.entries) {
        entries.set(entry.key, {
            key: entry.key,
            value: entry.value,
            embedding: entry.embedding,
            metadata: { ...entry.metadata }
        });
    }

    return {
        entries,
        config: { ...serialized.config },
        metadata: { ...serialized.metadata }
    };
}

/**
 * Resolve a variable reference or expression.
 * Supports:
 * - Simple paths: {{variableName}}, {{nodeId.field}}, {{loop.index}}, {{parallel.index}}, {{shared.key}}
 * - Expressions: {{a || b}}, {{a && b}}, {{a == b}}, {{a ? b : c}}, {{!a}}
 */
export function resolveVariable(
    context: ContextSnapshot,
    path: string,
    loopState?: LoopIterationState,
    parallelState?: ParallelBranchState
): VariableResolution | null {
    const cleanPath = path.replace(/^\{\{|\}\}$/g, "").trim();

    if (cleanPath.length === 0) return null;

    // Check if this is an expression (contains operators)
    if (isExpression(cleanPath)) {
        const tokens = tokenize(cleanPath);
        const ast = parseExpression(tokens);
        if (ast) {
            const value = evaluateExpression(ast, context, loopState, parallelState);
            return { value, source: "expression" as VariableResolution["source"], path: cleanPath };
        }
        // If parsing fails, fall back to simple path resolution
    }

    // Simple path resolution (original logic)
    return resolveVariablePath(context, cleanPath, loopState, parallelState);
}

/**
 * Interpolate all variables in a string.
 */
export function interpolateString(
    context: ContextSnapshot,
    template: string,
    loopState?: LoopIterationState,
    parallelState?: ParallelBranchState
): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
        const resolution = resolveVariable(context, path, loopState, parallelState);
        if (resolution === null) return match;

        if (typeof resolution.value === "object" && resolution.value !== null) {
            return JSON.stringify(resolution.value);
        }
        return String(resolution.value);
    });
}

/**
 * Get merged context for node execution (backwards-compatible view).
 */
export function getExecutionContext(context: ContextSnapshot): JsonObject {
    const merged: JsonObject = { ...context.inputs };

    for (const [key, value] of context.workflowVariables) {
        merged[key] = value;
    }

    for (const [nodeId, output] of context.nodeOutputs) {
        merged[nodeId] = output;
        if (typeof output === "object" && output !== null) {
            for (const [key, value] of Object.entries(output)) {
                if (!(key in merged)) {
                    merged[key] = value;
                }
            }
        }
    }

    return merged;
}

/**
 * Build final outputs from context.
 */
export function buildFinalOutputs(context: ContextSnapshot, outputNodeIds: string[]): JsonObject {
    const outputs: JsonObject = {};

    for (const nodeId of outputNodeIds) {
        const nodeOutput = context.nodeOutputs.get(nodeId);
        if (nodeOutput) {
            Object.assign(outputs, nodeOutput);
        }
    }

    if (Object.keys(outputs).length === 0) {
        for (const [key, value] of context.workflowVariables) {
            outputs[key] = value;
        }
    }

    return outputs;
}

/**
 * Merge another context's outputs into this context.
 */
export function mergeContext(context: ContextSnapshot, other: ContextSnapshot): ContextSnapshot {
    const newContext = cloneContext(context);

    for (const [nodeId, output] of other.nodeOutputs) {
        newContext.nodeOutputs.set(nodeId, output);
    }

    for (const [key, value] of other.workflowVariables) {
        newContext.workflowVariables.set(key, value);
    }

    return newContext;
}

/**
 * Check if a value looks like a variable reference.
 */
export function isVariableReference(value: unknown): value is string {
    return typeof value === "string" && value.includes("{{") && value.includes("}}");
}

/**
 * Extract variable names from a template string.
 */
export function extractVariableNames(template: string): string[] {
    const matches = template.match(/\{\{([^}]+)\}\}/g);
    if (!matches) return [];
    return matches.map((m) => m.replace(/^\{\{|\}\}$/g, "").trim());
}

// ============================================================================
// EXECUTION QUEUE - Parallel Node Execution State
// ============================================================================

/**
 * Initialize execution queue from built workflow.
 */
export function initializeQueue(workflow: BuiltWorkflow): ExecutionQueueState {
    const pending = new Set<string>();
    const ready = new Set<string>();
    const nodeStates = new Map<string, NodeExecutionState>();

    for (const [nodeId, node] of workflow.nodes) {
        const state: NodeExecutionState = {
            nodeId,
            status: "pending",
            retryCount: 0
        };

        if (node.dependencies.length === 0) {
            ready.add(nodeId);
            state.status = "ready";
        } else {
            pending.add(nodeId);
        }

        nodeStates.set(nodeId, state);
    }

    return {
        pending,
        ready,
        executing: new Set(),
        completed: new Set(),
        failed: new Set(),
        skipped: new Set(),
        nodeStates
    };
}

/**
 * Get nodes that are ready for execution.
 */
export function getReadyNodes(state: ExecutionQueueState, maxConcurrent: number): string[] {
    const available = maxConcurrent - state.executing.size;
    if (available <= 0) return [];
    return [...state.ready].slice(0, available);
}

/**
 * Mark nodes as executing.
 */
export function markExecuting(state: ExecutionQueueState, nodeIds: string[]): ExecutionQueueState {
    const newState = cloneQueueState(state);

    for (const nodeId of nodeIds) {
        newState.ready.delete(nodeId);
        newState.executing.add(nodeId);

        const nodeState = newState.nodeStates.get(nodeId);
        if (nodeState) {
            nodeState.status = "executing";
            nodeState.startedAt = Date.now();
        }
    }

    return newState;
}

/**
 * Mark a node as completed and update dependents.
 */
export function markCompleted(
    state: ExecutionQueueState,
    nodeId: string,
    output: JsonObject,
    workflow: BuiltWorkflow
): ExecutionQueueState {
    const newState = cloneQueueState(state);

    newState.executing.delete(nodeId);
    newState.completed.add(nodeId);

    const nodeState = newState.nodeStates.get(nodeId);
    if (nodeState) {
        nodeState.status = "completed";
        nodeState.completedAt = Date.now();
        nodeState.output = output;
    }

    const node = workflow.nodes.get(nodeId);
    if (node) {
        for (const dependentId of node.dependents) {
            if (checkNodeReady(newState, dependentId, workflow)) {
                newState.pending.delete(dependentId);
                newState.ready.add(dependentId);

                const depState = newState.nodeStates.get(dependentId);
                if (depState) {
                    depState.status = "ready";
                }
            }
        }
    }

    return newState;
}

/**
 * Mark a node as failed.
 */
export function markFailed(
    state: ExecutionQueueState,
    nodeId: string,
    error: string,
    workflow: BuiltWorkflow
): ExecutionQueueState {
    const newState = cloneQueueState(state);

    newState.executing.delete(nodeId);
    newState.failed.add(nodeId);

    const nodeState = newState.nodeStates.get(nodeId);
    if (nodeState) {
        nodeState.status = "failed";
        nodeState.completedAt = Date.now();
        nodeState.error = error;
    }

    markDependentsSkipped(newState, nodeId, workflow);
    return newState;
}

/**
 * Mark a node as skipped.
 */
export function markSkipped(
    state: ExecutionQueueState,
    nodeId: string,
    workflow: BuiltWorkflow
): ExecutionQueueState {
    const newState = cloneQueueState(state);

    newState.pending.delete(nodeId);
    newState.ready.delete(nodeId);
    newState.skipped.add(nodeId);

    const nodeState = newState.nodeStates.get(nodeId);
    if (nodeState) {
        nodeState.status = "skipped";
    }

    markDependentsSkipped(newState, nodeId, workflow);
    return newState;
}

/**
 * Mark a node for retry.
 */
export function markRetry(state: ExecutionQueueState, nodeId: string): ExecutionQueueState {
    const newState = cloneQueueState(state);

    newState.executing.delete(nodeId);
    newState.failed.delete(nodeId);
    newState.ready.add(nodeId);

    const nodeState = newState.nodeStates.get(nodeId);
    if (nodeState) {
        nodeState.status = "ready";
        nodeState.retryCount++;
        nodeState.error = undefined;
        nodeState.startedAt = undefined;
        nodeState.completedAt = undefined;
    }

    return newState;
}

/**
 * Check if execution is complete.
 */
export function isExecutionComplete(state: ExecutionQueueState): boolean {
    return state.pending.size === 0 && state.ready.size === 0 && state.executing.size === 0;
}

/**
 * Check if execution can continue.
 */
export function canContinue(state: ExecutionQueueState): boolean {
    return state.ready.size > 0 || state.executing.size > 0;
}

/**
 * Get execution summary.
 */
export function getExecutionSummary(state: ExecutionQueueState): {
    pending: number;
    ready: number;
    executing: number;
    completed: number;
    failed: number;
    skipped: number;
    total: number;
} {
    return {
        pending: state.pending.size,
        ready: state.ready.size,
        executing: state.executing.size,
        completed: state.completed.size,
        failed: state.failed.size,
        skipped: state.skipped.size,
        total: state.nodeStates.size
    };
}

/**
 * Get execution progress as percentage.
 */
export function getExecutionProgress(state: ExecutionQueueState): number {
    const total = state.nodeStates.size;
    if (total === 0) return 100;

    const processed = state.completed.size + state.failed.size + state.skipped.size;
    return Math.round((processed / total) * 100);
}

/**
 * Get node state by ID.
 */
export function getNodeState(
    state: ExecutionQueueState,
    nodeId: string
): NodeExecutionState | undefined {
    return state.nodeStates.get(nodeId);
}

/**
 * Get all nodes with a specific status.
 */
export function getNodesByStatus(
    state: ExecutionQueueState,
    status: NodeExecutionStatus
): string[] {
    const result: string[] = [];
    for (const [nodeId, nodeState] of state.nodeStates) {
        if (nodeState.status === status) {
            result.push(nodeId);
        }
    }
    return result;
}

/**
 * Reset a node for loop iteration.
 */
export function resetNodeForIteration(
    state: ExecutionQueueState,
    nodeId: string
): ExecutionQueueState {
    const newState = cloneQueueState(state);

    newState.completed.delete(nodeId);
    newState.failed.delete(nodeId);
    newState.skipped.delete(nodeId);
    newState.executing.delete(nodeId);
    newState.ready.delete(nodeId);
    newState.pending.add(nodeId);

    const nodeState = newState.nodeStates.get(nodeId);
    if (nodeState) {
        nodeState.status = "pending";
        nodeState.output = undefined;
        nodeState.error = undefined;
        nodeState.startedAt = undefined;
        nodeState.completedAt = undefined;
    }

    return newState;
}

/**
 * Reset multiple nodes for loop iteration.
 */
export function resetNodesForIteration(
    state: ExecutionQueueState,
    nodeIds: string[]
): ExecutionQueueState {
    let newState = state;
    for (const nodeId of nodeIds) {
        newState = resetNodeForIteration(newState, nodeId);
    }
    return newState;
}

// ============================================================================
// INTERNAL HELPERS - Context
// ============================================================================

function parsePath(path: string): string[] {
    return path
        .replace(/\[(\w+)\]/g, ".$1")
        .replace(/\['([^']+)'\]/g, ".$1")
        .replace(/\["([^"]+)"\]/g, ".$1")
        .split(".")
        .filter((s) => s !== "");
}

function navigatePath(value: JsonValue, path: string[]): JsonValue | undefined {
    let current: JsonValue = value;

    for (const segment of path) {
        if (current === null || current === undefined) return undefined;
        if (typeof current !== "object") return undefined;

        if (Array.isArray(current)) {
            const index = parseInt(segment, 10);
            if (isNaN(index) || index < 0 || index >= current.length) return undefined;
            current = current[index];
        } else {
            current = (current as Record<string, JsonValue>)[segment];
        }
    }

    return current;
}

function resolveLoopPath(path: string[], loopState: LoopIterationState): JsonValue | undefined {
    if (path.length === 0) return undefined;

    const key = path[0];
    let value: JsonValue | undefined;

    switch (key) {
        case "index":
            value = loopState.index;
            break;
        case "iteration":
            value = loopState.index + 1;
            break;
        case "item":
            value = loopState.item;
            break;
        case "total":
            value = loopState.total;
            break;
        case "results":
            value = loopState.results;
            break;
        default:
            return undefined;
    }

    if (value === undefined) return undefined;
    return path.length > 1 ? navigatePath(value, path.slice(1)) : value;
}

function resolveParallelPath(
    path: string[],
    parallelState: ParallelBranchState
): JsonValue | undefined {
    if (path.length === 0) return undefined;

    const key = path[0];
    let value: JsonValue | undefined;

    switch (key) {
        case "index":
            value = parallelState.index;
            break;
        case "currentItem":
            value = parallelState.currentItem;
            break;
        case "branchId":
            value = parallelState.branchId;
            break;
        default:
            return undefined;
    }

    if (value === undefined) return undefined;
    return path.length > 1 ? navigatePath(value, path.slice(1)) : value;
}

function estimateSize(value: JsonValue): number {
    return JSON.stringify(value).length * 2;
}

function truncateOutput(output: JsonObject, maxBytes: number): JsonObject {
    const stringified = JSON.stringify(output);
    if (stringified.length * 2 <= maxBytes) return output;

    return {
        __truncated: true,
        __originalSize: stringified.length * 2,
        __preview: stringified.substring(0, 1000)
    };
}

function pruneContext(context: ContextSnapshot, config: ContextStorageConfig): ContextSnapshot {
    const newContext = cloneContext(context);
    const outputs = [...newContext.nodeOutputs.entries()];
    const toRemove = outputs.length - config.retainLastN;

    if (toRemove <= 0) return newContext;

    for (let i = 0; i < toRemove; i++) {
        const [nodeId, output] = outputs[i];
        newContext.nodeOutputs.delete(nodeId);
        newContext.metadata.totalSizeBytes -= estimateSize(output);
    }

    return newContext;
}

function cloneContext(context: ContextSnapshot): ContextSnapshot {
    return {
        nodeOutputs: new Map(context.nodeOutputs),
        workflowVariables: new Map(context.workflowVariables),
        sharedMemory: cloneSharedMemoryState(context.sharedMemory),
        inputs: { ...context.inputs },
        metadata: { ...context.metadata }
    };
}

/**
 * Clone shared memory state for immutability.
 */
function cloneSharedMemoryState(state: SharedMemoryState): SharedMemoryState {
    return {
        entries: new Map(state.entries),
        config: { ...state.config },
        metadata: { ...state.metadata }
    };
}

/**
 * Calculate cosine similarity between two vectors.
 */
function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
}

/**
 * Detect the type of a JSON value.
 */
function detectValueType(value: JsonValue): "string" | "number" | "boolean" | "json" {
    if (typeof value === "string") return "string";
    if (typeof value === "number") return "number";
    if (typeof value === "boolean") return "boolean";
    return "json";
}

// ============================================================================
// INTERNAL HELPERS - Expression Parsing
// ============================================================================

/**
 * Token types for expression parsing.
 */
type TokenType =
    | "VARIABLE" // Variable path like "input.id" or "user.name"
    | "STRING" // String literal like "default" or 'value'
    | "NUMBER" // Number literal like 123 or 45.67
    | "BOOLEAN" // true or false
    | "NULL" // null
    | "OR" // ||
    | "AND" // &&
    | "NOT" // !
    | "EQ" // ==
    | "NEQ" // !=
    | "GT" // >
    | "GTE" // >=
    | "LT" // <
    | "LTE" // <=
    | "QUESTION" // ?
    | "COLON" // :
    | "LPAREN" // (
    | "RPAREN"; // )

interface Token {
    type: TokenType;
    value: string;
}

/**
 * AST node types for expression parsing.
 */
type ExpressionNode =
    | { type: "literal"; value: JsonValue }
    | { type: "variable"; path: string }
    | { type: "unary"; operator: "!"; operand: ExpressionNode }
    | { type: "binary"; operator: string; left: ExpressionNode; right: ExpressionNode }
    | {
          type: "ternary";
          condition: ExpressionNode;
          consequent: ExpressionNode;
          alternate: ExpressionNode;
      };

/**
 * Check if a string contains expression operators.
 */
function isExpression(content: string): boolean {
    // Check for operators, but be careful not to match inside quoted strings
    let inString = false;
    let stringChar = "";

    for (let i = 0; i < content.length; i++) {
        const char = content[i];

        if (!inString && (char === '"' || char === "'")) {
            inString = true;
            stringChar = char;
        } else if (inString && char === stringChar && content[i - 1] !== "\\") {
            inString = false;
        } else if (!inString) {
            // Check for operators
            const remaining = content.slice(i);
            if (
                remaining.startsWith("||") ||
                remaining.startsWith("&&") ||
                remaining.startsWith("==") ||
                remaining.startsWith("!=") ||
                remaining.startsWith(">=") ||
                remaining.startsWith("<=") ||
                remaining.startsWith("?") ||
                char === "!" ||
                char === ">" ||
                char === "<"
            ) {
                // Make sure it's not part of a variable path
                // ! at start could be negation, > < could be comparisons
                if (char === "!" && i === 0) return true;
                if (char === ">" || char === "<") return true;
                if (remaining.startsWith("||") || remaining.startsWith("&&")) return true;
                if (remaining.startsWith("==") || remaining.startsWith("!=")) return true;
                if (remaining.startsWith(">=") || remaining.startsWith("<=")) return true;
                if (remaining.startsWith("?")) return true;
            }
        }
    }

    return false;
}

/**
 * Tokenize an expression string.
 */
function tokenize(expr: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;

    while (i < expr.length) {
        // Skip whitespace
        if (/\s/.test(expr[i])) {
            i++;
            continue;
        }

        // Two-character operators
        const twoChar = expr.slice(i, i + 2);
        if (twoChar === "||") {
            tokens.push({ type: "OR", value: "||" });
            i += 2;
            continue;
        }
        if (twoChar === "&&") {
            tokens.push({ type: "AND", value: "&&" });
            i += 2;
            continue;
        }
        if (twoChar === "==") {
            tokens.push({ type: "EQ", value: "==" });
            i += 2;
            continue;
        }
        if (twoChar === "!=") {
            tokens.push({ type: "NEQ", value: "!=" });
            i += 2;
            continue;
        }
        if (twoChar === ">=") {
            tokens.push({ type: "GTE", value: ">=" });
            i += 2;
            continue;
        }
        if (twoChar === "<=") {
            tokens.push({ type: "LTE", value: "<=" });
            i += 2;
            continue;
        }

        // Single-character operators
        if (expr[i] === ">") {
            tokens.push({ type: "GT", value: ">" });
            i++;
            continue;
        }
        if (expr[i] === "<") {
            tokens.push({ type: "LT", value: "<" });
            i++;
            continue;
        }
        if (expr[i] === "!") {
            tokens.push({ type: "NOT", value: "!" });
            i++;
            continue;
        }
        if (expr[i] === "?") {
            tokens.push({ type: "QUESTION", value: "?" });
            i++;
            continue;
        }
        if (expr[i] === ":") {
            tokens.push({ type: "COLON", value: ":" });
            i++;
            continue;
        }
        if (expr[i] === "(") {
            tokens.push({ type: "LPAREN", value: "(" });
            i++;
            continue;
        }
        if (expr[i] === ")") {
            tokens.push({ type: "RPAREN", value: ")" });
            i++;
            continue;
        }

        // String literals (double or single quotes)
        if (expr[i] === '"' || expr[i] === "'") {
            const quote = expr[i];
            let str = "";
            i++; // Skip opening quote
            while (i < expr.length && expr[i] !== quote) {
                if (expr[i] === "\\" && i + 1 < expr.length) {
                    // Handle escape sequences
                    i++;
                    if (expr[i] === "n") str += "\n";
                    else if (expr[i] === "t") str += "\t";
                    else if (expr[i] === "r") str += "\r";
                    else str += expr[i];
                } else {
                    str += expr[i];
                }
                i++;
            }
            i++; // Skip closing quote
            tokens.push({ type: "STRING", value: str });
            continue;
        }

        // Numbers
        if (/[0-9]/.test(expr[i]) || (expr[i] === "-" && /[0-9]/.test(expr[i + 1] || ""))) {
            let num = "";
            if (expr[i] === "-") {
                num = "-";
                i++;
            }
            while (i < expr.length && /[0-9.]/.test(expr[i])) {
                num += expr[i];
                i++;
            }
            tokens.push({ type: "NUMBER", value: num });
            continue;
        }

        // Keywords and variable paths
        if (/[a-zA-Z_$]/.test(expr[i])) {
            let identifier = "";
            while (i < expr.length && /[a-zA-Z0-9_$.[\]'"]/.test(expr[i])) {
                // Handle bracket notation
                if (expr[i] === "[") {
                    identifier += expr[i];
                    i++;
                    // Consume everything until closing bracket
                    while (i < expr.length && expr[i] !== "]") {
                        identifier += expr[i];
                        i++;
                    }
                    if (expr[i] === "]") {
                        identifier += expr[i];
                        i++;
                    }
                    continue;
                }
                identifier += expr[i];
                i++;
            }

            // Check for keywords
            if (identifier === "true") {
                tokens.push({ type: "BOOLEAN", value: "true" });
            } else if (identifier === "false") {
                tokens.push({ type: "BOOLEAN", value: "false" });
            } else if (identifier === "null") {
                tokens.push({ type: "NULL", value: "null" });
            } else {
                tokens.push({ type: "VARIABLE", value: identifier });
            }
            continue;
        }

        // Unknown character - skip it
        i++;
    }

    return tokens;
}

/**
 * Parse tokens into an AST.
 * Precedence (lowest to highest):
 * 1. Ternary (? :)
 * 2. OR (||)
 * 3. AND (&&)
 * 4. Comparison (==, !=, >, <, >=, <=)
 * 5. Unary (!)
 * 6. Primary (literals, variables, parentheses)
 */
function parseExpression(tokens: Token[]): ExpressionNode | null {
    let pos = 0;

    function current(): Token | undefined {
        return tokens[pos];
    }

    function advance(): Token | undefined {
        return tokens[pos++];
    }

    function match(...types: TokenType[]): boolean {
        const token = current();
        return token !== undefined && types.includes(token.type);
    }

    // Parse ternary (lowest precedence)
    function parseTernary(): ExpressionNode | null {
        const condition = parseOr();
        if (!condition) return null;

        if (match("QUESTION")) {
            advance(); // consume ?
            const consequent = parseTernary();
            if (!consequent) return null;

            if (!match("COLON")) return null;
            advance(); // consume :

            const alternate = parseTernary();
            if (!alternate) return null;

            return { type: "ternary", condition, consequent, alternate };
        }

        return condition;
    }

    // Parse OR
    function parseOr(): ExpressionNode | null {
        let left = parseAnd();
        if (!left) return null;

        while (match("OR")) {
            advance();
            const right = parseAnd();
            if (!right) return null;
            left = { type: "binary", operator: "||", left, right };
        }

        return left;
    }

    // Parse AND
    function parseAnd(): ExpressionNode | null {
        let left = parseComparison();
        if (!left) return null;

        while (match("AND")) {
            advance();
            const right = parseComparison();
            if (!right) return null;
            left = { type: "binary", operator: "&&", left, right };
        }

        return left;
    }

    // Parse comparison
    function parseComparison(): ExpressionNode | null {
        let left = parseUnary();
        if (!left) return null;

        while (match("EQ", "NEQ", "GT", "GTE", "LT", "LTE")) {
            const op = advance()!.value;
            const right = parseUnary();
            if (!right) return null;
            left = { type: "binary", operator: op, left, right };
        }

        return left;
    }

    // Parse unary
    function parseUnary(): ExpressionNode | null {
        if (match("NOT")) {
            advance();
            const operand = parseUnary();
            if (!operand) return null;
            return { type: "unary", operator: "!", operand };
        }

        return parsePrimary();
    }

    // Parse primary (literals, variables, parentheses)
    function parsePrimary(): ExpressionNode | null {
        const token = current();
        if (!token) return null;

        if (token.type === "LPAREN") {
            advance();
            const expr = parseTernary();
            if (match("RPAREN")) advance();
            return expr;
        }

        if (token.type === "STRING") {
            advance();
            return { type: "literal", value: token.value };
        }

        if (token.type === "NUMBER") {
            advance();
            const num = parseFloat(token.value);
            return { type: "literal", value: isNaN(num) ? 0 : num };
        }

        if (token.type === "BOOLEAN") {
            advance();
            return { type: "literal", value: token.value === "true" };
        }

        if (token.type === "NULL") {
            advance();
            return { type: "literal", value: null };
        }

        if (token.type === "VARIABLE") {
            advance();
            return { type: "variable", path: token.value };
        }

        return null;
    }

    return parseTernary();
}

/**
 * Evaluate an expression AST.
 */
function evaluateExpression(
    node: ExpressionNode,
    context: ContextSnapshot,
    loopState?: LoopIterationState,
    parallelState?: ParallelBranchState
): JsonValue {
    switch (node.type) {
        case "literal":
            return node.value;

        case "variable": {
            // Resolve the variable path
            const resolution = resolveVariablePath(context, node.path, loopState, parallelState);
            return resolution?.value ?? null;
        }

        case "unary": {
            const operand = evaluateExpression(node.operand, context, loopState, parallelState);
            if (node.operator === "!") {
                return !isTruthy(operand);
            }
            return null;
        }

        case "binary": {
            const left = evaluateExpression(node.left, context, loopState, parallelState);

            // Short-circuit evaluation for || and &&
            if (node.operator === "||") {
                // Return left if it's not null/undefined, otherwise return right
                if (left !== null && left !== undefined) {
                    return left;
                }
                return evaluateExpression(node.right, context, loopState, parallelState);
            }

            if (node.operator === "&&") {
                // Return left if it's falsy, otherwise return right
                if (!isTruthy(left)) {
                    return left;
                }
                return evaluateExpression(node.right, context, loopState, parallelState);
            }

            // For comparison operators, evaluate both sides
            const right = evaluateExpression(node.right, context, loopState, parallelState);

            switch (node.operator) {
                case "==":
                    return looseEquals(left, right);
                case "!=":
                    return !looseEquals(left, right);
                case ">":
                    return toNumber(left) > toNumber(right);
                case ">=":
                    return toNumber(left) >= toNumber(right);
                case "<":
                    return toNumber(left) < toNumber(right);
                case "<=":
                    return toNumber(left) <= toNumber(right);
                default:
                    return null;
            }
        }

        case "ternary": {
            const condition = evaluateExpression(node.condition, context, loopState, parallelState);
            if (isTruthy(condition)) {
                return evaluateExpression(node.consequent, context, loopState, parallelState);
            }
            return evaluateExpression(node.alternate, context, loopState, parallelState);
        }

        default:
            return null;
    }
}

/**
 * Check if a value is truthy (JavaScript-like truthiness).
 */
function isTruthy(value: JsonValue): boolean {
    if (value === null || value === undefined) return false;
    if (value === false) return false;
    if (value === 0) return false;
    if (value === "") return false;
    return true;
}

/**
 * Loose equality comparison (like JavaScript ==).
 */
function looseEquals(a: JsonValue, b: JsonValue): boolean {
    // Handle null/undefined
    if (a === null || a === undefined) {
        return b === null || b === undefined;
    }
    if (b === null || b === undefined) {
        return false;
    }

    // Same type comparison
    if (typeof a === typeof b) {
        if (typeof a === "object") {
            return JSON.stringify(a) === JSON.stringify(b);
        }
        return a === b;
    }

    // Type coercion for number/string comparison
    if (typeof a === "number" && typeof b === "string") {
        return a === parseFloat(b);
    }
    if (typeof a === "string" && typeof b === "number") {
        return parseFloat(a) === b;
    }

    return false;
}

/**
 * Convert a value to a number for comparison.
 */
function toNumber(value: JsonValue): number {
    if (typeof value === "number") return value;
    if (typeof value === "string") {
        const num = parseFloat(value);
        return isNaN(num) ? 0 : num;
    }
    if (typeof value === "boolean") return value ? 1 : 0;
    return 0;
}

/**
 * Resolve a simple variable path (no expressions).
 * This is the original resolveVariable logic extracted for reuse.
 */
function resolveVariablePath(
    context: ContextSnapshot,
    path: string,
    loopState?: LoopIterationState,
    parallelState?: ParallelBranchState
): VariableResolution | null {
    const cleanPath = path.replace(/^\{\{|\}\}$/g, "").trim();
    const parts = parsePath(cleanPath);

    if (parts.length === 0) return null;

    const rootKey = parts[0];
    const remainingPath = parts.slice(1);

    // Check loop context
    if (rootKey === "loop" && loopState) {
        const value = resolveLoopPath(remainingPath, loopState);
        if (value !== undefined) {
            return { value, source: "loop", path: cleanPath };
        }
    }

    // Check parallel context
    if (rootKey === "parallel" && parallelState) {
        const value = resolveParallelPath(remainingPath, parallelState);
        if (value !== undefined) {
            return { value, source: "parallel", path: cleanPath };
        }
    }

    // Check shared memory context
    if (rootKey === "shared" && remainingPath.length > 0) {
        const sharedKey = remainingPath[0];
        const sharedValue = getSharedMemoryValue(context, sharedKey);
        if (sharedValue !== undefined) {
            const finalValue =
                remainingPath.length > 1
                    ? navigatePath(sharedValue, remainingPath.slice(1))
                    : sharedValue;
            if (finalValue !== undefined) {
                return { value: finalValue, source: "shared", path: cleanPath };
            }
        }
    }

    // Try workflow variables
    if (context.workflowVariables.has(rootKey)) {
        const rootValue = context.workflowVariables.get(rootKey)!;
        const value = navigatePath(rootValue, remainingPath);
        if (value !== undefined) {
            return { value, source: "workflowVariable", path: cleanPath };
        }
    }

    // Try node outputs
    if (context.nodeOutputs.has(rootKey)) {
        const nodeOutput = context.nodeOutputs.get(rootKey)!;
        const value = navigatePath(nodeOutput, remainingPath);
        if (value !== undefined) {
            return { value, source: "nodeOutput", path: cleanPath };
        }
    }

    // Try inputs
    const inputValue = navigatePath(context.inputs, parts);
    if (inputValue !== undefined) {
        return { value: inputValue, source: "input", path: cleanPath };
    }

    return null;
}

// ============================================================================
// INTERNAL HELPERS - Queue
// ============================================================================

function checkNodeReady(
    state: ExecutionQueueState,
    nodeId: string,
    workflow: BuiltWorkflow
): boolean {
    const node = workflow.nodes.get(nodeId);
    if (!node) return false;

    if (
        state.completed.has(nodeId) ||
        state.failed.has(nodeId) ||
        state.skipped.has(nodeId) ||
        state.executing.has(nodeId) ||
        state.ready.has(nodeId)
    ) {
        return false;
    }

    if (node.dependencies.length > 1) {
        const hasCompletedDep = node.dependencies.some((d) => state.completed.has(d));
        const allDepsProcessed = node.dependencies.every(
            (d) => state.completed.has(d) || state.failed.has(d) || state.skipped.has(d)
        );
        return allDepsProcessed && hasCompletedDep;
    }

    return node.dependencies.every((depId) => state.completed.has(depId));
}

function markDependentsSkipped(
    state: ExecutionQueueState,
    nodeId: string,
    workflow: BuiltWorkflow
): void {
    const node = workflow.nodes.get(nodeId);
    if (!node) return;

    for (const dependentId of node.dependents) {
        const dependent = workflow.nodes.get(dependentId);
        if (!dependent) continue;

        if (
            state.completed.has(dependentId) ||
            state.failed.has(dependentId) ||
            state.skipped.has(dependentId)
        ) {
            continue;
        }

        const allDepsFailed = dependent.dependencies.every(
            (d) => state.failed.has(d) || state.skipped.has(d)
        );

        if (allDepsFailed && dependent.dependencies.length > 0) {
            state.pending.delete(dependentId);
            state.ready.delete(dependentId);
            state.skipped.add(dependentId);

            const depState = state.nodeStates.get(dependentId);
            if (depState) {
                depState.status = "skipped";
            }

            markDependentsSkipped(state, dependentId, workflow);
        }
    }
}

function cloneQueueState(state: ExecutionQueueState): ExecutionQueueState {
    return {
        pending: new Set(state.pending),
        ready: new Set(state.ready),
        executing: new Set(state.executing),
        completed: new Set(state.completed),
        failed: new Set(state.failed),
        skipped: new Set(state.skipped),
        nodeStates: new Map([...state.nodeStates].map(([k, v]) => [k, { ...v }]))
    };
}
