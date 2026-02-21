/**
 * Polling manager for async operations
 */

import { TimeoutError } from "./errors";
import type { AILogger, PollConfig, PollResult, AIProvider } from "../types";

/**
 * Default polling configuration
 */
export const DEFAULT_POLL_CONFIG: PollConfig = {
    maxAttempts: 120, // ~10 minutes with 5s intervals
    intervalMs: 5000,
    backoffMultiplier: 1.5,
    maxIntervalMs: 30000
};

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Poll until an operation completes or fails
 */
export async function pollUntilComplete<T>(
    pollFn: () => Promise<PollResult<T>>,
    config: PollConfig = DEFAULT_POLL_CONFIG,
    logger?: AILogger,
    context?: string,
    provider?: AIProvider
): Promise<T> {
    let currentInterval = config.intervalMs;

    for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
        try {
            const result = await pollFn();

            if (result.status === "completed" && result.result !== undefined) {
                logger?.debug("Polling completed successfully", {
                    context,
                    attempts: attempt + 1
                });
                return result.result;
            }

            if (result.status === "failed") {
                throw new Error(result.error ?? "Operation failed");
            }

            logger?.debug("Operation still processing", {
                context,
                status: result.status,
                progress: result.progress,
                attempt: attempt + 1,
                nextPollMs: currentInterval
            });
        } catch (error) {
            // If it's not a polling status error, rethrow
            if (error instanceof Error && !error.message.includes("still processing")) {
                throw error;
            }
        }

        await sleep(currentInterval);

        // Increase interval with backoff
        currentInterval = Math.min(
            currentInterval * config.backoffMultiplier,
            config.maxIntervalMs
        );
    }

    const totalTimeMs = calculateTotalPollTime(config);
    if (provider) {
        throw new TimeoutError(provider, context ?? "Async operation", totalTimeMs);
    }
    throw new Error(
        `Operation timed out after ${config.maxAttempts} polling attempts (~${Math.round(totalTimeMs / 1000)}s)`
    );
}

/**
 * Calculate approximate total poll time based on config
 */
function calculateTotalPollTime(config: PollConfig): number {
    let total = 0;
    let interval = config.intervalMs;

    for (let i = 0; i < config.maxAttempts; i++) {
        total += interval;
        interval = Math.min(interval * config.backoffMultiplier, config.maxIntervalMs);
    }

    return total;
}

/**
 * Create a poll function from a status check function
 */
export function createPollFn<T, S>(
    checkStatus: () => Promise<S>,
    mapStatus: (status: S) => PollResult<T>
): () => Promise<PollResult<T>> {
    return async () => {
        const status = await checkStatus();
        return mapStatus(status);
    };
}
