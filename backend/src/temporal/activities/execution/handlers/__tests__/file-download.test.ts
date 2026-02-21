/**
 * File Download Handler Unit Tests
 *
 * Tests for the FileDownloadNodeHandler which downloads files
 * from URLs using the file_download builtin tool.
 */

// Mock the builtin tool
const mockExecute = jest.fn();
jest.mock("../../../../../services/tools/builtin/file-download", () => ({
    fileDownloadTool: {
        execute: mockExecute
    }
}));

// Mock logger
jest.mock("../../../../core", () => ({
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
import { interpolateVariables } from "../../../../core";
import { FileDownloadNodeHandler, createFileDownloadNodeHandler } from "../inputs/file-download";

import type { ContextSnapshot } from "../../../../core/types";
import type { NodeHandlerInput } from "../../types";

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
        nodeType: "fileDownload",
        nodeConfig,
        context: createMockContext(contextOverrides),
        metadata: {
            executionId: "test-execution-id",
            nodeId: "test-node-id",
            nodeName: "Test File Download"
        }
    };
}

describe("FileDownloadNodeHandler", () => {
    let handler: FileDownloadNodeHandler;

    beforeEach(() => {
        jest.clearAllMocks();
        handler = new FileDownloadNodeHandler();
        (interpolateVariables as jest.Mock).mockImplementation((value: unknown) => value);
    });

    describe("properties", () => {
        it("should have correct handler properties", () => {
            expect(handler.name).toBe("FileDownloadNodeHandler");
            expect(handler.supportedNodeTypes).toContain("fileDownload");
        });

        it("should report canHandle correctly", () => {
            expect(handler.canHandle("fileDownload")).toBe(true);
            expect(handler.canHandle("otherType")).toBe(false);
        });
    });

    describe("factory function", () => {
        it("should create handler instance", () => {
            const instance = createFileDownloadNodeHandler();
            expect(instance).toBeInstanceOf(FileDownloadNodeHandler);
        });
    });

    describe("execute", () => {
        describe("happy path", () => {
            it("should download file from URL", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/downloads/file.pdf",
                        filename: "file.pdf",
                        size: 1024000,
                        contentType: "application/pdf",
                        downloadTime: 1500,
                        url: "https://example.com/file.pdf"
                    }
                });

                const input = createMockInput({
                    url: "https://example.com/file.pdf",
                    outputVariable: "downloadResult"
                });

                const result = await handler.execute(input);

                expect(result.result).toHaveProperty("downloadResult");
                expect(result.result.downloadResult).toEqual(
                    expect.objectContaining({
                        path: "/workspace/downloads/file.pdf",
                        filename: "file.pdf",
                        size: 1024000,
                        contentType: "application/pdf"
                    })
                );
                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        url: "https://example.com/file.pdf"
                    }),
                    expect.any(Object)
                );
            });

            it("should download file with custom filename", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/downloads/custom-name.pdf",
                        filename: "custom-name.pdf",
                        size: 500000,
                        contentType: "application/pdf",
                        downloadTime: 800,
                        url: "https://example.com/doc"
                    }
                });

                const input = createMockInput({
                    url: "https://example.com/doc",
                    filename: "custom-name.pdf",
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        filename: "custom-name.pdf"
                    }),
                    expect.any(Object)
                );
            });

            it("should interpolate variables in URL", async () => {
                (interpolateVariables as jest.Mock).mockImplementation((value: string) => {
                    if (value === "{{fileUrl}}") return "https://resolved.com/file.zip";
                    return value;
                });

                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/file.zip",
                        filename: "file.zip",
                        size: 2000000,
                        contentType: "application/zip",
                        downloadTime: 3000,
                        url: "https://resolved.com/file.zip"
                    }
                });

                const input = createMockInput({
                    url: "{{fileUrl}}",
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        url: "https://resolved.com/file.zip"
                    }),
                    expect.any(Object)
                );
            });

            it("should interpolate variables in filename", async () => {
                (interpolateVariables as jest.Mock).mockImplementation((value: string) => {
                    if (value === "{{customFilename}}") return "dynamic-file.txt";
                    return value;
                });

                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/dynamic-file.txt",
                        filename: "dynamic-file.txt",
                        size: 1000,
                        contentType: "text/plain",
                        downloadTime: 100,
                        url: "https://example.com/data"
                    }
                });

                const input = createMockInput({
                    url: "https://example.com/data",
                    filename: "{{customFilename}}",
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        filename: "dynamic-file.txt"
                    }),
                    expect.any(Object)
                );
            });

            it("should store result in output variable", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/file.json",
                        filename: "file.json",
                        size: 500,
                        contentType: "application/json",
                        downloadTime: 50,
                        url: "https://example.com/file.json"
                    }
                });

                const input = createMockInput({
                    url: "https://example.com/file.json",
                    outputVariable: "myDownload"
                });

                const result = await handler.execute(input);

                expect(result.result).toHaveProperty("myDownload");
                expect(result.result.myDownload).toEqual(
                    expect.objectContaining({
                        filename: "file.json"
                    })
                );
            });

            it("should return file metadata (size, contentType, downloadTime)", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/image.png",
                        filename: "image.png",
                        size: 2500000,
                        contentType: "image/png",
                        downloadTime: 2000,
                        url: "https://example.com/image.png"
                    }
                });

                const input = createMockInput({
                    url: "https://example.com/image.png",
                    outputVariable: "result"
                });

                const result = await handler.execute(input);

                const download = result.result.result as {
                    size: number;
                    contentType: string;
                    downloadTime: number;
                };
                expect(download.size).toBe(2500000);
                expect(download.contentType).toBe("image/png");
                expect(download.downloadTime).toBe(2000);
            });
        });

        describe("configuration options", () => {
            it("should respect maxSize limit", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/small.txt",
                        filename: "small.txt",
                        size: 1000,
                        contentType: "text/plain",
                        downloadTime: 50,
                        url: "https://example.com/small.txt"
                    }
                });

                const input = createMockInput({
                    url: "https://example.com/small.txt",
                    maxSize: 10000,
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        maxSize: 10000
                    }),
                    expect.any(Object)
                );
            });

            it("should respect timeout setting", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/file.bin",
                        filename: "file.bin",
                        size: 5000000,
                        contentType: "application/octet-stream",
                        downloadTime: 10000,
                        url: "https://example.com/file.bin"
                    }
                });

                const input = createMockInput({
                    url: "https://example.com/file.bin",
                    timeout: 30000,
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        timeout: 30000
                    }),
                    expect.any(Object)
                );
            });

            it("should follow redirects when enabled", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/redirected.zip",
                        filename: "redirected.zip",
                        size: 1000000,
                        contentType: "application/zip",
                        downloadTime: 2000,
                        url: "https://cdn.example.com/redirected.zip"
                    }
                });

                const input = createMockInput({
                    url: "https://example.com/download",
                    followRedirects: true,
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        followRedirects: true
                    }),
                    expect.any(Object)
                );
            });

            it("should not follow redirects when disabled", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/file.txt",
                        filename: "file.txt",
                        size: 100,
                        contentType: "text/plain",
                        downloadTime: 50,
                        url: "https://example.com/file.txt"
                    }
                });

                const input = createMockInput({
                    url: "https://example.com/file.txt",
                    followRedirects: false,
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        followRedirects: false
                    }),
                    expect.any(Object)
                );
            });

            it("should validate allowed content types", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/doc.pdf",
                        filename: "doc.pdf",
                        size: 500000,
                        contentType: "application/pdf",
                        downloadTime: 800,
                        url: "https://example.com/doc.pdf"
                    }
                });

                const input = createMockInput({
                    url: "https://example.com/doc.pdf",
                    allowedContentTypes: ["application/pdf", "application/json"],
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        validateContentType: ["application/pdf", "application/json"]
                    }),
                    expect.any(Object)
                );
            });
        });

        describe("validation", () => {
            it("should throw error when URL is missing", async () => {
                const input = createMockInput({
                    outputVariable: "result"
                });

                await expect(handler.execute(input)).rejects.toThrow();
            });

            it("should throw error when URL is not a string", async () => {
                (interpolateVariables as jest.Mock).mockReturnValueOnce(12345);

                const input = createMockInput({
                    url: "{{nonStringUrl}}",
                    outputVariable: "result"
                });

                await expect(handler.execute(input)).rejects.toThrow("URL is required");
            });

            it("should throw error when URL resolves to empty", async () => {
                (interpolateVariables as jest.Mock).mockReturnValueOnce("");

                const input = createMockInput({
                    url: "{{emptyUrl}}",
                    outputVariable: "result"
                });

                await expect(handler.execute(input)).rejects.toThrow("URL is required");
            });
        });

        describe("error handling", () => {
            it("should handle 404 responses", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: false,
                    error: { message: "HTTP 404: File not found" }
                });

                const input = createMockInput({
                    url: "https://example.com/nonexistent.pdf",
                    outputVariable: "result"
                });

                await expect(handler.execute(input)).rejects.toThrow("HTTP 404: File not found");
            });

            it("should handle 500 responses", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: false,
                    error: { message: "HTTP 500: Internal server error" }
                });

                const input = createMockInput({
                    url: "https://example.com/file.pdf",
                    outputVariable: "result"
                });

                await expect(handler.execute(input)).rejects.toThrow(
                    "HTTP 500: Internal server error"
                );
            });

            it("should handle network timeouts", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: false,
                    error: { message: "Request timeout after 30000ms" }
                });

                const input = createMockInput({
                    url: "https://slow.example.com/file.pdf",
                    timeout: 30000,
                    outputVariable: "result"
                });

                await expect(handler.execute(input)).rejects.toThrow(
                    "Request timeout after 30000ms"
                );
            });

            it("should handle connection refused", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: false,
                    error: { message: "ECONNREFUSED - Connection refused" }
                });

                const input = createMockInput({
                    url: "https://offline.example.com/file.pdf",
                    outputVariable: "result"
                });

                await expect(handler.execute(input)).rejects.toThrow(
                    "ECONNREFUSED - Connection refused"
                );
            });

            it("should handle SSL certificate errors", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: false,
                    error: { message: "SSL certificate verification failed" }
                });

                const input = createMockInput({
                    url: "https://invalid-ssl.example.com/file.pdf",
                    outputVariable: "result"
                });

                await expect(handler.execute(input)).rejects.toThrow(
                    "SSL certificate verification failed"
                );
            });
        });

        describe("edge cases", () => {
            it("should handle result without output variable", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/file.txt",
                        filename: "file.txt",
                        size: 100,
                        contentType: "text/plain",
                        downloadTime: 50,
                        url: "https://example.com/file.txt"
                    }
                });

                const input = createMockInput({
                    url: "https://example.com/file.txt"
                    // No outputVariable
                });

                const result = await handler.execute(input);

                expect(Object.keys(result.result)).toHaveLength(0);
            });

            it("should handle URLs with query parameters", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/file.pdf",
                        filename: "file.pdf",
                        size: 1000,
                        contentType: "application/pdf",
                        downloadTime: 100,
                        url: "https://example.com/file.pdf?token=abc123&version=2"
                    }
                });

                const input = createMockInput({
                    url: "https://example.com/file.pdf?token=abc123&version=2",
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        url: "https://example.com/file.pdf?token=abc123&version=2"
                    }),
                    expect.any(Object)
                );
            });

            it("should include duration metrics", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/file.txt",
                        filename: "file.txt",
                        size: 100,
                        contentType: "text/plain",
                        downloadTime: 50,
                        url: "https://example.com/file.txt"
                    }
                });

                const input = createMockInput({
                    url: "https://example.com/file.txt",
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
                        filename: "file.txt",
                        size: 100,
                        contentType: "text/plain",
                        downloadTime: 50,
                        url: "https://example.com/file.txt"
                    }
                });

                const input = createMockInput({
                    url: "https://example.com/file.txt",
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

            it("should handle non-string filename from interpolation", async () => {
                (interpolateVariables as jest.Mock).mockImplementation((value: unknown) => {
                    if (value === "{{filename}}") return 12345; // Non-string
                    return value;
                });

                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/file.txt",
                        filename: "file.txt",
                        size: 100,
                        contentType: "text/plain",
                        downloadTime: 50,
                        url: "https://example.com/file.txt"
                    }
                });

                const input = createMockInput({
                    url: "https://example.com/file.txt",
                    filename: "{{filename}}",
                    outputVariable: "result"
                });

                await handler.execute(input);

                // Should pass undefined for filename when it's not a string
                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        filename: undefined
                    }),
                    expect.any(Object)
                );
            });
        });

        describe("timeout scenarios", () => {
            it("should handle download timeout for large files", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: false,
                    error: { message: "Download timeout: file transfer exceeded 60000ms" }
                });

                const input = createMockInput({
                    url: "https://example.com/large-file.zip",
                    timeout: 60000,
                    outputVariable: "result"
                });

                await expect(handler.execute(input)).rejects.toThrow("timeout");
            });

            it("should handle slow download within timeout", async () => {
                mockExecute.mockImplementationOnce(
                    () =>
                        new Promise((resolve) =>
                            setTimeout(
                                () =>
                                    resolve({
                                        success: true,
                                        data: {
                                            path: "/workspace/slow-file.pdf",
                                            filename: "slow-file.pdf",
                                            size: 5000000,
                                            contentType: "application/pdf",
                                            downloadTime: 15000,
                                            url: "https://slow.example.com/file.pdf"
                                        }
                                    }),
                                50
                            )
                        )
                );

                const input = createMockInput({
                    url: "https://slow.example.com/file.pdf",
                    outputVariable: "result"
                });

                const result = await handler.execute(input);

                expect(result.result.result).toBeDefined();
            });
        });

        describe("concurrent operations", () => {
            it("should handle multiple simultaneous downloads", async () => {
                const files = ["file1.pdf", "file2.pdf", "file3.pdf"];

                files.forEach((filename, i) => {
                    mockExecute.mockResolvedValueOnce({
                        success: true,
                        data: {
                            path: `/workspace/${filename}`,
                            filename,
                            size: 1000 * (i + 1),
                            contentType: "application/pdf",
                            downloadTime: 100 * (i + 1),
                            url: `https://example.com/${filename}`
                        }
                    });
                });

                const handler1 = createFileDownloadNodeHandler();
                const handler2 = createFileDownloadNodeHandler();
                const handler3 = createFileDownloadNodeHandler();

                const results = await Promise.all([
                    handler1.execute(
                        createMockInput({
                            url: `https://example.com/${files[0]}`,
                            outputVariable: "r1"
                        })
                    ),
                    handler2.execute(
                        createMockInput({
                            url: `https://example.com/${files[1]}`,
                            outputVariable: "r2"
                        })
                    ),
                    handler3.execute(
                        createMockInput({
                            url: `https://example.com/${files[2]}`,
                            outputVariable: "r3"
                        })
                    )
                ]);

                expect(results).toHaveLength(3);
                results.forEach((result, i) => {
                    expect(result.result[`r${i + 1}`]).toBeDefined();
                });
            });

            it("should isolate errors between concurrent downloads", async () => {
                mockExecute
                    .mockResolvedValueOnce({
                        success: true,
                        data: {
                            path: "/workspace/success1.pdf",
                            filename: "success1.pdf",
                            size: 1000,
                            contentType: "application/pdf",
                            downloadTime: 100,
                            url: "https://example.com/success1.pdf"
                        }
                    })
                    .mockResolvedValueOnce({
                        success: false,
                        error: { message: "HTTP 403: Access denied" }
                    })
                    .mockResolvedValueOnce({
                        success: true,
                        data: {
                            path: "/workspace/success2.pdf",
                            filename: "success2.pdf",
                            size: 2000,
                            contentType: "application/pdf",
                            downloadTime: 200,
                            url: "https://example.com/success2.pdf"
                        }
                    });

                const handler1 = createFileDownloadNodeHandler();
                const handler2 = createFileDownloadNodeHandler();
                const handler3 = createFileDownloadNodeHandler();

                const results = await Promise.allSettled([
                    handler1.execute(
                        createMockInput({
                            url: "https://example.com/success1.pdf",
                            outputVariable: "r1"
                        })
                    ),
                    handler2.execute(
                        createMockInput({
                            url: "https://protected.com/file.pdf",
                            outputVariable: "r2"
                        })
                    ),
                    handler3.execute(
                        createMockInput({
                            url: "https://example.com/success2.pdf",
                            outputVariable: "r3"
                        })
                    )
                ]);

                expect(results[0].status).toBe("fulfilled");
                expect(results[1].status).toBe("rejected");
                expect(results[2].status).toBe("fulfilled");
            });
        });
    });
});
