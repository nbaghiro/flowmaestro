/**
 * Structured logging utility for Temporal activities
 * Outputs JSON logs for better aggregation and querying
 */

export interface LogContext {
    executionId?: string;
    workflowId?: string;
    nodeId?: string;
    nodeType?: string;
    userId?: string;
    provider?: string;
    duration?: number;
    [key: string]: unknown;
}

interface LogEntry {
    level: "debug" | "info" | "warn" | "error";
    message: string;
    timestamp: string;
    context?: LogContext;
    error?: {
        name: string;
        message: string;
        stack?: string;
    };
}

function formatLog(entry: LogEntry): string {
    return JSON.stringify(entry);
}

/**
 * Structured logger for Temporal activities
 * Outputs JSON for easy parsing by log aggregation systems
 */
export const activityLogger = {
    debug: (message: string, context?: LogContext): void => {
        if (process.env.LOG_LEVEL === "debug") {
            console.debug(
                formatLog({
                    level: "debug",
                    message,
                    timestamp: new Date().toISOString(),
                    context
                })
            );
        }
    },

    info: (message: string, context?: LogContext): void => {
        console.log(
            formatLog({
                level: "info",
                message,
                timestamp: new Date().toISOString(),
                context
            })
        );
    },

    warn: (message: string, context?: LogContext): void => {
        console.warn(
            formatLog({
                level: "warn",
                message,
                timestamp: new Date().toISOString(),
                context
            })
        );
    },

    error: (message: string, error: Error, context?: LogContext): void => {
        console.error(
            formatLog({
                level: "error",
                message,
                timestamp: new Date().toISOString(),
                context,
                error: {
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                }
            })
        );
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
