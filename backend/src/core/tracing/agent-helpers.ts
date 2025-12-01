/**
 * Agent Tracing Helpers
 * Convenience methods for instrumenting agent execution with distributed tracing
 */

import { ActiveSpan } from "./span-service";
import { SpanType, CreateSpanInput } from "./span-types";

export interface AgentRunInput {
    agentId: string;
    name: string;
    userId?: string;
    sessionId?: string;
    input?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
}

export interface AgentIterationInput {
    parentSpan: ActiveSpan;
    iterationNumber: number;
    input?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
}

export interface ToolCallInput {
    parentSpan: ActiveSpan;
    toolName: string;
    toolType?: string;
    input?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
}

export interface ModelGenerationInput {
    parentSpan: ActiveSpan;
    modelId: string;
    provider: string;
    temperature?: number;
    maxTokens?: number;
    input?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
}

/**
 * AgentTracer - Helper class for agent-specific tracing operations
 *
 * Provides convenience methods for common agent tracing patterns:
 * - Agent runs (top-level execution)
 * - Agent iterations (steps within a run)
 * - Tool calls (tool executions)
 * - Model generations (LLM calls)
 *
 * Usage:
 * ```typescript
 * const tracer = new AgentTracer(spanService);
 *
 * // Start agent run
 * const agentRun = tracer.createAgentRun({
 *     agentId: "agent-123",
 *     name: "Customer Support Agent",
 *     userId: "user-456",
 *     input: { query: "How do I reset my password?" }
 * });
 *
 * // Create iteration
 * const iteration = tracer.createIteration({
 *     parentSpan: agentRun,
 *     iterationNumber: 1
 * });
 *
 * // Track LLM call
 * const modelCall = tracer.createModelGeneration({
 *     parentSpan: iteration,
 *     modelId: "gpt-4o",
 *     provider: "openai",
 *     temperature: 0.7
 * });
 *
 * // End spans
 * await modelCall.end({ output: { response: "..." } });
 * await iteration.end();
 * await agentRun.end({ output: { result: "..." } });
 * ```
 */
export class AgentTracer {
    /**
     * Create a top-level agent run span
     *
     * Use this to track the entire execution of an agent, from initial input
     * to final output. This is the root span for all agent operations.
     *
     * @param input Agent run configuration
     * @returns ActiveSpan for the agent run
     */
    static createAgentRun(input: AgentRunInput): CreateSpanInput {
        return {
            name: input.name,
            spanType: SpanType.AGENT_RUN,
            entityId: input.agentId,
            input: input.input,
            attributes: {
                userId: input.userId,
                sessionId: input.sessionId
            },
            metadata: input.metadata
        };
    }

    /**
     * Create an agent iteration span
     *
     * Use this to track individual iterations/steps within an agent run.
     * Agents often operate in loops, and this helps track each iteration.
     *
     * @param input Iteration configuration
     * @returns CreateSpanInput for the iteration
     */
    static createIteration(input: AgentIterationInput): CreateSpanInput {
        const context = input.parentSpan.getContext();

        return {
            traceId: context.traceId,
            parentSpanId: context.spanId,
            name: `Iteration ${input.iterationNumber}`,
            spanType: SpanType.AGENT_ITERATION,
            input: input.input,
            attributes: {
                iterationNumber: input.iterationNumber
            },
            metadata: input.metadata
        };
    }

    /**
     * Create a tool call span
     *
     * Use this to track tool executions within an agent iteration.
     * Tools are external functions/APIs that agents can call.
     *
     * @param input Tool call configuration
     * @returns CreateSpanInput for the tool call
     */
    static createToolCall(input: ToolCallInput): CreateSpanInput {
        const context = input.parentSpan.getContext();

        return {
            traceId: context.traceId,
            parentSpanId: context.spanId,
            name: input.toolName,
            spanType: SpanType.TOOL_EXECUTION,
            input: input.input,
            attributes: {
                toolName: input.toolName,
                toolType: input.toolType
            },
            metadata: input.metadata
        };
    }

    /**
     * Create a model generation span
     *
     * Use this to track LLM API calls within an agent iteration.
     * Automatically captures model parameters for cost calculation.
     *
     * @param input Model generation configuration
     * @returns CreateSpanInput for the model call
     */
    static createModelGeneration(input: ModelGenerationInput): CreateSpanInput {
        const context = input.parentSpan.getContext();

        return {
            traceId: context.traceId,
            parentSpanId: context.spanId,
            name: `${input.provider}/${input.modelId}`,
            spanType: SpanType.MODEL_GENERATION,
            input: input.input,
            attributes: {
                modelId: input.modelId,
                provider: input.provider,
                temperature: input.temperature,
                maxTokens: input.maxTokens
            },
            metadata: input.metadata
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
