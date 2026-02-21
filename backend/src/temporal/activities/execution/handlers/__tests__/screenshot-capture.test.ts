/**
 * Screenshot Capture Handler Unit Tests
 *
 * Tests for the ScreenshotCaptureNodeHandler which captures screenshots
 * of web pages using the screenshot_capture builtin tool.
 */

// Mock the builtin tool
const mockExecute = jest.fn();
jest.mock("../../../../../services/tools/builtin/screenshot-capture", () => ({
    screenshotCaptureTool: {
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
import {
    ScreenshotCaptureNodeHandler,
    createScreenshotCaptureNodeHandler
} from "../outputs/screenshot-capture";

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
        nodeType: "screenshotCapture",
        nodeConfig,
        context: createMockContext(contextOverrides),
        metadata: {
            executionId: "test-execution-id",
            nodeId: "test-node-id",
            nodeName: "Test Screenshot Capture"
        }
    };
}

describe("ScreenshotCaptureNodeHandler", () => {
    let handler: ScreenshotCaptureNodeHandler;

    beforeEach(() => {
        jest.clearAllMocks();
        handler = new ScreenshotCaptureNodeHandler();
        (interpolateVariables as jest.Mock).mockImplementation((value: unknown) => value);
    });

    describe("properties", () => {
        it("should have correct handler properties", () => {
            expect(handler.name).toBe("ScreenshotCaptureNodeHandler");
            expect(handler.supportedNodeTypes).toContain("screenshotCapture");
        });

        it("should report canHandle correctly", () => {
            expect(handler.canHandle("screenshotCapture")).toBe(true);
            expect(handler.canHandle("otherType")).toBe(false);
        });
    });

    describe("factory function", () => {
        it("should create handler instance", () => {
            const instance = createScreenshotCaptureNodeHandler();
            expect(instance).toBeInstanceOf(ScreenshotCaptureNodeHandler);
        });
    });

    describe("execute", () => {
        describe("happy path", () => {
            it("should capture screenshot of URL", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/screenshot.png",
                        filename: "screenshot.png",
                        format: "png",
                        width: 1280,
                        height: 720,
                        size: 250000,
                        url: "https://example.com",
                        capturedAt: "2024-01-15T12:00:00Z"
                    }
                });

                const input = createMockInput({
                    url: "https://example.com",
                    outputVariable: "screenshotResult"
                });

                const result = await handler.execute(input);

                expect(result.result).toHaveProperty("screenshotResult");
                expect(result.result.screenshotResult).toEqual(
                    expect.objectContaining({
                        url: "https://example.com",
                        width: 1280,
                        height: 720
                    })
                );
                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        url: "https://example.com"
                    }),
                    expect.any(Object)
                );
            });

            it("should capture full page screenshot", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/fullpage.png",
                        filename: "fullpage.png",
                        format: "png",
                        width: 1280,
                        height: 5000,
                        size: 1000000,
                        url: "https://example.com/long-page",
                        capturedAt: "2024-01-15T12:00:00Z"
                    }
                });

                const input = createMockInput({
                    url: "https://example.com/long-page",
                    fullPage: true,
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        fullPage: true
                    }),
                    expect.any(Object)
                );
            });

            it("should capture viewport only screenshot", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/viewport.png",
                        filename: "viewport.png",
                        format: "png",
                        width: 1280,
                        height: 720,
                        size: 200000,
                        url: "https://example.com",
                        capturedAt: "2024-01-15T12:00:00Z"
                    }
                });

                const input = createMockInput({
                    url: "https://example.com",
                    fullPage: false,
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        fullPage: false
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
                        path: "/workspace/screenshot.png",
                        filename: "screenshot.png",
                        format: "png",
                        width: 1280,
                        height: 720,
                        size: 200000,
                        url: "https://resolved.example.com/page",
                        capturedAt: "2024-01-15T12:00:00Z"
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
                        path: "/workspace/screenshot.png",
                        filename: "screenshot.png",
                        format: "png",
                        width: 1280,
                        height: 720,
                        size: 200000,
                        url: "https://example.com",
                        capturedAt: "2024-01-15T12:00:00Z"
                    }
                });

                const input = createMockInput({
                    url: "https://example.com",
                    outputVariable: "myScreenshot"
                });

                const result = await handler.execute(input);

                expect(result.result).toHaveProperty("myScreenshot");
            });

            it("should return file metadata (path, dimensions, size)", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/screenshot.png",
                        filename: "screenshot.png",
                        format: "png",
                        width: 1920,
                        height: 1080,
                        size: 500000,
                        url: "https://example.com",
                        capturedAt: "2024-01-15T12:00:00Z"
                    }
                });

                const input = createMockInput({
                    url: "https://example.com",
                    outputVariable: "result"
                });

                const result = await handler.execute(input);

                const screenshot = result.result.result as {
                    path: string;
                    width: number;
                    height: number;
                    size: number;
                };
                expect(screenshot.path).toBe("/workspace/screenshot.png");
                expect(screenshot.width).toBe(1920);
                expect(screenshot.height).toBe(1080);
                expect(screenshot.size).toBe(500000);
            });
        });

        describe("dimensions", () => {
            it("should capture with custom width", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/screenshot.png",
                        filename: "screenshot.png",
                        format: "png",
                        width: 1920,
                        height: 720,
                        size: 300000,
                        url: "https://example.com",
                        capturedAt: "2024-01-15T12:00:00Z"
                    }
                });

                const input = createMockInput({
                    url: "https://example.com",
                    width: 1920,
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        width: 1920
                    }),
                    expect.any(Object)
                );
            });

            it("should capture with custom height", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/screenshot.png",
                        filename: "screenshot.png",
                        format: "png",
                        width: 1280,
                        height: 1080,
                        size: 350000,
                        url: "https://example.com",
                        capturedAt: "2024-01-15T12:00:00Z"
                    }
                });

                const input = createMockInput({
                    url: "https://example.com",
                    height: 1080,
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        height: 1080
                    }),
                    expect.any(Object)
                );
            });

            it("should capture with device scale factor", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/screenshot.png",
                        filename: "screenshot.png",
                        format: "png",
                        width: 2560,
                        height: 1440,
                        size: 800000,
                        url: "https://example.com",
                        capturedAt: "2024-01-15T12:00:00Z"
                    }
                });

                const input = createMockInput({
                    url: "https://example.com",
                    deviceScale: 2,
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        deviceScale: 2
                    }),
                    expect.any(Object)
                );
            });
        });

        describe("format options", () => {
            it("should capture as PNG", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/screenshot.png",
                        filename: "screenshot.png",
                        format: "png",
                        width: 1280,
                        height: 720,
                        size: 300000,
                        url: "https://example.com",
                        capturedAt: "2024-01-15T12:00:00Z"
                    }
                });

                const input = createMockInput({
                    url: "https://example.com",
                    format: "png",
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        format: "png"
                    }),
                    expect.any(Object)
                );
            });

            it("should capture as JPEG with quality", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/screenshot.jpg",
                        filename: "screenshot.jpg",
                        format: "jpeg",
                        width: 1280,
                        height: 720,
                        size: 100000,
                        url: "https://example.com",
                        capturedAt: "2024-01-15T12:00:00Z"
                    }
                });

                const input = createMockInput({
                    url: "https://example.com",
                    format: "jpeg",
                    quality: 85,
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        format: "jpeg",
                        quality: 85
                    }),
                    expect.any(Object)
                );
            });

            it("should use custom filename", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/my-custom-name.png",
                        filename: "my-custom-name.png",
                        format: "png",
                        width: 1280,
                        height: 720,
                        size: 200000,
                        url: "https://example.com",
                        capturedAt: "2024-01-15T12:00:00Z"
                    }
                });

                const input = createMockInput({
                    url: "https://example.com",
                    filename: "my-custom-name",
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        filename: "my-custom-name"
                    }),
                    expect.any(Object)
                );
            });
        });

        describe("selector targeting", () => {
            it("should capture specific element by selector", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/element.png",
                        filename: "element.png",
                        format: "png",
                        width: 400,
                        height: 300,
                        size: 50000,
                        url: "https://example.com",
                        capturedAt: "2024-01-15T12:00:00Z"
                    }
                });

                const input = createMockInput({
                    url: "https://example.com",
                    selector: "#main-content",
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        selector: "#main-content"
                    }),
                    expect.any(Object)
                );
            });

            it("should handle selector not found", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: false,
                    error: { message: "Element not found: #nonexistent" }
                });

                const input = createMockInput({
                    url: "https://example.com",
                    selector: "#nonexistent",
                    outputVariable: "result"
                });

                await expect(handler.execute(input)).rejects.toThrow(
                    "Element not found: #nonexistent"
                );
            });
        });

        describe("page options", () => {
            it("should apply dark mode", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/dark.png",
                        filename: "dark.png",
                        format: "png",
                        width: 1280,
                        height: 720,
                        size: 200000,
                        url: "https://example.com",
                        capturedAt: "2024-01-15T12:00:00Z"
                    }
                });

                const input = createMockInput({
                    url: "https://example.com",
                    darkMode: true,
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        darkMode: true
                    }),
                    expect.any(Object)
                );
            });

            it("should wait for delay before capture", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/delayed.png",
                        filename: "delayed.png",
                        format: "png",
                        width: 1280,
                        height: 720,
                        size: 200000,
                        url: "https://example.com",
                        capturedAt: "2024-01-15T12:00:00Z"
                    }
                });

                const input = createMockInput({
                    url: "https://example.com",
                    delay: 2000,
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        delay: 2000
                    }),
                    expect.any(Object)
                );
            });

            it("should respect timeout setting", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/screenshot.png",
                        filename: "screenshot.png",
                        format: "png",
                        width: 1280,
                        height: 720,
                        size: 200000,
                        url: "https://example.com",
                        capturedAt: "2024-01-15T12:00:00Z"
                    }
                });

                const input = createMockInput({
                    url: "https://example.com",
                    timeout: 60000,
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        timeout: 60000
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
        });

        describe("error handling", () => {
            it("should handle page load timeout", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: false,
                    error: { message: "Page load timeout after 30000ms" }
                });

                const input = createMockInput({
                    url: "https://slow.example.com",
                    outputVariable: "result"
                });

                await expect(handler.execute(input)).rejects.toThrow(
                    "Page load timeout after 30000ms"
                );
            });

            it("should handle invalid URLs", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: false,
                    error: { message: "Invalid URL format" }
                });

                const input = createMockInput({
                    url: "not-a-valid-url",
                    outputVariable: "result"
                });

                await expect(handler.execute(input)).rejects.toThrow("Invalid URL format");
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
            it("should handle result without output variable", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/screenshot.png",
                        filename: "screenshot.png",
                        format: "png",
                        width: 1280,
                        height: 720,
                        size: 200000,
                        url: "https://example.com",
                        capturedAt: "2024-01-15T12:00:00Z"
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
                        path: "/workspace/screenshot.png",
                        filename: "screenshot.png",
                        format: "png",
                        width: 1280,
                        height: 720,
                        size: 200000,
                        url: "https://example.com",
                        capturedAt: "2024-01-15T12:00:00Z"
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
                        path: "/workspace/screenshot.png",
                        filename: "screenshot.png",
                        format: "png",
                        width: 1280,
                        height: 720,
                        size: 200000,
                        url: "https://example.com",
                        capturedAt: "2024-01-15T12:00:00Z"
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
            it("should handle navigation timeout", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: false,
                    error: { message: "Navigation timeout: page did not load within 60000ms" }
                });

                const input = createMockInput({
                    url: "https://very-slow-page.example.com",
                    timeout: 60000,
                    outputVariable: "result"
                });

                await expect(handler.execute(input)).rejects.toThrow("timeout");
            });

            it("should handle slow page render within timeout", async () => {
                mockExecute.mockImplementationOnce(
                    () =>
                        new Promise((resolve) =>
                            setTimeout(
                                () =>
                                    resolve({
                                        success: true,
                                        data: {
                                            path: "/workspace/slow-page.png",
                                            filename: "slow-page.png",
                                            format: "png",
                                            width: 1280,
                                            height: 720,
                                            size: 300000,
                                            url: "https://slow.example.com",
                                            capturedAt: "2024-01-15T12:00:00Z"
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
            });
        });

        describe("concurrent operations", () => {
            it("should handle multiple simultaneous screenshots", async () => {
                const urls = [
                    "https://example1.com",
                    "https://example2.com",
                    "https://example3.com"
                ];

                urls.forEach((url, i) => {
                    mockExecute.mockResolvedValueOnce({
                        success: true,
                        data: {
                            path: `/workspace/screenshot${i + 1}.png`,
                            filename: `screenshot${i + 1}.png`,
                            format: "png",
                            width: 1280,
                            height: 720,
                            size: 200000 + i * 10000,
                            url,
                            capturedAt: "2024-01-15T12:00:00Z"
                        }
                    });
                });

                const handler1 = createScreenshotCaptureNodeHandler();
                const handler2 = createScreenshotCaptureNodeHandler();
                const handler3 = createScreenshotCaptureNodeHandler();

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

            it("should isolate errors between concurrent screenshots", async () => {
                mockExecute
                    .mockResolvedValueOnce({
                        success: true,
                        data: {
                            path: "/workspace/success1.png",
                            filename: "success1.png",
                            format: "png",
                            width: 1280,
                            height: 720,
                            size: 200000,
                            url: "https://example1.com",
                            capturedAt: "2024-01-15T12:00:00Z"
                        }
                    })
                    .mockResolvedValueOnce({
                        success: false,
                        error: { message: "Browser crashed" }
                    })
                    .mockResolvedValueOnce({
                        success: true,
                        data: {
                            path: "/workspace/success2.png",
                            filename: "success2.png",
                            format: "png",
                            width: 1280,
                            height: 720,
                            size: 200000,
                            url: "https://example3.com",
                            capturedAt: "2024-01-15T12:00:00Z"
                        }
                    });

                const handler1 = createScreenshotCaptureNodeHandler();
                const handler2 = createScreenshotCaptureNodeHandler();
                const handler3 = createScreenshotCaptureNodeHandler();

                const results = await Promise.allSettled([
                    handler1.execute(
                        createMockInput({ url: "https://example1.com", outputVariable: "r1" })
                    ),
                    handler2.execute(
                        createMockInput({ url: "https://crash.com", outputVariable: "r2" })
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

        describe("resource cleanup", () => {
            it("should cleanup after successful capture", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/screenshot.png",
                        filename: "screenshot.png",
                        format: "png",
                        width: 1280,
                        height: 720,
                        size: 200000,
                        url: "https://example.com",
                        capturedAt: "2024-01-15T12:00:00Z"
                    }
                });

                const input = createMockInput({
                    url: "https://example.com",
                    outputVariable: "result"
                });

                const result = await handler.execute(input);

                // Verify operation completed successfully
                expect(result.result.result).toBeDefined();
                // Tool is expected to handle cleanup internally
                expect(mockExecute).toHaveBeenCalledTimes(1);
            });

            it("should cleanup after failed capture", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: false,
                    error: { message: "Capture failed" }
                });

                const input = createMockInput({
                    url: "https://example.com",
                    outputVariable: "result"
                });

                await expect(handler.execute(input)).rejects.toThrow("Capture failed");
                // Verify the tool was called (cleanup happens internally)
                expect(mockExecute).toHaveBeenCalledTimes(1);
            });
        });
    });
});
