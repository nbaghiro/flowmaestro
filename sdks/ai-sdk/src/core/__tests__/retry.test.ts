/**
 * Tests for retry logic
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
    fastRetryConfig,
    silentTestLogger,
    captureTestLogger
} from "../../__tests__/fixtures/configs";
import { RateLimitError, ProviderUnavailableError, AuthenticationError } from "../errors";
import { DEFAULT_RETRY_CONFIG, withRetry, isRetryableError, getRetryAfterMs } from "../retry";

describe("Retry Logic", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe("DEFAULT_RETRY_CONFIG", () => {
        it("should have correct default values", () => {
            expect(DEFAULT_RETRY_CONFIG.maxRetries).toBe(3);
            expect(DEFAULT_RETRY_CONFIG.initialDelayMs).toBe(1000);
            expect(DEFAULT_RETRY_CONFIG.maxDelayMs).toBe(10000);
            expect(DEFAULT_RETRY_CONFIG.backoffMultiplier).toBe(2);
            expect(DEFAULT_RETRY_CONFIG.retryableStatuses).toEqual([429, 503, 529]);
        });
    });

    describe("isRetryableError", () => {
        it("should return true for AIError with retryable=true", () => {
            const error = new RateLimitError("openai");
            expect(isRetryableError(error, DEFAULT_RETRY_CONFIG)).toBe(true);
        });

        it("should return false for AIError with retryable=false", () => {
            const error = new AuthenticationError("openai", "Invalid key");
            expect(isRetryableError(error, DEFAULT_RETRY_CONFIG)).toBe(false);
        });

        it("should return true for status 429", () => {
            const error = { status: 429 };
            expect(isRetryableError(error, DEFAULT_RETRY_CONFIG)).toBe(true);
        });

        it("should return true for status 503", () => {
            const error = { status: 503 };
            expect(isRetryableError(error, DEFAULT_RETRY_CONFIG)).toBe(true);
        });

        it("should return true for status 529", () => {
            const error = { status: 529 };
            expect(isRetryableError(error, DEFAULT_RETRY_CONFIG)).toBe(true);
        });

        it("should return true for statusCode property", () => {
            const error = { statusCode: 429 };
            expect(isRetryableError(error, DEFAULT_RETRY_CONFIG)).toBe(true);
        });

        it("should return false for non-retryable status", () => {
            const error = { status: 400 };
            expect(isRetryableError(error, DEFAULT_RETRY_CONFIG)).toBe(false);
        });

        it("should return true for overloaded_error type", () => {
            const error = { type: "overloaded_error" };
            expect(isRetryableError(error, DEFAULT_RETRY_CONFIG)).toBe(true);
        });

        it("should return true for rate_limit_error type", () => {
            const error = { type: "rate_limit_error" };
            expect(isRetryableError(error, DEFAULT_RETRY_CONFIG)).toBe(true);
        });

        it("should return true for message containing overloaded", () => {
            const error = { message: "The server is currently overloaded" };
            expect(isRetryableError(error, DEFAULT_RETRY_CONFIG)).toBe(true);
        });

        it("should return true for message containing rate limit", () => {
            const error = { message: "Rate limit exceeded" };
            expect(isRetryableError(error, DEFAULT_RETRY_CONFIG)).toBe(true);
        });

        it("should return true for message containing too many requests", () => {
            const error = { message: "Too many requests" };
            expect(isRetryableError(error, DEFAULT_RETRY_CONFIG)).toBe(true);
        });

        it("should return true for message containing model is loading", () => {
            const error = { message: "Model is loading, please wait" };
            expect(isRetryableError(error, DEFAULT_RETRY_CONFIG)).toBe(true);
        });

        it("should return true for message containing temporarily unavailable", () => {
            const error = { message: "Service temporarily unavailable" };
            expect(isRetryableError(error, DEFAULT_RETRY_CONFIG)).toBe(true);
        });

        it("should return false for non-object error", () => {
            expect(isRetryableError("error string", DEFAULT_RETRY_CONFIG)).toBe(false);
            expect(isRetryableError(null, DEFAULT_RETRY_CONFIG)).toBe(false);
            expect(isRetryableError(undefined, DEFAULT_RETRY_CONFIG)).toBe(false);
            expect(isRetryableError(123, DEFAULT_RETRY_CONFIG)).toBe(false);
        });

        it("should be case-insensitive for message matching", () => {
            const error = { message: "RATE LIMIT EXCEEDED" };
            expect(isRetryableError(error, DEFAULT_RETRY_CONFIG)).toBe(true);
        });
    });

    describe("getRetryAfterMs", () => {
        it("should extract retryAfterMs from AIError", () => {
            const error = new RateLimitError("openai", 5000);
            expect(getRetryAfterMs(error)).toBe(5000);
        });

        it("should extract retryAfter in seconds and convert to ms", () => {
            const error = { retryAfter: 30 };
            expect(getRetryAfterMs(error)).toBe(30000);
        });

        it("should extract retry_after in seconds and convert to ms", () => {
            const error = { retry_after: 60 };
            expect(getRetryAfterMs(error)).toBe(60000);
        });

        it("should extract from Retry-After header", () => {
            const error = {
                headers: { "retry-after": "45" }
            };
            expect(getRetryAfterMs(error)).toBe(45000);
        });

        it("should extract from Retry-After header (capitalized)", () => {
            const error = {
                headers: { "Retry-After": "15" }
            };
            expect(getRetryAfterMs(error)).toBe(15000);
        });

        it("should return undefined when no retry-after info", () => {
            const error = { message: "Some error" };
            expect(getRetryAfterMs(error)).toBeUndefined();
        });

        it("should return undefined for null", () => {
            expect(getRetryAfterMs(null)).toBeUndefined();
        });

        it("should return undefined for non-object", () => {
            expect(getRetryAfterMs("error")).toBeUndefined();
        });
    });

    describe("withRetry", () => {
        it("should return result on first success", async () => {
            const operation = vi.fn().mockResolvedValue("success");

            const resultPromise = withRetry(
                operation,
                fastRetryConfig,
                "test",
                "openai",
                silentTestLogger
            );

            await vi.runAllTimersAsync();
            const result = await resultPromise;

            expect(result).toBe("success");
            expect(operation).toHaveBeenCalledTimes(1);
        });

        it("should retry on retryable error and succeed", async () => {
            const operation = vi
                .fn()
                .mockRejectedValueOnce(new RateLimitError("openai"))
                .mockResolvedValue("success");

            const resultPromise = withRetry(
                operation,
                fastRetryConfig,
                "test",
                "openai",
                silentTestLogger
            );

            await vi.runAllTimersAsync();
            const result = await resultPromise;

            expect(result).toBe("success");
            expect(operation).toHaveBeenCalledTimes(2);
        });

        it("should not retry non-retryable errors", async () => {
            const operation = vi
                .fn()
                .mockRejectedValue(new AuthenticationError("openai", "Invalid key"));

            const resultPromise = withRetry(
                operation,
                fastRetryConfig,
                "test",
                "openai",
                silentTestLogger
            );

            // Attach catch handler before running timers to prevent unhandled rejection
            const catchPromise = resultPromise.catch(() => {});
            await vi.runAllTimersAsync();
            await catchPromise;

            await expect(resultPromise).rejects.toThrow(AuthenticationError);
            expect(operation).toHaveBeenCalledTimes(1);
        });

        it("should respect maxRetries limit", async () => {
            const operation = vi.fn().mockRejectedValue(new RateLimitError("openai"));

            const config = { ...fastRetryConfig, maxRetries: 2 };

            const resultPromise = withRetry(operation, config, "test", "openai", silentTestLogger);

            // Attach catch handler before running timers to prevent unhandled rejection
            const catchPromise = resultPromise.catch(() => {});
            await vi.runAllTimersAsync();
            await catchPromise;

            await expect(resultPromise).rejects.toThrow(RateLimitError);
            // Initial attempt + 2 retries = 3 total
            expect(operation).toHaveBeenCalledTimes(3);
        });

        it("should use exponential backoff", async () => {
            const operation = vi
                .fn()
                .mockRejectedValueOnce(new RateLimitError("openai"))
                .mockRejectedValueOnce(new RateLimitError("openai"))
                .mockResolvedValue("success");

            const config = {
                ...fastRetryConfig,
                initialDelayMs: 100,
                backoffMultiplier: 2
            };

            const resultPromise = withRetry(operation, config, "test", "openai", silentTestLogger);

            // First call happens immediately
            expect(operation).toHaveBeenCalledTimes(1);

            // After initial delay (100ms)
            await vi.advanceTimersByTimeAsync(100);
            expect(operation).toHaveBeenCalledTimes(2);

            // After second delay (200ms = 100 * 2)
            await vi.advanceTimersByTimeAsync(200);
            expect(operation).toHaveBeenCalledTimes(3);

            const result = await resultPromise;
            expect(result).toBe("success");
        });

        it("should use retryAfterMs from error when available", async () => {
            const operation = vi
                .fn()
                .mockRejectedValueOnce(new RateLimitError("openai", 500))
                .mockResolvedValue("success");

            const config = {
                ...fastRetryConfig,
                initialDelayMs: 100
            };

            const resultPromise = withRetry(operation, config, "test", "openai", silentTestLogger);

            // First call happens immediately
            expect(operation).toHaveBeenCalledTimes(1);

            // Should wait for retryAfterMs (500ms), not initialDelayMs (100ms)
            await vi.advanceTimersByTimeAsync(100);
            expect(operation).toHaveBeenCalledTimes(1); // Not retried yet

            await vi.advanceTimersByTimeAsync(400);
            expect(operation).toHaveBeenCalledTimes(2);

            const result = await resultPromise;
            expect(result).toBe("success");
        });

        it("should cap delay at maxDelayMs", async () => {
            const operation = vi
                .fn()
                .mockRejectedValueOnce(new RateLimitError("openai"))
                .mockRejectedValueOnce(new RateLimitError("openai"))
                .mockRejectedValueOnce(new RateLimitError("openai"))
                .mockResolvedValue("success");

            const config = {
                ...fastRetryConfig,
                maxRetries: 5,
                initialDelayMs: 100,
                maxDelayMs: 200,
                backoffMultiplier: 3
            };

            const resultPromise = withRetry(operation, config, "test", "openai", silentTestLogger);

            // First delay: 100ms
            await vi.advanceTimersByTimeAsync(100);
            expect(operation).toHaveBeenCalledTimes(2);

            // Second delay would be 300ms but capped at 200ms
            await vi.advanceTimersByTimeAsync(200);
            expect(operation).toHaveBeenCalledTimes(3);

            // Third delay also capped at 200ms
            await vi.advanceTimersByTimeAsync(200);
            expect(operation).toHaveBeenCalledTimes(4);

            const result = await resultPromise;
            expect(result).toBe("success");
        });

        it("should log retry attempts", async () => {
            const { logger, logs } = captureTestLogger();

            const operation = vi
                .fn()
                .mockRejectedValueOnce(new RateLimitError("openai"))
                .mockResolvedValue("success");

            const resultPromise = withRetry(
                operation,
                fastRetryConfig,
                "test-context",
                "openai",
                logger
            );

            await vi.runAllTimersAsync();
            await resultPromise;

            const warnLogs = logs.filter((l) => l.level === "warn");
            expect(warnLogs.length).toBe(1);
            expect(warnLogs[0].message).toBe("Retryable error, retrying");
            expect(warnLogs[0].context?.context).toBe("test-context");
            expect(warnLogs[0].context?.attempt).toBe(1);
        });

        it("should log error when max retries exceeded", async () => {
            const { logger, logs } = captureTestLogger();

            const operation = vi.fn().mockRejectedValue(new RateLimitError("openai"));

            const config = { ...fastRetryConfig, maxRetries: 1 };

            const resultPromise = withRetry(operation, config, "test-context", "openai", logger);

            // Attach catch handler before running timers to prevent unhandled rejection
            const catchPromise = resultPromise.catch(() => {});
            await vi.runAllTimersAsync();
            await catchPromise;

            await expect(resultPromise).rejects.toThrow();

            const errorLogs = logs.filter((l) => l.level === "error");
            expect(errorLogs.length).toBe(1);
            expect(errorLogs[0].message).toBe("Max retries exceeded");
        });

        it("should work with ProviderUnavailableError", async () => {
            const operation = vi
                .fn()
                .mockRejectedValueOnce(new ProviderUnavailableError("openai"))
                .mockResolvedValue("success");

            const resultPromise = withRetry(
                operation,
                fastRetryConfig,
                "test",
                "openai",
                silentTestLogger
            );

            await vi.runAllTimersAsync();
            const result = await resultPromise;

            expect(result).toBe("success");
            expect(operation).toHaveBeenCalledTimes(2);
        });

        it("should handle generic errors with retryable status", async () => {
            const error = new Error("Service unavailable");
            (error as { status: number }).status = 503;

            const operation = vi.fn().mockRejectedValueOnce(error).mockResolvedValue("success");

            const resultPromise = withRetry(
                operation,
                fastRetryConfig,
                "test",
                "openai",
                silentTestLogger
            );

            await vi.runAllTimersAsync();
            const result = await resultPromise;

            expect(result).toBe("success");
            expect(operation).toHaveBeenCalledTimes(2);
        });
    });
});
