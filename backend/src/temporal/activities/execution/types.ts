/**
 * Execution Types
 *
 * Type definitions for:
 * - Node handler system (execution signals, handler interface, metadata)
 * - Workflow builder (4-stage construction pipeline, parallel execution)
 */

import type { JsonObject, JsonValue, WorkflowEdge, WorkflowDefinition } from "@flowmaestro/shared";
import type { ContextSnapshot, LoopIterationState, ParallelBranchState } from "../../core/types";

// ============================================================================
// EXECUTION SIGNALS
// ============================================================================

/**
 * Loop metadata returned from loop handlers.
 * Used to control loop iteration behavior.
 */
export interface LoopMetadata {
    /** Whether the loop should continue to next iteration */
    shouldContinue: boolean;
    /** Current iteration index (0-based) */
    currentIndex: number;
    /** Total number of items in the loop */
    totalItems: number;
    /** Current item being processed */
    currentItem?: JsonValue;
    /** Accumulated results from all iterations */
    accumulatedResults?: JsonValue[];
    /** Whether the loop was broken early (e.g., via break condition) */
    wasBreakTriggered?: boolean;
}

/**
 * Pause context for pause/resume functionality.
 */
export interface PauseContext {
    /** Reason for the pause */
    reason: string;
    /** Node ID that triggered the pause */
    nodeId: string;
    /** When the pause was initiated */
    pausedAt: number;
    /** Expected resume trigger (manual, timeout, webhook, etc.) */
    resumeTrigger?: "manual" | "timeout" | "webhook" | "signal";
    /** Timeout in milliseconds if resumeTrigger is "timeout" */
    timeoutMs?: number;
    /** Additional data to preserve across pause */
    preservedData?: JsonObject;
}

/**
 * Signals returned from node handler execution.
 * These control workflow execution flow and behavior.
 */
export interface ExecutionSignals {
    /**
     * If true, workflow should pause after this node.
     * Requires pauseContext to be set.
     */
    pause?: boolean;

    /**
     * Context for the pause (reason, trigger conditions, etc.).
     */
    pauseContext?: PauseContext;

    /**
     * Duration in milliseconds to wait before continuing.
     * Different from pause - this is a simple delay.
     */
    waitDurationMs?: number;

    /**
     * For conditional/switch nodes: which branches to skip.
     * Array of node IDs that should not be executed.
     */
    branchesToSkip?: string[];

    /**
     * For conditional/switch nodes: the selected route/branch name.
     * Used for debugging and logging.
     */
    selectedRoute?: string;

    /**
     * Error port to activate (for error handling edges).
     * The edge with this sourceHandle should receive the error.
     */
    activateErrorPort?: string;

    /**
     * If true, this node is a terminal node (no further execution needed).
     */
    isTerminal?: boolean;

    /**
     * Loop metadata for loop nodes.
     */
    loopMetadata?: LoopMetadata;

    /**
     * Custom signals for extensibility.
     * Handlers can add their own signals here.
     */
    custom?: Record<string, JsonValue>;
}

// ============================================================================
// HANDLER INPUT/OUTPUT
// ============================================================================

/**
 * Metadata about node execution for logging and tracing.
 */
export interface NodeExecutionMetadata {
    /** Unique ID of this execution run */
    executionId: string;
    /** Workflow name for context */
    workflowName?: string;
    /** User ID for multi-tenancy */
    userId?: string;
    /** Node ID being executed */
    nodeId: string;
    /** Human-readable node name */
    nodeName?: string;
    /** Attempt number (for retries) */
    attemptNumber?: number;
    /** Max retries configured */
    maxRetries?: number;
}

/**
 * Input to a node handler.
 */
export interface NodeHandlerInput {
    /** The node type being executed */
    nodeType: string;
    /** The node's configuration */
    nodeConfig: JsonObject;
    /** Current context snapshot (immutable) */
    context: ContextSnapshot;
    /** Execution metadata for logging */
    metadata: NodeExecutionMetadata;
    /** Current loop iteration state (if in a loop) */
    loopState?: LoopIterationState;
    /** Current parallel branch state (if in parallel) */
    parallelState?: ParallelBranchState;
}

/**
 * Token usage information for LLM nodes.
 */
export interface TokenUsage {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    model?: string;
    provider?: string;
}

/**
 * Output metrics from node execution.
 */
export interface NodeExecutionMetrics {
    /** Execution duration in milliseconds */
    durationMs: number;
    /** Token usage for LLM nodes */
    tokenUsage?: TokenUsage;
    /** Number of API calls made */
    apiCallCount?: number;
    /** Data size processed (bytes) */
    dataSizeBytes?: number;
    /** Cache hit/miss info */
    cacheInfo?: {
        hit: boolean;
        key?: string;
    };
}

/**
 * Output from a node handler.
 */
export interface NodeHandlerOutput {
    /** The result data to store in context */
    result: JsonObject;
    /** Execution signals to control workflow */
    signals: ExecutionSignals;
    /** Execution metrics for logging */
    metrics?: NodeExecutionMetrics;
}

// ============================================================================
// HANDLER INTERFACE
// ============================================================================

/**
 * Node handler interface.
 * All node handlers must implement this interface.
 */
export interface NodeHandler {
    /** Handler name for debugging/logging */
    readonly name: string;

    /** Node types this handler supports (first-match-wins) */
    readonly supportedNodeTypes: readonly string[];

    /**
     * Check if this handler can handle the given node type.
     * Default implementation checks supportedNodeTypes.
     * Override for more complex matching logic.
     */
    canHandle(nodeType: string): boolean;

    /**
     * Execute the node and return output with signals.
     *
     * @param input - Node handler input
     * @returns Promise resolving to handler output
     */
    execute(input: NodeHandlerInput): Promise<NodeHandlerOutput>;
}

// ============================================================================
// HANDLER FACTORY & CATEGORIES
// ============================================================================

/**
 * Factory function signature for creating handlers.
 * Used for lazy initialization and dependency injection.
 */
export type NodeHandlerFactory = () => NodeHandler;

/**
 * Node handler categories for organization.
 * Aligned with frontend node groups in NodeLibrary.
 */
export type NodeHandlerCategory =
    | "ai" // LLM, vision, audio, embeddings, kb-query, router
    | "inputs" // input, files, url
    | "outputs" // output
    | "logic" // conditional, switch, loop, wait, wait-for-user, transform, variable, code
    | "utils" // http, database
    | "integrations" // file operations, third-party providers
    | "generic"; // Fallback handler

/**
 * Handler registration info.
 */
export interface HandlerRegistration {
    handler: NodeHandler;
    category: NodeHandlerCategory;
    priority: number; // Lower = higher priority
}

// ============================================================================
// BASE HANDLER CLASS
// ============================================================================

/**
 * Abstract base handler class.
 * Provides common implementation patterns for handlers.
 */
export abstract class BaseNodeHandler implements NodeHandler {
    abstract readonly name: string;
    abstract readonly supportedNodeTypes: readonly string[];

    canHandle(nodeType: string): boolean {
        return this.supportedNodeTypes.includes(nodeType);
    }

    abstract execute(input: NodeHandlerInput): Promise<NodeHandlerOutput>;

    /**
     * Helper to create a successful output.
     */
    protected success(
        result: JsonObject,
        signals: ExecutionSignals = {},
        metrics?: NodeExecutionMetrics
    ): NodeHandlerOutput {
        return { result, signals, metrics };
    }

    /**
     * Helper to create a terminal output (workflow should end).
     */
    protected terminal(result: JsonObject, metrics?: NodeExecutionMetrics): NodeHandlerOutput {
        return {
            result,
            signals: { isTerminal: true },
            metrics
        };
    }

    /**
     * Helper to create a pause signal.
     */
    protected pauseExecution(
        result: JsonObject,
        pauseContext: PauseContext,
        metrics?: NodeExecutionMetrics
    ): NodeHandlerOutput {
        return {
            result,
            signals: { pause: true, pauseContext },
            metrics
        };
    }

    /**
     * Helper to create a branch selection signal.
     */
    protected selectBranch(
        result: JsonObject,
        selectedRoute: string,
        branchesToSkip: string[],
        metrics?: NodeExecutionMetrics
    ): NodeHandlerOutput {
        return {
            result,
            signals: { selectedRoute, branchesToSkip },
            metrics
        };
    }
}

// ============================================================================
// WORKFLOW BUILDER TYPES
// ============================================================================

// Edge Types - Handle types for conditional/switch/loop branching

/**
 * Edge handle types for routing
 * - "default": Normal sequential flow
 * - "true"/"false": Conditional branching
 * - "loop-body": Loop iteration body
 * - "loop-exit": Loop completion exit
 * - "case-*": Switch case handles
 */
export type EdgeHandleType =
    | "default"
    | "true"
    | "false"
    | "loop-body"
    | "loop-exit"
    | "error"
    | `case-${string}`;

/**
 * Extended edge with typed handle information
 */
export interface TypedEdge extends WorkflowEdge {
    handleType: EdgeHandleType;
    priority?: number;
}

// Node Types - Extended node information for execution

/**
 * All supported node types including loop sentinels
 */
export type ExecutableNodeType =
    | "input"
    | "files"
    | "url"
    | "output"
    | "templateOutput"
    | "action"
    | "llm"
    | "http"
    | "transform"
    | "code"
    | "conditional"
    | "switch"
    | "loop"
    | "wait"
    | "variable"
    | "echo"
    | "vision"
    | "audio"
    | "embeddings"
    | "database"
    | "integration"
    | "knowledgeBaseQuery"
    | "fileOperations"
    | "pause"
    | "userInput"
    | "parallel"
    | "loop-start"
    | "loop-end";

/**
 * Loop context for nodes inside a loop
 */
export interface LoopContext {
    loopNodeId: string;
    startSentinelId: string;
    endSentinelId: string;
    bodyNodes: string[];
    iterationVariable: string;
    itemVariable?: string;
    arrayPath?: string;
    maxIterations: number;
}

/**
 * Extended node with execution metadata computed during construction
 */
export interface ExecutableNode {
    id: string;
    type: ExecutableNodeType;
    name: string;
    config: JsonObject;
    originalNodeId?: string;
    depth: number;
    dependencies: string[];
    dependents: string[];
    loopContext?: LoopContext;
    parallelBranchIndex?: number;
    parallelBranchTotal?: number;
}

// Built Workflow - Output of construction pipeline

/**
 * Complete built workflow ready for execution
 */
export interface BuiltWorkflow {
    originalDefinition: WorkflowDefinition;
    buildTimestamp: number;
    nodes: Map<string, ExecutableNode>;
    edges: Map<string, TypedEdge>;
    executionLevels: string[][];
    triggerNodeId: string;
    outputNodeIds: string[];
    loopContexts: Map<string, LoopContext>;
    maxConcurrentNodes: number;
}

// Construction Pipeline Interfaces

/**
 * Result from PathConstructor (Stage 1)
 */
export interface PathConstructorResult {
    reachableNodes: Set<string>;
    nodeDepths: Map<string, number>;
    adjacencyList: Map<string, string[]>;
    reverseAdjacencyList: Map<string, string[]>;
}

/**
 * Result from LoopConstructor (Stage 2)
 */
export interface LoopConstructorResult {
    nodes: Map<string, ExecutableNode>;
    edges: Map<string, TypedEdge>;
    loopContexts: Map<string, LoopContext>;
}

/**
 * Result from NodeConstructor (Stage 3)
 */
export interface NodeConstructorResult {
    nodes: Map<string, ExecutableNode>;
    parallelBranches: Map<string, string[]>;
}

/**
 * Result from EdgeConstructor (Stage 4)
 */
export interface EdgeConstructorResult {
    edges: Map<string, TypedEdge>;
}

// Validation Types

/**
 * Validation error from workflow building
 */
export interface BuildValidationError {
    code: string;
    message: string;
    nodeId?: string;
    edgeId?: string;
}

/**
 * Build result with validation
 */
export interface BuildResult {
    success: boolean;
    workflow?: BuiltWorkflow;
    errors?: BuildValidationError[];
    warnings?: BuildValidationError[];
}
