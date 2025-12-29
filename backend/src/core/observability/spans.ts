/**
 * OpenTelemetry Span Helpers
 *
 * Replaces the custom SpanService with OTel-native span management.
 * Spans are exported to GCP Cloud Trace via the OTLP exporter.
 */

import {
    trace,
    SpanStatusCode,
    SpanKind,
    type Span as OTelSpan,
    type Attributes
} from "@opentelemetry/api";

// Import from activities/tracing (single source of truth)
import { SpanType, type SpanContext } from "../../temporal/activities/tracing";

// Re-export for convenience
export { SpanType, type SpanContext };

/** Input for creating a span */
export interface CreateSpanInput {
    name: string;
    spanType: SpanType;
    entityId?: string;
    parentSpanId?: string;
    attributes?: Record<string, string | number | boolean | undefined>;
    input?: Record<string, unknown>;
}

/** Input for ending a span */
export interface EndSpanInput {
    output?: Record<string, unknown>;
    error?: Error | { message: string; type?: string; stack?: string };
    attributes?: Record<string, string | number | boolean | undefined>;
}

/** LLM-specific attributes following OTel GenAI semantic conventions */
export interface LLMAttributes {
    provider: string;
    model: string;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    temperature?: number;
    maxTokens?: number;
    inputCost?: number;
    outputCost?: number;
    totalCost?: number;
}

/** Get the default tracer */
function getTracer() {
    return trace.getTracer("flowmaestro", "1.0.0");
}

/** Map for tracking active spans by ID */
const activeSpans = new Map<string, OTelSpan>();

/**
 * Start a new span and track it for later completion.
 * Returns span context that can be passed to activities/workflows.
 */
export function startSpan(input: CreateSpanInput): SpanContext {
    const tracer = getTracer();

    // Build attributes
    const attributes: Attributes = {
        "flowmaestro.span_type": input.spanType,
        ...(input.entityId && { "flowmaestro.entity_id": input.entityId })
    };

    // Add custom attributes
    if (input.attributes) {
        for (const [key, value] of Object.entries(input.attributes)) {
            if (value !== undefined) {
                attributes[`flowmaestro.${key}`] = value;
            }
        }
    }

    // Add input as JSON attribute if small enough
    if (input.input) {
        const inputJson = JSON.stringify(input.input);
        if (inputJson.length < 4096) {
            attributes["flowmaestro.input"] = inputJson;
        }
    }

    // Determine span kind based on type
    const kind = getSpanKind(input.spanType);

    // Start the span
    const span = tracer.startSpan(input.name, {
        kind,
        attributes
    });

    const spanContext = span.spanContext();

    // Store for later retrieval
    activeSpans.set(spanContext.spanId, span);

    return {
        traceId: spanContext.traceId,
        spanId: spanContext.spanId,
        parentSpanId: input.parentSpanId
    };
}

/**
 * End a span by its ID.
 */
export function endSpan(spanId: string, input?: EndSpanInput): void {
    const span = activeSpans.get(spanId);
    if (!span) {
        return;
    }

    // Add output as attribute
    if (input?.output) {
        const outputJson = JSON.stringify(input.output);
        if (outputJson.length < 4096) {
            span.setAttribute("flowmaestro.output", outputJson);
        }
    }

    // Add additional attributes
    if (input?.attributes) {
        for (const [key, value] of Object.entries(input.attributes)) {
            if (value !== undefined) {
                span.setAttribute(`flowmaestro.${key}`, value);
            }
        }
    }

    // Handle error
    if (input?.error) {
        const err = input.error;
        span.setStatus({
            code: SpanStatusCode.ERROR,
            message: err.message
        });

        if (err instanceof Error) {
            span.recordException(err);
        } else {
            span.recordException(new Error(err.message));
        }
    } else {
        span.setStatus({ code: SpanStatusCode.OK });
    }

    span.end();
    activeSpans.delete(spanId);
}

/**
 * Set LLM-specific attributes on a span following GenAI semantic conventions.
 * @see https://opentelemetry.io/docs/specs/semconv/gen-ai/
 */
export function setLLMAttributes(spanId: string, attrs: LLMAttributes): void {
    const span = activeSpans.get(spanId);
    if (!span) {
        return;
    }

    // GenAI semantic conventions
    span.setAttributes({
        "gen_ai.system": attrs.provider,
        "gen_ai.request.model": attrs.model,
        ...(attrs.promptTokens !== undefined && {
            "gen_ai.usage.prompt_tokens": attrs.promptTokens
        }),
        ...(attrs.completionTokens !== undefined && {
            "gen_ai.usage.completion_tokens": attrs.completionTokens
        }),
        ...(attrs.totalTokens !== undefined && {
            "gen_ai.usage.total_tokens": attrs.totalTokens
        }),
        ...(attrs.temperature !== undefined && {
            "gen_ai.request.temperature": attrs.temperature
        }),
        ...(attrs.maxTokens !== undefined && {
            "gen_ai.request.max_tokens": attrs.maxTokens
        }),
        // FlowMaestro custom cost attributes
        ...(attrs.inputCost !== undefined && {
            "flowmaestro.cost.input": attrs.inputCost
        }),
        ...(attrs.outputCost !== undefined && {
            "flowmaestro.cost.output": attrs.outputCost
        }),
        ...(attrs.totalCost !== undefined && {
            "flowmaestro.cost.total": attrs.totalCost
        })
    });
}

/**
 * Set arbitrary attributes on an active span.
 */
export function setSpanAttributes(
    spanId: string,
    attributes: Record<string, string | number | boolean>
): void {
    const span = activeSpans.get(spanId);
    if (!span) {
        return;
    }

    const prefixedAttrs: Attributes = {};
    for (const [key, value] of Object.entries(attributes)) {
        // Don't prefix gen_ai attributes
        if (key.startsWith("gen_ai.")) {
            prefixedAttrs[key] = value;
        } else {
            prefixedAttrs[`flowmaestro.${key}`] = value;
        }
    }

    span.setAttributes(prefixedAttrs);
}

/**
 * Get the active span from the current context (if any).
 */
export function getActiveSpan(): OTelSpan | undefined {
    return trace.getActiveSpan();
}

/**
 * Run a function within a new span context.
 * Automatically handles span start/end and error recording.
 */
export async function withSpan<T>(
    input: CreateSpanInput,
    fn: (spanContext: SpanContext) => Promise<T>
): Promise<T> {
    const spanContext = startSpan(input);

    try {
        const result = await fn(spanContext);
        endSpan(spanContext.spanId);
        return result;
    } catch (error) {
        endSpan(spanContext.spanId, {
            error: error instanceof Error ? error : new Error(String(error))
        });
        throw error;
    }
}

/**
 * Determine OTel span kind based on span type.
 */
function getSpanKind(spanType: SpanType): SpanKind {
    switch (spanType) {
        case SpanType.HTTP_REQUEST:
        case SpanType.EXTERNAL_API:
            return SpanKind.CLIENT;
        case SpanType.MODEL_GENERATION:
        case SpanType.EMBEDDING_GENERATION:
            return SpanKind.CLIENT;
        case SpanType.DATABASE_QUERY:
        case SpanType.VECTOR_SEARCH:
            return SpanKind.CLIENT;
        default:
            return SpanKind.INTERNAL;
    }
}
