/**
 * Web Browse Handler Unit Tests
 *
 * Tests for the WebBrowseNodeHandler which fetches and reads
 * web page content using the web_browse builtin tool.
 */

// Mock the builtin tool
const mockExecute = jest.fn();
jest.mock("../../../../../services/tools/builtin/web-browse", () => ({
    webBrowseTool: {
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
import { WebBrowseNodeHandler, createWebBrowseNodeHandler } from "../inputs/web-browse";

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
        nodeType: "webBrowse",
        nodeConfig,
        context: createMockContext(contextOverrides),
        metadata: {
            executionId: "test-execution-id",
            nodeId: "test-node-id",
            nodeName: "Test Web Browse"
        }
    };
}

describe("WebBrowseNodeHandler", () => {
    let handler: WebBrowseNodeHandler;

    beforeEach(() => {
        jest.clearAllMocks();
        handler = new WebBrowseNodeHandler();
        (interpolateVariables as jest.Mock).mockImplementation((value: unknown) => value);
    });

    describe("properties", () => {
        it("should have correct handler properties", () => {
            expect(handler.name).toBe("WebBrowseNodeHandler");
            expect(handler.supportedNodeTypes).toContain("webBrowse");
        });

        it("should report canHandle correctly", () => {
            expect(handler.canHandle("webBrowse")).toBe(true);
            expect(handler.canHandle("otherType")).toBe(false);
        });
    });

    describe("factory function", () => {
        it("should create handler instance", () => {
            const instance = createWebBrowseNodeHandler();
            expect(instance).toBeInstanceOf(WebBrowseNodeHandler);
        });
    });

    describe("execute", () => {
        describe("happy path", () => {
            it("should fetch web page content", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        url: "https://example.com",
                        content: "<html><body>Hello World</body></html>",
                        contentType: "text/html",
                        contentLength: 37
                    }
                });

                const input = createMockInput({
                    url: "https://example.com",
                    outputVariable: "webContent"
                });

                const result = await handler.execute(input);

                expect(result.result).toHaveProperty("webContent");
                expect(result.result.webContent).toEqual(
                    expect.objectContaining({
                        url: "https://example.com",
                        contentType: "text/html"
                    })
                );
                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        url: "https://example.com"
                    }),
                    expect.any(Object)
                );
            });

            it("should extract text from HTML", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        url: "https://example.com",
                        content: "Hello World - extracted text",
                        contentType: "text/html",
                        contentLength: 28
                    }
                });

                const input = createMockInput({
                    url: "https://example.com",
                    extractText: true,
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        extractText: true
                    }),
                    expect.any(Object)
                );
            });

            it("should return raw HTML when extractText is false", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        url: "https://example.com",
                        content:
                            "<html><head><title>Test</title></head><body>Content</body></html>",
                        contentType: "text/html",
                        contentLength: 65
                    }
                });

                const input = createMockInput({
                    url: "https://example.com",
                    extractText: false,
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        extractText: false
                    }),
                    expect.any(Object)
                );
            });

            it("should interpolate variables in URL", async () => {
                (interpolateVariables as jest.Mock).mockImplementation((value: string) => {
                    if (value === "{{targetUrl}}") return "https://resolved.example.com/page";
                    return value;
                });

                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        url: "https://resolved.example.com/page",
                        content: "Resolved content",
                        contentType: "text/html",
                        contentLength: 16
                    }
                });

                const input = createMockInput({
                    url: "{{targetUrl}}",
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        url: "https://resolved.example.com/page"
                    }),
                    expect.any(Object)
                );
            });

            it("should store result in output variable", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        url: "https://example.com",
                        content: "Page content",
                        contentType: "text/html",
                        contentLength: 12
                    }
                });

                const input = createMockInput({
                    url: "https://example.com",
                    outputVariable: "myPageData"
                });

                const result = await handler.execute(input);

                expect(result.result).toHaveProperty("myPageData");
                expect(result.result.myPageData).toEqual(
                    expect.objectContaining({
                        content: "Page content"
                    })
                );
            });

            it("should return content type", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        url: "https://api.example.com/data.json",
                        content: '{"key": "value"}',
                        contentType: "application/json",
                        contentLength: 16
                    }
                });

                const input = createMockInput({
                    url: "https://api.example.com/data.json",
                    outputVariable: "result"
                });

                const result = await handler.execute(input);

                expect((result.result.result as { contentType: string }).contentType).toBe(
                    "application/json"
                );
            });
        });

        describe("configuration options", () => {
            it("should respect maxLength limit", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        url: "https://example.com",
                        content: "Truncated content",
                        contentType: "text/html",
                        contentLength: 17
                    }
                });

                const input = createMockInput({
                    url: "https://example.com",
                    maxLength: 5000,
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        maxLength: 5000
                    }),
                    expect.any(Object)
                );
            });

            it("should truncate content exceeding maxLength", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        url: "https://example.com",
                        content: "A".repeat(1000),
                        contentType: "text/html",
                        contentLength: 1000
                    }
                });

                const input = createMockInput({
                    url: "https://example.com",
                    maxLength: 1000,
                    outputVariable: "result"
                });

                const result = await handler.execute(input);

                expect((result.result.result as { contentLength: number }).contentLength).toBe(
                    1000
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
        });

        describe("HTTP response handling", () => {
            it("should handle 200 OK responses", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        url: "https://example.com",
                        content: "Success content",
                        contentType: "text/html",
                        contentLength: 15
                    }
                });

                const input = createMockInput({
                    url: "https://example.com",
                    outputVariable: "result"
                });

                const result = await handler.execute(input);

                expect(result.result.result).toBeDefined();
            });

            it("should handle 301/302 redirects", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        url: "https://redirected.example.com",
                        content: "Redirected content",
                        contentType: "text/html",
                        contentLength: 18
                    }
                });

                const input = createMockInput({
                    url: "https://example.com/old-path",
                    outputVariable: "result"
                });

                const result = await handler.execute(input);

                expect((result.result.result as { url: string }).url).toBe(
                    "https://redirected.example.com"
                );
            });

            it("should handle 404 not found", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: false,
                    error: { message: "HTTP 404: Page not found" }
                });

                const input = createMockInput({
                    url: "https://example.com/nonexistent",
                    outputVariable: "result"
                });

                await expect(handler.execute(input)).rejects.toThrow("HTTP 404: Page not found");
            });

            it("should handle 500 server errors", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: false,
                    error: { message: "HTTP 500: Internal server error" }
                });

                const input = createMockInput({
                    url: "https://broken.example.com",
                    outputVariable: "result"
                });

                await expect(handler.execute(input)).rejects.toThrow(
                    "HTTP 500: Internal server error"
                );
            });

            it("should handle different content types (html, json, text)", async () => {
                const contentTypes = [
                    { type: "text/html", content: "<html>Test</html>" },
                    { type: "application/json", content: '{"test": true}' },
                    { type: "text/plain", content: "Plain text" }
                ];

                for (const { type, content } of contentTypes) {
                    mockExecute.mockResolvedValueOnce({
                        success: true,
                        data: {
                            url: "https://example.com",
                            content,
                            contentType: type,
                            contentLength: content.length
                        }
                    });

                    const input = createMockInput({
                        url: "https://example.com",
                        outputVariable: "result"
                    });

                    const result = await handler.execute(input);

                    expect((result.result.result as { contentType: string }).contentType).toBe(
                        type
                    );
                }
            });
        });

        describe("error handling", () => {
            it("should handle network timeouts", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: false,
                    error: { message: "Request timeout" }
                });

                const input = createMockInput({
                    url: "https://slow.example.com",
                    outputVariable: "result"
                });

                await expect(handler.execute(input)).rejects.toThrow("Request timeout");
            });

            it("should handle DNS resolution failures", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: false,
                    error: { message: "ENOTFOUND: DNS lookup failed" }
                });

                const input = createMockInput({
                    url: "https://nonexistent-domain.example",
                    outputVariable: "result"
                });

                await expect(handler.execute(input)).rejects.toThrow(
                    "ENOTFOUND: DNS lookup failed"
                );
            });

            it("should handle connection refused", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: false,
                    error: { message: "ECONNREFUSED: Connection refused" }
                });

                const input = createMockInput({
                    url: "https://offline.example.com",
                    outputVariable: "result"
                });

                await expect(handler.execute(input)).rejects.toThrow(
                    "ECONNREFUSED: Connection refused"
                );
            });

            it("should handle SSL certificate errors", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: false,
                    error: { message: "SSL certificate verification failed" }
                });

                const input = createMockInput({
                    url: "https://invalid-ssl.example.com",
                    outputVariable: "result"
                });

                await expect(handler.execute(input)).rejects.toThrow(
                    "SSL certificate verification failed"
                );
            });
        });

        describe("edge cases", () => {
            it("should handle pages with no content", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        url: "https://example.com/empty",
                        content: "",
                        contentType: "text/html",
                        contentLength: 0
                    }
                });

                const input = createMockInput({
                    url: "https://example.com/empty",
                    outputVariable: "result"
                });

                const result = await handler.execute(input);

                expect((result.result.result as { content: string }).content).toBe("");
                expect((result.result.result as { contentLength: number }).contentLength).toBe(0);
            });

            it("should handle pages with special characters", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        url: "https://example.com",
                        content: "Unicode content: 你好世界 🎉",
                        contentType: "text/html",
                        contentLength: 28
                    }
                });

                const input = createMockInput({
                    url: "https://example.com",
                    outputVariable: "result"
                });

                const result = await handler.execute(input);

                expect((result.result.result as { content: string }).content).toContain("你好世界");
            });

            it("should handle result without output variable", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        url: "https://example.com",
                        content: "No output var",
                        contentType: "text/html",
                        contentLength: 13
                    }
                });

                const input = createMockInput({
                    url: "https://example.com"
                    // No outputVariable
                });

                const result = await handler.execute(input);

                expect(Object.keys(result.result)).toHaveLength(0);
            });

            it("should include duration metrics", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        url: "https://example.com",
                        content: "Test",
                        contentType: "text/html",
                        contentLength: 4
                    }
                });

                const input = createMockInput({
                    url: "https://example.com",
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
                        url: "https://example.com",
                        content: "Test",
                        contentType: "text/html",
                        contentLength: 4
                    }
                });

                const input = createMockInput({
                    url: "https://example.com",
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

        describe("timeout scenarios", () => {
            it("should handle slow page response within timeout", async () => {
                // Simulate a slow but successful response
                mockExecute.mockImplementationOnce(
                    () =>
                        new Promise((resolve) =>
                            setTimeout(
                                () =>
                                    resolve({
                                        success: true,
                                        data: {
                                            url: "https://slow.example.com",
                                            content: "Eventually loaded",
                                            contentType: "text/html",
                                            contentLength: 17
                                        }
                                    }),
                                50
                            )
                        )
                );

                const input = createMockInput({
                    url: "https://slow.example.com",
                    outputVariable: "result"
                });

                const result = await handler.execute(input);

                expect(result.result.result).toBeDefined();
                expect((result.result.result as { content: string }).content).toBe(
                    "Eventually loaded"
                );
            });

            it("should handle connection timeout with retry suggestion", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: false,
                    error: { message: "ETIMEDOUT: Connection timed out" }
                });

                const input = createMockInput({
                    url: "https://unresponsive.example.com",
                    outputVariable: "result"
                });

                await expect(handler.execute(input)).rejects.toThrow("ETIMEDOUT");
            });
        });

        describe("concurrent operations", () => {
            it("should handle multiple simultaneous browse requests", async () => {
                const urls = [
                    "https://example1.com",
                    "https://example2.com",
                    "https://example3.com"
                ];

                urls.forEach((url, i) => {
                    mockExecute.mockResolvedValueOnce({
                        success: true,
                        data: {
                            url,
                            content: `Content ${i}`,
                            contentType: "text/html",
                            contentLength: 9
                        }
                    });
                });

                const handler1 = createWebBrowseNodeHandler();
                const handler2 = createWebBrowseNodeHandler();
                const handler3 = createWebBrowseNodeHandler();

                const results = await Promise.all([
                    handler1.execute(createMockInput({ url: urls[0], outputVariable: "r1" })),
                    handler2.execute(createMockInput({ url: urls[1], outputVariable: "r2" })),
                    handler3.execute(createMockInput({ url: urls[2], outputVariable: "r3" }))
                ]);

                expect(results).toHaveLength(3);
                results.forEach((result, i) => {
                    expect(result.result[`r${i + 1}`]).toBeDefined();
                });
            });

            it("should isolate errors between concurrent requests", async () => {
                mockExecute
                    .mockResolvedValueOnce({
                        success: true,
                        data: {
                            url: "https://example1.com",
                            content: "Success",
                            contentType: "text/html",
                            contentLength: 7
                        }
                    })
                    .mockResolvedValueOnce({
                        success: false,
                        error: { message: "HTTP 500: Server error" }
                    })
                    .mockResolvedValueOnce({
                        success: true,
                        data: {
                            url: "https://example3.com",
                            content: "Also success",
                            contentType: "text/html",
                            contentLength: 12
                        }
                    });

                const handler1 = createWebBrowseNodeHandler();
                const handler2 = createWebBrowseNodeHandler();
                const handler3 = createWebBrowseNodeHandler();

                const results = await Promise.allSettled([
                    handler1.execute(
                        createMockInput({ url: "https://example1.com", outputVariable: "r1" })
                    ),
                    handler2.execute(
                        createMockInput({ url: "https://failing.com", outputVariable: "r2" })
                    ),
                    handler3.execute(
                        createMockInput({ url: "https://example3.com", outputVariable: "r3" })
                    )
                ]);

                expect(results[0].status).toBe("fulfilled");
                expect(results[1].status).toBe("rejected");
                expect(results[2].status).toBe("fulfilled");
            });
        });
    });
});
