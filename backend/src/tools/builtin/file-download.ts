/**
 * File Download Tool
 *
 * Downloads files from URLs using native fetch
 */

import { writeFile, mkdir, stat } from "fs/promises";
import { join, basename } from "path";
import { z } from "zod";
import { createServiceLogger } from "../../core/logging";
import type { BuiltInTool, ToolExecutionContext, ToolExecutionResult } from "../types";

const logger = createServiceLogger("FileDownloadTool");

/**
 * Input schema for file download
 */
export const fileDownloadInputSchema = z.object({
    url: z.string().url().describe("URL to download"),
    filename: z
        .string()
        .min(1)
        .max(255)
        .optional()
        .describe("Custom filename (auto-detect if not provided)"),
    path: z.string().default("/tmp/downloads").describe("Destination directory"),
    maxSize: z
        .number()
        .int()
        .min(1)
        .max(100000000) // 100MB max
        .default(52428800) // 50MB default
        .describe("Maximum file size in bytes"),
    timeout: z
        .number()
        .int()
        .min(5000)
        .max(300000)
        .default(60000)
        .describe("Download timeout in ms"),
    headers: z.record(z.string()).optional().describe("Custom HTTP headers"),
    followRedirects: z.boolean().default(true).describe("Follow HTTP redirects"),
    validateContentType: z
        .array(z.string())
        .optional()
        .describe("Allowed content types (e.g., ['image/png', 'application/pdf'])")
});

export type FileDownloadInput = z.infer<typeof fileDownloadInputSchema>;

/**
 * File download result
 */
export interface FileDownloadOutput {
    path: string;
    filename: string;
    size: number;
    contentType: string;
    downloadTime: number;
    url: string;
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
            return { valid: false, error: "Cannot download from local/internal addresses" };
        }

        // Block certain protocols
        if (!["http:", "https:"].includes(parsedUrl.protocol)) {
            return { valid: false, error: `Unsupported protocol: ${parsedUrl.protocol}` };
        }

        return { valid: true };
    } catch {
        return { valid: false, error: "Invalid URL provided" };
    }
}

/**
 * Extract filename from response or URL
 */
function extractFilename(url: string, response: Response, customFilename?: string): string {
    // Use custom filename if provided
    if (customFilename) {
        return sanitizeFilename(customFilename);
    }

    // Try Content-Disposition header
    const contentDisposition = response.headers.get("content-disposition");
    if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
            const extracted = filenameMatch[1].replace(/['"]/g, "").trim();
            if (extracted) {
                return sanitizeFilename(extracted);
            }
        }
    }

    // Try to extract from URL path
    const urlPath = new URL(url).pathname;
    const urlFilename = basename(urlPath);
    if (urlFilename && urlFilename.includes(".")) {
        return sanitizeFilename(urlFilename);
    }

    // Generate filename from content type
    const contentType = response.headers.get("content-type")?.split(";")[0]?.trim() || "";
    const extMap: Record<string, string> = {
        "image/png": "image.png",
        "image/jpeg": "image.jpg",
        "image/gif": "image.gif",
        "image/webp": "image.webp",
        "image/svg+xml": "image.svg",
        "application/pdf": "document.pdf",
        "application/json": "data.json",
        "text/plain": "file.txt",
        "text/html": "page.html",
        "text/csv": "data.csv",
        "application/zip": "archive.zip",
        "application/gzip": "archive.gz",
        "application/x-tar": "archive.tar",
        "video/mp4": "video.mp4",
        "audio/mpeg": "audio.mp3",
        "audio/wav": "audio.wav"
    };

    return extMap[contentType] || "download";
}

/**
 * Sanitize filename to remove dangerous characters
 */
function sanitizeFilename(filename: string): string {
    // Remove path separators and other dangerous characters
    let sanitized = filename.replace(/[/\\:*?"<>|]/g, "_");
    // Remove leading/trailing dots and spaces
    sanitized = sanitized.replace(/^[\s.]+|[\s.]+$/g, "");
    // Limit length
    if (sanitized.length > 200) {
        const ext = sanitized.lastIndexOf(".");
        if (ext > 0) {
            const extension = sanitized.slice(ext);
            sanitized = sanitized.slice(0, 200 - extension.length) + extension;
        } else {
            sanitized = sanitized.slice(0, 200);
        }
    }
    return sanitized || "download";
}

/**
 * Execute file download
 */
async function executeFileDownload(
    params: Record<string, unknown>,
    context: ToolExecutionContext
): Promise<ToolExecutionResult> {
    const startTime = Date.now();

    try {
        const input = fileDownloadInputSchema.parse(params);

        logger.info(
            {
                url: input.url,
                maxSize: input.maxSize,
                traceId: context.traceId
            },
            "Downloading file"
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
        const outputDir = context.traceId
            ? `/tmp/fm-workspace/${context.traceId}/downloads`
            : input.path;

        // Ensure output directory exists
        await mkdir(outputDir, { recursive: true });

        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), input.timeout);

        try {
            // Build request headers
            const headers: Record<string, string> = {
                "User-Agent": "FlowMaestro/1.0 FileDownloader",
                ...input.headers
            };

            // Make request
            const response = await fetch(input.url, {
                method: "GET",
                headers,
                signal: controller.signal,
                redirect: input.followRedirects ? "follow" : "error"
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                return {
                    success: false,
                    error: {
                        message: `HTTP Error ${response.status}: ${response.statusText}`,
                        code: `HTTP_${response.status}`,
                        retryable: response.status >= 500
                    },
                    metadata: { durationMs: Date.now() - startTime }
                };
            }

            // Get content type
            const contentType =
                response.headers.get("content-type")?.split(";")[0]?.trim() ||
                "application/octet-stream";

            // Validate content type if specified
            if (
                input.validateContentType &&
                input.validateContentType.length > 0 &&
                !input.validateContentType.includes(contentType)
            ) {
                return {
                    success: false,
                    error: {
                        message: `Content type '${contentType}' not in allowed types: ${input.validateContentType.join(", ")}`,
                        code: "INVALID_CONTENT_TYPE",
                        retryable: false
                    },
                    metadata: { durationMs: Date.now() - startTime }
                };
            }

            // Check content length if available
            const contentLength = response.headers.get("content-length");
            if (contentLength && parseInt(contentLength, 10) > input.maxSize) {
                return {
                    success: false,
                    error: {
                        message: `File size (${contentLength} bytes) exceeds maximum (${input.maxSize} bytes)`,
                        code: "FILE_TOO_LARGE",
                        retryable: false
                    },
                    metadata: { durationMs: Date.now() - startTime }
                };
            }

            // Extract filename
            const filename = extractFilename(input.url, response, input.filename);
            const outputPath = join(outputDir, filename);

            // Download file
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            // Check actual size
            if (buffer.length > input.maxSize) {
                return {
                    success: false,
                    error: {
                        message: `Downloaded file (${buffer.length} bytes) exceeds maximum (${input.maxSize} bytes)`,
                        code: "FILE_TOO_LARGE",
                        retryable: false
                    },
                    metadata: { durationMs: Date.now() - startTime }
                };
            }

            // Write to file
            await writeFile(outputPath, buffer);

            // Get file stats
            const stats = await stat(outputPath);
            const downloadTime = Date.now() - startTime;

            const output: FileDownloadOutput = {
                path: outputPath,
                filename,
                size: stats.size,
                contentType,
                downloadTime,
                url: input.url
            };

            logger.info(
                {
                    path: output.path,
                    size: output.size,
                    contentType: output.contentType,
                    downloadTime: output.downloadTime,
                    traceId: context.traceId
                },
                "File downloaded successfully"
            );

            return {
                success: true,
                data: output,
                metadata: {
                    durationMs: downloadTime,
                    creditCost: 1
                }
            };
        } finally {
            clearTimeout(timeoutId);
        }
    } catch (error) {
        logger.error({ err: error, traceId: context.traceId }, "File download failed");

        // Handle abort errors (timeout)
        if (error instanceof Error && error.name === "AbortError") {
            return {
                success: false,
                error: {
                    message: "Download timeout exceeded",
                    code: "TIMEOUT",
                    retryable: true
                },
                metadata: { durationMs: Date.now() - startTime }
            };
        }

        // Handle network errors
        if (error instanceof TypeError && error.message.includes("fetch")) {
            return {
                success: false,
                error: {
                    message: `Network error: ${error.message}`,
                    code: "NETWORK_ERROR",
                    retryable: true
                },
                metadata: { durationMs: Date.now() - startTime }
            };
        }

        return {
            success: false,
            error: {
                message: error instanceof Error ? error.message : "File download failed",
                retryable: false
            },
            metadata: { durationMs: Date.now() - startTime }
        };
    }
}

/**
 * File Download Tool Definition
 */
export const fileDownloadTool: BuiltInTool = {
    name: "file_download",
    displayName: "Download File",
    description:
        "Download a file from a URL. Supports custom headers, content type validation, and size limits.",
    category: "file",
    riskLevel: "medium",
    inputSchema: {
        type: "object",
        properties: {
            url: {
                type: "string",
                format: "uri",
                description: "URL to download"
            },
            filename: {
                type: "string",
                description: "Custom filename (auto-detect if not provided)"
            },
            path: {
                type: "string",
                description: "Destination directory",
                default: "/tmp/downloads"
            },
            maxSize: {
                type: "number",
                description: "Maximum file size in bytes",
                minimum: 1,
                maximum: 100000000,
                default: 52428800
            },
            timeout: {
                type: "number",
                description: "Download timeout in ms",
                minimum: 5000,
                maximum: 300000,
                default: 60000
            },
            headers: {
                type: "object",
                additionalProperties: { type: "string" },
                description: "Custom HTTP headers"
            },
            followRedirects: {
                type: "boolean",
                description: "Follow HTTP redirects",
                default: true
            },
            validateContentType: {
                type: "array",
                items: { type: "string" },
                description: "Allowed content types"
            }
        },
        required: ["url"]
    },
    zodSchema: fileDownloadInputSchema,
    enabledByDefault: true,
    creditCost: 1,
    tags: ["download", "file", "fetch", "url"],
    execute: executeFileDownload
};
