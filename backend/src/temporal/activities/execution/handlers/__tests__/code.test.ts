/**
 * Code Node Handler Unit Tests
 *
 * Tests code execution logic with mocked Docker sandbox:
 * - Docker-based code-sandbox mocked for all languages
 * - Handler properties and type support
 * - Schema validation
 */

// Mock code-sandbox before importing the handler
const mockCreateContainer = jest.fn();
const mockExecuteInContainer = jest.fn();
const mockWriteToContainer = jest.fn();
const mockDestroyContainer = jest.fn();
const mockGetLanguageConfig = jest.fn();

jest.mock("../../../../../services/code-sandbox", () => ({
    createContainer: mockCreateContainer,
    executeInContainer: mockExecuteInContainer,
    writeToContainer: mockWriteToContainer,
    destroyContainer: mockDestroyContainer,
    getLanguageConfig: mockGetLanguageConfig,
    DEFAULT_RESOURCE_LIMITS: {
        memoryBytes: 256 * 1024 * 1024,
        cpuCores: 0.5,
        timeoutMs: 30000,
        maxPids: 100,
        maxOutputBytes: 100 * 1024
    }
}));

// Mock heartbeat
jest.mock("../../../../core", () => {
    const actual = jest.requireActual("../../../../core");
    return {
        ...actual,
        withHeartbeat: jest.fn((_, fn) =>
            fn({ update: jest.fn(), complete: jest.fn(), fail: jest.fn() })
        ),
        createActivityLogger: jest.fn(() => ({
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn()
        })),
        getExecutionContext: jest.fn(() => ({}))
    };
});

import {
    createHandlerInput,
    createTestContext,
    assertValidOutput
} from "../../../../../../__tests__/helpers/handler-test-utils";
import { CodeNodeHandler, createCodeNodeHandler } from "../logic/code";

describe("CodeNodeHandler", () => {
    let handler: CodeNodeHandler;

    beforeEach(() => {
        handler = createCodeNodeHandler();
        jest.clearAllMocks();

        // Default mock implementations
        mockCreateContainer.mockResolvedValue({ containerId: "test-container-123" });
        mockWriteToContainer.mockResolvedValue(undefined);
        mockDestroyContainer.mockResolvedValue(undefined);
        mockGetLanguageConfig.mockReturnValue({
            extension: ".py",
            wrapCode: (code: string) => code,
            parseOutput: (stdout: string, stderr: string, exitCode: number) => ({
                result: JSON.parse(stdout || "null"),
                stdout: "",
                stderr,
                metadata: { exitCode }
            }),
            getCommand: () => ["python3", "-u", "/tmp/code.py"]
        });
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
            mockGetLanguageConfig.mockReturnValue({
                extension: ".js",
                wrapCode: (code: string) => code,
                parseOutput: (stdout: string, stderr: string, exitCode: number) => ({
                    result: JSON.parse(stdout || "null"),
                    stdout: "",
                    stderr,
                    metadata: { exitCode }
                }),
                getCommand: () => ["node", "/tmp/code.js"]
            });
        });

        it("executes simple JavaScript code", async () => {
            mockExecuteInContainer.mockResolvedValue({
                stdout: "42",
                stderr: "",
                exitCode: 0
            });

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
            mockExecuteInContainer.mockResolvedValue({
                stdout: '{"name": "test", "value": 123}',
                stderr: "",
                exitCode: 0
            });

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
            mockExecuteInContainer.mockResolvedValue({
                stdout: "[1, 2, 3, 4, 5]",
                stderr: "",
                exitCode: 0
            });

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
            mockExecuteInContainer.mockResolvedValue({
                stdout: "27",
                stderr: "",
                exitCode: 0
            });

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
            mockExecuteInContainer.mockResolvedValue({
                stdout: "true",
                stderr: "",
                exitCode: 0
            });

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
            mockExecuteInContainer.mockResolvedValue({
                stdout: "null",
                stderr: "",
                exitCode: 0
            });

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

        it("handles JavaScript execution errors", async () => {
            mockExecuteInContainer.mockResolvedValue({
                stdout: "",
                stderr: "ReferenceError: undefinedVar is not defined",
                exitCode: 1
            });

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "javascript",
                    code: "return undefinedVar;"
                }
            });

            await expect(handler.execute(input)).rejects.toThrow(/failed|error/i);
        });

        it("passes input variables to sandbox", async () => {
            mockExecuteInContainer.mockResolvedValue({
                stdout: "20",
                stderr: "",
                exitCode: 0
            });

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

            const output = await handler.execute(input);

            expect(output.result.output).toBe(20);
        });

        it("wraps result in outputVariable when specified", async () => {
            mockExecuteInContainer.mockResolvedValue({
                stdout: "42",
                stderr: "",
                exitCode: 0
            });

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
        });
    });

    describe("container lifecycle", () => {
        it("creates container with correct language", async () => {
            mockExecuteInContainer.mockResolvedValue({
                stdout: "42",
                stderr: "",
                exitCode: 0
            });

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "javascript",
                    code: "return 42;"
                }
            });

            await handler.execute(input);

            expect(mockCreateContainer).toHaveBeenCalledWith(
                "javascript",
                expect.any(Object),
                expect.any(Boolean)
            );
        });

        it("destroys container after execution", async () => {
            mockExecuteInContainer.mockResolvedValue({
                stdout: "42",
                stderr: "",
                exitCode: 0
            });

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "javascript",
                    code: "return 42;"
                }
            });

            await handler.execute(input);

            expect(mockDestroyContainer).toHaveBeenCalledWith("test-container-123");
        });

        it("destroys container even after execution failure", async () => {
            mockExecuteInContainer.mockRejectedValue(new Error("Execution failed"));

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "javascript",
                    code: "throw new Error('test');"
                }
            });

            await expect(handler.execute(input)).rejects.toThrow();

            expect(mockDestroyContainer).toHaveBeenCalledWith("test-container-123");
        });

        it("uses specified timeout", async () => {
            mockExecuteInContainer.mockResolvedValue({
                stdout: "42",
                stderr: "",
                exitCode: 0
            });

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "javascript",
                    code: "return 42;",
                    timeout: 5000
                }
            });

            await handler.execute(input);

            expect(mockCreateContainer).toHaveBeenCalledWith(
                "javascript",
                expect.objectContaining({
                    timeoutMs: 5000
                }),
                expect.any(Boolean)
            );
        });

        it("uses default timeout when not specified", async () => {
            mockExecuteInContainer.mockResolvedValue({
                stdout: "42",
                stderr: "",
                exitCode: 0
            });

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "javascript",
                    code: "return 42;"
                }
            });

            await handler.execute(input);

            expect(mockCreateContainer).toHaveBeenCalledWith(
                "javascript",
                expect.objectContaining({
                    timeoutMs: 30000
                }),
                expect.any(Boolean)
            );
        });
    });

    describe("Python execution", () => {
        beforeEach(() => {
            mockGetLanguageConfig.mockReturnValue({
                extension: ".py",
                wrapCode: (code: string) => code,
                parseOutput: (stdout: string, stderr: string, exitCode: number) => ({
                    result: JSON.parse(stdout || "null"),
                    stdout: "",
                    stderr,
                    metadata: { exitCode }
                }),
                getCommand: () => ["python3", "-u", "/tmp/code.py"]
            });
        });

        it("executes simple Python code", async () => {
            mockExecuteInContainer.mockResolvedValue({
                stdout: "42",
                stderr: "",
                exitCode: 0
            });

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
            mockExecuteInContainer.mockResolvedValue({
                stdout: '{"name": "test", "value": 123}',
                stderr: "",
                exitCode: 0
            });

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
            mockExecuteInContainer.mockResolvedValue({
                stdout: "[1, 2, 3, 4, 5]",
                stderr: "",
                exitCode: 0
            });

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

        it("handles Python syntax errors", async () => {
            mockExecuteInContainer.mockResolvedValue({
                stdout: "",
                stderr: "SyntaxError: invalid syntax",
                exitCode: 1
            });

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "python",
                    code: "def broken syntax"
                }
            });

            await expect(handler.execute(input)).rejects.toThrow(/failed|error/i);
        });

        it("accesses input variables in Python", async () => {
            mockExecuteInContainer.mockResolvedValue({
                stdout: "20",
                stderr: "",
                exitCode: 0
            });

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
    });

    describe("Shell execution", () => {
        beforeEach(() => {
            mockGetLanguageConfig.mockReturnValue({
                extension: ".sh",
                wrapCode: (code: string) => code,
                parseOutput: (stdout: string, stderr: string, exitCode: number) => ({
                    result: stdout.trim(),
                    stdout,
                    stderr,
                    metadata: { exitCode }
                }),
                getCommand: () => ["bash", "/tmp/code.sh"]
            });
        });

        it("executes simple shell command", async () => {
            mockExecuteInContainer.mockResolvedValue({
                stdout: "hello world\n",
                stderr: "",
                exitCode: 0
            });

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "shell",
                    code: "echo hello world"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.language).toBe("shell");
            expect(output.result.output).toBe("hello world");
        });

        it("handles shell command failure", async () => {
            mockExecuteInContainer.mockResolvedValue({
                stdout: "",
                stderr: "command not found: invalid_command",
                exitCode: 127
            });

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "shell",
                    code: "invalid_command"
                }
            });

            await expect(handler.execute(input)).rejects.toThrow(/failed|error/i);
        });
    });

    describe("network access control", () => {
        it("disables network by default", async () => {
            mockExecuteInContainer.mockResolvedValue({
                stdout: "42",
                stderr: "",
                exitCode: 0
            });

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "javascript",
                    code: "return 42;"
                }
            });

            await handler.execute(input);

            expect(mockCreateContainer).toHaveBeenCalledWith(
                expect.any(String),
                expect.any(Object),
                false
            );
        });

        it("enables network when allowNetworkAccess is true", async () => {
            mockExecuteInContainer.mockResolvedValue({
                stdout: "200",
                stderr: "",
                exitCode: 0
            });

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "javascript",
                    code: 'return fetch("https://api.example.com");',
                    allowNetworkAccess: true
                }
            });

            await handler.execute(input);

            expect(mockCreateContainer).toHaveBeenCalledWith(
                expect.any(String),
                expect.any(Object),
                true
            );
        });
    });

    describe("memory limits", () => {
        it("uses specified memory limit", async () => {
            mockExecuteInContainer.mockResolvedValue({
                stdout: "42",
                stderr: "",
                exitCode: 0
            });

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "javascript",
                    code: "return 42;",
                    memory: 512
                }
            });

            await handler.execute(input);

            expect(mockCreateContainer).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    memoryBytes: 512 * 1024 * 1024
                }),
                expect.any(Boolean)
            );
        });

        it("uses default memory when not specified", async () => {
            mockExecuteInContainer.mockResolvedValue({
                stdout: "42",
                stderr: "",
                exitCode: 0
            });

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "javascript",
                    code: "return 42;"
                }
            });

            await handler.execute(input);

            expect(mockCreateContainer).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    memoryBytes: 128 * 1024 * 1024
                }),
                expect.any(Boolean)
            );
        });
    });

    describe("metrics", () => {
        it("records execution duration", async () => {
            mockExecuteInContainer.mockResolvedValue({
                stdout: "42",
                stderr: "",
                exitCode: 0
            });

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
    });

    describe("timeout handling", () => {
        it("throws on execution timeout", async () => {
            mockExecuteInContainer.mockRejectedValue(new Error("Execution timeout"));

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "javascript",
                    code: "while(true) {}",
                    timeout: 1000
                }
            });

            await expect(handler.execute(input)).rejects.toThrow(/timeout/i);
        });
    });

    describe("edge cases", () => {
        it("handles string return values", async () => {
            mockExecuteInContainer.mockResolvedValue({
                stdout: '"hello world"',
                stderr: "",
                exitCode: 0
            });

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

        it("handles empty array", async () => {
            mockExecuteInContainer.mockResolvedValue({
                stdout: "[]",
                stderr: "",
                exitCode: 0
            });

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
            mockExecuteInContainer.mockResolvedValue({
                stdout: "{}",
                stderr: "",
                exitCode: 0
            });

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

        it("passes entire context when inputVariables not specified", async () => {
            mockExecuteInContainer.mockResolvedValue({
                stdout: "15",
                stderr: "",
                exitCode: 0
            });

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
                },
                context
            });

            const output = await handler.execute(input);

            expect(output.result.output).toBe(15);
        });
    });

    describe("concurrent execution", () => {
        it("handles multiple simultaneous executions", async () => {
            mockCreateContainer
                .mockResolvedValueOnce({ containerId: "container-1" })
                .mockResolvedValueOnce({ containerId: "container-2" })
                .mockResolvedValueOnce({ containerId: "container-3" });

            mockExecuteInContainer
                .mockResolvedValueOnce({ stdout: "10", stderr: "", exitCode: 0 })
                .mockResolvedValueOnce({ stdout: "20", stderr: "", exitCode: 0 })
                .mockResolvedValueOnce({ stdout: "30", stderr: "", exitCode: 0 });

            const handler1 = createCodeNodeHandler();
            const handler2 = createCodeNodeHandler();
            const handler3 = createCodeNodeHandler();

            const results = await Promise.all([
                handler1.execute(
                    createHandlerInput({
                        nodeType: "code",
                        nodeConfig: { language: "javascript", code: "return 10;" }
                    })
                ),
                handler2.execute(
                    createHandlerInput({
                        nodeType: "code",
                        nodeConfig: { language: "javascript", code: "return 20;" }
                    })
                ),
                handler3.execute(
                    createHandlerInput({
                        nodeType: "code",
                        nodeConfig: { language: "javascript", code: "return 30;" }
                    })
                )
            ]);

            expect(results).toHaveLength(3);
            expect(results[0].result.output).toBe(10);
            expect(results[1].result.output).toBe(20);
            expect(results[2].result.output).toBe(30);
        });

        it("isolates errors between concurrent executions", async () => {
            mockCreateContainer
                .mockResolvedValueOnce({ containerId: "container-1" })
                .mockResolvedValueOnce({ containerId: "container-2" })
                .mockResolvedValueOnce({ containerId: "container-3" });

            mockExecuteInContainer
                .mockResolvedValueOnce({ stdout: "10", stderr: "", exitCode: 0 })
                .mockResolvedValueOnce({ stdout: "", stderr: "Syntax error", exitCode: 1 })
                .mockResolvedValueOnce({ stdout: "30", stderr: "", exitCode: 0 });

            const handler1 = createCodeNodeHandler();
            const handler2 = createCodeNodeHandler();
            const handler3 = createCodeNodeHandler();

            const results = await Promise.allSettled([
                handler1.execute(
                    createHandlerInput({
                        nodeType: "code",
                        nodeConfig: { language: "javascript", code: "return 10;" }
                    })
                ),
                handler2.execute(
                    createHandlerInput({
                        nodeType: "code",
                        nodeConfig: { language: "javascript", code: "invalid syntax" }
                    })
                ),
                handler3.execute(
                    createHandlerInput({
                        nodeType: "code",
                        nodeConfig: { language: "javascript", code: "return 30;" }
                    })
                )
            ]);

            expect(results[0].status).toBe("fulfilled");
            expect(results[1].status).toBe("rejected");
            expect(results[2].status).toBe("fulfilled");
        });
    });

    describe("resource cleanup", () => {
        it("cleans up container after successful execution", async () => {
            mockExecuteInContainer.mockResolvedValue({
                stdout: "42",
                stderr: "",
                exitCode: 0
            });

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "javascript",
                    code: "return 42;"
                }
            });

            await handler.execute(input);

            expect(mockCreateContainer).toHaveBeenCalled();
            expect(mockDestroyContainer).toHaveBeenCalledWith("test-container-123");
        });

        it("cleans up container after failed execution", async () => {
            mockExecuteInContainer.mockRejectedValue(new Error("Execution failed"));

            const input = createHandlerInput({
                nodeType: "code",
                nodeConfig: {
                    language: "javascript",
                    code: "throw new Error('test');"
                }
            });

            await expect(handler.execute(input)).rejects.toThrow();

            expect(mockCreateContainer).toHaveBeenCalled();
            expect(mockDestroyContainer).toHaveBeenCalledWith("test-container-123");
        });
    });
});
