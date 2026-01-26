/**
 * File Read Handler Unit Tests
 *
 * Tests for the FileReadNodeHandler which reads files
 * from the execution workspace using the file_read builtin tool.
 */

import type { JsonObject } from "@flowmaestro/shared";
import type { ContextSnapshot } from "../../../../../src/temporal/core/types";
import type { NodeHandlerInput } from "../../../../../src/temporal/activities/execution/types";

// Mock the builtin tool
const mockExecute = jest.fn();
jest.mock("../../../../../src/tools/builtin/file-read", () => ({
    fileReadTool: {
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

import {
    FileReadNodeHandler,
    createFileReadNodeHandler
} from "../../../../../src/temporal/activities/execution/handlers/inputs/file-read";
import { interpolateVariables } from "../../../../../src/temporal/core";

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
        nodeType: "fileRead",
        nodeConfig,
        context: createMockContext(contextOverrides),
        metadata: {
            executionId: "test-execution-id",
            nodeId: "test-node-id",
            nodeName: "Test File Read"
        }
    };
}

describe("FileReadNodeHandler", () => {
    let handler: FileReadNodeHandler;

    beforeEach(() => {
        jest.clearAllMocks();
        handler = new FileReadNodeHandler();
        (interpolateVariables as jest.Mock).mockImplementation((value: unknown) => value);
    });

    describe("properties", () => {
        it("should have correct handler properties", () => {
            expect(handler.name).toBe("FileReadNodeHandler");
            expect(handler.supportedNodeTypes).toContain("fileRead");
        });

        it("should report canHandle correctly", () => {
            expect(handler.canHandle("fileRead")).toBe(true);
            expect(handler.canHandle("otherType")).toBe(false);
        });
    });

    describe("factory function", () => {
        it("should create handler instance", () => {
            const instance = createFileReadNodeHandler();
            expect(instance).toBeInstanceOf(FileReadNodeHandler);
        });
    });

    describe("execute", () => {
        describe("happy path", () => {
            it("should read file with default encoding (utf-8)", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/data.txt",
                        content: "Hello, World!",
                        encoding: "utf-8",
                        size: 13
                    }
                });

                const input = createMockInput({
                    path: "/workspace/data.txt",
                    outputVariable: "fileContent"
                });

                const result = await handler.execute(input);

                expect(result.result).toHaveProperty("fileContent");
                expect(result.result.fileContent).toEqual(
                    expect.objectContaining({
                        content: "Hello, World!",
                        encoding: "utf-8",
                        size: 13
                    })
                );
                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        path: "/workspace/data.txt"
                    }),
                    expect.any(Object)
                );
            });

            it("should read file with specified encoding", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/binary.dat",
                        content: "SGVsbG8gV29ybGQ=",
                        encoding: "base64",
                        size: 11
                    }
                });

                const input = createMockInput({
                    path: "/workspace/binary.dat",
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
                    if (value === "{{filePath}}") return "/resolved/path/file.json";
                    return value;
                });

                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/resolved/path/file.json",
                        content: '{"key": "value"}',
                        encoding: "utf-8",
                        size: 16
                    }
                });

                const input = createMockInput({
                    path: "{{filePath}}",
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        path: "/resolved/path/file.json"
                    }),
                    expect.any(Object)
                );
            });

            it("should store result in output variable", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/config.yaml",
                        content: "name: test\nvalue: 123",
                        encoding: "utf-8",
                        size: 22
                    }
                });

                const input = createMockInput({
                    path: "/workspace/config.yaml",
                    outputVariable: "myConfig"
                });

                const result = await handler.execute(input);

                expect(result.result).toHaveProperty("myConfig");
                expect(result.result.myConfig).toEqual(
                    expect.objectContaining({
                        content: "name: test\nvalue: 123"
                    })
                );
            });

            it("should return file metadata (size, encoding)", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/large.txt",
                        content: "A".repeat(1000),
                        encoding: "utf-8",
                        size: 1000
                    }
                });

                const input = createMockInput({
                    path: "/workspace/large.txt",
                    outputVariable: "result"
                });

                const result = await handler.execute(input);

                const fileData = result.result.result as {
                    size: number;
                    encoding: string;
                };
                expect(fileData.size).toBe(1000);
                expect(fileData.encoding).toBe("utf-8");
            });
        });

        describe("encoding options", () => {
            it("should read utf-8 encoded files", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/utf8.txt",
                        content: "UTF-8 content with unicode: 你好世界",
                        encoding: "utf-8",
                        size: 36
                    }
                });

                const input = createMockInput({
                    path: "/workspace/utf8.txt",
                    encoding: "utf-8",
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        encoding: "utf-8"
                    }),
                    expect.any(Object)
                );
            });

            it("should read base64 encoded files", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/binary.bin",
                        content: "SGVsbG8gV29ybGQh",
                        encoding: "base64",
                        size: 12
                    }
                });

                const input = createMockInput({
                    path: "/workspace/binary.bin",
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

            it("should read binary encoded files", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/raw.bin",
                        content: "binary data here",
                        encoding: "binary",
                        size: 16
                    }
                });

                const input = createMockInput({
                    path: "/workspace/raw.bin",
                    encoding: "binary",
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        encoding: "binary"
                    }),
                    expect.any(Object)
                );
            });
        });

        describe("validation", () => {
            it("should throw error when file path is missing", async () => {
                const input = createMockInput({
                    outputVariable: "result"
                });

                await expect(handler.execute(input)).rejects.toThrow();
            });

            it("should throw error when file path is not a string", async () => {
                (interpolateVariables as jest.Mock).mockReturnValueOnce(12345);

                const input = createMockInput({
                    path: "{{nonStringPath}}",
                    outputVariable: "result"
                });

                await expect(handler.execute(input)).rejects.toThrow("File path is required");
            });
        });

        describe("error handling", () => {
            it("should handle file not found", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: false,
                    error: { message: "ENOENT: File not found" }
                });

                const input = createMockInput({
                    path: "/workspace/nonexistent.txt",
                    outputVariable: "result"
                });

                await expect(handler.execute(input)).rejects.toThrow("ENOENT: File not found");
            });

            it("should handle permission denied", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: false,
                    error: { message: "EACCES: Permission denied" }
                });

                const input = createMockInput({
                    path: "/protected/file.txt",
                    outputVariable: "result"
                });

                await expect(handler.execute(input)).rejects.toThrow("EACCES: Permission denied");
            });

            it("should handle directory instead of file", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: false,
                    error: { message: "EISDIR: Path is a directory, not a file" }
                });

                const input = createMockInput({
                    path: "/workspace/some-directory",
                    outputVariable: "result"
                });

                await expect(handler.execute(input)).rejects.toThrow(
                    "EISDIR: Path is a directory, not a file"
                );
            });
        });

        describe("edge cases", () => {
            it("should handle empty files", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/empty.txt",
                        content: "",
                        encoding: "utf-8",
                        size: 0
                    }
                });

                const input = createMockInput({
                    path: "/workspace/empty.txt",
                    outputVariable: "result"
                });

                const result = await handler.execute(input);

                expect((result.result.result as { content: string }).content).toBe("");
                expect((result.result.result as { size: number }).size).toBe(0);
            });

            it("should handle files at maxSize limit", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/large.txt",
                        content: "A".repeat(1000000),
                        encoding: "utf-8",
                        size: 1000000
                    }
                });

                const input = createMockInput({
                    path: "/workspace/large.txt",
                    maxSize: 1000000,
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        maxSize: 1000000
                    }),
                    expect.any(Object)
                );
            });

            it("should handle files exceeding maxSize limit", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: false,
                    error: { message: "File size exceeds maximum allowed size" }
                });

                const input = createMockInput({
                    path: "/workspace/huge.txt",
                    maxSize: 1000,
                    outputVariable: "result"
                });

                await expect(handler.execute(input)).rejects.toThrow(
                    "File size exceeds maximum allowed size"
                );
            });

            it("should handle files with special characters in name", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/file with spaces & symbols!.txt",
                        content: "Special filename content",
                        encoding: "utf-8",
                        size: 24
                    }
                });

                const input = createMockInput({
                    path: "/workspace/file with spaces & symbols!.txt",
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        path: "/workspace/file with spaces & symbols!.txt"
                    }),
                    expect.any(Object)
                );
            });

            it("should handle result without output variable", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/file.txt",
                        content: "No output var",
                        encoding: "utf-8",
                        size: 13
                    }
                });

                const input = createMockInput({
                    path: "/workspace/file.txt"
                    // No outputVariable
                });

                const result = await handler.execute(input);

                expect(Object.keys(result.result)).toHaveLength(0);
            });

            it("should include duration metrics", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/file.txt",
                        content: "Test",
                        encoding: "utf-8",
                        size: 4
                    }
                });

                const input = createMockInput({
                    path: "/workspace/file.txt",
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
                        path: "/workspace/file.txt",
                        content: "Test",
                        encoding: "utf-8",
                        size: 4
                    }
                });

                const input = createMockInput({
                    path: "/workspace/file.txt",
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

            it("should use default userId when not provided", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/file.txt",
                        content: "Test",
                        encoding: "utf-8",
                        size: 4
                    }
                });

                const input = createMockInput({
                    path: "/workspace/file.txt",
                    outputVariable: "result"
                });
                delete input.metadata.userId;

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.any(Object),
                    expect.objectContaining({
                        userId: "system"
                    })
                );
            });
        });
    });
});
