/**
 * Retry logic with exponential backoff
 */

import { AIError } from "./errors";
import type { AIProvider, AILogger, RetryConfig } from "../types";

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
    retryableStatuses: [429, 503, 529]
};

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: unknown, config: RetryConfig): boolean {
    if (error instanceof AIError) {
        return error.retryable;
    }

    if (typeof error !== "object" || error === null) {
        return false;
    }

    const err = error as Record<string, unknown>;

    // Check status code
    if (typeof err.status === "number") {
        if (config.retryableStatuses.includes(err.status)) {
            return true;
        }
    }

    // Check for statusCode property (some SDKs use this)
    if (typeof err.statusCode === "number") {
        if (config.retryableStatuses.includes(err.statusCode)) {
            return true;
        }
    }

    // Check error type
    if (typeof err.type === "string") {
        if (["overloaded_error", "rate_limit_error"].includes(err.type)) {
            return true;
        }
    }

    // Check error message
    if (typeof err.message === "string") {
        const message = err.message.toLowerCase();
        const retryablePatterns = [
            "overloaded",
            "rate limit",
            "too many requests",
            "model is loading",
            "is currently loading",
            "503",
            "529",
            "temporarily unavailable",
            "service unavailable"
        ];
        return retryablePatterns.some((pattern) => message.includes(pattern));
    }

    return false;
}

/**
 * Extract retry-after from error (if available)
 */
export function getRetryAfterMs(error: unknown): number | undefined {
    if (error instanceof AIError && error.retryAfterMs) {
        return error.retryAfterMs;
    }

    if (typeof error === "object" && error !== null) {
        const err = error as Record<string, unknown>;

        // Check retryAfter in seconds
        if (typeof err.retryAfter === "number") {
            return err.retryAfter * 1000;
        }

        // Check retry_after in seconds
        if (typeof err.retry_after === "number") {
            return err.retry_after * 1000;
        }

        // Check headers for Retry-After
        if (typeof err.headers === "object" && err.headers !== null) {
            const headers = err.headers as Record<string, unknown>;
            const retryAfterHeader = headers["retry-after"] || headers["Retry-After"];
            if (typeof retryAfterHeader === "string") {
                const seconds = parseInt(retryAfterHeader, 10);
                if (!isNaN(seconds)) {
                    return seconds * 1000;
                }
            }
        }
    }

    return undefined;
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute an operation with retry logic
 */
export async function withRetry<T>(
    operation: () => Promise<T>,
    config: RetryConfig,
    context: string,
    provider: AIProvider,
    logger?: AILogger
): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error: unknown) {
            lastError = error;

            if (!isRetryableError(error, config)) {
                throw error;
            }

            if (attempt >= config.maxRetries) {
                logger?.error(
                    "Max retries exceeded",
                    error instanceof Error ? error : new Error(String(error)),
                    { context, provider, maxRetries: config.maxRetries }
                );
                throw error;
            }

            // Calculate delay with backoff
            const retryAfter = getRetryAfterMs(error);
            const calculatedDelay =
                config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt);
            const delay = retryAfter ?? Math.min(calculatedDelay, config.maxDelayMs);

            const errorMessage = error instanceof Error ? error.message : String(error);

            logger?.warn("Retryable error, retrying", {
                context,
                provider,
                attempt: attempt + 1,
                maxRetries: config.maxRetries,
                delayMs: delay,
                error: errorMessage
            });

            await sleep(delay);
        }
    }

    throw lastError;
}
