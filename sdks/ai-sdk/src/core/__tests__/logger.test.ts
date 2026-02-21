/**
 * Tests for logger utilities
 */

/* eslint-disable no-console */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { consoleLogger, silentLogger, createPrefixedLogger } from "../logger";
import type { AILogger } from "../../types";

describe("Logger Utilities", () => {
    describe("silentLogger", () => {
        it("should have all required methods", () => {
            expect(typeof silentLogger.debug).toBe("function");
            expect(typeof silentLogger.info).toBe("function");
            expect(typeof silentLogger.warn).toBe("function");
            expect(typeof silentLogger.error).toBe("function");
        });

        it("should not throw when called", () => {
            expect(() => silentLogger.debug("test")).not.toThrow();
            expect(() => silentLogger.info("test")).not.toThrow();
            expect(() => silentLogger.warn("test")).not.toThrow();
            expect(() => silentLogger.error("test")).not.toThrow();
        });

        it("should return undefined", () => {
            expect(silentLogger.debug("test")).toBeUndefined();
            expect(silentLogger.info("test")).toBeUndefined();
            expect(silentLogger.warn("test")).toBeUndefined();
            expect(silentLogger.error("test")).toBeUndefined();
        });

        it("should accept context parameter", () => {
            expect(() => silentLogger.debug("test", { key: "value" })).not.toThrow();
            expect(() => silentLogger.info("test", { key: "value" })).not.toThrow();
            expect(() => silentLogger.warn("test", { key: "value" })).not.toThrow();
        });

        it("should accept error parameter", () => {
            const error = new Error("Test error");
            expect(() => silentLogger.error("test", error, { key: "value" })).not.toThrow();
        });
    });

    describe("consoleLogger", () => {
        const originalEnv = process.env;

        beforeEach(() => {
            vi.spyOn(console, "debug").mockImplementation(() => {});
            vi.spyOn(console, "info").mockImplementation(() => {});
            vi.spyOn(console, "warn").mockImplementation(() => {});
            vi.spyOn(console, "error").mockImplementation(() => {});
            process.env = { ...originalEnv };
        });

        afterEach(() => {
            vi.restoreAllMocks();
            process.env = originalEnv;
        });

        it("should have all required methods", () => {
            expect(typeof consoleLogger.debug).toBe("function");
            expect(typeof consoleLogger.info).toBe("function");
            expect(typeof consoleLogger.warn).toBe("function");
            expect(typeof consoleLogger.error).toBe("function");
        });

        it("should call console.info with prefix", () => {
            consoleLogger.info("Test message");

            expect(console.info).toHaveBeenCalledWith("[AI-SDK INFO] Test message", "");
        });

        it("should call console.info with context", () => {
            consoleLogger.info("Test message", { key: "value" });

            expect(console.info).toHaveBeenCalledWith("[AI-SDK INFO] Test message", {
                key: "value"
            });
        });

        it("should call console.warn with prefix", () => {
            consoleLogger.warn("Warning message");

            expect(console.warn).toHaveBeenCalledWith("[AI-SDK WARN] Warning message", "");
        });

        it("should call console.error with error details", () => {
            const error = new Error("Test error");
            consoleLogger.error("Error message", error, { extra: "context" });

            expect(console.error).toHaveBeenCalledWith("[AI-SDK ERROR] Error message", {
                error: "Test error",
                stack: expect.any(String),
                extra: "context"
            });
        });

        it("should call console.error without error", () => {
            consoleLogger.error("Error message");

            expect(console.error).toHaveBeenCalledWith("[AI-SDK ERROR] Error message", {
                error: undefined,
                stack: undefined
            });
        });

        describe("debug logging", () => {
            it("should not call console.debug when DEBUG is not set", () => {
                delete process.env.DEBUG;
                delete process.env.AI_SDK_DEBUG;

                consoleLogger.debug("Debug message");

                expect(console.debug).not.toHaveBeenCalled();
            });

            it("should call console.debug when DEBUG is set", () => {
                process.env.DEBUG = "true";

                consoleLogger.debug("Debug message");

                expect(console.debug).toHaveBeenCalledWith("[AI-SDK DEBUG] Debug message", "");
            });

            it("should call console.debug when AI_SDK_DEBUG is set", () => {
                process.env.AI_SDK_DEBUG = "1";

                consoleLogger.debug("Debug message", { data: "test" });

                expect(console.debug).toHaveBeenCalledWith("[AI-SDK DEBUG] Debug message", {
                    data: "test"
                });
            });
        });
    });

    describe("createPrefixedLogger", () => {
        it("should create a logger that prefixes messages", () => {
            const calls: Array<{
                method: string;
                message: string;
                context?: Record<string, unknown>;
            }> = [];

            const baseLogger: AILogger = {
                debug: (message, context) => calls.push({ method: "debug", message, context }),
                info: (message, context) => calls.push({ method: "info", message, context }),
                warn: (message, context) => calls.push({ method: "warn", message, context }),
                error: (message, _error, context) =>
                    calls.push({ method: "error", message, context })
            };

            const prefixedLogger = createPrefixedLogger("MyPrefix", baseLogger);

            prefixedLogger.debug("Debug message", { a: 1 });
            prefixedLogger.info("Info message", { b: 2 });
            prefixedLogger.warn("Warn message", { c: 3 });
            prefixedLogger.error("Error message", new Error("test"), { d: 4 });

            expect(calls).toHaveLength(4);
            expect(calls[0]).toEqual({
                method: "debug",
                message: "[MyPrefix] Debug message",
                context: { a: 1 }
            });
            expect(calls[1]).toEqual({
                method: "info",
                message: "[MyPrefix] Info message",
                context: { b: 2 }
            });
            expect(calls[2]).toEqual({
                method: "warn",
                message: "[MyPrefix] Warn message",
                context: { c: 3 }
            });
            expect(calls[3]).toEqual({
                method: "error",
                message: "[MyPrefix] Error message",
                context: { d: 4 }
            });
        });

        it("should pass error through for error method", () => {
            let capturedError: Error | undefined;

            const baseLogger: AILogger = {
                debug: () => {},
                info: () => {},
                warn: () => {},
                error: (_message, error) => {
                    capturedError = error;
                }
            };

            const prefixedLogger = createPrefixedLogger("Test", baseLogger);
            const testError = new Error("Test error");

            prefixedLogger.error("Error", testError);

            expect(capturedError).toBe(testError);
        });

        it("should work with nested prefixed loggers", () => {
            const calls: string[] = [];

            const baseLogger: AILogger = {
                debug: (message) => calls.push(message),
                info: (message) => calls.push(message),
                warn: (message) => calls.push(message),
                error: (message) => calls.push(message)
            };

            const level1Logger = createPrefixedLogger("L1", baseLogger);
            const level2Logger = createPrefixedLogger("L2", level1Logger);

            level2Logger.info("Nested message");

            expect(calls[0]).toBe("[L1] [L2] Nested message");
        });

        it("should handle undefined context", () => {
            const calls: Array<{ context?: Record<string, unknown> }> = [];

            const baseLogger: AILogger = {
                debug: (_message, context) => calls.push({ context }),
                info: (_message, context) => calls.push({ context }),
                warn: (_message, context) => calls.push({ context }),
                error: (_message, _error, context) => calls.push({ context })
            };

            const prefixedLogger = createPrefixedLogger("Test", baseLogger);

            prefixedLogger.info("No context");

            expect(calls[0].context).toBeUndefined();
        });
    });
});
