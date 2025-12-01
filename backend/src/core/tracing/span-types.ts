/**
 * Observability Types for Distributed Tracing
 * Implements Mastra-inspired span-based observability
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

export enum SpanStatus {
    STARTED = "started",
    COMPLETED = "completed",
    FAILED = "failed",
    CANCELLED = "cancelled"
}

/**
 * Core span interface stored in database
 */
export interface Span {
    traceId: string;
    spanId: string;
    parentSpanId?: string;
    name: string;
    spanType: SpanType;
    entityId?: string; // workflow_id, agent_id, node_id, etc.
    startedAt: Date;
    endedAt?: Date;
    durationMs?: number;
    status: SpanStatus;
    input?: Record<string, unknown>;
    output?: Record<string, unknown>;
    error?: SpanError;
    attributes?: SpanAttributes;
    metadata?: Record<string, unknown>;
}

/**
 * Error information captured in a span
 */
export interface SpanError {
    message: string;
    type: string;
    stack?: string;
    code?: string;
}

/**
 * Span attributes for filtering and analysis
 */
export interface SpanAttributes {
    // User and context
    userId?: string;
    requestId?: string;
    sessionId?: string;

    // LLM-specific attributes
    modelId?: string;
    provider?: string;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    temperature?: number;
    maxTokens?: number;

    // Cost tracking (USD)
    inputCost?: number;
    outputCost?: number;
    totalCost?: number;

    // Tool-specific attributes
    toolName?: string;
    toolType?: string;

    // Node-specific attributes
    nodeType?: string;
    nodeId?: string;

    // HTTP-specific attributes
    httpMethod?: string;
    httpUrl?: string;
    httpStatusCode?: number;

    // Database-specific attributes
    queryType?: string;
    tableName?: string;
    rowCount?: number;

    // General attributes
    [key: string]: string | number | boolean | undefined;
}

/**
 * Input parameters for creating a new span
 */
export interface CreateSpanInput {
    traceId?: string; // If not provided, a new trace is created
    parentSpanId?: string;
    name: string;
    spanType: SpanType;
    entityId?: string;
    input?: Record<string, unknown>;
    attributes?: SpanAttributes;
    metadata?: Record<string, unknown>;
}

/**
 * Parameters for ending a span
 */
export interface EndSpanInput {
    spanId: string;
    output?: Record<string, unknown>;
    error?: Error | SpanError;
    attributes?: SpanAttributes;
}

/**
 * A trace is a collection of spans representing a complete execution
 */
export interface Trace {
    traceId: string;
    rootSpan: Span;
    spans: Span[];
    startedAt: Date;
    endedAt?: Date;
    durationMs?: number;
    status: SpanStatus;
}

/**
 * Filters for querying spans
 */
export interface SpanFilters {
    traceId?: string;
    spanType?: SpanType | SpanType[];
    entityId?: string;
    userId?: string;
    status?: SpanStatus;
    dateRange?: {
        start?: Date;
        end?: Date;
    };
}

/**
 * Pagination options for span queries
 */
export interface PaginationOptions {
    page: number;
    perPage: number;
}

/**
 * Paginated result for span queries
 */
export interface PaginatedSpans {
    spans: Span[];
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
}

/**
 * Active span context for propagation
 */
export interface SpanContext {
    traceId: string;
    spanId: string;
    parentSpanId?: string;
}

/**
 * Tracing context passed through execution
 */
export interface TracingContext {
    traceId: string;
    currentSpanId?: string;
    userId?: string;
    requestId?: string;
    sessionId?: string;
}
