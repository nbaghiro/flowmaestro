/**
 * Core Types
 *
 * Consolidated type definitions for the temporal execution engine.
 * Includes execution, context, and state types.
 */

import type { JsonObject, JsonValue } from "@flowmaestro/shared";

// ============================================================================
// RE-EXPORTS
// ============================================================================

export type { JsonObject, JsonValue };

// ============================================================================
// BASE EXECUTION TYPES
// ============================================================================

/**
 * Base configuration that all node executors receive
 */
export interface BaseNodeConfig {
    /** The type of node being executed */
    nodeType: string;
    /** Optional output variable name to store results */
    outputVariable?: string;
}

/**
 * Context passed to node executors
 */
export interface ExecutionContext {
    /** Variables accumulated during workflow execution */
    variables: Record<string, JsonValue>;
    /** The execution ID for tracking */
    executionId?: string;
    /** The user ID who initiated the execution */
    userId?: string;
    /** The workflow ID being executed */
    workflowId?: string;
}

/**
 * Result returned by node executors
 */
export interface NodeExecutorResult {
    /** Whether the execution was successful */
    success: boolean;
    /** The output data from the node */
    output?: JsonValue;
    /** Error message if execution failed */
    error?: string;
    /** Execution duration in milliseconds */
    durationMs?: number;
    /** Additional metadata about the execution */
    metadata?: Record<string, JsonValue>;
}

// ============================================================================
// NODE EXECUTION STATUS
// ============================================================================

/**
 * Node execution status
 */
export type NodeExecutionStatus =
    | "pending"
    | "ready"
    | "executing"
    | "completed"
    | "failed"
    | "skipped";

/**
 * State for a single node's execution
 */
export interface NodeExecutionState {
    nodeId: string;
    status: NodeExecutionStatus;
    startedAt?: number;
    completedAt?: number;
    error?: string;
    output?: JsonObject;
    retryCount: number;
}

/**
 * Complete execution queue state
 */
export interface ExecutionQueueState {
    /** Nodes waiting for dependencies */
    pending: Set<string>;
    /** Nodes ready to execute (all dependencies met) */
    ready: Set<string>;
    /** Nodes currently executing */
    executing: Set<string>;
    /** Successfully completed nodes */
    completed: Set<string>;
    /** Failed nodes */
    failed: Set<string>;
    /** Skipped nodes (due to branch not taken or dependency failure) */
    skipped: Set<string>;
    /** Per-node state */
    nodeStates: Map<string, NodeExecutionState>;
}

// ============================================================================
// CONTEXT MANAGER TYPES
// ============================================================================

/**
 * Configuration for context storage limits
 */
export interface ContextStorageConfig {
    /** Maximum size in bytes for a single node's output */
    maxOutputSizeBytes: number;
    /** Maximum total context size in bytes */
    maxTotalSizeBytes: number;
    /** Percentage of max size that triggers pruning (0-1) */
    pruneThreshold: number;
    /** Always retain the last N node outputs */
    retainLastN: number;
}

/**
 * Snapshot of execution context
 */
export interface ContextSnapshot {
    /** Node outputs keyed by node ID */
    nodeOutputs: Map<string, JsonObject>;
    /** User-defined workflow variables */
    workflowVariables: Map<string, JsonValue>;
    /** Shared memory state for cross-node data sharing with semantic search */
    sharedMemory: SharedMemoryState;
    /** Original workflow inputs (immutable) */
    inputs: JsonObject;
    /** Context metadata */
    metadata: {
        totalSizeBytes: number;
        nodeCount: number;
        createdAt: number;
    };
}

// ============================================================================
// SHARED MEMORY TYPES
// ============================================================================

/**
 * Configuration for shared memory storage limits
 */
export interface SharedMemoryConfig {
    /** Maximum number of entries in shared memory */
    maxEntries: number;
    /** Maximum size in bytes for a single value */
    maxValueSizeBytes: number;
    /** Maximum total size in bytes for all shared memory */
    maxTotalSizeBytes: number;
    /** Embedding model to use for semantic search */
    embeddingModel: string;
    /** Embedding dimensions (e.g., 1536 for text-embedding-3-small) */
    embeddingDimensions: number;
    /** Whether semantic search is enabled by default */
    enableSemanticSearch: boolean;
}

/**
 * A single entry in shared memory
 */
export interface SharedMemoryEntry {
    /** The key used to store this entry */
    key: string;
    /** The stored value */
    value: JsonValue;
    /** Vector embedding for semantic search (optional) */
    embedding?: number[];
    /** Entry metadata */
    metadata: {
        /** Timestamp when the entry was created */
        createdAt: number;
        /** Timestamp when the entry was last updated */
        updatedAt: number;
        /** The node ID that last wrote this entry */
        nodeId: string;
        /** Detected type of the value */
        valueType: "string" | "number" | "boolean" | "json";
        /** Size of the value in bytes */
        sizeBytes: number;
    };
}

/**
 * Complete shared memory state
 */
export interface SharedMemoryState {
    /** All entries keyed by their key name */
    entries: Map<string, SharedMemoryEntry>;
    /** Configuration for this shared memory instance */
    config: SharedMemoryConfig;
    /** Shared memory metadata */
    metadata: {
        /** Total size of all entries in bytes */
        totalSizeBytes: number;
        /** Number of entries */
        entryCount: number;
        /** Timestamp when shared memory was created */
        createdAt: number;
    };
}

/**
 * Result of resolving a variable reference
 */
export interface VariableResolution {
    /** Resolved value */
    value: JsonValue;
    /** Source of the value */
    source: "nodeOutput" | "workflowVariable" | "input" | "loop" | "parallel" | "shared";
    /** Original path that was resolved */
    path: string;
}

/**
 * Loop iteration state for context
 */
export interface LoopIterationState {
    /** Current iteration index (0-based) */
    index: number;
    /** Current item (for forEach loops) */
    item?: JsonValue;
    /** Total iterations (known for count/forEach, estimated for while) */
    total?: number;
    /** Results accumulated across iterations */
    results: JsonValue[];
}

/**
 * Parallel branch state for context
 */
export interface ParallelBranchState {
    /** Branch index */
    index: number;
    /** Current item (for collection-based parallel) */
    currentItem?: JsonValue;
    /** Branch identifier */
    branchId: string;
}

// ============================================================================
// SPAN TYPES (TRACING)
// ============================================================================

/**
 * Span types for observability
 * This is the canonical definition - workflows import from here (via workflow-safe)
 * The activities/tracing.ts re-exports this enum for convenience.
 */
export enum SpanType {
    // Workflow execution spans
    WORKFLOW_RUN = "workflow_run",
    NODE_EXECUTION = "node_execution",

    // Agent execution spans
    AGENT_RUN = "agent_run",
    AGENT_ITERATION = "agent_iteration",

    // LLM and tool spans
    MODEL_GENERATION = "model_generation",
    TOOL_EXECUTION = "tool_execution",
    TOOL_VALIDATION = "tool_validation",

    // Memory and data spans
    MEMORY_OPERATION = "memory_operation",
    VECTOR_SEARCH = "vector_search",
    EMBEDDING_GENERATION = "embedding_generation",

    // Database and external operations
    DATABASE_QUERY = "database_query",
    HTTP_REQUEST = "http_request",
    EXTERNAL_API = "external_api",

    // Processing spans
    PROCESSOR_RUN = "processor_run",
    VALIDATION = "validation"
}
