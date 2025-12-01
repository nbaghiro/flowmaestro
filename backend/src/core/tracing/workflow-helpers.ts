/**
 * Workflow Tracing Helpers
 * Convenience methods for instrumenting workflow execution with distributed tracing
 */

import { ActiveSpan } from "./span-service";
import { SpanType, CreateSpanInput } from "./span-types";

export interface WorkflowRunInput {
    workflowId: string;
    name: string;
    userId?: string;
    requestId?: string;
    input?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
}

export interface NodeExecutionInput {
    parentSpan: ActiveSpan;
    nodeId: string;
    nodeName: string;
    nodeType?: string;
    input?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
}

export interface ProcessorRunInput {
    parentSpan: ActiveSpan;
    processorName: string;
    processorType?: string;
    input?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
}

export interface ValidationInput {
    parentSpan: ActiveSpan;
    validationType: string;
    input?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
}

/**
 * WorkflowTracer - Helper class for workflow-specific tracing operations
 *
 * Provides convenience methods for common workflow tracing patterns:
 * - Workflow runs (top-level execution)
 * - Node executions (individual node steps)
 * - Processor runs (data processing operations)
 * - Validation operations
 *
 * Usage:
 * ```typescript
 * const tracer = new WorkflowTracer(spanService);
 *
 * // Start workflow run
 * const workflowRun = tracer.createWorkflowRun({
 *     workflowId: "workflow-123",
 *     name: "Customer Onboarding",
 *     userId: "user-456",
 *     input: { customerId: "cust-789" }
 * });
 *
 * // Create node execution
 * const nodeExecution = tracer.createNodeExecution({
 *     parentSpan: workflowRun,
 *     nodeId: "node-1",
 *     nodeName: "Validate Input",
 *     nodeType: "validator"
 * });
 *
 * // End spans
 * await nodeExecution.end({ output: { valid: true } });
 * await workflowRun.end({ output: { status: "completed" } });
 * ```
 */
export class WorkflowTracer {
    /**
     * Create a top-level workflow run span
     *
     * Use this to track the entire execution of a workflow, from trigger
     * to completion. This is the root span for all workflow operations.
     *
     * @param input Workflow run configuration
     * @returns CreateSpanInput for the workflow run
     */
    static createWorkflowRun(input: WorkflowRunInput): CreateSpanInput {
        return {
            name: input.name,
            spanType: SpanType.WORKFLOW_RUN,
            entityId: input.workflowId,
            input: input.input,
            attributes: {
                userId: input.userId,
                requestId: input.requestId
            },
            metadata: input.metadata
        };
    }

    /**
     * Create a node execution span
     *
     * Use this to track the execution of individual nodes within a workflow.
     * Each node represents a discrete step in the workflow DAG.
     *
     * @param input Node execution configuration
     * @returns CreateSpanInput for the node execution
     */
    static createNodeExecution(input: NodeExecutionInput): CreateSpanInput {
        const context = input.parentSpan.getContext();

        return {
            traceId: context.traceId,
            parentSpanId: context.spanId,
            name: input.nodeName,
            spanType: SpanType.NODE_EXECUTION,
            entityId: input.nodeId,
            input: input.input,
            attributes: {
                nodeId: input.nodeId,
                nodeType: input.nodeType
            },
            metadata: input.metadata
        };
    }

    /**
     * Create a processor run span
     *
     * Use this to track data processing operations within a workflow.
     * Processors transform, validate, or enrich data.
     *
     * @param input Processor run configuration
     * @returns CreateSpanInput for the processor run
     */
    static createProcessorRun(input: ProcessorRunInput): CreateSpanInput {
        const context = input.parentSpan.getContext();

        return {
            traceId: context.traceId,
            parentSpanId: context.spanId,
            name: input.processorName,
            spanType: SpanType.PROCESSOR_RUN,
            input: input.input,
            attributes: {
                processorType: input.processorType
            },
            metadata: input.metadata
        };
    }

    /**
     * Create a validation span
     *
     * Use this to track validation operations within a workflow.
     * Validations ensure data meets required criteria.
     *
     * @param input Validation configuration
     * @returns CreateSpanInput for the validation
     */
    static createValidation(input: ValidationInput): CreateSpanInput {
        const context = input.parentSpan.getContext();

        return {
            traceId: context.traceId,
            parentSpanId: context.spanId,
            name: `Validate: ${input.validationType}`,
            spanType: SpanType.VALIDATION,
            input: input.input,
            attributes: {
                validationType: input.validationType
            },
            metadata: input.metadata
        };
    }

    /**
     * Create a database query span
     *
     * Use this to track database operations within a workflow node.
     *
     * @param parentSpan Parent span
     * @param queryType Type of query (SELECT, INSERT, UPDATE, etc.)
     * @param options Additional options
     * @returns CreateSpanInput for the database query
     */
    static createDatabaseQuery(
        parentSpan: ActiveSpan,
        queryType: string,
        options?: {
            tableName?: string;
            input?: Record<string, unknown>;
            metadata?: Record<string, unknown>;
        }
    ): CreateSpanInput {
        const context = parentSpan.getContext();

        return {
            traceId: context.traceId,
            parentSpanId: context.spanId,
            name: `DB: ${queryType}`,
            spanType: SpanType.DATABASE_QUERY,
            input: options?.input,
            attributes: {
                queryType,
                tableName: options?.tableName
            },
            metadata: options?.metadata
        };
    }

    /**
     * Create an HTTP request span
     *
     * Use this to track external HTTP requests made by workflow nodes.
     *
     * @param parentSpan Parent span
     * @param method HTTP method
     * @param url Request URL
     * @param options Additional options
     * @returns CreateSpanInput for the HTTP request
     */
    static createHttpRequest(
        parentSpan: ActiveSpan,
        method: string,
        url: string,
        options?: {
            input?: Record<string, unknown>;
            metadata?: Record<string, unknown>;
        }
    ): CreateSpanInput {
        const context = parentSpan.getContext();

        return {
            traceId: context.traceId,
            parentSpanId: context.spanId,
            name: `${method} ${url}`,
            spanType: SpanType.HTTP_REQUEST,
            input: options?.input,
            attributes: {
                httpMethod: method,
                httpUrl: url
            },
            metadata: options?.metadata
        };
    }

    /**
     * Helper to create child span from parent context
     *
     * Generic method for creating any type of child span.
     * Use the specific methods above for common patterns.
     *
     * @param parentSpan Parent span
     * @param name Span name
     * @param spanType Type of span
     * @param options Additional options
     * @returns CreateSpanInput for the child span
     */
    static createChildSpan(
        parentSpan: ActiveSpan,
        name: string,
        spanType: SpanType,
        options?: {
            entityId?: string;
            input?: Record<string, unknown>;
            attributes?: Record<string, string | number | boolean>;
            metadata?: Record<string, unknown>;
        }
    ): CreateSpanInput {
        const context = parentSpan.getContext();

        return {
            traceId: context.traceId,
            parentSpanId: context.spanId,
            name,
            spanType,
            entityId: options?.entityId,
            input: options?.input,
            attributes: options?.attributes,
            metadata: options?.metadata
        };
    }
}
