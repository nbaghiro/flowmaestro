/**
 * Structured Logger with Correlation IDs
 * Integrates Pino logger with RequestContext for distributed tracing
 * Includes automatic PII redaction for sensitive fields
 */

import type { RequestContext } from "@flowmaestro/shared";
import type { Logger as PinoLogger } from "pino";

/**
 * Sensitive field names that should be automatically redacted
 */
const SENSITIVE_FIELDS = new Set([
    "password",
    "token",
    "accesstoken",
    "access_token",
    "refreshtoken",
    "refresh_token",
    "apikey",
    "api_key",
    "apiKey",
    "secret",
    "clientsecret",
    "client_secret",
    "clientSecret",
    "authorization",
    "cookie",
    "sessionid",
    "session_id",
    "sessionId",
    "creditcard",
    "credit_card",
    "creditCard",
    "ssn",
    "socialsecurity",
    "privatekey",
    "private_key",
    "privateKey",
    "encryptionkey",
    "encryption_key",
    "encryptionKey"
]);

/**
 * Redaction placeholder
 */
const REDACTED = "[REDACTED]";

/**
 * Recursively sanitize an object by redacting sensitive fields
 */
export function sanitizeLogData<T>(data: T, depth = 0): T {
    // Prevent infinite recursion
    if (depth > 10) {
        return data;
    }

    if (data === null || data === undefined) {
        return data;
    }

    if (typeof data !== "object") {
        return data;
    }

    if (Array.isArray(data)) {
        return data.map((item) => sanitizeLogData(item, depth + 1)) as T;
    }

    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
        const lowerKey = key.toLowerCase();
        if (SENSITIVE_FIELDS.has(lowerKey)) {
            sanitized[key] = REDACTED;
        } else if (typeof value === "object" && value !== null) {
            sanitized[key] = sanitizeLogData(value, depth + 1);
        } else {
            sanitized[key] = value;
        }
    }
    return sanitized as T;
}

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
    child(bindings: Record<string, unknown>): CorrelatedLogger;
}

/**
 * Create a logger with correlation IDs from RequestContext
 */
export function createCorrelatedLogger(
    baseLogger: PinoLogger,
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
 * Cloud Error Reporting payload structure
 */
export interface CloudErrorPayload {
    "@type": string;
    message: string;
    serviceContext: {
        service: string;
        version: string;
    };
    context?: {
        reportLocation?: {
            filePath?: string;
            lineNumber?: number;
            functionName?: string;
        };
        httpRequest?: {
            method?: string;
            url?: string;
            userAgent?: string;
            remoteIp?: string;
        };
    };
    stack_trace?: string;
}

/**
 * Format an error for Cloud Error Reporting
 * Adds the @type field for automatic error grouping
 */
export function formatErrorForCloudReporting(
    error: Error,
    serviceName: string,
    serviceVersion: string,
    context?: {
        filePath?: string;
        lineNumber?: number;
        functionName?: string;
        httpRequest?: {
            method?: string;
            url?: string;
            userAgent?: string;
            remoteIp?: string;
        };
    }
): CloudErrorPayload {
    const payload: CloudErrorPayload = {
        "@type":
            "type.googleapis.com/google.devtools.clouderrorreporting.v1beta1.ReportedErrorEvent",
        message: error.message,
        serviceContext: {
            service: serviceName,
            version: serviceVersion
        }
    };

    if (error.stack) {
        payload.stack_trace = error.stack;
    }

    if (context) {
        payload.context = {};
        if (context.filePath || context.lineNumber || context.functionName) {
            payload.context.reportLocation = {
                filePath: context.filePath,
                lineNumber: context.lineNumber,
                functionName: context.functionName
            };
        }
        if (context.httpRequest) {
            payload.context.httpRequest = context.httpRequest;
        }
    }

    return payload;
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
    sessionId?: string;
    timestamp: Date;
    service?: string;
    data?: Record<string, unknown>;
    err?: {
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
    logger: PinoLogger,
    level: LogLevel,
    message: string,
    context?: RequestContext,
    data?: Record<string, unknown>,
    error?: unknown
): void {
    // Sanitize data to redact sensitive fields
    const sanitizedData = data ? sanitizeLogData(data) : {};
    const logData: Record<string, unknown> = { ...sanitizedData };

    if (context) {
        const tracingContext = context.getTracingContext();
        logData.traceId = tracingContext.traceId;
        logData.requestId = tracingContext.requestId;
        logData.spanId = tracingContext.spanId;
        logData.userId = tracingContext.userId;
        logData.sessionId = tracingContext.sessionId;
    }

    if (error) {
        logData.err = formatError(error);
    }

    logger[level](logData, message);
}
