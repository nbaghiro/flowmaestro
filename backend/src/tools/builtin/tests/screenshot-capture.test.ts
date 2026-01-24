/**
 * Screenshot Capture Tool Tests
 */

import * as fs from "fs/promises";
import { screenshotCaptureTool, screenshotCaptureInputSchema } from "../screenshot-capture";
import {
    createMockContext,
    assertSuccess,
    assertError,
    assertToolProperties,
    assertHasMetadata
} from "./test-helpers";
import type { Stats } from "fs";

// Mock fs/promises
jest.mock("fs/promises", () => ({
    mkdir: jest.fn(),
    stat: jest.fn()
}));

// Mock Playwright
const mockPage = {
    setViewportSize: jest.fn(),
    setExtraHTTPHeaders: jest.fn(),
    goto: jest.fn().mockResolvedValue(null),
    waitForSelector: jest.fn().mockResolvedValue(null),
    waitForTimeout: jest.fn().mockResolvedValue(null),
    evaluate: jest.fn().mockResolvedValue(null),
    screenshot: jest.fn().mockResolvedValue(Buffer.from("mock screenshot data")),
    close: jest.fn().mockResolvedValue(null),
    viewportSize: jest.fn().mockReturnValue({ width: 1280, height: 800 })
};

const mockContext = {
    addCookies: jest.fn().mockResolvedValue(null),
    newPage: jest.fn().mockResolvedValue(mockPage),
    close: jest.fn().mockResolvedValue(null)
};

const mockBrowser = {
    newContext: jest.fn().mockResolvedValue(mockContext),
    close: jest.fn().mockResolvedValue(null)
};

jest.mock("playwright", () => ({
    chromium: {
        launch: jest.fn().mockResolvedValue(mockBrowser)
    }
}));

// Get mocked fs module
const mockedFs = fs as jest.Mocked<typeof fs>;

describe("ScreenshotCaptureTool", () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Default successful mocks
        mockedFs.mkdir.mockResolvedValue(undefined);
        mockedFs.stat.mockResolvedValue({ size: 12345 } as Stats);
    });

    describe("tool properties", () => {
        it("has correct basic properties", () => {
            assertToolProperties(screenshotCaptureTool, {
                name: "screenshot_capture",
                category: "web",
                riskLevel: "medium"
            });
        });

        it("has correct display name", () => {
            expect(screenshotCaptureTool.displayName).toBe("Capture Screenshot");
        });

        it("has correct tags", () => {
            expect(screenshotCaptureTool.tags).toContain("screenshot");
            expect(screenshotCaptureTool.tags).toContain("capture");
            expect(screenshotCaptureTool.tags).toContain("browser");
        });

        it("has credit cost defined", () => {
            expect(screenshotCaptureTool.creditCost).toBeGreaterThan(0);
        });
    });

    describe("input schema validation", () => {
        it("accepts valid URL input", () => {
            const input = {
                url: "https://example.com"
            };
            expect(() => screenshotCaptureInputSchema.parse(input)).not.toThrow();
        });

        it("accepts full page capture options", () => {
            const input = {
                url: "https://example.com",
                fullPage: true
            };
            expect(() => screenshotCaptureInputSchema.parse(input)).not.toThrow();
        });

        it("accepts custom viewport dimensions", () => {
            const input = {
                url: "https://example.com",
                width: 1920,
                height: 1080
            };
            expect(() => screenshotCaptureInputSchema.parse(input)).not.toThrow();
        });

        it("accepts retina scale factor", () => {
            const input = {
                url: "https://example.com",
                deviceScale: 2
            };
            expect(() => screenshotCaptureInputSchema.parse(input)).not.toThrow();
        });

        it("accepts all valid formats", () => {
            for (const format of ["png", "jpeg", "webp"]) {
                const input = {
                    url: "https://example.com",
                    format
                };
                expect(() => screenshotCaptureInputSchema.parse(input)).not.toThrow();
            }
        });

        it("accepts element selector", () => {
            const input = {
                url: "https://example.com",
                selector: "#main-content"
            };
            expect(() => screenshotCaptureInputSchema.parse(input)).not.toThrow();
        });

        it("accepts hide selectors array", () => {
            const input = {
                url: "https://example.com",
                hideSelectors: [".ads", ".popup", "#cookie-banner"]
            };
            expect(() => screenshotCaptureInputSchema.parse(input)).not.toThrow();
        });

        it("accepts cookies for authentication", () => {
            const input = {
                url: "https://example.com",
                cookies: [{ name: "session", value: "abc123", domain: "example.com" }]
            };
            expect(() => screenshotCaptureInputSchema.parse(input)).not.toThrow();
        });

        it("accepts custom headers", () => {
            const input = {
                url: "https://example.com",
                headers: {
                    Authorization: "Bearer token123",
                    "X-Custom-Header": "value"
                }
            };
            expect(() => screenshotCaptureInputSchema.parse(input)).not.toThrow();
        });

        it("accepts dark mode preference", () => {
            const input = {
                url: "https://example.com",
                darkMode: true
            };
            expect(() => screenshotCaptureInputSchema.parse(input)).not.toThrow();
        });

        it("uses default values when not provided", () => {
            const input = { url: "https://example.com" };
            const parsed = screenshotCaptureInputSchema.parse(input);
            expect(parsed.fullPage).toBe(false);
            expect(parsed.width).toBe(1280);
            expect(parsed.height).toBe(800);
            expect(parsed.deviceScale).toBe(1);
            expect(parsed.format).toBe("png");
            expect(parsed.quality).toBe(80);
            expect(parsed.delay).toBe(0);
            expect(parsed.timeout).toBe(30000);
            expect(parsed.filename).toBe("screenshot");
            expect(parsed.darkMode).toBe(false);
        });

        it("rejects invalid URL", () => {
            const input = {
                url: "not-a-valid-url"
            };
            expect(() => screenshotCaptureInputSchema.parse(input)).toThrow();
        });

        it("rejects width below minimum", () => {
            const input = {
                url: "https://example.com",
                width: 100
            };
            expect(() => screenshotCaptureInputSchema.parse(input)).toThrow();
        });

        it("rejects width above maximum", () => {
            const input = {
                url: "https://example.com",
                width: 5000
            };
            expect(() => screenshotCaptureInputSchema.parse(input)).toThrow();
        });

        it("rejects invalid device scale", () => {
            const input = {
                url: "https://example.com",
                deviceScale: 5
            };
            expect(() => screenshotCaptureInputSchema.parse(input)).toThrow();
        });

        it("rejects invalid format", () => {
            const input = {
                url: "https://example.com",
                format: "gif"
            };
            expect(() => screenshotCaptureInputSchema.parse(input)).toThrow();
        });

        it("rejects quality out of range", () => {
            const input = {
                url: "https://example.com",
                quality: 150
            };
            expect(() => screenshotCaptureInputSchema.parse(input)).toThrow();
        });

        it("rejects timeout exceeding maximum", () => {
            const input = {
                url: "https://example.com",
                timeout: 120000
            };
            expect(() => screenshotCaptureInputSchema.parse(input)).toThrow();
        });
    });

    describe("execution", () => {
        it("executes successfully with valid URL", async () => {
            const context = createMockContext();
            const params = {
                url: "https://example.com",
                filename: "example_screenshot"
            };

            const result = await screenshotCaptureTool.execute(params, context);

            assertSuccess(result);
            assertHasMetadata(result);
            expect(result.data?.url).toBe("https://example.com");
            expect(result.data?.filename).toBe("example_screenshot.png");
        });

        it("executes with full page capture", async () => {
            const context = createMockContext();
            const params = {
                url: "https://example.com",
                fullPage: true
            };

            const result = await screenshotCaptureTool.execute(params, context);

            assertSuccess(result);
        });

        it("executes with JPEG format and quality", async () => {
            const context = createMockContext();
            const params = {
                url: "https://example.com",
                format: "jpeg",
                quality: 90
            };

            const result = await screenshotCaptureTool.execute(params, context);

            assertSuccess(result);
            expect(result.data?.format).toBe("jpeg");
        });

        it("rejects localhost URL", async () => {
            const context = createMockContext();
            const params = {
                url: "http://localhost:3000"
            };

            const result = await screenshotCaptureTool.execute(params, context);

            assertError(result, "INVALID_URL");
        });

        it("rejects 127.0.0.1 URL", async () => {
            const context = createMockContext();
            const params = {
                url: "http://127.0.0.1:8080"
            };

            const result = await screenshotCaptureTool.execute(params, context);

            assertError(result, "INVALID_URL");
        });

        it("rejects private network addresses", async () => {
            const context = createMockContext();

            const privateUrls = ["http://192.168.1.1", "http://10.0.0.1", "http://172.16.0.1"];

            for (const url of privateUrls) {
                const result = await screenshotCaptureTool.execute({ url }, context);
                assertError(result, "INVALID_URL");
            }
        });

        it("rejects .local domain", async () => {
            const context = createMockContext();
            const params = {
                url: "http://myserver.local"
            };

            const result = await screenshotCaptureTool.execute(params, context);

            assertError(result, "INVALID_URL");
        });
    });

    describe("output", () => {
        it("returns correct dimensions in output", async () => {
            const context = createMockContext();
            const params = {
                url: "https://example.com",
                width: 1920,
                height: 1080
            };

            const result = await screenshotCaptureTool.execute(params, context);

            assertSuccess(result);
            expect(result.data?.width).toBe(1920);
            expect(result.data?.height).toBe(1080);
        });

        it("returns capturedAt timestamp", async () => {
            const context = createMockContext();
            const params = {
                url: "https://example.com"
            };

            const result = await screenshotCaptureTool.execute(params, context);

            assertSuccess(result);
            expect(result.data?.capturedAt).toBeDefined();
            expect(new Date(result.data?.capturedAt as string).getTime()).not.toBeNaN();
        });

        it("generates correct output path", async () => {
            const context = createMockContext();
            const params = {
                url: "https://example.com",
                filename: "my_screenshot",
                format: "png"
            };

            const result = await screenshotCaptureTool.execute(params, context);

            assertSuccess(result);
            expect(result.data?.path).toBe("/tmp/fm-workspace/test-trace-abc/my_screenshot.png");
        });
    });
});
