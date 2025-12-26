/**
 * Structured logging utility for Temporal workflows
 *
 * Note: Temporal workflows are deterministic and cannot use external services
 * or non-deterministic operations directly. This logger outputs JSON to console
 * which GKE will forward to Cloud Logging.
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

type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Map log levels to Cloud Logging severity
 */
const SEVERITY_MAP: Record<LogLevel, string> = {
    debug: "DEBUG",
    info: "INFO",
    warn: "WARNING",
    error: "ERROR"
};

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
};

export interface WorkflowLogContext {
    executionId: string;
    workflowName: string;
    userId?: string;
    iteration?: number;
    nodeId?: string;
    [key: string]: unknown;
}

export interface WorkflowLogger {
    debug(message: string, data?: Record<string, unknown>): void;
    info(message: string, data?: Record<string, unknown>): void;
    warn(message: string, data?: Record<string, unknown>): void;
    error(message: string, error?: Error | unknown, data?: Record<string, unknown>): void;
    child(additionalContext: Record<string, unknown>): WorkflowLogger;
}

const SERVICE_NAME = "flowmaestro-worker";
const SERVICE_VERSION = process.env.APP_VERSION || "1.0.0";
const currentLogLevel = (process.env.LOG_LEVEL || "info") as LogLevel;

function shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[currentLogLevel];
}

function formatWorkflowLog(
    level: LogLevel,
    message: string,
    context: WorkflowLogContext,
    data?: Record<string, unknown>,
    error?: Error
): string {
    const sanitizedData = data ? sanitizeLogData(data) : undefined;

    const payload: Record<string, unknown> = {
        severity: SEVERITY_MAP[level],
        message,
        timestamp: new Date().toISOString(),
        "logging.googleapis.com/labels": {
            service: SERVICE_NAME,
            version: SERVICE_VERSION,
            workflowName: context.workflowName,
            executionId: context.executionId
        },
        // Top-level fields for easy querying
        traceId: context.executionId, // Use executionId as traceId for workflow correlation
        executionId: context.executionId,
        workflowName: context.workflowName,
        userId: context.userId
    };

    // Add iteration if present
    if (context.iteration !== undefined) {
        payload.iteration = context.iteration;
    }

    // Add nodeId if present
    if (context.nodeId) {
        payload.nodeId = context.nodeId;
    }

    // Add additional data
    if (sanitizedData && Object.keys(sanitizedData).length > 0) {
        payload.data = sanitizedData;
    }

    // Add error details
    if (error) {
        payload["@type"] =
            "type.googleapis.com/google.devtools.clouderrorreporting.v1beta1.ReportedErrorEvent";
        payload.serviceContext = {
            service: SERVICE_NAME,
            version: SERVICE_VERSION
        };
        payload.err = {
            name: error.name,
            message: error.message,
            stack: error.stack
        };
        if (error.stack) {
            payload.stack_trace = error.stack;
        }
    }

    return JSON.stringify(payload);
}

/**
 * Create a logger for Temporal workflows
 */
export function createWorkflowLogger(context: WorkflowLogContext): WorkflowLogger {
    const logMethod = (level: LogLevel) => {
        return (
            message: string,
            dataOrError?: Record<string, unknown> | Error | unknown,
            additionalData?: Record<string, unknown>
        ) => {
            if (!shouldLog(level)) {
                return;
            }

            let data: Record<string, unknown> | undefined;
            let error: Error | undefined;

            if (level === "error") {
                // For error level, second param might be an error
                if (dataOrError instanceof Error) {
                    error = dataOrError;
                    data = additionalData;
                } else if (
                    dataOrError &&
                    typeof dataOrError === "object" &&
                    "message" in dataOrError
                ) {
                    // Could be an error-like object
                    error = dataOrError as Error;
                    data = additionalData;
                } else {
                    data = dataOrError as Record<string, unknown>;
                }
            } else {
                data = dataOrError as Record<string, unknown>;
            }

            const formatted = formatWorkflowLog(level, message, context, data, error);

            // Output to console - GKE will forward to Cloud Logging
            if (level === "error") {
                console.error(formatted);
            } else if (level === "warn") {
                console.warn(formatted);
            } else if (level === "debug") {
                console.debug(formatted);
            } else {
                console.log(formatted);
            }
        };
    };

    return {
        debug: logMethod("debug"),
        info: logMethod("info"),
        warn: logMethod("warn"),
        error: (message: string, error?: Error | unknown, data?: Record<string, unknown>) => {
            if (!shouldLog("error")) {
                return;
            }
            const errorObj =
                error instanceof Error ? error : error ? new Error(String(error)) : undefined;
            const formatted = formatWorkflowLog("error", message, context, data, errorObj);
            console.error(formatted);
        },
        child: (additionalContext: Record<string, unknown>): WorkflowLogger => {
            return createWorkflowLogger({
                ...context,
                ...additionalContext
            } as WorkflowLogContext);
        }
    };
}
