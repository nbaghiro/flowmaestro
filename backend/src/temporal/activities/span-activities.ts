/**
 * Span Activities for Temporal Workflows
 * Activities for creating and ending spans from workflows
 */

import { getSpanService } from "../../core/tracing";
import { AgentTracer } from "../../core/tracing/agent-helpers";
import { WorkflowTracer } from "../../core/tracing/workflow-helpers";
import type { CreateSpanInput, SpanContext, SpanAttributes } from "../../core/tracing/span-types";

/**
 * Create a new span
 */
export async function createSpan(input: CreateSpanInput): Promise<SpanContext> {
    const spanService = getSpanService();
    const activeSpan = spanService.createSpan(input);

    // Return context for workflow to track
    return activeSpan.getContext();
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
    const spanService = getSpanService();
    await spanService.endSpan(params);
}

/**
 * End a span with an error
 */
export async function endSpanWithError(params: {
    spanId: string;
    error: Error | { message: string; type: string; stack?: string };
}): Promise<void> {
    const spanService = getSpanService();
    await spanService.endSpan({
        spanId: params.spanId,
        error: params.error
    });
}

/**
 * Set attributes on a span (update in batch)
 * Note: Only works for spans that haven't been flushed yet
 */
export async function setSpanAttributes(params: {
    spanId: string;
    attributes: Record<string, string | number | boolean>;
}): Promise<void> {
    const spanService = getSpanService();
    spanService.updateSpanAttributes(params.spanId, params.attributes);
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
    const spanService = getSpanService();
    const spanInput = AgentTracer.createAgentRun(params);
    const activeSpan = spanService.createSpan(spanInput);
    return activeSpan.getContext();
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
    const spanService = getSpanService();

    // Create a temporary parent span context
    const parentSpan = {
        getContext: () => ({
            traceId: params.traceId,
            spanId: params.parentSpanId
        })
    } as Parameters<typeof AgentTracer.createIteration>[0]["parentSpan"];

    const spanInput = AgentTracer.createIteration({
        parentSpan,
        iterationNumber: params.iterationNumber,
        input: params.input,
        metadata: params.metadata
    });

    const activeSpan = spanService.createSpan(spanInput);
    return activeSpan.getContext();
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
    const spanService = getSpanService();

    const parentSpan = {
        getContext: () => ({
            traceId: params.traceId,
            spanId: params.parentSpanId
        })
    } as Parameters<typeof AgentTracer.createToolCall>[0]["parentSpan"];

    const spanInput = AgentTracer.createToolCall({
        parentSpan,
        toolName: params.toolName,
        toolType: params.toolType,
        input: params.input,
        metadata: params.metadata
    });

    const activeSpan = spanService.createSpan(spanInput);
    return activeSpan.getContext();
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
    const spanService = getSpanService();

    const parentSpan = {
        getContext: () => ({
            traceId: params.traceId,
            spanId: params.parentSpanId
        })
    } as Parameters<typeof AgentTracer.createModelGeneration>[0]["parentSpan"];

    const spanInput = AgentTracer.createModelGeneration({
        parentSpan,
        modelId: params.modelId,
        provider: params.provider,
        temperature: params.temperature,
        maxTokens: params.maxTokens,
        input: params.input,
        metadata: params.metadata
    });

    const activeSpan = spanService.createSpan(spanInput);
    return activeSpan.getContext();
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
    const spanService = getSpanService();
    const spanInput = WorkflowTracer.createWorkflowRun(params);
    const activeSpan = spanService.createSpan(spanInput);
    return activeSpan.getContext();
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
    input?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
}): Promise<SpanContext> {
    const spanService = getSpanService();

    const parentSpan = {
        getContext: () => ({
            traceId: params.traceId,
            spanId: params.parentSpanId
        })
    } as Parameters<typeof WorkflowTracer.createNodeExecution>[0]["parentSpan"];

    const spanInput = WorkflowTracer.createNodeExecution({
        parentSpan,
        nodeId: params.nodeId,
        nodeName: params.nodeName,
        nodeType: params.nodeType,
        input: params.input,
        metadata: params.metadata
    });

    const activeSpan = spanService.createSpan(spanInput);
    return activeSpan.getContext();
}
