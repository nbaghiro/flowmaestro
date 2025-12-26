/**
 * OpenTelemetry Metrics for GCP Cloud Monitoring
 *
 * Push-based metrics that replace querying spans for analytics.
 * Exported to Cloud Monitoring via the OTLP exporter.
 *
 * @see https://opentelemetry.io/docs/specs/otel/metrics/
 */

import { metrics, type Meter, type Counter, type Histogram } from "@opentelemetry/api";

/** Get the default meter */
function getMeter(): Meter {
    return metrics.getMeter("flowmaestro", "1.0.0");
}

// Lazy-initialized metric instruments
let _workflowExecutions: Counter | null = null;
let _nodeExecutions: Counter | null = null;
let _llmRequests: Counter | null = null;
let _llmTokens: Counter | null = null;
let _toolExecutions: Counter | null = null;
let _workflowDuration: Histogram | null = null;
let _nodeDuration: Histogram | null = null;
let _llmDuration: Histogram | null = null;
let _llmCost: Histogram | null = null;

/** Workflow execution counter */
function getWorkflowExecutionsCounter(): Counter {
    if (!_workflowExecutions) {
        _workflowExecutions = getMeter().createCounter("flowmaestro.workflow.executions", {
            description: "Total number of workflow executions",
            unit: "1"
        });
    }
    return _workflowExecutions;
}

/** Node execution counter */
function getNodeExecutionsCounter(): Counter {
    if (!_nodeExecutions) {
        _nodeExecutions = getMeter().createCounter("flowmaestro.node.executions", {
            description: "Total number of node executions",
            unit: "1"
        });
    }
    return _nodeExecutions;
}

/** LLM request counter */
function getLLMRequestsCounter(): Counter {
    if (!_llmRequests) {
        _llmRequests = getMeter().createCounter("flowmaestro.llm.requests", {
            description: "Total number of LLM API requests",
            unit: "1"
        });
    }
    return _llmRequests;
}

/** LLM token counter */
function getLLMTokensCounter(): Counter {
    if (!_llmTokens) {
        _llmTokens = getMeter().createCounter("flowmaestro.llm.tokens", {
            description: "Total number of LLM tokens used",
            unit: "1"
        });
    }
    return _llmTokens;
}

/** Tool execution counter */
function getToolExecutionsCounter(): Counter {
    if (!_toolExecutions) {
        _toolExecutions = getMeter().createCounter("flowmaestro.tool.executions", {
            description: "Total number of tool executions",
            unit: "1"
        });
    }
    return _toolExecutions;
}

/** Workflow duration histogram */
function getWorkflowDurationHistogram(): Histogram {
    if (!_workflowDuration) {
        _workflowDuration = getMeter().createHistogram("flowmaestro.workflow.duration", {
            description: "Workflow execution duration",
            unit: "ms"
        });
    }
    return _workflowDuration;
}

/** Node duration histogram */
function getNodeDurationHistogram(): Histogram {
    if (!_nodeDuration) {
        _nodeDuration = getMeter().createHistogram("flowmaestro.node.duration", {
            description: "Node execution duration",
            unit: "ms"
        });
    }
    return _nodeDuration;
}

/** LLM duration histogram */
function getLLMDurationHistogram(): Histogram {
    if (!_llmDuration) {
        _llmDuration = getMeter().createHistogram("flowmaestro.llm.duration", {
            description: "LLM request duration",
            unit: "ms"
        });
    }
    return _llmDuration;
}

/** LLM cost histogram */
function getLLMCostHistogram(): Histogram {
    if (!_llmCost) {
        _llmCost = getMeter().createHistogram("flowmaestro.llm.cost", {
            description: "LLM request cost in USD",
            unit: "USD"
        });
    }
    return _llmCost;
}

/** Attributes for workflow metrics */
export interface WorkflowMetricAttributes {
    workflowId: string;
    userId?: string;
    status: "started" | "completed" | "failed" | "cancelled";
}

/** Attributes for node metrics */
export interface NodeMetricAttributes {
    workflowId: string;
    nodeId: string;
    nodeType: string;
    status: "started" | "completed" | "failed" | "skipped";
}

/** Attributes for LLM metrics */
export interface LLMMetricAttributes {
    provider: string;
    model: string;
    userId?: string;
    workflowId?: string;
    status: "success" | "error";
}

/** Attributes for tool metrics */
export interface ToolMetricAttributes {
    toolName: string;
    workflowId?: string;
    agentId?: string;
    status: "success" | "error";
}

/**
 * Record a workflow execution event.
 */
export function recordWorkflowExecution(attrs: WorkflowMetricAttributes): void {
    getWorkflowExecutionsCounter().add(1, {
        workflow_id: attrs.workflowId,
        user_id: attrs.userId || "unknown",
        status: attrs.status
    });
}

/**
 * Record workflow duration when completed.
 */
export function recordWorkflowDuration(attrs: WorkflowMetricAttributes, durationMs: number): void {
    getWorkflowDurationHistogram().record(durationMs, {
        workflow_id: attrs.workflowId,
        user_id: attrs.userId || "unknown",
        status: attrs.status
    });
}

/**
 * Record a node execution event.
 */
export function recordNodeExecution(attrs: NodeMetricAttributes): void {
    getNodeExecutionsCounter().add(1, {
        workflow_id: attrs.workflowId,
        node_id: attrs.nodeId,
        node_type: attrs.nodeType,
        status: attrs.status
    });
}

/**
 * Record node duration when completed.
 */
export function recordNodeDuration(attrs: NodeMetricAttributes, durationMs: number): void {
    getNodeDurationHistogram().record(durationMs, {
        workflow_id: attrs.workflowId,
        node_id: attrs.nodeId,
        node_type: attrs.nodeType,
        status: attrs.status
    });
}

/**
 * Record an LLM request event.
 */
export function recordLLMRequest(attrs: LLMMetricAttributes): void {
    getLLMRequestsCounter().add(1, {
        provider: attrs.provider,
        model: attrs.model,
        user_id: attrs.userId || "unknown",
        workflow_id: attrs.workflowId || "standalone",
        status: attrs.status
    });
}

/**
 * Record LLM token usage.
 */
export function recordLLMTokens(
    attrs: LLMMetricAttributes,
    tokens: { prompt: number; completion: number }
): void {
    const counter = getLLMTokensCounter();
    const baseAttrs = {
        provider: attrs.provider,
        model: attrs.model,
        user_id: attrs.userId || "unknown",
        workflow_id: attrs.workflowId || "standalone"
    };

    counter.add(tokens.prompt, { ...baseAttrs, token_type: "prompt" });
    counter.add(tokens.completion, { ...baseAttrs, token_type: "completion" });
}

/**
 * Record LLM request duration.
 */
export function recordLLMDuration(attrs: LLMMetricAttributes, durationMs: number): void {
    getLLMDurationHistogram().record(durationMs, {
        provider: attrs.provider,
        model: attrs.model,
        user_id: attrs.userId || "unknown",
        workflow_id: attrs.workflowId || "standalone",
        status: attrs.status
    });
}

/**
 * Record LLM cost in USD.
 */
export function recordLLMCost(attrs: LLMMetricAttributes, costUsd: number): void {
    getLLMCostHistogram().record(costUsd, {
        provider: attrs.provider,
        model: attrs.model,
        user_id: attrs.userId || "unknown",
        workflow_id: attrs.workflowId || "standalone"
    });
}

/**
 * Record a tool execution event.
 */
export function recordToolExecution(attrs: ToolMetricAttributes): void {
    getToolExecutionsCounter().add(1, {
        tool_name: attrs.toolName,
        workflow_id: attrs.workflowId || "standalone",
        agent_id: attrs.agentId || "none",
        status: attrs.status
    });
}
