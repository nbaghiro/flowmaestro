/**
 * Structured logging utility for Temporal activities
 * Outputs JSON logs for Cloud Logging compatibility
 */

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
    "authorization",
    "cookie"
]);

const REDACTED = "[REDACTED]";

/**
 * Recursively sanitize an object by redacting sensitive fields
 */
function sanitizeLogData<T>(data: T, depth = 0): T {
    if (depth > 10 || data === null || data === undefined) {
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

export interface LogContext {
    // Correlation IDs for distributed tracing
    traceId?: string;
    spanId?: string;

    // Execution context
    executionId?: string;
    workflowId?: string;
    nodeId?: string;
    nodeType?: string;
    userId?: string;

    // Provider info
    provider?: string;
    model?: string;

    // Performance
    duration?: number;
    attempt?: number;
    maxAttempts?: number;

    // Request details
    method?: string;
    url?: string;
    statusCode?: number;

    // Additional context
    [key: string]: unknown;
}

/**
 * Map log levels to Cloud Logging severity
 */
const SEVERITY_MAP = {
    debug: "DEBUG",
    info: "INFO",
    warn: "WARNING",
    error: "ERROR"
} as const;

interface LogEntry {
    level: "debug" | "info" | "warn" | "error";
    message: string;
    timestamp: string;
    service: string;
    context?: LogContext;
    error?: {
        name: string;
        message: string;
        stack?: string;
        retryable?: boolean;
    };
}

const SERVICE_NAME = process.env.SERVICE_NAME || "flowmaestro-worker";
const SERVICE_VERSION = process.env.APP_VERSION || "1.0.0";

/**
 * Format log entry for Cloud Logging JSON format
 */
function formatLog(entry: LogEntry): string {
    // Sanitize context to redact sensitive fields
    const sanitizedContext = entry.context ? sanitizeLogData(entry.context) : undefined;

    const cloudPayload: Record<string, unknown> = {
        severity: SEVERITY_MAP[entry.level],
        message: entry.message,
        timestamp: entry.timestamp,
        "logging.googleapis.com/labels": {
            service: entry.service,
            version: SERVICE_VERSION,
            ...(sanitizedContext?.traceId && { traceId: sanitizedContext.traceId }),
            ...(sanitizedContext?.executionId && { executionId: sanitizedContext.executionId }),
            ...(sanitizedContext?.nodeId && { nodeId: sanitizedContext.nodeId })
        }
    };

    // Add context fields at top level for easier querying
    if (sanitizedContext) {
        cloudPayload.traceId = sanitizedContext.traceId || sanitizedContext.executionId;
        cloudPayload.executionId = sanitizedContext.executionId;
        cloudPayload.workflowId = sanitizedContext.workflowId;
        cloudPayload.nodeId = sanitizedContext.nodeId;
        cloudPayload.nodeType = sanitizedContext.nodeType;
        cloudPayload.userId = sanitizedContext.userId;

        // Add remaining context fields
        const {
            traceId: _traceId,
            spanId: _spanId,
            executionId: _executionId,
            workflowId: _workflowId,
            nodeId: _nodeId,
            nodeType: _nodeType,
            userId: _userId,
            ...rest
        } = sanitizedContext;
        if (Object.keys(rest).length > 0) {
            cloudPayload.context = rest;
        }
    }

    // Add error details for Cloud Error Reporting
    if (entry.error) {
        cloudPayload["@type"] =
            "type.googleapis.com/google.devtools.clouderrorreporting.v1beta1.ReportedErrorEvent";
        cloudPayload.serviceContext = {
            service: entry.service,
            version: SERVICE_VERSION
        };
        cloudPayload.err = {
            name: entry.error.name,
            message: entry.error.message,
            stack: entry.error.stack,
            retryable: entry.error.retryable
        };
        if (entry.error.stack) {
            cloudPayload.stack_trace = entry.error.stack;
        }
    }

    return JSON.stringify(cloudPayload);
}

function shouldLog(level: LogEntry["level"]): boolean {
    const logLevel = process.env.LOG_LEVEL || "info";
    const levels = ["debug", "info", "warn", "error"];
    return levels.indexOf(level) >= levels.indexOf(logLevel);
}

/**
 * Structured logger for Temporal activities
 * Outputs JSON for easy parsing by log aggregation systems
 */
export const activityLogger = {
    debug: (message: string, context?: LogContext): void => {
        if (shouldLog("debug")) {
            console.debug(
                formatLog({
                    level: "debug",
                    message,
                    timestamp: new Date().toISOString(),
                    service: SERVICE_NAME,
                    context
                })
            );
        }
    },

    info: (message: string, context?: LogContext): void => {
        if (shouldLog("info")) {
            console.log(
                formatLog({
                    level: "info",
                    message,
                    timestamp: new Date().toISOString(),
                    service: SERVICE_NAME,
                    context
                })
            );
        }
    },

    warn: (message: string, context?: LogContext): void => {
        if (shouldLog("warn")) {
            console.warn(
                formatLog({
                    level: "warn",
                    message,
                    timestamp: new Date().toISOString(),
                    service: SERVICE_NAME,
                    context
                })
            );
        }
    },

    error: (message: string, error: Error, context?: LogContext): void => {
        if (shouldLog("error")) {
            // Check if error has retryable property (from our custom errors)
            const retryable =
                "retryable" in error && typeof error.retryable === "boolean"
                    ? error.retryable
                    : undefined;

            console.error(
                formatLog({
                    level: "error",
                    message,
                    timestamp: new Date().toISOString(),
                    service: SERVICE_NAME,
                    context,
                    error: {
                        name: error.name,
                        message: error.message,
                        stack: error.stack,
                        retryable
                    }
                })
            );
        }
    }
};

/**
 * Create a child logger with preset context
 * Useful for adding execution context to all logs in an activity
 */
export function createActivityLogger(baseContext: LogContext) {
    return {
        debug: (message: string, context?: LogContext): void => {
            activityLogger.debug(message, { ...baseContext, ...context });
        },
        info: (message: string, context?: LogContext): void => {
            activityLogger.info(message, { ...baseContext, ...context });
        },
        warn: (message: string, context?: LogContext): void => {
            activityLogger.warn(message, { ...baseContext, ...context });
        },
        error: (message: string, error: Error, context?: LogContext): void => {
            activityLogger.error(message, error, { ...baseContext, ...context });
        }
    };
}
