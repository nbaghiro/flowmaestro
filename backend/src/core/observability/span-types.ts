/**
 * Span Types for OpenTelemetry Integration
 *
 * Type definitions for distributed tracing spans.
 */

export interface SpanContext {
    traceId: string;
    spanId: string;
    traceFlags?: number;
    parentSpanId?: string;
}

export interface WorkflowSpan {
    workflowId: string;
    executionId: string;
    spanId: string;
    parentSpanId?: string;
    startTime: number;
    endTime?: number;
    status: "running" | "completed" | "failed";
    attributes: Record<string, unknown>;
}

export interface NodeSpan {
    nodeId: string;
    nodeType: string;
    executionId: string;
    spanId: string;
    parentSpanId: string;
    startTime: number;
    endTime?: number;
    status: "running" | "completed" | "failed";
    attributes: Record<string, unknown>;
}

// SpanType as both type and const object
export type SpanType =
    | "workflow"
    | "node"
    | "activity"
    | "http_request"
    | "external_api"
    | "model_generation"
    | "embedding_generation"
    | "database_query"
    | "vector_search";

export const SpanType = {
    WORKFLOW: "workflow" as SpanType,
    NODE: "node" as SpanType,
    ACTIVITY: "activity" as SpanType,
    HTTP_REQUEST: "http_request" as SpanType,
    EXTERNAL_API: "external_api" as SpanType,
    MODEL_GENERATION: "model_generation" as SpanType,
    EMBEDDING_GENERATION: "embedding_generation" as SpanType,
    DATABASE_QUERY: "database_query" as SpanType,
    VECTOR_SEARCH: "vector_search" as SpanType
};
