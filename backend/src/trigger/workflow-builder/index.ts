/**
 * Workflow Builder Module
 *
 * 4-stage pipeline for converting WorkflowDefinitions into ExecutionPlans.
 *
 * Pipeline stages:
 * 1. PathConstructor - BFS reachability from entry point
 * 2. LoopConstructor - Insert loop sentinel nodes
 * 3. NodeConstructor - Build executable nodes, expand parallel blocks
 * 4. EdgeConstructor - Wire edges with handle types
 *
 * Usage:
 * ```typescript
 * import { buildExecutionPlan, validateWorkflow } from "./workflow-builder";
 *
 * const plan = buildExecutionPlan(workflowDefinition);
 * console.log(`Plan has ${plan.nodeCount} nodes across ${plan.executionLevels.length} levels`);
 * ```
 */

// Main builder exports
export {
    WorkflowBuilder,
    buildExecutionPlan,
    validateWorkflow,
    getExecutionPlanSummary
} from "./builder";

// Type exports
export type {
    EdgeHandleType,
    LoopSentinel,
    ExecutableNode,
    ExecutableEdge,
    LoopBoundary,
    ParallelBoundary,
    ExecutionPlan,
    ConstructionContext,
    ReachabilityResult,
    BuildOptions,
    NodeCategory
} from "./types";

// Utility function exports
export {
    NODE_TYPE_CATEGORIES,
    getNodeCategory,
    isControlFlowNode,
    isLogicNode,
    isLoopNode,
    isParallelNode
} from "./types";

// Stage exports for advanced usage
export { PathConstructor } from "./path-constructor";
export { LoopConstructor } from "./loop-constructor";
export { NodeConstructor } from "./node-constructor";
export { EdgeConstructor } from "./edge-constructor";
