/**
 * Code Node Handler Unit Tests
 *
 * Tests code execution logic with mocked dependencies:
 * - VM2 mocked for JavaScript execution
 * - Child process mocked for Python execution
 * - Handler properties and type support
 * - Schema validation
 */

// Mock VM2 before importing the handler
const mockVmRun = jest.fn();
jest.mock("vm2", () => ({
    VM: jest.fn().mockImplementation(() => ({
        run: mockVmRun
    }))
}));

// Mock child_process for Python execution control
const mockSpawn = jest.fn();
jest.mock("child_process", () => ({
    spawn: mockSpawn,
    execSync: jest.requireActual("child_process").execSync
}));

// Mock fs/promises for temp file handling
const mockWriteFile = jest.fn();
const mockUnlink = jest.fn();
jest.mock("fs/promises", () => ({
    writeFile: mockWriteFile,
    unlink: mockUnlink
}));

import { EventEmitter } from "events";
import {
    createHandlerInput,
    createTestContext,
    assertValidOutput
} from "../../../../../../tests/helpers/handler-test-utils";
import { CodeNodeHandler, createCodeNodeHandler } from "../logic/code";

// Helper to create a mock child process
function createMockChildProcess(
    exitCode: number = 0,
    stdout: string = "",
    stderr: string = ""
): EventEmitter & { stdout: EventEmitter; stderr: EventEmitter; kill: jest.Mock } {
    const process = new EventEmitter() as EventEmitter & {
        stdout: EventEmitter;
        stderr: EventEmitter;
        kill: jest.Mock;
    };
    process.stdout = new EventEmitter();
    process.stderr = new EventEmitter();
    process.kill = jest.fn();

    // Schedule events for next tick to allow Promise setup
    setImmediate(() => {
        if (stdout) {
            process.stdout.emit("data", Buffer.from(stdout));
        }
        if (stderr) {
            process.stderr.emit("data", Buffer.from(stderr));
        }
        process.emit("close", exitCode);
    });

    return process;
}

describe("CodeNodeHandler", () => {
    let handler: CodeNodeHandler;

    beforeEach(() => {
        handler = createCodeNodeHandler();
        jest.clearAllMocks();

        // Default mock implementations
        mockWriteFile.mockResolvedValue(undefined);
        mockUnlink.mockResolvedValue(undefined);
    });

    describe("handler properties", () => {
        it("has correct name", () => {
            expect(handler.name).toBe("CodeNodeHandler");
        });

        it("supports code node type", () => {
            expect(handler.supportedNodeTypes).toContain("code");
        });

        it("can handle code type", () => {
            expect(handler.canHandle("code")).toBe(true);
        });

        it("cannot handle other types", () => {
            expect(handler.canHandle("transform")).toBe(false);
            expect(handler.canHandle("loop")).toBe(false);
        });
    });

    describe("schema validation", () => {
        it("throws error for empty code", async () => {
            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "javascript",
                    code: ""
                }
            });

            await expect(handler.execute(input)).rejects.toThrow(/Code is required/);
        });

        it("throws error for missing language", async () => {
            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    code: "return 42;"
                }
            });

            await expect(handler.execute(input)).rejects.toThrow();
        });

        it("throws error for unsupported language", async () => {
            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "ruby",
                    code: 'puts "hello"'
                }
            });

            await expect(handler.execute(input)).rejects.toThrow();
        });
    });

    describe("JavaScript execution", () => {
        beforeEach(() => {
            mockVmRun.mockReset();
        });

        it("executes simple JavaScript code", async () => {
            mockVmRun.mockResolvedValue(42);

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "javascript",
                    code: "return 42;"
                }
            });

            const output = await handler.execute(input);

            assertValidOutput(output);
            expect(output.result.language).toBe("javascript");
            expect(output.result.output).toBe(42);
        });

        it("returns object results", async () => {
            mockVmRun.mockResolvedValue({ name: "test", value: 123 });

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "javascript",
                    code: 'return { name: "test", value: 123 };'
                }
            });

            const output = await handler.execute(input);

            expect(output.result.output).toEqual({ name: "test", value: 123 });
        });

        it("returns array results", async () => {
            mockVmRun.mockResolvedValue([1, 2, 3, 4, 5]);

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "javascript",
                    code: "return [1, 2, 3, 4, 5];"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.output).toEqual([1, 2, 3, 4, 5]);
        });

        it("handles arithmetic operations", async () => {
            mockVmRun.mockResolvedValue(27);

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "javascript",
                    code: "return (10 + 5) * 2 - 3;"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.output).toBe(27);
        });

        it("returns boolean values", async () => {
            mockVmRun.mockResolvedValue(true);

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "javascript",
                    code: "return true;"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.output).toBe(true);
        });

        it("returns null values", async () => {
            mockVmRun.mockResolvedValue(null);

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "javascript",
                    code: "return null;"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.output).toBeNull();
        });

        it("returns undefined values", async () => {
            mockVmRun.mockResolvedValue(undefined);

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "javascript",
                    code: "const x = 1;"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.output).toBeUndefined();
        });

        it("handles deeply nested objects", async () => {
            mockVmRun.mockResolvedValue({
                level1: { level2: { level3: { value: "deep" } } }
            });

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "javascript",
                    code: 'return { level1: { level2: { level3: { value: "deep" } } } };'
                }
            });

            const output = await handler.execute(input);

            const result = output.result.output as {
                level1: { level2: { level3: { value: string } } };
            };
            expect(result.level1.level2.level3.value).toBe("deep");
        });

        it("handles array construction", async () => {
            mockVmRun.mockResolvedValue([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "javascript",
                    code: "return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.output).toHaveLength(10);
        });

        it("handles JavaScript execution errors", async () => {
            mockVmRun.mockRejectedValue(new Error("ReferenceError: undefinedVar is not defined"));

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "javascript",
                    code: "return undefinedVar;"
                }
            });

            await expect(handler.execute(input)).rejects.toThrow(/undefinedVar/);
        });

        it("passes input variables to sandbox", async () => {
            const { VM } = jest.requireMock("vm2");
            mockVmRun.mockResolvedValue(20);

            const context = createTestContext({
                nodeOutputs: {
                    data: { value: 10 }
                }
            });

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "javascript",
                    code: "return data.value * 2;",
                    inputVariables: ["data"]
                },
                context
            });

            await handler.execute(input);

            // Verify VM was created with sandbox containing data
            expect(VM).toHaveBeenCalledWith(
                expect.objectContaining({
                    sandbox: expect.objectContaining({
                        data: { value: 10 }
                    })
                })
            );
        });

        it("wraps result in outputVariable when specified", async () => {
            mockVmRun.mockResolvedValue(42);

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "javascript",
                    code: "return 42;",
                    outputVariable: "codeResult"
                }
            });

            const output = await handler.execute(input);

            expect(output.result).toHaveProperty("codeResult");
            const wrapped = output.result.codeResult as { output: number };
            expect(wrapped.output).toBe(42);
        });
    });

    describe("sandbox security", () => {
        beforeEach(() => {
            mockVmRun.mockReset();
        });

        it("creates VM with restricted settings", async () => {
            const { VM } = jest.requireMock("vm2");
            mockVmRun.mockResolvedValue("result");

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "javascript",
                    code: "return 'test';"
                }
            });

            await handler.execute(input);

            expect(VM).toHaveBeenCalledWith(
                expect.objectContaining({
                    eval: false,
                    wasm: false,
                    fixAsync: true
                })
            );
        });

        it("uses specified timeout", async () => {
            const { VM } = jest.requireMock("vm2");
            mockVmRun.mockResolvedValue("result");

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "javascript",
                    code: "return 'test';",
                    timeout: 5000
                }
            });

            await handler.execute(input);

            expect(VM).toHaveBeenCalledWith(
                expect.objectContaining({
                    timeout: 5000
                })
            );
        });

        it("uses default timeout when not specified", async () => {
            const { VM } = jest.requireMock("vm2");
            mockVmRun.mockResolvedValue("result");

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "javascript",
                    code: "return 'test';"
                }
            });

            await handler.execute(input);

            expect(VM).toHaveBeenCalledWith(
                expect.objectContaining({
                    timeout: 30000
                })
            );
        });

        it("provides console in sandbox", async () => {
            const { VM } = jest.requireMock("vm2");
            mockVmRun.mockResolvedValue("done");

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "javascript",
                    code: 'console.log("test"); return "done";'
                }
            });

            await handler.execute(input);

            const vmCall = VM.mock.calls[0][0];
            expect(vmCall.sandbox.console).toBeDefined();
            expect(vmCall.sandbox.console.log).toBeDefined();
            expect(vmCall.sandbox.console.error).toBeDefined();
            expect(vmCall.sandbox.console.warn).toBeDefined();
        });
    });

    describe("Python execution", () => {
        beforeEach(() => {
            mockSpawn.mockReset();
            mockWriteFile.mockReset();
            mockUnlink.mockReset();
            mockWriteFile.mockResolvedValue(undefined);
            mockUnlink.mockResolvedValue(undefined);
        });

        it("executes simple Python code", async () => {
            const mockProcess = createMockChildProcess(0, "__FLOWMAESTRO_OUTPUT__\n42");
            mockSpawn.mockReturnValue(mockProcess);

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "python",
                    code: "result = 42"
                }
            });

            const output = await handler.execute(input);

            assertValidOutput(output);
            expect(output.result.language).toBe("python");
            expect(output.result.output).toBe(42);
        });

        it("executes Python with dict return", async () => {
            const mockProcess = createMockChildProcess(
                0,
                '__FLOWMAESTRO_OUTPUT__\n{"name": "test", "value": 123}'
            );
            mockSpawn.mockReturnValue(mockProcess);

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "python",
                    code: 'result = {"name": "test", "value": 123}'
                }
            });

            const output = await handler.execute(input);

            expect(output.result.output).toEqual({ name: "test", value: 123 });
        });

        it("executes Python with list return", async () => {
            const mockProcess = createMockChildProcess(
                0,
                "__FLOWMAESTRO_OUTPUT__\n[1, 2, 3, 4, 5]"
            );
            mockSpawn.mockReturnValue(mockProcess);

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "python",
                    code: "result = [1, 2, 3, 4, 5]"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.output).toEqual([1, 2, 3, 4, 5]);
        });

        it("accesses input variables in Python", async () => {
            const mockProcess = createMockChildProcess(0, "__FLOWMAESTRO_OUTPUT__\n20");
            mockSpawn.mockReturnValue(mockProcess);

            const context = createTestContext({
                nodeOutputs: {
                    data: { value: 10 }
                }
            });

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "python",
                    code: 'result = data["value"] * 2',
                    inputVariables: ["data"]
                },
                context
            });

            const output = await handler.execute(input);

            expect(output.result.output).toBe(20);
        });

        it("captures Python stdout", async () => {
            const mockProcess = createMockChildProcess(
                0,
                'Hello from Python\n__FLOWMAESTRO_OUTPUT__\n"done"'
            );
            mockSpawn.mockReturnValue(mockProcess);

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "python",
                    code: `
print("Hello from Python")
result = "done"
                    `
                }
            });

            const output = await handler.execute(input);

            expect(output.result.stdout).toContain("Hello from Python");
        });

        it("handles Python syntax errors", async () => {
            const mockProcess = createMockChildProcess(1, "", "SyntaxError: invalid syntax");
            mockSpawn.mockReturnValue(mockProcess);

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "python",
                    code: "def broken syntax"
                }
            });

            await expect(handler.execute(input)).rejects.toThrow(/SyntaxError|failed with code/);
        });

        it("includes exit code in metadata", async () => {
            const mockProcess = createMockChildProcess(0, "__FLOWMAESTRO_OUTPUT__\ntrue");
            mockSpawn.mockReturnValue(mockProcess);

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "python",
                    code: "result = True"
                }
            });

            const output = await handler.execute(input);
            const metadata = output.result.metadata as { exitCode: number } | undefined;

            expect(metadata?.exitCode).toBe(0);
        });

        it("writes temp file for Python code", async () => {
            const mockProcess = createMockChildProcess(0, "__FLOWMAESTRO_OUTPUT__\n1");
            mockSpawn.mockReturnValue(mockProcess);

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "python",
                    code: "result = 1"
                }
            });

            await handler.execute(input);

            expect(mockWriteFile).toHaveBeenCalled();
            const writtenContent = mockWriteFile.mock.calls[0][1] as string;
            expect(writtenContent).toContain("result = 1");
            expect(writtenContent).toContain("import json");
        });

        it("cleans up temp file after execution", async () => {
            const mockProcess = createMockChildProcess(0, "__FLOWMAESTRO_OUTPUT__\n1");
            mockSpawn.mockReturnValue(mockProcess);

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "python",
                    code: "result = 1"
                }
            });

            await handler.execute(input);

            expect(mockUnlink).toHaveBeenCalled();
        });

        it("spawns python3 process", async () => {
            const mockProcess = createMockChildProcess(0, "__FLOWMAESTRO_OUTPUT__\n1");
            mockSpawn.mockReturnValue(mockProcess);

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "python",
                    code: "result = 1"
                }
            });

            await handler.execute(input);

            expect(mockSpawn).toHaveBeenCalledWith(
                "python3",
                expect.any(Array),
                expect.any(Object)
            );
        });

        it("handles process spawn errors", async () => {
            const mockProcess = new EventEmitter() as EventEmitter & {
                stdout: EventEmitter;
                stderr: EventEmitter;
                kill: jest.Mock;
            };
            mockProcess.stdout = new EventEmitter();
            mockProcess.stderr = new EventEmitter();
            mockProcess.kill = jest.fn();

            mockSpawn.mockReturnValue(mockProcess);

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "python",
                    code: "result = 1"
                }
            });

            // Emit error after a tick
            setImmediate(() => {
                mockProcess.emit("error", new Error("spawn python3 ENOENT"));
            });

            await expect(handler.execute(input)).rejects.toThrow(/spawn/);
        });
    });

    describe("metrics", () => {
        it("records execution duration for JavaScript", async () => {
            mockVmRun.mockResolvedValue(42);

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "javascript",
                    code: "return 42;"
                }
            });

            const output = await handler.execute(input);

            expect(output.metrics).toBeDefined();
            expect(output.metrics?.durationMs).toBeGreaterThanOrEqual(0);
        });

        it("records execution duration for Python", async () => {
            const mockProcess = createMockChildProcess(0, "__FLOWMAESTRO_OUTPUT__\n1");
            mockSpawn.mockReturnValue(mockProcess);

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "python",
                    code: "result = 1"
                }
            });

            const output = await handler.execute(input);

            expect(output.metrics).toBeDefined();
            expect(output.metrics?.durationMs).toBeGreaterThanOrEqual(0);
        });
    });

    describe("edge cases", () => {
        it("handles code with only comments in JavaScript", async () => {
            mockVmRun.mockResolvedValue(undefined);

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "javascript",
                    code: "// This is a comment"
                }
            });

            const output = await handler.execute(input);
            expect(output.result.output).toBeUndefined();
        });

        it("handles string return values", async () => {
            mockVmRun.mockResolvedValue("hello world");

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "javascript",
                    code: 'return "hello world";'
                }
            });

            const output = await handler.execute(input);
            expect(output.result.output).toBe("hello world");
        });

        it("handles floating point numbers", async () => {
            mockVmRun.mockResolvedValue(3.14159);

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "javascript",
                    code: "return 3.14159;"
                }
            });

            const output = await handler.execute(input);
            expect(output.result.output).toBeCloseTo(3.14159);
        });

        it("handles negative numbers", async () => {
            mockVmRun.mockResolvedValue(-42);

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "javascript",
                    code: "return -42;"
                }
            });

            const output = await handler.execute(input);
            expect(output.result.output).toBe(-42);
        });

        it("handles empty array", async () => {
            mockVmRun.mockResolvedValue([]);

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "javascript",
                    code: "return [];"
                }
            });

            const output = await handler.execute(input);
            expect(output.result.output).toEqual([]);
        });

        it("handles empty object", async () => {
            mockVmRun.mockResolvedValue({});

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "javascript",
                    code: "return {};"
                }
            });

            const output = await handler.execute(input);
            expect(output.result.output).toEqual({});
        });
    });
});
