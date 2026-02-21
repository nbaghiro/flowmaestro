/**
 * Screenshot Capture Tool
 *
 * Captures screenshots of web pages using headless browser (Playwright)
 */

import { mkdir, stat } from "fs/promises";
import { join } from "path";
import { z } from "zod";
import { createServiceLogger } from "../../../core/logging";
import type { BuiltInTool, ToolExecutionContext, ToolExecutionResult } from "../types";

const logger = createServiceLogger("ScreenshotCaptureTool");

/**
 * Cookie schema for authenticated pages
 */
const cookieSchema = z.object({
    name: z.string(),
    value: z.string(),
    domain: z.string()
});

/**
 * Input schema for screenshot capture
 */
export const screenshotCaptureInputSchema = z.object({
    url: z.string().url().describe("URL to capture"),
    fullPage: z.boolean().default(false).describe("Capture full scrollable page"),
    width: z.number().int().min(320).max(3840).default(1280).describe("Viewport width"),
    height: z.number().int().min(240).max(2160).default(800).describe("Viewport height"),
    deviceScale: z.number().min(1).max(3).default(1).describe("Device scale factor (2 for retina)"),
    format: z.enum(["png", "jpeg", "webp"]).default("png").describe("Output format"),
    quality: z.number().int().min(0).max(100).default(80).describe("JPEG/WebP quality"),
    delay: z.number().int().min(0).max(10000).default(0).describe("Wait ms after page load"),
    selector: z.string().optional().describe("Capture specific element only (CSS selector)"),
    hideSelectors: z.array(z.string()).optional().describe("CSS selectors to hide (ads, popups)"),
    timeout: z
        .number()
        .int()
        .min(5000)
        .max(60000)
        .default(30000)
        .describe("Navigation timeout in ms"),
    headers: z.record(z.string()).optional().describe("Custom HTTP headers"),
    cookies: z.array(cookieSchema).optional().describe("Cookies to set before navigation"),
    filename: z
        .string()
        .min(1)
        .max(255)
        .default("screenshot")
        .describe("Output filename without extension"),
    waitForSelector: z
        .string()
        .optional()
        .describe("Wait for this selector to appear before capture"),
    darkMode: z.boolean().default(false).describe("Emulate dark mode preference")
});

export type ScreenshotCaptureInput = z.infer<typeof screenshotCaptureInputSchema>;

/**
 * Screenshot capture result
 */
export interface ScreenshotCaptureOutput {
    path: string;
    filename: string;
    format: string;
    width: number;
    height: number;
    size: number;
    url: string;
    capturedAt: string;
}

/**
 * Validate URL is not a local/internal address
 */
function validateUrl(url: string): { valid: boolean; error?: string } {
    try {
        const parsedUrl = new URL(url);
        const hostname = parsedUrl.hostname.toLowerCase();

        // Block local and internal addresses
        if (
            hostname === "localhost" ||
            hostname === "127.0.0.1" ||
            hostname === "0.0.0.0" ||
            hostname.startsWith("192.168.") ||
            hostname.startsWith("10.") ||
            hostname.startsWith("172.16.") ||
            hostname.startsWith("172.17.") ||
            hostname.startsWith("172.18.") ||
            hostname.startsWith("172.19.") ||
            hostname.startsWith("172.2") ||
            hostname.startsWith("172.30.") ||
            hostname.startsWith("172.31.") ||
            hostname.endsWith(".local") ||
            hostname.endsWith(".internal")
        ) {
            return {
                valid: false,
                error: "Cannot capture screenshots of local/internal addresses"
            };
        }

        // Block file:// protocol
        if (parsedUrl.protocol === "file:") {
            return { valid: false, error: "Cannot capture screenshots of file:// URLs" };
        }

        return { valid: true };
    } catch {
        return { valid: false, error: "Invalid URL provided" };
    }
}

/**
 * Capture screenshot using Playwright
 */
async function captureScreenshot(
    input: ScreenshotCaptureInput,
    outputDir: string
): Promise<{ path: string; filename: string; width: number; height: number }> {
    // Dynamic import for optional dependency
    const { chromium } = await import("playwright");

    const format = input.format;
    const filename = `${input.filename}.${format}`;
    const outputPath = join(outputDir, filename);

    // Launch browser
    const browser = await chromium.launch({
        headless: true
    });

    try {
        // Create context with viewport settings
        const context = await browser.newContext({
            viewport: { width: input.width, height: input.height },
            deviceScaleFactor: input.deviceScale,
            colorScheme: input.darkMode ? "dark" : "light"
        });

        // Set cookies if provided
        if (input.cookies && input.cookies.length > 0) {
            await context.addCookies(
                input.cookies.map((c) => ({
                    name: c.name,
                    value: c.value,
                    domain: c.domain,
                    path: "/"
                }))
            );
        }

        const page = await context.newPage();

        // Set custom headers if provided
        if (input.headers) {
            await page.setExtraHTTPHeaders(input.headers);
        }

        // Navigate to URL
        try {
            await page.goto(input.url, {
                timeout: input.timeout,
                waitUntil: "networkidle"
            });
        } catch {
            // Fallback to domcontentloaded if networkidle times out
            await page.goto(input.url, {
                timeout: input.timeout,
                waitUntil: "domcontentloaded"
            });
        }

        // Wait for specific selector if provided
        if (input.waitForSelector) {
            await page.waitForSelector(input.waitForSelector, { timeout: input.timeout });
        }

        // Additional delay after load
        if (input.delay > 0) {
            await page.waitForTimeout(input.delay);
        }

        // Hide elements if specified
        if (input.hideSelectors && input.hideSelectors.length > 0) {
            for (const selector of input.hideSelectors) {
                try {
                    // page.evaluate runs in browser context - use string template to avoid TS errors
                    await page.evaluate(
                        `document.querySelectorAll('${selector.replace(/'/g, "\\'")}').forEach(el => el.style.display = 'none')`
                    );
                } catch {
                    // Ignore if selector not found
                }
            }
        }

        // Prepare screenshot options
        const screenshotOptions: {
            path: string;
            fullPage: boolean;
            type: "png" | "jpeg";
            quality?: number;
        } = {
            path: outputPath,
            fullPage: input.fullPage,
            type: format === "webp" ? "png" : format // Playwright doesn't support webp directly
        };

        // Add quality for JPEG
        if (format === "jpeg") {
            screenshotOptions.quality = input.quality;
        }

        // Get actual dimensions
        let actualWidth = input.width;
        let actualHeight = input.height;

        // Capture specific element or full page
        if (input.selector) {
            const element = page.locator(input.selector);
            await element.screenshot(screenshotOptions);
            const box = await element.boundingBox();
            if (box) {
                actualWidth = Math.round(box.width);
                actualHeight = Math.round(box.height);
            }
        } else {
            await page.screenshot(screenshotOptions);
            if (input.fullPage) {
                actualHeight = await page.evaluate("document.documentElement.scrollHeight");
            }
        }

        return { path: outputPath, filename, width: actualWidth, height: actualHeight };
    } finally {
        await browser.close();
    }
}

/**
 * Execute screenshot capture
 */
async function executeScreenshotCapture(
    params: Record<string, unknown>,
    context: ToolExecutionContext
): Promise<ToolExecutionResult> {
    const startTime = Date.now();

    try {
        const input = screenshotCaptureInputSchema.parse(params);

        logger.info(
            {
                url: input.url,
                fullPage: input.fullPage,
                dimensions: `${input.width}x${input.height}`,
                traceId: context.traceId
            },
            "Capturing screenshot"
        );

        // Validate URL
        const urlValidation = validateUrl(input.url);
        if (!urlValidation.valid) {
            return {
                success: false,
                error: {
                    message: urlValidation.error!,
                    code: "INVALID_URL",
                    retryable: false
                },
                metadata: { durationMs: Date.now() - startTime }
            };
        }

        // Determine output directory
        const outputDir = context.traceId ? `/tmp/fm-workspace/${context.traceId}` : "/tmp";

        // Ensure output directory exists
        try {
            await mkdir(outputDir, { recursive: true });
        } catch {
            // Directory may already exist
        }

        // Capture the screenshot
        const { path, filename, width, height } = await captureScreenshot(input, outputDir);

        // Get file stats
        const stats = await stat(path);

        const output: ScreenshotCaptureOutput = {
            path,
            filename,
            format: input.format,
            width,
            height,
            size: stats.size,
            url: input.url,
            capturedAt: new Date().toISOString()
        };

        logger.info(
            {
                path: output.path,
                size: output.size,
                dimensions: `${output.width}x${output.height}`,
                traceId: context.traceId
            },
            "Screenshot captured successfully"
        );

        return {
            success: true,
            data: output,
            metadata: {
                durationMs: Date.now() - startTime,
                creditCost: 2
            }
        };
    } catch (error) {
        logger.error({ err: error, traceId: context.traceId }, "Screenshot capture failed");

        // Check for missing playwright dependency
        if (error instanceof Error && error.message.includes("playwright")) {
            return {
                success: false,
                error: {
                    message:
                        "Screenshot capture requires Playwright. Install with: npm install playwright && npx playwright install chromium",
                    code: "MISSING_DEPENDENCY",
                    retryable: false
                },
                metadata: { durationMs: Date.now() - startTime }
            };
        }

        // Handle navigation errors
        if (error instanceof Error && error.message.includes("net::")) {
            return {
                success: false,
                error: {
                    message: `Failed to load URL: ${error.message}`,
                    code: "NAVIGATION_ERROR",
                    retryable: true
                },
                metadata: { durationMs: Date.now() - startTime }
            };
        }

        return {
            success: false,
            error: {
                message: error instanceof Error ? error.message : "Screenshot capture failed",
                retryable: false
            },
            metadata: { durationMs: Date.now() - startTime }
        };
    }
}

/**
 * Screenshot Capture Tool Definition
 */
export const screenshotCaptureTool: BuiltInTool = {
    name: "screenshot_capture",
    displayName: "Capture Screenshot",
    description:
        "Capture a screenshot of a web page. Supports full-page capture, custom viewport sizes, element targeting, and various output formats. Uses headless Chromium browser.",
    category: "web",
    riskLevel: "medium",
    inputSchema: {
        type: "object",
        properties: {
            url: {
                type: "string",
                format: "uri",
                description: "URL to capture"
            },
            fullPage: {
                type: "boolean",
                description: "Capture full scrollable page",
                default: false
            },
            width: {
                type: "number",
                description: "Viewport width in pixels",
                minimum: 320,
                maximum: 3840,
                default: 1280
            },
            height: {
                type: "number",
                description: "Viewport height in pixels",
                minimum: 240,
                maximum: 2160,
                default: 800
            },
            deviceScale: {
                type: "number",
                description: "Device scale factor (2 for retina)",
                minimum: 1,
                maximum: 3,
                default: 1
            },
            format: {
                type: "string",
                enum: ["png", "jpeg", "webp"],
                description: "Output format",
                default: "png"
            },
            quality: {
                type: "number",
                description: "JPEG/WebP quality (0-100)",
                minimum: 0,
                maximum: 100,
                default: 80
            },
            delay: {
                type: "number",
                description: "Wait ms after page load before capture",
                minimum: 0,
                maximum: 10000,
                default: 0
            },
            selector: {
                type: "string",
                description: "Capture specific element only (CSS selector)"
            },
            hideSelectors: {
                type: "array",
                items: { type: "string" },
                description: "CSS selectors to hide before capture"
            },
            timeout: {
                type: "number",
                description: "Navigation timeout in ms",
                minimum: 5000,
                maximum: 60000,
                default: 30000
            },
            filename: {
                type: "string",
                description: "Output filename without extension",
                default: "screenshot"
            },
            darkMode: {
                type: "boolean",
                description: "Emulate dark mode preference",
                default: false
            }
        },
        required: ["url"]
    },
    zodSchema: screenshotCaptureInputSchema,
    enabledByDefault: true,
    creditCost: 2,
    tags: ["screenshot", "capture", "web", "browser", "image"],
    execute: executeScreenshotCapture
};
