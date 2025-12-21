/**
 * Shared type definitions for Temporal activities and workflows
 */

import type { JsonObject, JsonValue } from "@flowmaestro/shared";

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

/**
 * Span types for observability
 */
export enum SpanType {
    WORKFLOW_RUN = "workflow_run",
    NODE_EXECUTION = "node_execution",
    AGENT_EXECUTION = "agent_execution",
    LLM_CALL = "llm_call",
    TOOL_CALL = "tool_call",
    HTTP_REQUEST = "http_request",
    DATABASE_QUERY = "database_query"
}

// Note: HealthCheckResult is defined in ./health.ts with more detail
// Import from there instead: import { HealthCheckResult } from "./health"

/**
 * Re-export commonly used types from shared package
 */
export type { JsonObject, JsonValue };
