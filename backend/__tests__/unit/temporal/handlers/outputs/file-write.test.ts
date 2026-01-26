/**
 * File Write Handler Unit Tests
 *
 * Tests for the FileWriteNodeHandler which writes files
 * to the execution workspace using the file_write builtin tool.
 */

// Mock the builtin tool
const mockExecute = jest.fn();
jest.mock("../../../../../src/tools/builtin/file-write", () => ({
    fileWriteTool: {
        execute: mockExecute
    }
}));

// Mock logger
jest.mock("../../../../../src/temporal/core", () => ({
    createActivityLogger: () => ({
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn()
    }),
    interpolateVariables: jest.fn((value: unknown, _context: unknown) => value),
    getExecutionContext: jest.fn((context: unknown) => context)
}));

import type { JsonObject } from "@flowmaestro/shared";
import {
    FileWriteNodeHandler,
    createFileWriteNodeHandler
} from "../../../../../src/temporal/activities/execution/handlers/outputs/file-write";
import { interpolateVariables } from "../../../../../src/temporal/core";

import type { NodeHandlerInput } from "../../../../../src/temporal/activities/execution/types";
import type { ContextSnapshot } from "../../../../../src/temporal/core/types";

// Helper to create mock context
function createMockContext(overrides: Partial<ContextSnapshot> = {}): ContextSnapshot {
    return {
        workflowId: "test-workflow-id",
        executionId: "test-execution-id",
        variables: new Map(),
        nodeOutputs: new Map(),
        sharedMemory: new Map(),
        secrets: new Map(),
        loopStates: [],
        parallelStates: [],
        ...overrides
    } as ContextSnapshot;
}

// Helper to create mock input
function createMockInput(
    nodeConfig: JsonObject,
    contextOverrides: Partial<ContextSnapshot> = {}
): NodeHandlerInput {
    return {
        nodeType: "fileWrite",
        nodeConfig,
        context: createMockContext(contextOverrides),
        metadata: {
            executionId: "test-execution-id",
            nodeId: "test-node-id",
            nodeName: "Test File Write"
        }
    };
}

describe("FileWriteNodeHandler", () => {
    let handler: FileWriteNodeHandler;

    beforeEach(() => {
        jest.clearAllMocks();
        handler = new FileWriteNodeHandler();
        (interpolateVariables as jest.Mock).mockImplementation((value: unknown) => value);
    });

    describe("properties", () => {
        it("should have correct handler properties", () => {
            expect(handler.name).toBe("FileWriteNodeHandler");
            expect(handler.supportedNodeTypes).toContain("fileWrite");
        });

        it("should report canHandle correctly", () => {
            expect(handler.canHandle("fileWrite")).toBe(true);
            expect(handler.canHandle("otherType")).toBe(false);
        });
    });

    describe("factory function", () => {
        it("should create handler instance", () => {
            const instance = createFileWriteNodeHandler();
            expect(instance).toBeInstanceOf(FileWriteNodeHandler);
        });
    });

    describe("execute", () => {
        describe("happy path", () => {
            it("should write string content to file", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "output.txt",
                        fullPath: "/workspace/output.txt",
                        size: 13,
                        created: true
                    }
                });

                const input = createMockInput({
                    path: "output.txt",
                    content: "Hello, World!",
                    outputVariable: "writeResult"
                });

                const result = await handler.execute(input);

                expect(result.result).toHaveProperty("writeResult");
                expect(result.result.writeResult).toEqual(
                    expect.objectContaining({
                        path: "output.txt",
                        size: 13,
                        created: true
                    })
                );
                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        path: "output.txt",
                        content: "Hello, World!"
                    }),
                    expect.any(Object)
                );
            });

            it("should write with specified encoding", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "binary.dat",
                        fullPath: "/workspace/binary.dat",
                        size: 16,
                        created: true
                    }
                });

                const input = createMockInput({
                    path: "binary.dat",
                    content: "SGVsbG8gV29ybGQh",
                    encoding: "base64",
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        encoding: "base64"
                    }),
                    expect.any(Object)
                );
            });

            it("should interpolate variables in file path", async () => {
                (interpolateVariables as jest.Mock).mockImplementation((value: string) => {
                    if (value === "{{outputPath}}") return "/custom/output.json";
                    return value;
                });

                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/custom/output.json",
                        fullPath: "/workspace/custom/output.json",
                        size: 20,
                        created: true
                    }
                });

                const input = createMockInput({
                    path: "{{outputPath}}",
                    content: '{"key": "value"}',
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        path: "/custom/output.json"
                    }),
                    expect.any(Object)
                );
            });

            it("should interpolate variables in content", async () => {
                (interpolateVariables as jest.Mock).mockImplementation((value: string) => {
                    if (value === "{{dynamicContent}}") return "Resolved dynamic content";
                    return value;
                });

                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "output.txt",
                        fullPath: "/workspace/output.txt",
                        size: 24,
                        created: true
                    }
                });

                const input = createMockInput({
                    path: "output.txt",
                    content: "{{dynamicContent}}",
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        content: "Resolved dynamic content"
                    }),
                    expect.any(Object)
                );
            });

            it("should store result in output variable", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "result.txt",
                        fullPath: "/workspace/result.txt",
                        size: 10,
                        created: true
                    }
                });

                const input = createMockInput({
                    path: "result.txt",
                    content: "Test data",
                    outputVariable: "myWriteResult"
                });

                const result = await handler.execute(input);

                expect(result.result).toHaveProperty("myWriteResult");
            });

            it("should return file metadata (path, size, created)", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "data.json",
                        fullPath: "/workspace/data.json",
                        size: 150,
                        created: true
                    }
                });

                const input = createMockInput({
                    path: "data.json",
                    content: '{"data": "test"}',
                    outputVariable: "result"
                });

                const result = await handler.execute(input);

                const writeData = result.result.result as {
                    path: string;
                    size: number;
                    created: boolean;
                };
                expect(writeData.path).toBe("data.json");
                expect(writeData.size).toBe(150);
                expect(writeData.created).toBe(true);
            });
        });

        describe("content handling", () => {
            it("should JSON stringify object content", async () => {
                (interpolateVariables as jest.Mock).mockImplementation((value: unknown) => {
                    if (typeof value === "object") return value;
                    return value;
                });

                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "data.json",
                        fullPath: "/workspace/data.json",
                        size: 50,
                        created: true
                    }
                });

                const input = createMockInput({
                    path: "data.json",
                    content: "{{objectData}}",
                    outputVariable: "result"
                });

                // Simulate object content returned from interpolation
                (interpolateVariables as jest.Mock).mockReturnValueOnce("data.json");
                (interpolateVariables as jest.Mock).mockReturnValueOnce({
                    name: "test",
                    value: 123
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        content: expect.stringContaining("name")
                    }),
                    expect.any(Object)
                );
            });

            it("should JSON stringify array content", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "array.json",
                        fullPath: "/workspace/array.json",
                        size: 30,
                        created: true
                    }
                });

                const input = createMockInput({
                    path: "array.json",
                    content: "{{arrayData}}",
                    outputVariable: "result"
                });

                (interpolateVariables as jest.Mock).mockReturnValueOnce("array.json");
                (interpolateVariables as jest.Mock).mockReturnValueOnce([1, 2, 3, 4, 5]);

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        content: expect.stringMatching(/\[/)
                    }),
                    expect.any(Object)
                );
            });

            it("should handle number content", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "number.txt",
                        fullPath: "/workspace/number.txt",
                        size: 5,
                        created: true
                    }
                });

                const input = createMockInput({
                    path: "number.txt",
                    content: "{{numberValue}}",
                    outputVariable: "result"
                });

                (interpolateVariables as jest.Mock).mockReturnValueOnce("number.txt");
                (interpolateVariables as jest.Mock).mockReturnValueOnce(12345);

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        content: "12345"
                    }),
                    expect.any(Object)
                );
            });

            it("should handle boolean content", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "bool.txt",
                        fullPath: "/workspace/bool.txt",
                        size: 4,
                        created: true
                    }
                });

                const input = createMockInput({
                    path: "bool.txt",
                    content: "{{boolValue}}",
                    outputVariable: "result"
                });

                (interpolateVariables as jest.Mock).mockReturnValueOnce("bool.txt");
                (interpolateVariables as jest.Mock).mockReturnValueOnce(true);

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        content: "true"
                    }),
                    expect.any(Object)
                );
            });
        });

        describe("directory handling", () => {
            it("should create directories when createDirectories is true", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "nested/deep/file.txt",
                        fullPath: "/workspace/nested/deep/file.txt",
                        size: 10,
                        created: true
                    }
                });

                const input = createMockInput({
                    path: "nested/deep/file.txt",
                    content: "Test data",
                    createDirectories: true,
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        createDirectories: true
                    }),
                    expect.any(Object)
                );
            });

            it("should fail when directory missing and createDirectories is false", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: false,
                    error: { message: "ENOENT: Directory does not exist" }
                });

                const input = createMockInput({
                    path: "nonexistent/dir/file.txt",
                    content: "Test data",
                    createDirectories: false,
                    outputVariable: "result"
                });

                await expect(handler.execute(input)).rejects.toThrow(
                    "ENOENT: Directory does not exist"
                );
            });
        });

        describe("overwrite handling", () => {
            it("should overwrite existing file when overwrite is true", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "existing.txt",
                        fullPath: "/workspace/existing.txt",
                        size: 15,
                        created: false
                    }
                });

                const input = createMockInput({
                    path: "existing.txt",
                    content: "New content",
                    overwrite: true,
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        overwrite: true
                    }),
                    expect.any(Object)
                );
            });

            it("should fail on existing file when overwrite is false", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: false,
                    error: { message: "File already exists and overwrite is disabled" }
                });

                const input = createMockInput({
                    path: "existing.txt",
                    content: "New content",
                    overwrite: false,
                    outputVariable: "result"
                });

                await expect(handler.execute(input)).rejects.toThrow(
                    "File already exists and overwrite is disabled"
                );
            });
        });

        describe("validation", () => {
            it("should throw error when path is missing", async () => {
                const input = createMockInput({
                    content: "Test content",
                    outputVariable: "result"
                });

                await expect(handler.execute(input)).rejects.toThrow();
            });

            it("should throw error when path is not a string", async () => {
                (interpolateVariables as jest.Mock).mockReturnValueOnce(12345);

                const input = createMockInput({
                    path: "{{nonStringPath}}",
                    content: "Test",
                    outputVariable: "result"
                });

                await expect(handler.execute(input)).rejects.toThrow("File path is required");
            });

            it("should throw error when content is undefined", async () => {
                (interpolateVariables as jest.Mock)
                    .mockReturnValueOnce("file.txt")
                    .mockReturnValueOnce(undefined);

                const input = createMockInput({
                    path: "file.txt",
                    content: "{{undefinedVar}}",
                    outputVariable: "result"
                });

                await expect(handler.execute(input)).rejects.toThrow("Content is required");
            });

            it("should throw error when content is null", async () => {
                (interpolateVariables as jest.Mock)
                    .mockReturnValueOnce("file.txt")
                    .mockReturnValueOnce(null);

                const input = createMockInput({
                    path: "file.txt",
                    content: "{{nullVar}}",
                    outputVariable: "result"
                });

                await expect(handler.execute(input)).rejects.toThrow("Content is required");
            });
        });

        describe("error handling", () => {
            it("should handle permission denied", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: false,
                    error: { message: "EACCES: Permission denied" }
                });

                const input = createMockInput({
                    path: "/protected/file.txt",
                    content: "Test",
                    outputVariable: "result"
                });

                await expect(handler.execute(input)).rejects.toThrow("EACCES: Permission denied");
            });

            it("should handle disk full", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: false,
                    error: { message: "ENOSPC: No space left on device" }
                });

                const input = createMockInput({
                    path: "large-file.bin",
                    content: "A".repeat(10000),
                    outputVariable: "result"
                });

                await expect(handler.execute(input)).rejects.toThrow(
                    "ENOSPC: No space left on device"
                );
            });

            it("should handle invalid path characters", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: false,
                    error: { message: "Invalid characters in file path" }
                });

                const input = createMockInput({
                    path: "file\0name.txt",
                    content: "Test",
                    outputVariable: "result"
                });

                await expect(handler.execute(input)).rejects.toThrow(
                    "Invalid characters in file path"
                );
            });
        });

        describe("edge cases", () => {
            it("should reject empty string content via schema validation", async () => {
                const input = createMockInput({
                    path: "empty.txt",
                    content: "",
                    outputVariable: "result"
                });

                // Empty string fails schema validation (min length 1)
                await expect(handler.execute(input)).rejects.toThrow("Content is required");
            });

            it("should handle special characters in path", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "file with spaces & symbols!.txt",
                        fullPath: "/workspace/file with spaces & symbols!.txt",
                        size: 10,
                        created: true
                    }
                });

                const input = createMockInput({
                    path: "file with spaces & symbols!.txt",
                    content: "Test data",
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        path: "file with spaces & symbols!.txt"
                    }),
                    expect.any(Object)
                );
            });

            it("should handle unicode content", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "unicode.txt",
                        fullPath: "/workspace/unicode.txt",
                        size: 30,
                        created: true
                    }
                });

                const input = createMockInput({
                    path: "unicode.txt",
                    content: "Hello 世界 🎉 مرحبا",
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        content: "Hello 世界 🎉 مرحبا"
                    }),
                    expect.any(Object)
                );
            });

            it("should handle result without output variable", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "file.txt",
                        fullPath: "/workspace/file.txt",
                        size: 10,
                        created: true
                    }
                });

                const input = createMockInput({
                    path: "file.txt",
                    content: "No output"
                    // No outputVariable
                });

                const result = await handler.execute(input);

                expect(Object.keys(result.result)).toHaveLength(0);
            });

            it("should include duration metrics", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "file.txt",
                        fullPath: "/workspace/file.txt",
                        size: 4,
                        created: true
                    }
                });

                const input = createMockInput({
                    path: "file.txt",
                    content: "Test",
                    outputVariable: "result"
                });

                const result = await handler.execute(input);

                expect(result.metrics?.durationMs).toBeDefined();
                expect(result.metrics?.durationMs).toBeGreaterThanOrEqual(0);
            });

            it("should pass tool execution context correctly", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "file.txt",
                        fullPath: "/workspace/file.txt",
                        size: 4,
                        created: true
                    }
                });

                const input = createMockInput({
                    path: "file.txt",
                    content: "Test",
                    outputVariable: "result"
                });
                input.metadata.userId = "user-123";
                input.metadata.executionId = "exec-456";

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.any(Object),
                    expect.objectContaining({
                        userId: "user-123",
                        mode: "workflow",
                        traceId: "exec-456"
                    })
                );
            });
        });
    });
});
