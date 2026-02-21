/**
 * Tests for polling logic
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
    fastPollConfig,
    silentTestLogger,
    captureTestLogger
} from "../../__tests__/fixtures/configs";
import { TimeoutError } from "../errors";
import { DEFAULT_POLL_CONFIG, pollUntilComplete, createPollFn } from "../polling";
import type { PollResult } from "../../types";

describe("Polling Logic", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe("DEFAULT_POLL_CONFIG", () => {
        it("should have correct default values", () => {
            expect(DEFAULT_POLL_CONFIG.maxAttempts).toBe(120);
            expect(DEFAULT_POLL_CONFIG.intervalMs).toBe(5000);
            expect(DEFAULT_POLL_CONFIG.backoffMultiplier).toBe(1.5);
            expect(DEFAULT_POLL_CONFIG.maxIntervalMs).toBe(30000);
        });
    });

    describe("pollUntilComplete", () => {
        it("should return result immediately when status is completed", async () => {
            const pollFn = vi.fn().mockResolvedValue({
                status: "completed",
                result: "success-data"
            } as PollResult<string>);

            const resultPromise = pollUntilComplete(
                pollFn,
                fastPollConfig,
                silentTestLogger,
                "test"
            );

            await vi.runAllTimersAsync();
            const result = await resultPromise;

            expect(result).toBe("success-data");
            expect(pollFn).toHaveBeenCalledTimes(1);
        });

        it("should poll until completion", async () => {
            const pollFn = vi
                .fn()
                .mockResolvedValueOnce({ status: "pending" } as PollResult<string>)
                .mockResolvedValueOnce({ status: "processing" } as PollResult<string>)
                .mockResolvedValue({ status: "completed", result: "done" } as PollResult<string>);

            const resultPromise = pollUntilComplete(
                pollFn,
                fastPollConfig,
                silentTestLogger,
                "test"
            );

            // First poll is immediate
            expect(pollFn).toHaveBeenCalledTimes(1);

            // Wait for first interval
            await vi.advanceTimersByTimeAsync(fastPollConfig.intervalMs);
            expect(pollFn).toHaveBeenCalledTimes(2);

            // Wait for second interval (with backoff)
            await vi.advanceTimersByTimeAsync(
                fastPollConfig.intervalMs * fastPollConfig.backoffMultiplier
            );
            expect(pollFn).toHaveBeenCalledTimes(3);

            const result = await resultPromise;
            expect(result).toBe("done");
        });

        it("should throw on failed status", async () => {
            const pollFn = vi
                .fn()
                .mockResolvedValueOnce({ status: "pending" } as PollResult<string>)
                .mockResolvedValue({
                    status: "failed",
                    error: "Generation failed"
                } as PollResult<string>);

            const resultPromise = pollUntilComplete(
                pollFn,
                fastPollConfig,
                silentTestLogger,
                "test"
            );

            // Attach catch handler before running timers to prevent unhandled rejection
            const catchPromise = resultPromise.catch(() => {});
            await vi.runAllTimersAsync();
            await catchPromise;

            await expect(resultPromise).rejects.toThrow("Generation failed");
        });

        it("should throw default error message on failed status without error", async () => {
            const pollFn = vi.fn().mockResolvedValue({ status: "failed" } as PollResult<string>);

            const resultPromise = pollUntilComplete(
                pollFn,
                fastPollConfig,
                silentTestLogger,
                "test"
            );

            // Attach catch handler before running timers to prevent unhandled rejection
            const catchPromise = resultPromise.catch(() => {});
            await vi.runAllTimersAsync();
            await catchPromise;

            await expect(resultPromise).rejects.toThrow("Operation failed");
        });

        it("should throw TimeoutError when provider is specified", async () => {
            const pollFn = vi
                .fn()
                .mockResolvedValue({ status: "processing" } as PollResult<string>);

            const config = { ...fastPollConfig, maxAttempts: 2 };

            const resultPromise = pollUntilComplete(
                pollFn,
                config,
                silentTestLogger,
                "Video generation",
                "runway"
            );

            // Attach catch handler before running timers to prevent unhandled rejection
            const catchPromise = resultPromise.catch(() => {});
            await vi.runAllTimersAsync();
            await catchPromise;

            await expect(resultPromise).rejects.toThrow(TimeoutError);
        });

        it("should throw generic error when provider is not specified", async () => {
            const pollFn = vi
                .fn()
                .mockResolvedValue({ status: "processing" } as PollResult<string>);

            const config = { ...fastPollConfig, maxAttempts: 2 };

            const resultPromise = pollUntilComplete(
                pollFn,
                config,
                silentTestLogger,
                "Video generation"
            );

            // Attach catch handler before running timers to prevent unhandled rejection
            const catchPromise = resultPromise.catch(() => {});
            await vi.runAllTimersAsync();
            await catchPromise;

            await expect(resultPromise).rejects.toThrow("Operation timed out");
        });

        it("should use exponential backoff up to maxIntervalMs", async () => {
            const pollFn = vi
                .fn()
                .mockResolvedValueOnce({ status: "pending" } as PollResult<string>)
                .mockResolvedValueOnce({ status: "pending" } as PollResult<string>)
                .mockResolvedValueOnce({ status: "pending" } as PollResult<string>)
                .mockResolvedValue({ status: "completed", result: "done" } as PollResult<string>);

            const config = {
                ...fastPollConfig,
                intervalMs: 10,
                backoffMultiplier: 3,
                maxIntervalMs: 25,
                maxAttempts: 10
            };

            const resultPromise = pollUntilComplete(pollFn, config, silentTestLogger, "test");

            // First poll immediate
            expect(pollFn).toHaveBeenCalledTimes(1);

            // First interval: 10ms
            await vi.advanceTimersByTimeAsync(10);
            expect(pollFn).toHaveBeenCalledTimes(2);

            // Second interval: 10 * 3 = 30, but capped at 25ms
            await vi.advanceTimersByTimeAsync(25);
            expect(pollFn).toHaveBeenCalledTimes(3);

            // Third interval: still capped at 25ms
            await vi.advanceTimersByTimeAsync(25);
            expect(pollFn).toHaveBeenCalledTimes(4);

            const result = await resultPromise;
            expect(result).toBe("done");
        });

        it("should log debug messages", async () => {
            const { logger, logs } = captureTestLogger();

            const pollFn = vi
                .fn()
                .mockResolvedValueOnce({ status: "pending", progress: 25 } as PollResult<string>)
                .mockResolvedValue({ status: "completed", result: "done" } as PollResult<string>);

            const resultPromise = pollUntilComplete(pollFn, fastPollConfig, logger, "test-context");

            await vi.runAllTimersAsync();
            await resultPromise;

            const debugLogs = logs.filter((l) => l.level === "debug");
            expect(debugLogs.length).toBeGreaterThanOrEqual(2);

            const processingLog = debugLogs.find((l) => l.message === "Operation still processing");
            expect(processingLog).toBeDefined();
            expect(processingLog?.context?.status).toBe("pending");
            expect(processingLog?.context?.progress).toBe(25);

            const completedLog = debugLogs.find(
                (l) => l.message === "Polling completed successfully"
            );
            expect(completedLog).toBeDefined();
        });

        it("should rethrow errors that dont contain still processing", async () => {
            const pollFn = vi.fn().mockRejectedValue(new Error("Network error"));

            const resultPromise = pollUntilComplete(
                pollFn,
                fastPollConfig,
                silentTestLogger,
                "test"
            );

            // Attach catch handler before running timers to prevent unhandled rejection
            const catchPromise = resultPromise.catch(() => {});
            await vi.runAllTimersAsync();
            await catchPromise;

            await expect(resultPromise).rejects.toThrow("Network error");
        });

        it("should rethrow non-processing errors", async () => {
            const pollFn = vi.fn().mockRejectedValue(new Error("Fatal error"));

            const resultPromise = pollUntilComplete(
                pollFn,
                fastPollConfig,
                silentTestLogger,
                "test"
            );

            // Attach catch handler before running timers to prevent unhandled rejection
            const catchPromise = resultPromise.catch(() => {});
            await vi.runAllTimersAsync();
            await catchPromise;

            await expect(resultPromise).rejects.toThrow("Fatal error");
        });

        it("should use default config when not provided", async () => {
            const pollFn = vi
                .fn()
                .mockResolvedValue({ status: "completed", result: "data" } as PollResult<string>);

            const result = await pollUntilComplete(pollFn);

            expect(result).toBe("data");
        });
    });

    describe("createPollFn", () => {
        it("should create a poll function from status checker", async () => {
            interface JobStatus {
                state: "queued" | "running" | "done" | "error";
                output?: string;
                errorMessage?: string;
            }

            const checkStatus = vi.fn().mockResolvedValue({
                state: "done",
                output: "result-data"
            } as JobStatus);

            const mapStatus = (status: JobStatus): PollResult<string> => {
                switch (status.state) {
                    case "queued":
                        return { status: "pending" };
                    case "running":
                        return { status: "processing" };
                    case "done":
                        return { status: "completed", result: status.output };
                    case "error":
                        return { status: "failed", error: status.errorMessage };
                }
            };

            const pollFn = createPollFn(checkStatus, mapStatus);
            const result = await pollFn();

            expect(result.status).toBe("completed");
            expect(result.result).toBe("result-data");
            expect(checkStatus).toHaveBeenCalledTimes(1);
        });

        it("should work with pollUntilComplete", async () => {
            vi.useRealTimers();

            let callCount = 0;
            const checkStatus = vi.fn().mockImplementation(async () => {
                callCount++;
                if (callCount < 3) {
                    return { state: "running" };
                }
                return { state: "done", output: "final-result" };
            });

            const mapStatus = (status: { state: string; output?: string }) => {
                if (status.state === "done") {
                    return { status: "completed" as const, result: status.output };
                }
                return { status: "processing" as const };
            };

            const pollFn = createPollFn(checkStatus, mapStatus);

            const result = await pollUntilComplete(
                pollFn,
                { ...fastPollConfig, intervalMs: 1 },
                silentTestLogger,
                "test"
            );

            expect(result).toBe("final-result");
            expect(checkStatus).toHaveBeenCalledTimes(3);
        });
    });
});
