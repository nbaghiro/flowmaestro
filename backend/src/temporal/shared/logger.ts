/**
 * Structured logging utility for Temporal activities
 * Outputs JSON logs for better aggregation and querying
 */

export interface LogContext {
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

const SERVICE_NAME = "temporal-worker";

function formatLog(entry: LogEntry): string {
    return JSON.stringify(entry);
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
