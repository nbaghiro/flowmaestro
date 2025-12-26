/**
 * Span Activities for Temporal Workflows
 *
 * Activities for creating and ending spans from workflows.
 * Uses OpenTelemetry to export spans to GCP Cloud Trace.
 */

import {
    SpanType,
    startSpan,
    endSpan as otelEndSpan,
    setSpanAttributes as otelSetSpanAttributes,
    setLLMAttributes,
    type SpanContext,
    type CreateSpanInput as OTelCreateSpanInput,
    type LLMAttributes
} from "../../core/observability";
import {
    recordWorkflowExecution,
    recordWorkflowDuration,
    recordNodeExecution,
    recordNodeDuration,
    recordLLMRequest,
    recordLLMTokens,
    recordLLMDuration,
    recordLLMCost,
    recordToolExecution
} from "../../core/observability";

// Re-export SpanType and SpanContext for compatibility
export { SpanType, type SpanContext };

/** Input for creating a span (compatible with legacy API) */
export interface CreateSpanInput {
    name: string;
    spanType: SpanType;
    entityId?: string;
    parentSpanId?: string;
    traceId?: string;
    input?: Record<string, unknown>;
    attributes?: Record<string, string | number | boolean | undefined>;
    metadata?: Record<string, unknown>;
}

/** Attributes for span updates */
export type SpanAttributes = Record<string, string | number | boolean>;

/**
 * Create a new span
 */
export async function createSpan(input: CreateSpanInput): Promise<SpanContext> {
    const otelInput: OTelCreateSpanInput = {
        name: input.name,
        spanType: input.spanType,
        entityId: input.entityId,
        parentSpanId: input.parentSpanId,
        input: input.input,
        attributes: input.attributes
    };

    return startSpan(otelInput);
}

/**
 * End a span
 */
export async function endSpan(params: {
    spanId: string;
    output?: Record<string, unknown>;
    error?: Error | { message: string; type: string; stack?: string };
    attributes?: SpanAttributes;
}): Promise<void> {
    otelEndSpan(params.spanId, {
        output: params.output,
        error: params.error,
        attributes: params.attributes
    });
}

/**
 * End a span with an error
 */
export async function endSpanWithError(params: {
    spanId: string;
    error: Error | { message: string; type: string; stack?: string };
}): Promise<void> {
    otelEndSpan(params.spanId, {
        error: params.error
    });
}

/**
 * Set attributes on a span
 */
export async function setSpanAttributes(params: {
    spanId: string;
    attributes: SpanAttributes;
}): Promise<void> {
    otelSetSpanAttributes(params.spanId, params.attributes);
}

// ========================================
// Agent Tracing Helper Activities
// ========================================

/**
 * Create an agent run span
 */
export async function createAgentRunSpan(params: {
    agentId: string;
    name: string;
    userId?: string;
    sessionId?: string;
    input?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
}): Promise<SpanContext> {
    const spanContext = startSpan({
        name: params.name,
        spanType: SpanType.AGENT_RUN,
        entityId: params.agentId,
        input: params.input,
        attributes: {
            userId: params.userId,
            sessionId: params.sessionId
        }
    });

    // Record metric
    recordWorkflowExecution({
        workflowId: params.agentId,
        userId: params.userId,
        status: "started"
    });

    return spanContext;
}

/**
 * Create an agent iteration span
 */
export async function createIterationSpan(params: {
    traceId: string;
    parentSpanId: string;
    iterationNumber: number;
    input?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
}): Promise<SpanContext> {
    return startSpan({
        name: `Iteration ${params.iterationNumber}`,
        spanType: SpanType.AGENT_ITERATION,
        parentSpanId: params.parentSpanId,
        input: params.input,
        attributes: {
            iterationNumber: params.iterationNumber
        }
    });
}

/**
 * Create a tool call span
 */
export async function createToolCallSpan(params: {
    traceId: string;
    parentSpanId: string;
    toolName: string;
    toolType?: string;
    input?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
}): Promise<SpanContext> {
    const spanContext = startSpan({
        name: params.toolName,
        spanType: SpanType.TOOL_EXECUTION,
        parentSpanId: params.parentSpanId,
        input: params.input,
        attributes: {
            toolName: params.toolName,
            toolType: params.toolType
        }
    });

    // Record metric
    recordToolExecution({
        toolName: params.toolName,
        status: "success"
    });

    return spanContext;
}

/**
 * Create a model generation span
 */
export async function createModelGenerationSpan(params: {
    traceId: string;
    parentSpanId: string;
    modelId: string;
    provider: string;
    temperature?: number;
    maxTokens?: number;
    input?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
}): Promise<SpanContext> {
    const spanContext = startSpan({
        name: `${params.provider}/${params.modelId}`,
        spanType: SpanType.MODEL_GENERATION,
        parentSpanId: params.parentSpanId,
        input: params.input,
        attributes: {
            modelId: params.modelId,
            provider: params.provider,
            temperature: params.temperature,
            maxTokens: params.maxTokens
        }
    });

    // Set LLM-specific attributes
    setLLMAttributes(spanContext.spanId, {
        provider: params.provider,
        model: params.modelId,
        temperature: params.temperature,
        maxTokens: params.maxTokens
    });

    return spanContext;
}

/**
 * End a model generation span with token usage and cost
 */
export async function endModelGenerationSpan(params: {
    spanId: string;
    provider: string;
    model: string;
    promptTokens?: number;
    completionTokens?: number;
    totalCost?: number;
    durationMs?: number;
    output?: Record<string, unknown>;
    error?: Error | { message: string; type: string; stack?: string };
}): Promise<void> {
    // Update LLM attributes
    const llmAttrs: LLMAttributes = {
        provider: params.provider,
        model: params.model
    };

    if (params.promptTokens !== undefined) {
        llmAttrs.promptTokens = params.promptTokens;
    }
    if (params.completionTokens !== undefined) {
        llmAttrs.completionTokens = params.completionTokens;
    }
    if (params.promptTokens !== undefined && params.completionTokens !== undefined) {
        llmAttrs.totalTokens = params.promptTokens + params.completionTokens;
    }
    if (params.totalCost !== undefined) {
        llmAttrs.totalCost = params.totalCost;
    }

    setLLMAttributes(params.spanId, llmAttrs);

    // Record metrics
    const status = params.error ? "error" : "success";
    const metricAttrs = {
        provider: params.provider,
        model: params.model,
        status: status as "success" | "error"
    };

    recordLLMRequest(metricAttrs);

    if (params.promptTokens !== undefined && params.completionTokens !== undefined) {
        recordLLMTokens(metricAttrs, {
            prompt: params.promptTokens,
            completion: params.completionTokens
        });
    }

    if (params.durationMs !== undefined) {
        recordLLMDuration(metricAttrs, params.durationMs);
    }

    if (params.totalCost !== undefined) {
        recordLLMCost(metricAttrs, params.totalCost);
    }

    // End the span
    otelEndSpan(params.spanId, {
        output: params.output,
        error: params.error
    });
}

// ========================================
// Workflow Tracing Helper Activities
// ========================================

/**
 * Create a workflow run span
 */
export async function createWorkflowRunSpan(params: {
    workflowId: string;
    name: string;
    userId?: string;
    requestId?: string;
    input?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
}): Promise<SpanContext> {
    const spanContext = startSpan({
        name: params.name,
        spanType: SpanType.WORKFLOW_RUN,
        entityId: params.workflowId,
        input: params.input,
        attributes: {
            userId: params.userId,
            requestId: params.requestId
        }
    });

    // Record metric
    recordWorkflowExecution({
        workflowId: params.workflowId,
        userId: params.userId,
        status: "started"
    });

    return spanContext;
}

/**
 * End a workflow run span
 */
export async function endWorkflowRunSpan(params: {
    spanId: string;
    workflowId: string;
    userId?: string;
    durationMs: number;
    status: "completed" | "failed" | "cancelled";
    output?: Record<string, unknown>;
    error?: Error | { message: string; type: string; stack?: string };
}): Promise<void> {
    // Record metrics
    recordWorkflowExecution({
        workflowId: params.workflowId,
        userId: params.userId,
        status: params.status
    });

    recordWorkflowDuration(
        {
            workflowId: params.workflowId,
            userId: params.userId,
            status: params.status
        },
        params.durationMs
    );

    // End the span
    otelEndSpan(params.spanId, {
        output: params.output,
        error: params.error,
        attributes: {
            durationMs: params.durationMs,
            status: params.status
        }
    });
}

/**
 * Create a node execution span
 */
export async function createNodeExecutionSpan(params: {
    traceId: string;
    parentSpanId: string;
    nodeId: string;
    nodeName: string;
    nodeType?: string;
    workflowId?: string;
    input?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
}): Promise<SpanContext> {
    const spanContext = startSpan({
        name: params.nodeName,
        spanType: SpanType.NODE_EXECUTION,
        entityId: params.nodeId,
        parentSpanId: params.parentSpanId,
        input: params.input,
        attributes: {
            nodeId: params.nodeId,
            nodeType: params.nodeType,
            workflowId: params.workflowId
        }
    });

    // Record metric
    if (params.workflowId && params.nodeType) {
        recordNodeExecution({
            workflowId: params.workflowId,
            nodeId: params.nodeId,
            nodeType: params.nodeType,
            status: "started"
        });
    }

    return spanContext;
}

/**
 * End a node execution span
 */
export async function endNodeExecutionSpan(params: {
    spanId: string;
    workflowId?: string;
    nodeId: string;
    nodeType?: string;
    durationMs: number;
    status: "completed" | "failed" | "skipped";
    output?: Record<string, unknown>;
    error?: Error | { message: string; type: string; stack?: string };
}): Promise<void> {
    // Record metrics
    if (params.workflowId && params.nodeType) {
        recordNodeExecution({
            workflowId: params.workflowId,
            nodeId: params.nodeId,
            nodeType: params.nodeType,
            status: params.status
        });

        recordNodeDuration(
            {
                workflowId: params.workflowId,
                nodeId: params.nodeId,
                nodeType: params.nodeType,
                status: params.status
            },
            params.durationMs
        );
    }

    // End the span
    otelEndSpan(params.spanId, {
        output: params.output,
        error: params.error,
        attributes: {
            durationMs: params.durationMs,
            status: params.status
        }
    });
}
