/**
 * Structured Logger with Correlation IDs
 * Integrates Pino logger with RequestContext for distributed tracing
 */

import type { RequestContext } from "@flowmaestro/shared";
import type { Logger } from "pino";

/**
 * Enhanced log methods with automatic correlation ID injection
 */
export interface CorrelatedLogger {
    trace(obj: object | string, msg?: string): void;
    debug(obj: object | string, msg?: string): void;
    info(obj: object | string, msg?: string): void;
    warn(obj: object | string, msg?: string): void;
    error(obj: object | string, msg?: string): void;
    fatal(obj: object | string, msg?: string): void;
}

/**
 * Create a logger with correlation IDs from RequestContext
 */
export function createCorrelatedLogger(
    baseLogger: Logger,
    requestContext?: RequestContext
): CorrelatedLogger {
    if (!requestContext) {
        return baseLogger as unknown as CorrelatedLogger;
    }

    const tracingContext = requestContext.getTracingContext();

    // Create child logger with correlation IDs
    const childLogger = baseLogger.child({
        traceId: tracingContext.traceId,
        requestId: tracingContext.requestId,
        spanId: tracingContext.spanId,
        userId: tracingContext.userId,
        sessionId: tracingContext.sessionId
    });

    return childLogger as unknown as CorrelatedLogger;
}

/**
 * Log levels for structured logging
 */
export enum LogLevel {
    TRACE = "trace",
    DEBUG = "debug",
    INFO = "info",
    WARN = "warn",
    ERROR = "error",
    FATAL = "fatal"
}

/**
 * Structured log entry interface
 */
export interface LogEntry {
    level: LogLevel;
    message: string;
    traceId?: string;
    requestId?: string;
    spanId?: string;
    userId?: string;
    timestamp: Date;
    data?: Record<string, unknown>;
    error?: {
        message: string;
        stack?: string;
        code?: string;
        type?: string;
    };
}

/**
 * Format error for logging
 */
export function formatError(error: unknown): {
    message: string;
    stack?: string;
    code?: string;
    type?: string;
} {
    if (error instanceof Error) {
        return {
            message: error.message,
            stack: error.stack,
            code: (error as Error & { code?: string }).code,
            type: error.name
        };
    }

    if (typeof error === "string") {
        return { message: error, type: "string" };
    }

    return {
        message: JSON.stringify(error),
        type: typeof error
    };
}

/**
 * Log with context helper
 */
export function logWithContext(
    logger: Logger,
    level: LogLevel,
    message: string,
    context?: RequestContext,
    data?: Record<string, unknown>,
    error?: unknown
): void {
    const logData: Record<string, unknown> = { ...data };

    if (context) {
        const tracingContext = context.getTracingContext();
        logData.traceId = tracingContext.traceId;
        logData.requestId = tracingContext.requestId;
        logData.spanId = tracingContext.spanId;
        logData.userId = tracingContext.userId;
        logData.sessionId = tracingContext.sessionId;
    }

    if (error) {
        logData.error = formatError(error);
    }

    logger[level](logData, message);
}
