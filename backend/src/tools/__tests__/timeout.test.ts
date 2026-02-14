/**
 * Tests for Tool Execution Timeout
 */

import {
    executeWithTimeout,
    withTimeout,
    ToolTimeoutError,
    DEFAULT_TOOL_TIMEOUTS,
    getToolTimeout,
    isAbortError
} from "../timeout";

describe("executeWithTimeout", () => {
    it("should execute function successfully when within timeout", async () => {
        const result = await executeWithTimeout(
            "test_tool",
            "function",
            async () => ({ success: true, data: "test" })
        );

        expect(result).toEqual({ success: true, data: "test" });
    });

    it("should pass abort signal to function", async () => {
        let receivedSignal: AbortSignal | undefined;

        await executeWithTimeout(
            "test_tool",
            "function",
            async (signal) => {
                receivedSignal = signal;
                return { success: true };
            }
        );

        expect(receivedSignal).toBeDefined();
        expect(receivedSignal?.aborted).toBe(false);
    });

    it("should throw ToolTimeoutError when execution exceeds timeout", async () => {
        const slowFunction = async () => {
            await new Promise((resolve) => setTimeout(resolve, 200));
            return { success: true };
        };

        await expect(
            executeWithTimeout(
                "slow_tool",
                "function",
                slowFunction,
                { timeoutMs: 50 }
            )
        ).rejects.toThrow(ToolTimeoutError);
    });

    it("should abort signal when timeout occurs", async () => {
        let signalAborted = false;

        const slowFunction = async (signal: AbortSignal) => {
            signal.addEventListener("abort", () => {
                signalAborted = true;
            });
            await new Promise((resolve) => setTimeout(resolve, 200));
            return { success: true };
        };

        try {
            await executeWithTimeout(
                "slow_tool",
                "function",
                slowFunction,
                { timeoutMs: 50 }
            );
        } catch {
            // Expected to throw
        }

        // Give a bit of time for the abort handler to fire
        await new Promise((resolve) => setTimeout(resolve, 10));
        expect(signalAborted).toBe(true);
    });

    it("should use tool type default timeout when not specified", async () => {
        const startTime = Date.now();

        const fastFunction = async () => {
            return { success: true };
        };

        await executeWithTimeout("test_tool", "function", fastFunction);

        const duration = Date.now() - startTime;
        // Should complete quickly, not wait for full timeout
        expect(duration).toBeLessThan(1000);
    });

    it("should use custom timeout from config", async () => {
        const slowFunction = async () => {
            await new Promise((resolve) => setTimeout(resolve, 100));
            return { success: true };
        };

        // Should succeed with 200ms timeout
        const result = await executeWithTimeout(
            "slow_tool",
            "function",
            slowFunction,
            { timeoutMs: 200 }
        );

        expect(result).toEqual({ success: true });
    });

    it("should re-throw non-timeout errors", async () => {
        const errorFunction = async () => {
            throw new Error("Custom error");
        };

        await expect(
            executeWithTimeout("error_tool", "function", errorFunction)
        ).rejects.toThrow("Custom error");
    });

    it("should include tool info in ToolTimeoutError", async () => {
        const slowFunction = async () => {
            await new Promise((resolve) => setTimeout(resolve, 200));
            return { success: true };
        };

        try {
            await executeWithTimeout(
                "my_tool",
                "mcp",
                slowFunction,
                { timeoutMs: 50 }
            );
            fail("Should have thrown");
        } catch (error) {
            expect(error).toBeInstanceOf(ToolTimeoutError);
            const timeoutError = error as ToolTimeoutError;
            expect(timeoutError.toolName).toBe("my_tool");
            expect(timeoutError.toolType).toBe("mcp");
            expect(timeoutError.timeoutMs).toBe(50);
        }
    });
});

describe("withTimeout", () => {
    it("should create a wrapped function with timeout", async () => {
        // Test that withTimeout creates a working wrapper
        const wrapper = withTimeout<[number, number], number>("add_tool", "function");
        const originalFn = async (_signal: AbortSignal, x: number, y: number): Promise<number> => {
            return x + y;
        };
        const wrappedFn = wrapper(originalFn);

        const result = await wrappedFn(1, 2);
        expect(result).toBe(3);
    });

    it("should apply timeout to wrapped function", async () => {
        const wrapper = withTimeout<[], string>("slow_tool", "function", { timeoutMs: 50 });
        const slowFn = async (_signal: AbortSignal): Promise<string> => {
            await new Promise((resolve) => setTimeout(resolve, 200));
            return "done";
        };
        const wrappedFn = wrapper(slowFn);

        await expect(wrappedFn()).rejects.toThrow(ToolTimeoutError);
    });
});

describe("getToolTimeout", () => {
    it("should return default timeout for tool type", () => {
        expect(getToolTimeout("any_tool", "function")).toBe(DEFAULT_TOOL_TIMEOUTS.function);
        expect(getToolTimeout("any_tool", "mcp")).toBe(DEFAULT_TOOL_TIMEOUTS.mcp);
        expect(getToolTimeout("any_tool", "workflow")).toBe(DEFAULT_TOOL_TIMEOUTS.workflow);
        expect(getToolTimeout("any_tool", "agent")).toBe(DEFAULT_TOOL_TIMEOUTS.agent);
    });

    it("should return default timeout for unknown tool type", () => {
        expect(getToolTimeout("any_tool", "unknown_type")).toBe(DEFAULT_TOOL_TIMEOUTS.default);
    });

    it("should use override for specific tool name", () => {
        const overrides = {
            "special_tool": 5000
        };

        expect(getToolTimeout("special_tool", "function", overrides)).toBe(5000);
        expect(getToolTimeout("normal_tool", "function", overrides)).toBe(
            DEFAULT_TOOL_TIMEOUTS.function
        );
    });
});

describe("isAbortError", () => {
    it("should return true for AbortError", () => {
        // Create an error that mimics AbortError
        const abortError = new Error("The operation was aborted");
        abortError.name = "AbortError";
        expect(isAbortError(abortError)).toBe(true);
    });

    it("should return true for error with aborted message", () => {
        const error = new Error("Request was aborted");
        expect(isAbortError(error)).toBe(true);
    });

    it("should return false for other errors", () => {
        const error = new Error("Some other error");
        expect(isAbortError(error)).toBe(false);
    });

    it("should return false for non-error values", () => {
        expect(isAbortError("string")).toBe(false);
        expect(isAbortError(null)).toBe(false);
        expect(isAbortError(undefined)).toBe(false);
        expect(isAbortError(123)).toBe(false);
    });
});

describe("DEFAULT_TOOL_TIMEOUTS", () => {
    it("should have reasonable default values", () => {
        // Function tools should be relatively quick
        expect(DEFAULT_TOOL_TIMEOUTS.function).toBeLessThanOrEqual(60000);

        // MCP tools need more time for external calls
        expect(DEFAULT_TOOL_TIMEOUTS.mcp).toBeGreaterThan(DEFAULT_TOOL_TIMEOUTS.function);

        // Workflows and agents need even more time
        expect(DEFAULT_TOOL_TIMEOUTS.workflow).toBeGreaterThan(DEFAULT_TOOL_TIMEOUTS.mcp);
        expect(DEFAULT_TOOL_TIMEOUTS.agent).toBeGreaterThan(DEFAULT_TOOL_TIMEOUTS.workflow);

        // Default should be reasonable
        expect(DEFAULT_TOOL_TIMEOUTS.default).toBeGreaterThan(0);
    });
});
