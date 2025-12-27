import type { JsonObject, WorkflowDefinition } from "@flowmaestro/shared";

/**
 * Handle types for edges - determines how the edge is activated
 */
export type EdgeHandleType = "source" | "error" | "condition" | "router" | "loop";

/**
 * Loop sentinel types - marks start/end of loop iterations
 */
export type LoopSentinel = "START" | "END";

/**
 * An executable node with computed dependencies and execution metadata.
 * This is the result of processing a WorkflowNode through the construction pipeline.
 */
export interface ExecutableNode {
    /** Unique node identifier */
    id: string;

    /** Node type (e.g., "llm", "http", "conditional", "loop") */
    type: string;

    /** Original node name from the workflow definition */
    name: string;

    /** Node configuration (model, URL, condition, etc.) */
    config: JsonObject;

    /** Node position for visualization */
    position: { x: number; y: number };

    /** IDs of nodes that must complete before this node can execute */
    dependencies: string[];

    /** IDs of nodes that depend on this node's output */
    dependents: string[];

    /** Type of handle for the primary output edge */
    handleType?: EdgeHandleType;

    /** Loop context if this node is inside a loop */
    loopContext?: {
        /** ID of the parent loop node */
        parentLoopId: string;
        /** Whether this is a loop sentinel node */
        sentinel?: LoopSentinel;
    };

    /** Parallel context if this node is inside a parallel block */
    parallelContext?: {
        /** ID of the parent parallel node */
        parentParallelId: string;
        /** Branch index within the parallel execution */
        branchIndex?: number;
    };

    /** Whether this node has an error output port */
    hasErrorPort: boolean;

    /** Whether this node is a terminal node (ends a branch) */
    isTerminal: boolean;
}

/**
 * Edge with resolved handle type and validation.
 */
export interface ExecutableEdge {
    /** Unique edge identifier */
    id: string;

    /** Source node ID */
    source: string;

    /** Target node ID */
    target: string;

    /** Handle type (determines when this edge activates) */
    handleType: EdgeHandleType;

    /** Original source handle from the workflow definition */
    sourceHandle?: string;

    /** Condition value for conditional edges (e.g., "true", "false", "default") */
    conditionValue?: string;

    /** Router path for router edges */
    routerPath?: string;
}

/**
 * Loop boundary information for orchestrating loop execution.
 */
export interface LoopBoundary {
    /** ID of the loop node */
    loopNodeId: string;

    /** ID of the synthetic START sentinel node */
    startSentinelId: string;

    /** ID of the synthetic END sentinel node */
    endSentinelId: string;

    /** IDs of all nodes inside the loop body */
    bodyNodeIds: string[];

    /** Loop type (for, forEach, while, doWhile) */
    loopType: "for" | "forEach" | "while" | "doWhile";

    /** Loop configuration */
    loopConfig: {
        /** Number of iterations (for "for" loops) */
        count?: number;
        /** Source array expression (for "forEach" loops) */
        sourceArray?: string;
        /** Condition expression (for "while"/"doWhile" loops) */
        condition?: string;
    };
}

/**
 * Parallel block information for orchestrating parallel execution.
 */
export interface ParallelBoundary {
    /** ID of the parallel node */
    parallelNodeId: string;

    /** Branch definitions */
    branches: Array<{
        /** Branch index */
        index: number;
        /** Node IDs in this branch */
        nodeIds: string[];
        /** First node in the branch */
        startNodeId: string;
        /** Last node in the branch */
        endNodeId: string;
    }>;

    /** Aggregation strategy for combining branch outputs */
    aggregation: "all" | "first" | "race";
}

/**
 * The complete execution plan built by the 4-stage construction pipeline.
 * This is the input to the workflow executor.
 */
export interface ExecutionPlan {
    /** All executable nodes indexed by ID */
    nodes: Map<string, ExecutableNode>;

    /** All executable edges */
    edges: ExecutableEdge[];

    /** IDs of nodes with no dependencies (execution entry points) */
    startNodes: string[];

    /** Nodes grouped by execution level (for parallel batch execution) */
    executionLevels: string[][];

    /** Loop boundaries for orchestrating loop execution */
    loopBoundaries: Map<string, LoopBoundary>;

    /** Parallel boundaries for orchestrating parallel execution */
    parallelBoundaries: Map<string, ParallelBoundary>;

    /** Original workflow definition */
    definition: WorkflowDefinition;

    /** Total number of executable nodes */
    nodeCount: number;

    /** Validation warnings (non-fatal issues) */
    warnings: string[];
}

/**
 * Context passed through the construction pipeline stages.
 */
export interface ConstructionContext {
    /** Original workflow definition */
    definition: WorkflowDefinition;

    /** Nodes being built (mutable during construction) */
    nodes: Map<string, ExecutableNode>;

    /** Edges being built (mutable during construction) */
    edges: ExecutableEdge[];

    /** Loop boundaries discovered during construction */
    loopBoundaries: Map<string, LoopBoundary>;

    /** Parallel boundaries discovered during construction */
    parallelBoundaries: Map<string, ParallelBoundary>;

    /** Warnings accumulated during construction */
    warnings: string[];
}

/**
 * Result of the PathConstructor stage - reachable nodes from entry point.
 */
export interface ReachabilityResult {
    /** IDs of reachable nodes */
    reachableNodeIds: Set<string>;

    /** IDs of unreachable nodes (for warnings) */
    unreachableNodeIds: Set<string>;

    /** Entry point node ID */
    entryPointId: string;
}

/**
 * Options for building an execution plan.
 */
export interface BuildOptions {
    /** Whether to include unreachable nodes in the plan */
    includeUnreachable?: boolean;

    /** Whether to validate node configurations */
    validateConfigs?: boolean;

    /** Maximum depth for loop nesting */
    maxLoopDepth?: number;

    /** Maximum number of parallel branches */
    maxParallelBranches?: number;
}

/**
 * Node type categories for handler routing.
 */
export type NodeCategory =
    | "llm"
    | "http"
    | "transform"
    | "logic"
    | "integration"
    | "control-flow"
    | "agent"
    | "input-output"
    | "generic";

/**
 * Mapping of node types to their categories.
 */
export const NODE_TYPE_CATEGORIES: Record<string, NodeCategory> = {
    // LLM nodes
    llm: "llm",
    chat: "llm",
    completion: "llm",
    vision: "llm",
    audio: "llm",
    embeddings: "llm",

    // HTTP nodes
    http: "http",
    webhook: "http",
    "api-call": "http",

    // Transform nodes
    transform: "transform",
    code: "transform",
    jsonata: "transform",
    template: "transform",
    extract: "transform",

    // Logic nodes
    conditional: "logic",
    switch: "logic",
    router: "logic",
    filter: "logic",
    merge: "logic",

    // Integration nodes
    integration: "integration",
    database: "integration",
    "knowledge-base": "integration",
    email: "integration",
    slack: "integration",
    salesforce: "integration",

    // Control flow nodes
    loop: "control-flow",
    forEach: "control-flow",
    while: "control-flow",
    parallel: "control-flow",
    wait: "control-flow",
    pause: "control-flow",
    "human-input": "control-flow",

    // Agent nodes
    agent: "agent",
    "agent-tool": "agent",

    // Input/Output nodes
    input: "input-output",
    output: "input-output",
    variable: "input-output",
    echo: "input-output"
};

/**
 * Get the category for a node type.
 */
export function getNodeCategory(nodeType: string): NodeCategory {
    return NODE_TYPE_CATEGORIES[nodeType] || "generic";
}

/**
 * Check if a node type is a control flow node.
 */
export function isControlFlowNode(nodeType: string): boolean {
    return getNodeCategory(nodeType) === "control-flow";
}

/**
 * Check if a node type is a logic node (branching).
 */
export function isLogicNode(nodeType: string): boolean {
    return getNodeCategory(nodeType) === "logic";
}

/**
 * Check if a node type is a loop node.
 */
export function isLoopNode(nodeType: string): boolean {
    return ["loop", "forEach", "while", "doWhile"].includes(nodeType);
}

/**
 * Check if a node type is a parallel node.
 */
export function isParallelNode(nodeType: string): boolean {
    return nodeType === "parallel";
}
