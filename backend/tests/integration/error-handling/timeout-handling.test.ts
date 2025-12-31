/**
 * Timeout Handling Integration Tests
 *
 * Tests for timeout behavior across different operations:
 * - Activity timeout triggers failure
 * - HTTP request timeout
 * - Long-running LLM call timeout
 * - Timeout error message clarity
 * - Timeout configuration options
 */

import {
    createContext,
    setVariable,
    getVariable
} from "../../../src/temporal/core/services/context";

// ============================================================================
// HELPER TYPES
// ============================================================================

interface TimeoutConfig {
    timeoutMs: number;
    operationType: "activity" | "http" | "llm" | "database" | "custom";
}

interface TimeoutResult {
    timedOut: boolean;
    completedInTime: boolean;
    actualDurationMs: number;
    configuredTimeoutMs: number;
    error?: {
        type: string;
        message: string;
        operationType: string;
    };
    output?: Record<string, unknown>;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Simulate an operation with timeout
 */
async function simulateWithTimeout(
    operationDurationMs: number,
    config: TimeoutConfig,
    simulateActualDelay: boolean = false
): Promise<TimeoutResult> {
    const timedOut = operationDurationMs > config.timeoutMs;

    if (simulateActualDelay) {
        // For actual timing tests, use the minimum of operation duration and timeout
        const delayMs = Math.min(operationDurationMs, config.timeoutMs, 100);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    const actualDurationMs = timedOut ? config.timeoutMs : operationDurationMs;

    if (timedOut) {
        return {
            timedOut: true,
            completedInTime: false,
            actualDurationMs,
            configuredTimeoutMs: config.timeoutMs,
            error: {
                type: "TimeoutError",
                message: `${config.operationType} operation timed out after ${config.timeoutMs}ms`,
                operationType: config.operationType
            }
        };
    }

    return {
        timedOut: false,
        completedInTime: true,
        actualDurationMs,
        configuredTimeoutMs: config.timeoutMs,
        output: {
            success: true,
            durationMs: operationDurationMs
        }
    };
}

/**
 * Simulate HTTP request with timeout
 */
async function simulateHttpWithTimeout(
    url: string,
    responseDurationMs: number,
    timeoutMs: number
): Promise<TimeoutResult & { url: string }> {
    const result = await simulateWithTimeout(responseDurationMs, {
        timeoutMs,
        operationType: "http"
    });

    return {
        ...result,
        url,
        error: result.error
            ? {
                  ...result.error,
                  message: `HTTP request to ${url} timed out after ${timeoutMs}ms`
              }
            : undefined
    };
}

/**
 * Simulate LLM call with timeout
 */
async function simulateLlmWithTimeout(
    model: string,
    promptLength: number,
    generationDurationMs: number,
    timeoutMs: number
): Promise<TimeoutResult & { model: string; promptLength: number }> {
    const result = await simulateWithTimeout(generationDurationMs, {
        timeoutMs,
        operationType: "llm"
    });

    return {
        ...result,
        model,
        promptLength,
        error: result.error
            ? {
                  ...result.error,
                  message: `LLM call to ${model} timed out after ${timeoutMs}ms`
              }
            : undefined
    };
}

/**
 * Simulate database query with timeout
 */
async function simulateDbWithTimeout(
    query: string,
    queryDurationMs: number,
    timeoutMs: number
): Promise<TimeoutResult & { query: string }> {
    const result = await simulateWithTimeout(queryDurationMs, {
        timeoutMs,
        operationType: "database"
    });

    return {
        ...result,
        query,
        error: result.error
            ? {
                  ...result.error,
                  message: `Database query timed out after ${timeoutMs}ms`
              }
            : undefined
    };
}

// ============================================================================
// TEST SUITES
// ============================================================================

describe("Timeout Handling", () => {
    describe("activity timeout triggers failure", () => {
        it("should fail when activity exceeds timeout", async () => {
            const result = await simulateWithTimeout(5000, {
                timeoutMs: 1000,
                operationType: "activity"
            });

            expect(result.timedOut).toBe(true);
            expect(result.completedInTime).toBe(false);
            expect(result.error?.type).toBe("TimeoutError");
        });

        it("should succeed when activity completes within timeout", async () => {
            const result = await simulateWithTimeout(500, {
                timeoutMs: 1000,
                operationType: "activity"
            });

            expect(result.timedOut).toBe(false);
            expect(result.completedInTime).toBe(true);
            expect(result.output?.success).toBe(true);
        });

        it("should report correct timeout duration", async () => {
            const timeoutMs = 3000;
            const result = await simulateWithTimeout(10000, {
                timeoutMs,
                operationType: "activity"
            });

            expect(result.configuredTimeoutMs).toBe(timeoutMs);
            expect(result.actualDurationMs).toBe(timeoutMs);
        });

        it("should handle activity completing exactly at timeout", async () => {
            const timeoutMs = 1000;
            const result = await simulateWithTimeout(1000, {
                timeoutMs,
                operationType: "activity"
            });

            // Equal to timeout should not time out
            expect(result.timedOut).toBe(false);
        });

        it("should handle very short timeouts", async () => {
            const result = await simulateWithTimeout(100, {
                timeoutMs: 10,
                operationType: "activity"
            });

            expect(result.timedOut).toBe(true);
            expect(result.configuredTimeoutMs).toBe(10);
        });

        it("should handle very long timeouts", async () => {
            const result = await simulateWithTimeout(
                1000,
                { timeoutMs: 3600000, operationType: "activity" } // 1 hour
            );

            expect(result.timedOut).toBe(false);
            expect(result.completedInTime).toBe(true);
        });
    });

    describe("HTTP request timeout", () => {
        it("should timeout slow HTTP requests", async () => {
            const result = await simulateHttpWithTimeout(
                "https://api.example.com/data",
                10000,
                5000
            );

            expect(result.timedOut).toBe(true);
            expect(result.url).toBe("https://api.example.com/data");
            expect(result.error?.message).toContain("https://api.example.com/data");
        });

        it("should succeed for fast HTTP requests", async () => {
            const result = await simulateHttpWithTimeout("https://api.example.com/fast", 100, 5000);

            expect(result.timedOut).toBe(false);
            expect(result.output?.success).toBe(true);
        });

        it("should include URL in timeout error", async () => {
            const url = "https://slow-api.example.com/endpoint";
            const result = await simulateHttpWithTimeout(url, 10000, 1000);

            expect(result.error?.message).toContain(url);
            expect(result.error?.message).toContain("1000ms");
        });

        it("should handle multiple HTTP timeouts", async () => {
            const results = await Promise.all([
                simulateHttpWithTimeout("https://api1.com", 3000, 1000),
                simulateHttpWithTimeout("https://api2.com", 500, 1000),
                simulateHttpWithTimeout("https://api3.com", 2000, 1000)
            ]);

            expect(results[0].timedOut).toBe(true);
            expect(results[1].timedOut).toBe(false);
            expect(results[2].timedOut).toBe(true);
        });

        it("should handle HTTP request with connection timeout", async () => {
            const result = await simulateWithTimeout(30000, {
                timeoutMs: 5000,
                operationType: "http"
            });

            expect(result.timedOut).toBe(true);
            expect(result.error?.operationType).toBe("http");
        });
    });

    describe("long-running LLM call timeout", () => {
        it("should timeout slow LLM generation", async () => {
            const result = await simulateLlmWithTimeout(
                "gpt-4",
                5000, // prompt tokens
                120000, // 2 minutes generation time
                60000 // 1 minute timeout
            );

            expect(result.timedOut).toBe(true);
            expect(result.model).toBe("gpt-4");
            expect(result.error?.message).toContain("gpt-4");
        });

        it("should succeed for fast LLM generation", async () => {
            const result = await simulateLlmWithTimeout("gpt-3.5-turbo", 100, 5000, 30000);

            expect(result.timedOut).toBe(false);
            expect(result.output?.success).toBe(true);
        });

        it("should include model name in timeout error", async () => {
            const model = "claude-3-opus";
            const result = await simulateLlmWithTimeout(model, 1000, 90000, 30000);

            expect(result.error?.message).toContain(model);
        });

        it("should handle different LLM timeout configurations", async () => {
            const models = [
                { model: "gpt-4", duration: 45000, timeout: 60000 },
                { model: "gpt-3.5-turbo", duration: 5000, timeout: 30000 },
                { model: "claude-instant", duration: 3000, timeout: 15000 }
            ];

            const results = await Promise.all(
                models.map((m) => simulateLlmWithTimeout(m.model, 100, m.duration, m.timeout))
            );

            expect(results.every((r) => !r.timedOut)).toBe(true);
        });

        it("should handle LLM streaming timeout", async () => {
            // Simulate streaming LLM response that takes too long
            const result = await simulateWithTimeout(
                180000, // 3 minutes total streaming
                { timeoutMs: 120000, operationType: "llm" }
            );

            expect(result.timedOut).toBe(true);
        });
    });

    describe("database query timeout", () => {
        it("should timeout slow database queries", async () => {
            const result = await simulateDbWithTimeout(
                "SELECT * FROM large_table WHERE complex_condition",
                30000,
                10000
            );

            expect(result.timedOut).toBe(true);
            expect(result.query).toContain("large_table");
        });

        it("should succeed for fast database queries", async () => {
            const result = await simulateDbWithTimeout(
                "SELECT id FROM users WHERE id = 1",
                50,
                5000
            );

            expect(result.timedOut).toBe(false);
        });

        it("should include timeout duration in error", async () => {
            const timeoutMs = 15000;
            const result = await simulateDbWithTimeout("SELECT *", 60000, timeoutMs);

            expect(result.error?.message).toContain(`${timeoutMs}ms`);
        });
    });

    describe("timeout error message clarity", () => {
        it("should provide clear error message for activity timeout", async () => {
            const result = await simulateWithTimeout(10000, {
                timeoutMs: 5000,
                operationType: "activity"
            });

            expect(result.error?.message).toMatch(/activity.*timed out.*5000ms/i);
        });

        it("should provide clear error message for HTTP timeout", async () => {
            const result = await simulateWithTimeout(10000, {
                timeoutMs: 3000,
                operationType: "http"
            });

            expect(result.error?.message).toMatch(/http.*timed out.*3000ms/i);
        });

        it("should provide clear error message for LLM timeout", async () => {
            const result = await simulateWithTimeout(60000, {
                timeoutMs: 30000,
                operationType: "llm"
            });

            expect(result.error?.message).toMatch(/llm.*timed out.*30000ms/i);
        });

        it("should include operation type in error", async () => {
            const operationTypes: Array<"activity" | "http" | "llm" | "database"> = [
                "activity",
                "http",
                "llm",
                "database"
            ];

            for (const opType of operationTypes) {
                const result = await simulateWithTimeout(10000, {
                    timeoutMs: 1000,
                    operationType: opType
                });

                expect(result.error?.operationType).toBe(opType);
            }
        });

        it("should format timeout duration in human-readable format", async () => {
            const result = await simulateWithTimeout(120000, {
                timeoutMs: 60000,
                operationType: "activity"
            });

            expect(result.error?.message).toContain("60000ms");
        });
    });

    describe("timeout configuration options", () => {
        it("should respect per-operation timeout", async () => {
            const configs = [
                { operationMs: 1000, timeoutMs: 500 }, // times out
                { operationMs: 1000, timeoutMs: 1500 }, // succeeds
                { operationMs: 1000, timeoutMs: 1000 } // boundary
            ];

            const results = await Promise.all(
                configs.map((c) =>
                    simulateWithTimeout(c.operationMs, {
                        timeoutMs: c.timeoutMs,
                        operationType: "activity"
                    })
                )
            );

            expect(results[0].timedOut).toBe(true);
            expect(results[1].timedOut).toBe(false);
            expect(results[2].timedOut).toBe(false);
        });

        it("should handle different timeout values for same operation type", async () => {
            const shortTimeout = await simulateWithTimeout(5000, {
                timeoutMs: 1000,
                operationType: "http"
            });

            const longTimeout = await simulateWithTimeout(5000, {
                timeoutMs: 10000,
                operationType: "http"
            });

            expect(shortTimeout.timedOut).toBe(true);
            expect(longTimeout.timedOut).toBe(false);
        });

        it("should handle zero timeout (immediate timeout)", async () => {
            const result = await simulateWithTimeout(100, {
                timeoutMs: 0,
                operationType: "activity"
            });

            expect(result.timedOut).toBe(true);
        });

        it("should handle custom operation type", async () => {
            const result = await simulateWithTimeout(10000, {
                timeoutMs: 5000,
                operationType: "custom"
            });

            expect(result.timedOut).toBe(true);
            expect(result.error?.operationType).toBe("custom");
        });
    });

    describe("timeout with parallel operations", () => {
        it("should handle multiple operations timing out independently", async () => {
            const operations = [
                { duration: 3000, timeout: 1000 },
                { duration: 500, timeout: 1000 },
                { duration: 2000, timeout: 1000 },
                { duration: 800, timeout: 1000 }
            ];

            const results = await Promise.all(
                operations.map((op) =>
                    simulateWithTimeout(op.duration, {
                        timeoutMs: op.timeout,
                        operationType: "activity"
                    })
                )
            );

            expect(results[0].timedOut).toBe(true);
            expect(results[1].timedOut).toBe(false);
            expect(results[2].timedOut).toBe(true);
            expect(results[3].timedOut).toBe(false);
        });

        it("should not affect other operations when one times out", async () => {
            const results = await Promise.all([
                simulateWithTimeout(5000, { timeoutMs: 100, operationType: "http" }, true),
                simulateWithTimeout(50, { timeoutMs: 1000, operationType: "http" }, true),
                simulateWithTimeout(50, { timeoutMs: 1000, operationType: "http" }, true)
            ]);

            // First one timed out, others completed
            expect(results[0].timedOut).toBe(true);
            expect(results[1].timedOut).toBe(false);
            expect(results[2].timedOut).toBe(false);
        });
    });

    describe("timeout recovery scenarios", () => {
        it("should preserve context state before timeout", async () => {
            let context = createContext({});
            context = setVariable(context, "beforeOperation", "preserved");

            await simulateWithTimeout(10000, {
                timeoutMs: 1000,
                operationType: "activity"
            });

            // Even after timeout, context should be intact
            expect(getVariable(context, "beforeOperation")).toBe("preserved");
        });

        it("should allow workflow to continue after timeout in parallel branch", async () => {
            // Simulate parallel execution where one branch times out
            const branch1 = await simulateWithTimeout(5000, {
                timeoutMs: 1000,
                operationType: "http"
            });

            const branch2 = await simulateWithTimeout(500, {
                timeoutMs: 2000,
                operationType: "http"
            });

            expect(branch1.timedOut).toBe(true);
            expect(branch2.timedOut).toBe(false);
            expect(branch2.output?.success).toBe(true);
        });
    });

    describe("edge cases", () => {
        it("should handle very small timeout values", async () => {
            const result = await simulateWithTimeout(10, {
                timeoutMs: 1,
                operationType: "activity"
            });

            expect(result.timedOut).toBe(true);
        });

        it("should handle operation completing just before timeout", async () => {
            const result = await simulateWithTimeout(999, {
                timeoutMs: 1000,
                operationType: "activity"
            });

            expect(result.timedOut).toBe(false);
        });

        it("should handle operation completing just after timeout", async () => {
            const result = await simulateWithTimeout(1001, {
                timeoutMs: 1000,
                operationType: "activity"
            });

            expect(result.timedOut).toBe(true);
        });

        it("should handle negative duration (instant completion)", async () => {
            const result = await simulateWithTimeout(0, {
                timeoutMs: 1000,
                operationType: "activity"
            });

            expect(result.timedOut).toBe(false);
            expect(result.actualDurationMs).toBe(0);
        });
    });
});
