/**
 * OpenTelemetry Observability Module
 *
 * Provides tracing and metrics for FlowMaestro via GCP Cloud Trace
 * and Cloud Monitoring.
 */

// OTel SDK initialization
export { initializeOTel, shutdownOTel, isOTelEnabled } from "./otel";
export type { OTelConfig } from "./otel";

// Span helpers
export {
    SpanType,
    startSpan,
    endSpan,
    setLLMAttributes,
    setSpanAttributes,
    getActiveSpan,
    withSpan
} from "./spans";
export type { SpanContext, CreateSpanInput, EndSpanInput, LLMAttributes } from "./spans";

// Metrics
export {
    recordWorkflowExecution,
    recordWorkflowDuration,
    recordNodeExecution,
    recordNodeDuration,
    recordLLMRequest,
    recordLLMTokens,
    recordLLMDuration,
    recordLLMCost,
    recordToolExecution
} from "./metrics";
export type {
    WorkflowMetricAttributes,
    NodeMetricAttributes,
    LLMMetricAttributes,
    ToolMetricAttributes
} from "./metrics";

// Cost calculator
export { calculateCost, getModelPricing, formatCost, estimateCost } from "./cost-calculator";
export type { ModelPricing, CostCalculationInput, CostCalculationResult } from "./cost-calculator";
