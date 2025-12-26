/**
 * Workflow-Safe Span Types
 *
 * This file contains only types and enums that can be safely imported
 * into Temporal workflows (which run in a sandboxed environment).
 *
 * DO NOT import anything that pulls in Node.js modules here.
 */

/** FlowMaestro span types */
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

/** Span context for propagation */
export interface SpanContext {
    traceId: string;
    spanId: string;
    parentSpanId?: string;
}
