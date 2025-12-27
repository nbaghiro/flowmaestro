/**
 * Temporal Runtime Logger Configuration
 *
 * Creates a custom Temporal runtime logger that routes all logs
 * through pino for consistent formatting across the application.
 *
 * Handles:
 * - Workflow logs (strips [workflowType(workflowId)] prefix)
 * - SDK internal logs
 */

import type { Logger as TemporalLogger, DefaultLogger, LogLevel } from "@temporalio/worker";
import type { Logger as PinoLogger } from "pino";

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
    const { baseLogger, level = "INFO" } = options;

    // Create child loggers for different log sources
    const workflowLogger = baseLogger.child({ component: "workflow" });
    const sdkLogger = baseLogger.child({ component: "temporal-sdk" });

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
