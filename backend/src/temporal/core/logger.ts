/**
 * Activity Logger
 *
 * Pino-based logging for Temporal activities and runtime.
 * This file uses Node.js modules and must NOT be imported from workflows.
 */

import pino, { Logger as PinoLogger } from "pino";
import type { Logger as TemporalLogger, DefaultLogger, LogLevel } from "@temporalio/worker";

// Re-export workflow logger types for convenience
export type { WorkflowLogContext, WorkflowLogger } from "./workflow-logger";
export { createWorkflowLogger } from "./workflow-logger";

// ============================================================================
// SANITIZATION
// ============================================================================

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

// ============================================================================
// ACTIVITY LOGGING (Pino-based)
// ============================================================================

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

const SERVICE_NAME = process.env.SERVICE_NAME || "flowmaestro-worker";
const SERVICE_VERSION = process.env.APP_VERSION || "1.0.0";

// Color codes for pretty logging
const colors = {
    reset: "\x1b[0m",
    green: "\x1b[32m",
    cyan: "\x1b[36m",
    yellow: "\x1b[33m",
    red: "\x1b[31m",
    magenta: "\x1b[35m",
    gray: "\x1b[90m"
};

const levelColors: Record<string, string> = {
    trace: colors.gray,
    debug: colors.cyan,
    info: colors.green,
    warn: colors.yellow,
    error: colors.red,
    fatal: colors.red
};

const levelNames: Record<number, string> = {
    10: "TRACE",
    20: "DEBUG",
    30: "INFO",
    40: "WARN",
    50: "ERROR",
    60: "FATAL"
};

// Type for pino-pretty function
type PinoPrettyFn = typeof import("pino-pretty").default;
type PrettyStream = ReturnType<PinoPrettyFn>;

// Cached pretty stream module (loaded dynamically in dev only)
let pinoPrettyFn: PinoPrettyFn | null = null;

/**
 * Create a pretty stream with custom formatting
 * Format: 2025-12-27T17:35:06.273Z [INFO] Message { key: 'value' }
 * Returns null if pino-pretty is not available (production)
 */
function createPrettyStream(): PrettyStream | null {
    // Only attempt to load pino-pretty in development
    if (process.env.NODE_ENV === "production") {
        return null;
    }

    try {
        // Dynamic require for dev-only dependency
        if (!pinoPrettyFn) {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const module = require("pino-pretty");
            // Handle both CommonJS default export and ESM interop
            pinoPrettyFn = module.default || module;
        }

        // Type guard - should never be null at this point
        const prettyFn = pinoPrettyFn;
        if (!prettyFn) {
            return null;
        }

        const ignoreFields = new Set([
            "pid",
            "hostname",
            "service",
            "component",
            "level",
            "time",
            "msg",
            "v"
        ]);

        return prettyFn({
            colorize: true,
            singleLine: true,
            ignore: Array.from(ignoreFields).join(","),
            messageFormat: (log: Record<string, unknown>, messageKey: string) => {
                const level = log.level as number;
                const levelName = levelNames[level] || "INFO";
                const levelColor = levelColors[levelName.toLowerCase()] || "";
                const reset = colors.reset;
                const timestampColor = colors.magenta;

                const time = log.time
                    ? new Date(log.time as number).toISOString()
                    : new Date().toISOString();

                const msg = (log[messageKey] as string) || "";

                return `${timestampColor}${time}${reset} ${levelColor}[${levelName}]${reset} ${msg}`;
            },
            customPrettifiers: {
                time: () => "",
                level: () => ""
            }
        });
    } catch {
        // pino-pretty not available, fall back to JSON logging
        return null;
    }
}

/**
 * Create the base pino logger instance for activities
 * Uses pino-pretty in development for readable logs
 */
function createBasePinoLogger(): PinoLogger {
    const isDev = process.env.NODE_ENV !== "production";

    const pinoOpts: pino.LoggerOptions = {
        level: process.env.LOG_LEVEL || "info",
        base: {
            service: SERVICE_NAME
        }
    };

    // Development: use synchronous pretty stream for readable logs
    const prettyStream = isDev ? createPrettyStream() : null;
    if (prettyStream) {
        return pino(pinoOpts, prettyStream);
    } else {
        // Production: JSON format for Cloud Logging
        pinoOpts.base = {
            ...pinoOpts.base,
            version: SERVICE_VERSION,
            env: "production"
        };
        pinoOpts.formatters = {
            level: (label) => ({ severity: label.toUpperCase() }),
            bindings: (bindings) => sanitizeLogData(bindings)
        };
        pinoOpts.timestamp = () => `,"timestamp":"${new Date().toISOString()}"`;
        return pino(pinoOpts);
    }
}

// Singleton logger instance
let baseLogger: PinoLogger | null = null;

function getBaseLogger(): PinoLogger {
    if (!baseLogger) {
        baseLogger = createBasePinoLogger();
    }
    return baseLogger;
}

/**
 * Activity logger interface matching the existing API
 */
export interface ActivityLogger {
    debug: (message: string, context?: LogContext) => void;
    info: (message: string, context?: LogContext) => void;
    warn: (message: string, context?: LogContext) => void;
    error: (message: string, error: Error, context?: LogContext) => void;
}

/**
 * Structured logger for Temporal activities
 * Uses pino for consistent formatting across the app
 */
export const activityLogger: ActivityLogger = {
    debug: (message: string, context?: LogContext): void => {
        const logger = getBaseLogger();
        const sanitized = context ? sanitizeLogData(context) : {};
        logger.debug(sanitized, message);
    },

    info: (message: string, context?: LogContext): void => {
        const logger = getBaseLogger();
        const sanitized = context ? sanitizeLogData(context) : {};
        logger.info(sanitized, message);
    },

    warn: (message: string, context?: LogContext): void => {
        const logger = getBaseLogger();
        const sanitized = context ? sanitizeLogData(context) : {};
        logger.warn(sanitized, message);
    },

    error: (message: string, error: Error, context?: LogContext): void => {
        const logger = getBaseLogger();
        const sanitized = context ? sanitizeLogData(context) : {};

        // Check if error has retryable property (from our custom errors)
        const retryable =
            "retryable" in error && typeof error.retryable === "boolean"
                ? error.retryable
                : undefined;

        logger.error(
            {
                ...sanitized,
                err: {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                    retryable
                }
            },
            message
        );
    }
};

/**
 * Create a child logger with preset context
 * Useful for adding execution context to all logs in an activity
 */
export function createActivityLogger(baseContext: LogContext): ActivityLogger {
    const logger = getBaseLogger();
    const sanitizedBase = sanitizeLogData(baseContext);

    // Create a child logger with the base context
    const childLogger = logger.child({ component: sanitizedBase.nodeType || "activity" });

    return {
        debug: (message: string, context?: LogContext): void => {
            const merged = context
                ? { ...sanitizedBase, ...sanitizeLogData(context) }
                : sanitizedBase;
            childLogger.debug(merged, message);
        },
        info: (message: string, context?: LogContext): void => {
            const merged = context
                ? { ...sanitizedBase, ...sanitizeLogData(context) }
                : sanitizedBase;
            childLogger.info(merged, message);
        },
        warn: (message: string, context?: LogContext): void => {
            const merged = context
                ? { ...sanitizedBase, ...sanitizeLogData(context) }
                : sanitizedBase;
            childLogger.warn(merged, message);
        },
        error: (message: string, error: Error, context?: LogContext): void => {
            const merged = context
                ? { ...sanitizedBase, ...sanitizeLogData(context) }
                : sanitizedBase;

            const retryable =
                "retryable" in error && typeof error.retryable === "boolean"
                    ? error.retryable
                    : undefined;

            childLogger.error(
                {
                    ...merged,
                    err: {
                        name: error.name,
                        message: error.message,
                        stack: error.stack,
                        retryable
                    }
                },
                message
            );
        }
    };
}

// ============================================================================
// RUNTIME LOGGER (for Temporal SDK logs)
// ============================================================================

/**
 * Regex to match Temporal's workflow log prefix: [workflowType(workflowId)]
 * Example: [orchestratorWorkflow(execution-44048885-5ad7-451b-9085-32031bd33305)]
 */
const WORKFLOW_PREFIX_REGEX = /^\[(\w+)\(([^)]+)\)\]\s*/;

type PinoLogLevel = "trace" | "debug" | "info" | "warn" | "error";

interface RuntimeLoggerOptions {
    /** Base pino logger instance */
    baseLogger: PinoLogger;
    /** Minimum log level (default: "INFO") */
    level?: LogLevel;
}

/**
 * Create a Temporal runtime logger that routes logs through pino
 *
 * @example
 * ```typescript
 * const { DefaultLogger } = await import("@temporalio/worker");
 * const runtimeLogger = createRuntimeLogger(DefaultLogger, {
 *     baseLogger: logger
 * });
 * Runtime.install({ logger: runtimeLogger });
 * ```
 */
export function createRuntimeLogger(
    DefaultLoggerClass: typeof DefaultLogger,
    options: RuntimeLoggerOptions
): TemporalLogger {
    const { baseLogger: runtimeBaseLogger, level = "INFO" } = options;

    // Create child loggers for different log sources
    const workflowLogger = runtimeBaseLogger.child({ component: "workflow" });
    const sdkLogger = runtimeBaseLogger.child({ component: "temporal-sdk" });

    return new DefaultLoggerClass(level, ({ level: logLevel, message }) => {
        // Check if this is a workflow log (has the [workflowType(workflowId)] prefix)
        const match = message.match(WORKFLOW_PREFIX_REGEX);

        if (match) {
            // Extract workflow info from prefix
            const workflowType = match[1];
            const workflowId = match[2];
            const cleanMessage = message.replace(WORKFLOW_PREFIX_REGEX, "");

            // Parse execution ID from workflowId (format: execution-uuid)
            const executionId = workflowId.startsWith("execution-")
                ? workflowId.substring(10, 18) + "..."
                : workflowId.substring(0, 8) + "...";

            // Log through pino with workflow context
            const pinoLevel = logLevel.toLowerCase() as PinoLogLevel;
            const logFn = workflowLogger[pinoLevel] || workflowLogger.info;
            logFn.call(workflowLogger, { workflowType, executionId }, cleanMessage);
        } else {
            // Regular SDK log
            const pinoLevel = logLevel.toLowerCase() as PinoLogLevel;
            const logFn = sdkLogger[pinoLevel] || sdkLogger.info;
            logFn.call(sdkLogger, message);
        }
    });
}

/**
 * Get the base pino logger for use in runtime logger creation
 */
export function getActivityBaseLogger(): PinoLogger {
    return getBaseLogger();
}
