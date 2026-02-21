/**
 * Default logger implementation
 */

/* eslint-disable no-console */
import type { AILogger } from "../types";

/**
 * Console-based logger for development/debugging
 */
export const consoleLogger: AILogger = {
    debug(message: string, context?: Record<string, unknown>): void {
        if (process.env.DEBUG || process.env.AI_SDK_DEBUG) {
            console.debug(`[AI-SDK DEBUG] ${message}`, context ?? "");
        }
    },

    info(message: string, context?: Record<string, unknown>): void {
        console.info(`[AI-SDK INFO] ${message}`, context ?? "");
    },

    warn(message: string, context?: Record<string, unknown>): void {
        console.warn(`[AI-SDK WARN] ${message}`, context ?? "");
    },

    error(message: string, error?: Error, context?: Record<string, unknown>): void {
        console.error(`[AI-SDK ERROR] ${message}`, {
            error: error?.message,
            stack: error?.stack,
            ...context
        });
    }
};

/**
 * Silent logger - does nothing
 */
export const silentLogger: AILogger = {
    debug(): void {},
    info(): void {},
    warn(): void {},
    error(): void {}
};

/**
 * Create a prefixed logger
 */
export function createPrefixedLogger(prefix: string, logger: AILogger): AILogger {
    return {
        debug(message: string, context?: Record<string, unknown>): void {
            logger.debug(`[${prefix}] ${message}`, context);
        },
        info(message: string, context?: Record<string, unknown>): void {
            logger.info(`[${prefix}] ${message}`, context);
        },
        warn(message: string, context?: Record<string, unknown>): void {
            logger.warn(`[${prefix}] ${message}`, context);
        },
        error(message: string, error?: Error, context?: Record<string, unknown>): void {
            logger.error(`[${prefix}] ${message}`, error, context);
        }
    };
}
