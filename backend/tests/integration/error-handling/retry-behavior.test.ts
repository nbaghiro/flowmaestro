/**
 * Retry Behavior Integration Tests
 *
 * Tests for retry logic and error recovery:
 * - Retryable errors trigger retry (RateLimitError, 429, 500, 502, 503)
 * - Non-retryable errors fail immediately (ValidationError, 400, 401, 404)
 * - Exponential backoff between retries
 * - Max retries exhausted
 * - Success after retry
 */

// Context imports not currently used but kept for potential future use

// ============================================================================
// HELPER TYPES
// ============================================================================

interface RetryConfig {
    maxRetries: number;
    initialDelayMs: number;
    maxDelayMs: number;
    backoffMultiplier: number;
    retryableErrors: string[];
    retryableStatusCodes: number[];
}

interface RetryAttempt {
    attemptNumber: number;
    timestamp: number;
    delayMs: number;
    error?: { type: string; message: string; statusCode?: number };
    success: boolean;
}

interface RetryResult {
    success: boolean;
    attempts: RetryAttempt[];
    totalRetries: number;
    totalDelayMs: number;
    finalError?: { type: string; message: string };
    output?: Record<string, unknown>;
}

type ErrorGenerator = (
    attemptNumber: number
) => { type: string; message: string; statusCode?: number } | null;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxRetries: 3,
    initialDelayMs: 100,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
    retryableErrors: ["RateLimitError", "ServerError", "NetworkError", "TimeoutError"],
    retryableStatusCodes: [429, 500, 502, 503, 504]
};

/**
 * Check if an error is retryable
 */
function isRetryableError(
    error: { type: string; statusCode?: number },
    config: RetryConfig
): boolean {
    if (config.retryableErrors.includes(error.type)) {
        return true;
    }
    if (error.statusCode && config.retryableStatusCodes.includes(error.statusCode)) {
        return true;
    }
    return false;
}

/**
 * Calculate delay with exponential backoff
 */
function calculateBackoffDelay(attemptNumber: number, config: RetryConfig): number {
    const delay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attemptNumber);
    return Math.min(delay, config.maxDelayMs);
}

/**
 * Simulate node execution with retry logic
 */
async function simulateWithRetry(
    errorGenerator: ErrorGenerator,
    config: Partial<RetryConfig> = {},
    simulateDelays: boolean = false
): Promise<RetryResult> {
    const fullConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
    const attempts: RetryAttempt[] = [];
    let totalDelayMs = 0;

    for (let attempt = 0; attempt <= fullConfig.maxRetries; attempt++) {
        const startTime = Date.now();
        const error = errorGenerator(attempt);

        if (!error) {
            // Success
            attempts.push({
                attemptNumber: attempt,
                timestamp: startTime,
                delayMs: 0,
                success: true
            });

            return {
                success: true,
                attempts,
                totalRetries: attempt,
                totalDelayMs,
                output: { result: "success", attemptsTaken: attempt + 1 }
            };
        }

        // Error occurred
        const isRetryable = isRetryableError(error, fullConfig);

        attempts.push({
            attemptNumber: attempt,
            timestamp: startTime,
            delayMs: 0,
            error,
            success: false
        });

        if (!isRetryable || attempt === fullConfig.maxRetries) {
            // Not retryable or max retries reached
            return {
                success: false,
                attempts,
                totalRetries: attempt,
                totalDelayMs,
                finalError: error
            };
        }

        // Calculate backoff delay
        const delayMs = calculateBackoffDelay(attempt, fullConfig);
        totalDelayMs += delayMs;
        attempts[attempts.length - 1].delayMs = delayMs;

        if (simulateDelays) {
            await new Promise((resolve) => setTimeout(resolve, Math.min(delayMs, 50)));
        }
    }

    return {
        success: false,
        attempts,
        totalRetries: fullConfig.maxRetries,
        totalDelayMs,
        finalError: { type: "MaxRetriesExceeded", message: "Maximum retries exceeded" }
    };
}

// ============================================================================
// TEST SUITES
// ============================================================================

describe("Retry Behavior", () => {
    describe("retryable errors trigger retry", () => {
        it("should retry on RateLimitError", async () => {
            let attemptCount = 0;

            const result = await simulateWithRetry((attempt) => {
                attemptCount++;
                if (attempt < 2) {
                    return {
                        type: "RateLimitError",
                        message: "Too many requests",
                        statusCode: 429
                    };
                }
                return null; // Success on 3rd attempt
            });

            expect(result.success).toBe(true);
            expect(result.totalRetries).toBe(2);
            expect(attemptCount).toBe(3);
        });

        it("should retry on 429 status code", async () => {
            const result = await simulateWithRetry((attempt) => {
                if (attempt < 1) {
                    return { type: "HttpError", message: "Rate limited", statusCode: 429 };
                }
                return null;
            });

            expect(result.success).toBe(true);
            expect(result.attempts).toHaveLength(2);
        });

        it("should retry on 500 server error", async () => {
            const result = await simulateWithRetry((attempt) => {
                if (attempt < 2) {
                    return { type: "HttpError", message: "Internal server error", statusCode: 500 };
                }
                return null;
            });

            expect(result.success).toBe(true);
            expect(result.totalRetries).toBe(2);
        });

        it("should retry on 502 bad gateway", async () => {
            const result = await simulateWithRetry((attempt) => {
                if (attempt < 1) {
                    return { type: "HttpError", message: "Bad gateway", statusCode: 502 };
                }
                return null;
            });

            expect(result.success).toBe(true);
        });

        it("should retry on 503 service unavailable", async () => {
            const result = await simulateWithRetry((attempt) => {
                if (attempt < 1) {
                    return { type: "HttpError", message: "Service unavailable", statusCode: 503 };
                }
                return null;
            });

            expect(result.success).toBe(true);
        });

        it("should retry on NetworkError", async () => {
            const result = await simulateWithRetry((attempt) => {
                if (attempt < 2) {
                    return { type: "NetworkError", message: "ECONNRESET" };
                }
                return null;
            });

            expect(result.success).toBe(true);
            expect(result.totalRetries).toBe(2);
        });

        it("should retry on TimeoutError", async () => {
            const result = await simulateWithRetry((attempt) => {
                if (attempt < 1) {
                    return { type: "TimeoutError", message: "Request timeout" };
                }
                return null;
            });

            expect(result.success).toBe(true);
        });

        it("should retry on ServerError", async () => {
            const result = await simulateWithRetry((attempt) => {
                if (attempt < 2) {
                    return { type: "ServerError", message: "Server overloaded" };
                }
                return null;
            });

            expect(result.success).toBe(true);
        });
    });

    describe("non-retryable errors fail immediately", () => {
        it("should not retry on ValidationError", async () => {
            const result = await simulateWithRetry(() => {
                return { type: "ValidationError", message: "Invalid input" };
            });

            expect(result.success).toBe(false);
            expect(result.attempts).toHaveLength(1);
            expect(result.totalRetries).toBe(0);
            expect(result.finalError?.type).toBe("ValidationError");
        });

        it("should not retry on 400 bad request", async () => {
            const result = await simulateWithRetry(() => {
                return { type: "HttpError", message: "Bad request", statusCode: 400 };
            });

            expect(result.success).toBe(false);
            expect(result.attempts).toHaveLength(1);
        });

        it("should not retry on 401 unauthorized", async () => {
            const result = await simulateWithRetry(() => {
                return { type: "HttpError", message: "Unauthorized", statusCode: 401 };
            });

            expect(result.success).toBe(false);
            expect(result.attempts).toHaveLength(1);
            expect(result.finalError?.statusCode).toBe(401);
        });

        it("should not retry on 403 forbidden", async () => {
            const result = await simulateWithRetry(() => {
                return { type: "HttpError", message: "Forbidden", statusCode: 403 };
            });

            expect(result.success).toBe(false);
            expect(result.attempts).toHaveLength(1);
        });

        it("should not retry on 404 not found", async () => {
            const result = await simulateWithRetry(() => {
                return { type: "HttpError", message: "Not found", statusCode: 404 };
            });

            expect(result.success).toBe(false);
            expect(result.attempts).toHaveLength(1);
        });

        it("should not retry on AuthenticationError", async () => {
            const result = await simulateWithRetry(() => {
                return { type: "AuthenticationError", message: "Invalid API key" };
            });

            expect(result.success).toBe(false);
            expect(result.attempts).toHaveLength(1);
        });

        it("should not retry on ContentPolicyError", async () => {
            const result = await simulateWithRetry(() => {
                return { type: "ContentPolicyError", message: "Content violates policy" };
            });

            expect(result.success).toBe(false);
            expect(result.attempts).toHaveLength(1);
        });
    });

    describe("exponential backoff between retries", () => {
        it("should increase delay exponentially", async () => {
            const result = await simulateWithRetry(
                () => ({ type: "RateLimitError", message: "Rate limited" }),
                { maxRetries: 4, initialDelayMs: 100, backoffMultiplier: 2 }
            );

            // Delays: 100, 200, 400, 800
            expect(result.attempts[0].delayMs).toBe(100);
            expect(result.attempts[1].delayMs).toBe(200);
            expect(result.attempts[2].delayMs).toBe(400);
            expect(result.attempts[3].delayMs).toBe(800);
        });

        it("should respect maxDelayMs cap", async () => {
            const result = await simulateWithRetry(
                () => ({ type: "RateLimitError", message: "Rate limited" }),
                { maxRetries: 5, initialDelayMs: 1000, backoffMultiplier: 3, maxDelayMs: 5000 }
            );

            // Delays: 1000, 3000, 5000 (capped), 5000 (capped), 5000 (capped)
            expect(result.attempts[0].delayMs).toBe(1000);
            expect(result.attempts[1].delayMs).toBe(3000);
            expect(result.attempts[2].delayMs).toBe(5000);
            expect(result.attempts[3].delayMs).toBe(5000);
            expect(result.attempts[4].delayMs).toBe(5000);
        });

        it("should calculate correct total delay", async () => {
            const result = await simulateWithRetry(
                () => ({ type: "RateLimitError", message: "Rate limited" }),
                { maxRetries: 3, initialDelayMs: 100, backoffMultiplier: 2 }
            );

            // Total: 100 + 200 + 400 = 700 (no delay after final attempt)
            expect(result.totalDelayMs).toBe(700);
        });

        it("should use custom backoff multiplier", async () => {
            const result = await simulateWithRetry(
                () => ({ type: "ServerError", message: "Error" }),
                { maxRetries: 3, initialDelayMs: 50, backoffMultiplier: 3 }
            );

            // Delays: 50, 150, 450
            expect(result.attempts[0].delayMs).toBe(50);
            expect(result.attempts[1].delayMs).toBe(150);
            expect(result.attempts[2].delayMs).toBe(450);
        });
    });

    describe("max retries exhausted", () => {
        it("should stop after max retries", async () => {
            let attemptCount = 0;

            const result = await simulateWithRetry(
                () => {
                    attemptCount++;
                    return { type: "RateLimitError", message: "Still rate limited" };
                },
                { maxRetries: 3 }
            );

            expect(result.success).toBe(false);
            expect(attemptCount).toBe(4); // Initial + 3 retries
            expect(result.attempts).toHaveLength(4);
        });

        it("should return final error after max retries", async () => {
            const result = await simulateWithRetry(
                () => ({ type: "ServerError", message: "Server down" }),
                { maxRetries: 2 }
            );

            expect(result.success).toBe(false);
            expect(result.finalError).toEqual({ type: "ServerError", message: "Server down" });
        });

        it("should track all attempt errors", async () => {
            let errorCount = 0;

            const result = await simulateWithRetry(
                () => {
                    errorCount++;
                    return { type: "NetworkError", message: `Connection failed (${errorCount})` };
                },
                { maxRetries: 2 }
            );

            expect(result.attempts).toHaveLength(3);
            expect(result.attempts[0].error?.message).toBe("Connection failed (1)");
            expect(result.attempts[1].error?.message).toBe("Connection failed (2)");
            expect(result.attempts[2].error?.message).toBe("Connection failed (3)");
        });

        it("should handle zero max retries", async () => {
            let attemptCount = 0;

            const result = await simulateWithRetry(
                () => {
                    attemptCount++;
                    return { type: "RateLimitError", message: "Rate limited" };
                },
                { maxRetries: 0 }
            );

            expect(result.success).toBe(false);
            expect(attemptCount).toBe(1);
            expect(result.attempts).toHaveLength(1);
        });

        it("should respect high max retries value", async () => {
            let attemptCount = 0;

            const result = await simulateWithRetry(
                (attempt) => {
                    attemptCount++;
                    if (attempt < 7) {
                        return { type: "ServerError", message: "Still failing" };
                    }
                    return null;
                },
                { maxRetries: 10 }
            );

            expect(result.success).toBe(true);
            expect(attemptCount).toBe(8);
        });
    });

    describe("success after retry", () => {
        it("should succeed on second attempt", async () => {
            const result = await simulateWithRetry((attempt) => {
                if (attempt === 0) {
                    return { type: "RateLimitError", message: "Rate limited" };
                }
                return null;
            });

            expect(result.success).toBe(true);
            expect(result.totalRetries).toBe(1);
            expect(result.output).toEqual({ result: "success", attemptsTaken: 2 });
        });

        it("should succeed on third attempt", async () => {
            const result = await simulateWithRetry((attempt) => {
                if (attempt < 2) {
                    return { type: "ServerError", message: "Server busy" };
                }
                return null;
            });

            expect(result.success).toBe(true);
            expect(result.totalRetries).toBe(2);
        });

        it("should succeed on last allowed attempt", async () => {
            const result = await simulateWithRetry(
                (attempt) => {
                    if (attempt < 3) {
                        return { type: "NetworkError", message: "Connection reset" };
                    }
                    return null;
                },
                { maxRetries: 3 }
            );

            expect(result.success).toBe(true);
            expect(result.totalRetries).toBe(3);
            expect(result.attempts).toHaveLength(4);
        });

        it("should succeed immediately without retries needed", async () => {
            const result = await simulateWithRetry(() => null);

            expect(result.success).toBe(true);
            expect(result.totalRetries).toBe(0);
            expect(result.attempts).toHaveLength(1);
        });

        it("should return output on success after retries", async () => {
            const result = await simulateWithRetry((attempt) => {
                if (attempt < 2) {
                    return { type: "TimeoutError", message: "Timeout" };
                }
                return null;
            });

            expect(result.success).toBe(true);
            expect(result.output).toBeDefined();
            expect(result.output?.attemptsTaken).toBe(3);
        });
    });

    describe("custom retry configuration", () => {
        it("should use custom retryable errors list", async () => {
            const result = await simulateWithRetry(
                () => ({ type: "CustomError", message: "Custom retryable" }),
                { retryableErrors: ["CustomError"], maxRetries: 2 }
            );

            // Should retry because CustomError is in the list
            expect(result.attempts).toHaveLength(3);
        });

        it("should use custom retryable status codes", async () => {
            const result = await simulateWithRetry(
                () => ({ type: "HttpError", message: "Custom status", statusCode: 418 }),
                { retryableStatusCodes: [418], maxRetries: 2 }
            );

            // Should retry because 418 is in the list
            expect(result.attempts).toHaveLength(3);
        });

        it("should handle empty retryable lists", async () => {
            const result = await simulateWithRetry(
                () => ({ type: "RateLimitError", message: "Rate limited" }),
                { retryableErrors: [], retryableStatusCodes: [] }
            );

            // Should not retry even for normally retryable errors
            expect(result.attempts).toHaveLength(1);
            expect(result.success).toBe(false);
        });
    });

    describe("mixed error scenarios", () => {
        it("should handle alternating error types", async () => {
            const result = await simulateWithRetry((attempt) => {
                if (attempt === 0) {
                    return { type: "RateLimitError", message: "Rate limited" };
                }
                if (attempt === 1) {
                    return { type: "NetworkError", message: "Connection lost" };
                }
                return null;
            });

            expect(result.success).toBe(true);
            expect(result.attempts[0].error?.type).toBe("RateLimitError");
            expect(result.attempts[1].error?.type).toBe("NetworkError");
        });

        it("should stop on non-retryable after retryable errors", async () => {
            const result = await simulateWithRetry((attempt) => {
                if (attempt < 2) {
                    return { type: "ServerError", message: "Server error" };
                }
                return { type: "ValidationError", message: "Invalid input" };
            });

            expect(result.success).toBe(false);
            expect(result.attempts).toHaveLength(3);
            expect(result.finalError?.type).toBe("ValidationError");
        });

        it("should handle varying status codes", async () => {
            const statusCodes = [503, 500, 429, 200];
            let attemptIndex = 0;

            const result = await simulateWithRetry((_attempt) => {
                const statusCode = statusCodes[attemptIndex++];
                if (statusCode === 200) {
                    return null; // Success
                }
                return { type: "HttpError", message: `Status ${statusCode}`, statusCode };
            });

            expect(result.success).toBe(true);
            expect(result.attempts).toHaveLength(4);
        });
    });

    describe("retry timing", () => {
        it("should track attempt timestamps", async () => {
            const result = await simulateWithRetry(
                (attempt) => {
                    if (attempt < 2) {
                        return { type: "RateLimitError", message: "Rate limited" };
                    }
                    return null;
                },
                {},
                false // Don't simulate actual delays for fast test
            );

            expect(result.attempts[0].timestamp).toBeDefined();
            expect(result.attempts[1].timestamp).toBeDefined();
            expect(result.attempts[2].timestamp).toBeDefined();
        });

        it("should have reasonable delay between actual retries", async () => {
            const startTime = Date.now();

            const result = await simulateWithRetry(
                (attempt) => {
                    if (attempt < 2) {
                        return { type: "ServerError", message: "Error" };
                    }
                    return null;
                },
                { initialDelayMs: 20, backoffMultiplier: 2 },
                true // Simulate delays
            );

            const totalTime = Date.now() - startTime;

            expect(result.success).toBe(true);
            // Should have some delay (capped at 50ms per iteration in simulation)
            expect(totalTime).toBeGreaterThan(30);
        });
    });

    describe("edge cases", () => {
        it("should handle error with missing status code", async () => {
            const result = await simulateWithRetry(() => ({
                type: "UnknownError",
                message: "Something went wrong"
            }));

            expect(result.success).toBe(false);
            expect(result.attempts).toHaveLength(1);
        });

        it("should handle very long error messages", async () => {
            const longMessage = "Error: " + "x".repeat(1000);

            const result = await simulateWithRetry(
                () => ({
                    type: "ServerError",
                    message: longMessage
                }),
                { maxRetries: 1 }
            );

            expect(result.finalError?.message).toBe(longMessage);
        });

        it("should handle concurrent retry scenarios", async () => {
            // Simulate multiple nodes retrying simultaneously
            const results = await Promise.all([
                simulateWithRetry((a) => (a < 1 ? { type: "RateLimitError", message: "1" } : null)),
                simulateWithRetry((a) => (a < 2 ? { type: "ServerError", message: "2" } : null)),
                simulateWithRetry((a) => (a < 1 ? { type: "NetworkError", message: "3" } : null))
            ]);

            expect(results.every((r) => r.success)).toBe(true);
            expect(results[0].totalRetries).toBe(1);
            expect(results[1].totalRetries).toBe(2);
            expect(results[2].totalRetries).toBe(1);
        });
    });
});
