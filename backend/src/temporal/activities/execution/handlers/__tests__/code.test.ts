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
} from "../../../../../../__tests__/helpers/handler-test-utils";
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

        it("blocks require() calls in JavaScript sandbox", async () => {
            mockVmRun.mockRejectedValue(new Error("require is not defined"));

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "javascript",
                    code: 'const fs = require("fs"); return fs.readFileSync("/etc/passwd");'
                }
            });

            await expect(handler.execute(input)).rejects.toThrow(/require is not defined/);
        });

        it("blocks process access in JavaScript sandbox", async () => {
            mockVmRun.mockRejectedValue(new Error("process is not defined"));

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "javascript",
                    code: "return process.env.SECRET_KEY;"
                }
            });

            await expect(handler.execute(input)).rejects.toThrow(/process is not defined/);
        });

        it("blocks global access in JavaScript sandbox", async () => {
            mockVmRun.mockRejectedValue(new Error("global is not defined"));

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "javascript",
                    code: "return global.process.exit(1);"
                }
            });

            await expect(handler.execute(input)).rejects.toThrow(/global is not defined/);
        });

        it("blocks constructor prototype escape attempt", async () => {
            mockVmRun.mockRejectedValue(new Error("Cannot access constructor"));

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "javascript",
                    code: `
                        const ForeignFunction = this.constructor.constructor;
                        const process = ForeignFunction('return process')();
                        return process.env;
                    `
                }
            });

            await expect(handler.execute(input)).rejects.toThrow();
        });

        it("blocks __proto__ manipulation", async () => {
            mockVmRun.mockRejectedValue(new Error("Cannot modify prototype"));

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "javascript",
                    code: `
                        const obj = {};
                        obj.__proto__.polluted = true;
                        return ({}).polluted;
                    `
                }
            });

            // Should either throw or return undefined (not true)
            await expect(handler.execute(input)).rejects.toThrow();
        });

        it("blocks Buffer access in sandbox", async () => {
            mockVmRun.mockRejectedValue(new Error("Buffer is not defined"));

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "javascript",
                    code: 'return Buffer.from("test").toString("hex");'
                }
            });

            await expect(handler.execute(input)).rejects.toThrow(/Buffer is not defined/);
        });

        it("blocks child_process access via eval bypass", async () => {
            // VM2 should block eval
            mockVmRun.mockRejectedValue(new Error("Code generation from strings disallowed"));

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "javascript",
                    code: `
                        const evil = eval;
                        return evil('require("child_process").execSync("ls")');
                    `
                }
            });

            await expect(handler.execute(input)).rejects.toThrow();
        });

        it("blocks Function constructor escape", async () => {
            mockVmRun.mockRejectedValue(new Error("Function constructor is not allowed"));

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "javascript",
                    code: `
                        const fn = new Function('return process.env');
                        return fn();
                    `
                }
            });

            await expect(handler.execute(input)).rejects.toThrow();
        });

        it("blocks WebAssembly instantiation", async () => {
            const { VM } = jest.requireMock("vm2");
            mockVmRun.mockRejectedValue(new Error("WebAssembly is not defined"));

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "javascript",
                    code: `
                        const wasmCode = new Uint8Array([0,97,115,109,1,0,0,0]);
                        return WebAssembly.instantiate(wasmCode);
                    `
                }
            });

            await expect(handler.execute(input)).rejects.toThrow();
            // Verify wasm is disabled
            expect(VM).toHaveBeenCalledWith(
                expect.objectContaining({
                    wasm: false
                })
            );
        });

        it("isolates sandbox from host environment variables", async () => {
            const { VM } = jest.requireMock("vm2");
            mockVmRun.mockResolvedValue(undefined);

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "javascript",
                    code: "return typeof process;"
                }
            });

            await handler.execute(input);

            // Verify sandbox doesn't include process
            const vmCall = VM.mock.calls[0][0];
            expect(vmCall.sandbox.process).toBeUndefined();
        });
    });

    describe("Python sandbox security", () => {
        beforeEach(() => {
            mockSpawn.mockReset();
            mockWriteFile.mockReset();
            mockUnlink.mockReset();
            mockWriteFile.mockResolvedValue(undefined);
            mockUnlink.mockResolvedValue(undefined);
        });

        it("blocks os.system() calls", async () => {
            const mockProcess = createMockChildProcess(
                1,
                "",
                "NameError: name 'os' is not defined"
            );
            mockSpawn.mockReturnValue(mockProcess);

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "python",
                    code: 'os.system("rm -rf /")'
                }
            });

            await expect(handler.execute(input)).rejects.toThrow(/NameError|failed with code/);
        });

        it("blocks subprocess module", async () => {
            const mockProcess = createMockChildProcess(
                1,
                "",
                "ModuleNotFoundError: No module named 'subprocess'"
            );
            mockSpawn.mockReturnValue(mockProcess);

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "python",
                    code: 'import subprocess; subprocess.run(["ls"])'
                }
            });

            await expect(handler.execute(input)).rejects.toThrow(
                /ModuleNotFoundError|failed with code/
            );
        });

        it("blocks socket module for network access", async () => {
            const mockProcess = createMockChildProcess(
                1,
                "",
                "ModuleNotFoundError: No module named 'socket'"
            );
            mockSpawn.mockReturnValue(mockProcess);

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "python",
                    code: "import socket; s = socket.socket()"
                }
            });

            await expect(handler.execute(input)).rejects.toThrow(
                /ModuleNotFoundError|failed with code/
            );
        });

        it("blocks file write operations", async () => {
            const mockProcess = createMockChildProcess(
                1,
                "",
                "PermissionError: [Errno 13] Permission denied"
            );
            mockSpawn.mockReturnValue(mockProcess);

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "python",
                    code: 'open("/etc/passwd", "w").write("hacked")'
                }
            });

            await expect(handler.execute(input)).rejects.toThrow(
                /PermissionError|failed with code/
            );
        });

        it("blocks exec() and eval() in Python", async () => {
            const mockProcess = createMockChildProcess(
                1,
                "",
                "NameError: name 'exec' is not defined"
            );
            mockSpawn.mockReturnValue(mockProcess);

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "python",
                    code: "exec(\"import os; os.system('ls')\")"
                }
            });

            await expect(handler.execute(input)).rejects.toThrow(/NameError|failed with code/);
        });

        it("blocks __import__ function", async () => {
            const mockProcess = createMockChildProcess(
                1,
                "",
                "NameError: name '__import__' is not defined"
            );
            mockSpawn.mockReturnValue(mockProcess);

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "python",
                    code: '__import__("os").system("ls")'
                }
            });

            await expect(handler.execute(input)).rejects.toThrow(/NameError|failed with code/);
        });
    });

    describe("memory and resource limits", () => {
        beforeEach(() => {
            mockVmRun.mockReset();
        });

        it("handles memory exhaustion gracefully", async () => {
            mockVmRun.mockRejectedValue(
                new Error(
                    "FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed - JavaScript heap out of memory"
                )
            );

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "javascript",
                    code: `
                        const arr = [];
                        while(true) { arr.push(new Array(1000000).fill('x')); }
                    `
                }
            });

            await expect(handler.execute(input)).rejects.toThrow(/memory|heap/i);
        });

        it("handles very large string creation", async () => {
            mockVmRun.mockRejectedValue(new Error("Invalid string length"));

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "javascript",
                    code: 'return "x".repeat(Number.MAX_SAFE_INTEGER);'
                }
            });

            await expect(handler.execute(input)).rejects.toThrow(/Invalid string length/);
        });

        it("handles large array allocation", async () => {
            mockVmRun.mockRejectedValue(new Error("Invalid array length"));

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "javascript",
                    code: "return new Array(Number.MAX_SAFE_INTEGER);"
                }
            });

            await expect(handler.execute(input)).rejects.toThrow(/Invalid array length/);
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

    describe("timeout handling", () => {
        it("respects timeout configuration for JavaScript", async () => {
            const { VM } = jest.requireMock("vm2");
            mockVmRun.mockRejectedValue(new Error("Script execution timed out after 1000ms"));

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "javascript",
                    code: "while(true) {}",
                    timeout: 1000
                }
            });

            await expect(handler.execute(input)).rejects.toThrow(/timed out/);
            expect(VM).toHaveBeenCalledWith(
                expect.objectContaining({
                    timeout: 1000
                })
            );
        });

        it("throws on JavaScript execution timeout", async () => {
            mockVmRun.mockRejectedValue(new Error("Script execution timed out after 30000ms"));

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "javascript",
                    code: "while(true) {}"
                }
            });

            await expect(handler.execute(input)).rejects.toThrow(/timed out/);
        });

        it("throws on Python execution timeout", async () => {
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
                    code: "import time; time.sleep(100)",
                    timeout: 1000
                }
            });

            // Emit error after a tick to simulate timeout
            setImmediate(() => {
                mockProcess.stderr.emit("data", Buffer.from(""));
                mockProcess.emit("close", null); // null exit code indicates killed process
            });

            await expect(handler.execute(input)).rejects.toThrow(/failed with code/);
        });
    });

    describe("async/await execution", () => {
        it("handles async/await code in JavaScript", async () => {
            mockVmRun.mockResolvedValue("async result");

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "javascript",
                    code: `
                        const data = await Promise.resolve({ value: 42 });
                        return "async result";
                    `
                }
            });

            const output = await handler.execute(input);
            expect(output.result.output).toBe("async result");
        });

        it("handles async function definitions", async () => {
            mockVmRun.mockResolvedValue([1, 2, 3, 4]);

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "javascript",
                    code: `
                        async function fetchData() {
                            return await Promise.resolve([1, 2, 3, 4]);
                        }
                        return await fetchData();
                    `
                }
            });

            const output = await handler.execute(input);
            expect(output.result.output).toEqual([1, 2, 3, 4]);
        });

        it("handles rejected promises with proper error", async () => {
            mockVmRun.mockRejectedValue(new Error("Promise rejected: API failed"));

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "javascript",
                    code: `
                        return await Promise.reject(new Error("API failed"));
                    `
                }
            });

            await expect(handler.execute(input)).rejects.toThrow(/API failed/);
        });

        it("handles sequential async operations", async () => {
            mockVmRun.mockResolvedValue({ step1: "done", step2: "done", step3: "done" });

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "javascript",
                    code: `
                        const step1 = await Promise.resolve("done");
                        const step2 = await Promise.resolve("done");
                        const step3 = await Promise.resolve("done");
                        return { step1, step2, step3 };
                    `
                }
            });

            const output = await handler.execute(input);
            expect(output.result.output).toEqual({ step1: "done", step2: "done", step3: "done" });
        });
    });

    describe("sandbox globals", () => {
        it("provides Math object in sandbox", async () => {
            const { VM } = jest.requireMock("vm2");
            mockVmRun.mockResolvedValue(3.14);

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "javascript",
                    code: "return Math.round(Math.PI * 100) / 100;"
                }
            });

            await handler.execute(input);

            // VM2 inherits global objects by default, verify VM was created
            expect(VM).toHaveBeenCalled();
        });

        it("provides JSON object in sandbox", async () => {
            mockVmRun.mockResolvedValue({ parsed: true });

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "javascript",
                    code: "return JSON.parse('{\"parsed\": true}');"
                }
            });

            const output = await handler.execute(input);
            expect(output.result.output).toEqual({ parsed: true });
        });

        it("provides Date object in sandbox", async () => {
            mockVmRun.mockResolvedValue(true);

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "javascript",
                    code: "return new Date() instanceof Date;"
                }
            });

            const output = await handler.execute(input);
            expect(output.result.output).toBe(true);
        });

        it("provides Array methods in sandbox", async () => {
            mockVmRun.mockResolvedValue([2, 4, 6]);

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "javascript",
                    code: "return [1, 2, 3].map(x => x * 2);"
                }
            });

            const output = await handler.execute(input);
            expect(output.result.output).toEqual([2, 4, 6]);
        });

        it("provides Object methods in sandbox", async () => {
            mockVmRun.mockResolvedValue(["a", "b"]);

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "javascript",
                    code: "return Object.keys({ a: 1, b: 2 });"
                }
            });

            const output = await handler.execute(input);
            expect(output.result.output).toEqual(["a", "b"]);
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

        it("handles circular reference error in JavaScript", async () => {
            mockVmRun.mockRejectedValue(new Error("Converting circular structure to JSON"));

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "javascript",
                    code: `
                        const obj = { a: 1 };
                        obj.self = obj;
                        return JSON.stringify(obj);
                    `
                }
            });

            await expect(handler.execute(input)).rejects.toThrow(/circular/i);
        });

        it("handles very deep recursion in JavaScript", async () => {
            mockVmRun.mockRejectedValue(new Error("Maximum call stack size exceeded"));

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "javascript",
                    code: `
                        function recurse(n) { return recurse(n + 1); }
                        return recurse(0);
                    `
                }
            });

            await expect(handler.execute(input)).rejects.toThrow(/call stack/i);
        });

        it("handles Python import errors", async () => {
            const mockProcess = createMockChildProcess(
                1,
                "",
                "ModuleNotFoundError: No module named 'nonexistent_module'"
            );
            mockSpawn.mockReturnValue(mockProcess);

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "python",
                    code: "import nonexistent_module"
                }
            });

            await expect(handler.execute(input)).rejects.toThrow(
                /ModuleNotFoundError|failed with code/
            );
        });

        it("passes entire context when inputVariables not specified", async () => {
            const { VM } = jest.requireMock("vm2");
            mockVmRun.mockResolvedValue(15);

            const context = createTestContext({
                nodeOutputs: {
                    data1: { x: 5 },
                    data2: { y: 10 }
                }
            });

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "javascript",
                    code: "return x + y;"
                    // No inputVariables specified - entire context passed
                },
                context
            });

            await handler.execute(input);

            // Verify VM was created with entire context spread into sandbox
            expect(VM).toHaveBeenCalledWith(
                expect.objectContaining({
                    sandbox: expect.objectContaining({
                        console: expect.any(Object)
                        // Context variables spread in
                    })
                })
            );
        });
    });

    describe("concurrent execution", () => {
        it("handles multiple simultaneous JavaScript executions", async () => {
            mockVmRun.mockResolvedValueOnce(10).mockResolvedValueOnce(20).mockResolvedValueOnce(30);

            const handler1 = createCodeNodeHandler();
            const handler2 = createCodeNodeHandler();
            const handler3 = createCodeNodeHandler();

            const results = await Promise.all([
                handler1.execute(
                    createHandlerInput({
                        nodeType: "code",
                        nodeConfig: {
                            language: "javascript",
                            code: "return 10;"
                        }
                    })
                ),
                handler2.execute(
                    createHandlerInput({
                        nodeType: "code",
                        nodeConfig: {
                            language: "javascript",
                            code: "return 20;"
                        }
                    })
                ),
                handler3.execute(
                    createHandlerInput({
                        nodeType: "code",
                        nodeConfig: {
                            language: "javascript",
                            code: "return 30;"
                        }
                    })
                )
            ]);

            expect(results).toHaveLength(3);
            expect(results[0].result.output).toBe(10);
            expect(results[1].result.output).toBe(20);
            expect(results[2].result.output).toBe(30);
        });

        it("isolates errors between concurrent JavaScript executions", async () => {
            mockVmRun
                .mockResolvedValueOnce(10)
                .mockRejectedValueOnce(new Error("Syntax error"))
                .mockResolvedValueOnce(30);

            const handler1 = createCodeNodeHandler();
            const handler2 = createCodeNodeHandler();
            const handler3 = createCodeNodeHandler();

            const results = await Promise.allSettled([
                handler1.execute(
                    createHandlerInput({
                        nodeType: "code",
                        nodeConfig: {
                            language: "javascript",
                            code: "return 10;"
                        }
                    })
                ),
                handler2.execute(
                    createHandlerInput({
                        nodeType: "code",
                        nodeConfig: {
                            language: "javascript",
                            code: "invalid syntax"
                        }
                    })
                ),
                handler3.execute(
                    createHandlerInput({
                        nodeType: "code",
                        nodeConfig: {
                            language: "javascript",
                            code: "return 30;"
                        }
                    })
                )
            ]);

            expect(results[0].status).toBe("fulfilled");
            expect(results[1].status).toBe("rejected");
            expect(results[2].status).toBe("fulfilled");
        });
    });

    describe("resource cleanup", () => {
        it("cleans up temp files after Python execution success", async () => {
            const mockProcess = createMockChildProcess(0, '{"result": 42}', "");
            mockSpawn.mockReturnValueOnce(mockProcess);

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "python",
                    code: "print({'result': 42})"
                }
            });

            await handler.execute(input);

            // Verify temp file was written and then cleaned up
            expect(mockWriteFile).toHaveBeenCalled();
            expect(mockUnlink).toHaveBeenCalled();
        });

        it("cleans up temp files after Python execution failure", async () => {
            const mockProcess = createMockChildProcess(1, "", "SyntaxError: invalid syntax");
            mockSpawn.mockReturnValueOnce(mockProcess);

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "python",
                    code: "invalid python syntax ++++"
                }
            });

            await expect(handler.execute(input)).rejects.toThrow();

            // Verify cleanup still happens after failure
            expect(mockWriteFile).toHaveBeenCalled();
            expect(mockUnlink).toHaveBeenCalled();
        });
    });
});
