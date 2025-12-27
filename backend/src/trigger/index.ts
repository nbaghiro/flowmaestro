/**
 * FlowMaestro Trigger.dev Execution Engine
 *
 * This module provides workflow execution using Trigger.dev.
 * It replaces the previous Temporal-based execution engine.
 *
 * Main components:
 * - Workflow Builder: 4-stage pipeline for constructing execution plans
 * - Node Handlers: Pluggable handlers for all node types
 * - Execution Queue: Parallel batch execution management
 * - Context Manager: Node output and variable management
 * - Tasks: Trigger.dev tasks for workflow and node execution
 */

// Workflow Builder
export { buildExecutionPlan, WorkflowBuilder } from "./workflow-builder";
export type {
    ExecutableNode,
    ExecutableEdge,
    ExecutionPlan,
    LoopBoundary,
    ParallelBoundary,
    BuildOptions,
    EdgeHandleType,
    LoopSentinel
} from "./workflow-builder";

// Node Handlers
export {
    handlerRegistry,
    NodeHandlerRegistry,
    BaseNodeHandler,
    TransformHandler,
    LogicHandler,
    LLMHandler,
    HTTPHandler,
    ControlFlowHandler,
    InputOutputHandler,
    AgentHandler,
    IntegrationHandler
} from "./node-handlers";
export type {
    NodeHandler,
    NodeHandlerInput,
    NodeHandlerOutput,
    NodeSignals,
    HandlerCategory
} from "./node-handlers";

// Shared Utilities
export { ExecutionQueue } from "./shared/execution-queue";
export { ContextManager } from "./shared/context-manager";
export type { ContextSnapshot } from "./shared/context-manager";

// Tasks
export { workflowExecutor, nodeExecutor } from "./tasks";
export type {
    WorkflowExecutionPayload,
    WorkflowExecutionResult,
    NodeExecutorPayload,
    NodeExecutorResult
} from "./tasks";
