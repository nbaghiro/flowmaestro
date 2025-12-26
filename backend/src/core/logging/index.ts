/**
 * Centralized Logging Module
 *
 * Provides a unified logging interface with:
 * - Google Cloud Logging integration
 * - Automatic PII redaction
 * - Correlation ID injection
 * - Cloud Error Reporting support
 */

import pino, { Logger as PinoLogger } from "pino";
import {
    CloudLoggingWriter,
    initializeCloudLogging,
    shutdownCloudLogging,
    type CloudLoggingConfig
} from "./cloud-transport";
import {
    createCorrelatedLogger,
    sanitizeLogData,
    formatError,
    formatErrorForCloudReporting,
    LogLevel
} from "./logger";
import type { CorrelatedLogger, LogEntry, CloudErrorPayload } from "./logger";
import type { FastifyRequest } from "fastify";

// Re-export types and utilities
export {
    createCorrelatedLogger,
    sanitizeLogData,
    formatError,
    formatErrorForCloudReporting,
    LogLevel
};
export type { CorrelatedLogger, LogEntry, CloudErrorPayload };

/**
 * Logger configuration
 */
export interface LoggerConfig {
    level: string;
    serviceName: string;
    serviceVersion: string;
    environment: string;
    gcpProjectId?: string;
    enableCloudLogging: boolean;
}

/**
 * Extended logger interface with child logger support
 */
export interface Logger extends CorrelatedLogger {
    child(bindings: Record<string, unknown>): Logger;
}

// Singleton logger instance
let loggerInstance: PinoLogger | null = null;
let loggerConfig: LoggerConfig | null = null;
let cloudWriter: CloudLoggingWriter | null = null;

/**
 * Create Pino serializers with PII redaction
 */
function createSerializers() {
    return {
        err: (err: Error) => formatError(err),
        req: (req: { method?: string; url?: string; headers?: Record<string, unknown> }) => ({
            method: req.method,
            url: req.url,
            // Redact sensitive headers
            headers: req.headers ? sanitizeLogData(req.headers) : undefined
        }),
        res: (res: { statusCode?: number }) => ({
            statusCode: res.statusCode
        })
    };
}

/**
 * Initialize the logger
 * Must be called before using getLogger()
 */
export function initializeLogger(config: LoggerConfig): PinoLogger {
    if (loggerInstance) {
        return loggerInstance;
    }

    loggerConfig = config;

    // Initialize Cloud Logging if enabled
    if (config.enableCloudLogging && config.gcpProjectId) {
        const cloudConfig: CloudLoggingConfig = {
            projectId: config.gcpProjectId,
            logName: `${config.serviceName}-logs`,
            serviceName: config.serviceName,
            serviceVersion: config.serviceVersion,
            enabled: true
        };
        cloudWriter = initializeCloudLogging(cloudConfig);
    }

    // Create Pino logger with environment-appropriate options
    const pinoOptions: pino.LoggerOptions = {
        level: config.level,
        serializers: createSerializers(),
        base: {
            service: config.serviceName
        }
    };

    // In development, use pino-pretty for human-readable output
    if (config.environment === "development" && !config.enableCloudLogging) {
        // Set default component so messageFormat always has a value
        pinoOptions.base = {
            ...pinoOptions.base,
            component: config.serviceName
        };
        pinoOptions.transport = {
            target: "pino-pretty",
            options: {
                colorize: true,
                translateTime: "HH:MM:ss",
                ignore: "pid,hostname,service,version,env",
                singleLine: true,
                messageFormat: "[{component}] {msg}"
            }
        };
    } else {
        // In production, use JSON-optimized formatters for Cloud Logging
        pinoOptions.base = {
            ...pinoOptions.base,
            version: config.serviceVersion,
            env: config.environment
        };
        pinoOptions.formatters = {
            level: (label) => ({ level: label }),
            bindings: (bindings) => sanitizeLogData(bindings)
        };
        // Use custom timestamp format for Cloud Logging
        pinoOptions.timestamp = () => `,"time":"${new Date().toISOString()}"`;
    }

    loggerInstance = pino(pinoOptions);

    return loggerInstance;
}

/**
 * Get the logger instance
 * Creates a default logger if not yet initialized (for early module loading)
 */
export function getLogger(): PinoLogger {
    if (!loggerInstance) {
        // Create a default logger if not initialized
        // This handles cases where services import logger before server init
        const isDev = process.env.NODE_ENV !== "production";
        const pinoOpts: pino.LoggerOptions = {
            level: process.env.LOG_LEVEL || "info",
            base: { service: "flowmaestro" }
        };

        if (isDev) {
            // Set default component so messageFormat always has a value
            pinoOpts.base = { ...pinoOpts.base, component: "server" };
            pinoOpts.transport = {
                target: "pino-pretty",
                options: {
                    colorize: true,
                    translateTime: "HH:MM:ss",
                    ignore: "pid,hostname,service",
                    singleLine: true,
                    messageFormat: "[{component}] {msg}"
                }
            };
        }

        loggerInstance = pino(pinoOpts);
    }
    return loggerInstance;
}

/**
 * Create a child logger with component context
 * Uses 'component' to avoid duplicate 'service' field
 */
export function createServiceLogger(serviceName: string): PinoLogger {
    return getLogger().child({ component: serviceName });
}

/**
 * Create a logger from a Fastify request with correlation IDs
 */
export function createRequestLogger(request: FastifyRequest): PinoLogger {
    // The request already has a logger with correlation IDs from middleware
    return request.log as PinoLogger;
}

/**
 * Shutdown the logger and flush any pending logs
 */
export async function shutdownLogger(): Promise<void> {
    if (cloudWriter) {
        await shutdownCloudLogging();
        cloudWriter = null;
    }
    loggerInstance = null;
    loggerConfig = null;
}

/**
 * Get the current logger configuration
 */
export function getLoggerConfig(): LoggerConfig | null {
    return loggerConfig;
}

/**
 * Create a logger for Temporal workers
 * Uses pino-pretty in development, JSON for production
 */
export function createWorkerLogger(workerName: string): PinoLogger {
    const isDev = process.env.NODE_ENV !== "production";
    const pinoOpts: pino.LoggerOptions = {
        level: process.env.LOG_LEVEL || "info",
        serializers: createSerializers(),
        base: {
            service: workerName
        }
    };

    if (isDev) {
        // Set default component so messageFormat always has a value
        pinoOpts.base = { ...pinoOpts.base, component: workerName };
        pinoOpts.transport = {
            target: "pino-pretty",
            options: {
                colorize: true,
                translateTime: "HH:MM:ss",
                ignore: "pid,hostname,service",
                singleLine: true,
                messageFormat: "[{component}] {msg}"
            }
        };
    } else {
        pinoOpts.base = {
            ...pinoOpts.base,
            version: process.env.APP_VERSION || "1.0.0",
            env: "production"
        };
        pinoOpts.formatters = {
            level: (label) => ({ level: label }),
            bindings: (bindings) => sanitizeLogData(bindings)
        };
        pinoOpts.timestamp = () => `,"time":"${new Date().toISOString()}"`;
    }

    return pino(pinoOpts);
}

/**
 * Wrapper to create a sanitizing logger that auto-redacts sensitive data
 */
export function createSanitizingLogger(baseLogger: PinoLogger): Logger {
    const createMethod = (level: keyof PinoLogger) => {
        return (obj: object | string, msg?: string) => {
            if (typeof obj === "string") {
                (baseLogger[level] as (msg: string) => void)(obj);
            } else {
                const sanitized = sanitizeLogData(obj);
                if (msg) {
                    (baseLogger[level] as (obj: object, msg: string) => void)(sanitized, msg);
                } else {
                    (baseLogger[level] as (obj: object) => void)(sanitized);
                }
            }
        };
    };

    return {
        trace: createMethod("trace"),
        debug: createMethod("debug"),
        info: createMethod("info"),
        warn: createMethod("warn"),
        error: createMethod("error"),
        fatal: createMethod("fatal"),
        child: (bindings: Record<string, unknown>) => {
            const sanitizedBindings = sanitizeLogData(bindings);
            return createSanitizingLogger(baseLogger.child(sanitizedBindings));
        }
    };
}
