/**
 * Temporal Activity Interceptor for OpenTelemetry
 *
 * Automatically traces all activity executions and records metrics.
 * Spans are exported to GCP Cloud Trace via the OTLP exporter.
 */

import { Context as ActivityContext } from "@temporalio/activity";
import { createServiceLogger } from "../../core/logging";
import { SpanType, startSpan, endSpan, setSpanAttributes } from "../../core/observability";
import type {
    ActivityInboundCallsInterceptor,
    ActivityExecuteInput,
    ActivityInterceptors,
    Next
} from "@temporalio/worker";

const logger = createServiceLogger("activity-interceptor");

/**
 * Activity inbound interceptor that creates OTel spans for all activity executions.
 */
class OTelActivityInboundInterceptor implements ActivityInboundCallsInterceptor {
    private readonly activityContext: ActivityContext;

    constructor(ctx: ActivityContext) {
        this.activityContext = ctx;
    }

    async execute(
        input: ActivityExecuteInput,
        next: Next<ActivityInboundCallsInterceptor, "execute">
    ): Promise<unknown> {
        const info = this.activityContext.info;
        const activityName = info.activityType;

        // Start span for this activity
        const spanContext = startSpan({
            name: `activity:${activityName}`,
            spanType: SpanType.NODE_EXECUTION,
            entityId: info.workflowExecution.workflowId,
            attributes: {
                "activity.name": activityName,
                "activity.attempt": info.attempt,
                "activity.taskQueue": info.taskQueue,
                "workflow.id": info.workflowExecution.workflowId,
                "workflow.runId": info.workflowExecution.runId,
                "workflow.type": info.workflowType
            }
        });

        const startTime = Date.now();

        try {
            // Execute the activity
            const result = await next(input);

            // Record success
            const durationMs = Date.now() - startTime;
            setSpanAttributes(spanContext.spanId, {
                "activity.duration_ms": durationMs,
                "activity.status": "completed"
            });

            endSpan(spanContext.spanId);

            logger.debug(
                {
                    activity: activityName,
                    workflowId: info.workflowExecution.workflowId,
                    durationMs
                },
                "Activity completed"
            );

            return result;
        } catch (error) {
            // Record failure
            const durationMs = Date.now() - startTime;
            setSpanAttributes(spanContext.spanId, {
                "activity.duration_ms": durationMs,
                "activity.status": "failed"
            });

            endSpan(spanContext.spanId, {
                error: error instanceof Error ? error : new Error(String(error))
            });

            logger.warn(
                {
                    activity: activityName,
                    workflowId: info.workflowExecution.workflowId,
                    durationMs,
                    error: error instanceof Error ? error.message : String(error)
                },
                "Activity failed"
            );

            throw error;
        }
    }
}

/**
 * Factory function to create OTel activity interceptors.
 * Used by Temporal worker configuration.
 */
export function createOTelActivityInterceptor(ctx: ActivityContext): ActivityInterceptors {
    return {
        inbound: new OTelActivityInboundInterceptor(ctx)
    };
}
