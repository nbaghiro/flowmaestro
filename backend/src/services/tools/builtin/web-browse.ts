/**
 * Web Browse Tool
 *
 * Fetches and reads web page content
 */

import { z } from "zod";
import { createServiceLogger } from "../../../core/logging";
import type { BuiltInTool, ToolExecutionContext, ToolExecutionResult } from "../types";

const logger = createServiceLogger("WebBrowseTool");

/**
 * Input schema for web browse
 */
export const webBrowseInputSchema = z.object({
    url: z.string().url().describe("The URL to fetch"),
    extractText: z.boolean().default(true).describe("Whether to extract plain text from HTML"),
    maxLength: z
        .number()
        .int()
        .min(100)
        .max(50000)
        .default(10000)
        .describe("Maximum characters to return")
});

export type WebBrowseInput = z.infer<typeof webBrowseInputSchema>;

/**
 * Simple HTML to text extraction
 */
function htmlToText(html: string): string {
    // Remove script and style elements
    let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
    text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");

    // Remove HTML tags
    text = text.replace(/<[^>]+>/g, " ");

    // Decode common HTML entities
    text = text
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'");

    // Normalize whitespace
    text = text.replace(/\s+/g, " ").trim();

    return text;
}

/**
 * Execute web browse
 */
async function executeWebBrowse(
    params: Record<string, unknown>,
    context: ToolExecutionContext
): Promise<ToolExecutionResult> {
    const startTime = Date.now();

    try {
        // Validate input
        const input = webBrowseInputSchema.parse(params);

        logger.info({ url: input.url, traceId: context.traceId }, "Fetching web page");

        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        try {
            const response = await fetch(input.url, {
                method: "GET",
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (compatible; FlowMaestroBot/1.0; +https://flowmaestro.io)",
                    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                return {
                    success: false,
                    error: {
                        message: `Failed to fetch URL: HTTP ${response.status}`,
                        code: `HTTP_${response.status}`,
                        retryable: response.status >= 500
                    },
                    metadata: {
                        durationMs: Date.now() - startTime
                    }
                };
            }

            const contentType = response.headers.get("content-type") || "";
            let content = await response.text();

            // Extract text from HTML if requested and content is HTML
            if (input.extractText && contentType.includes("text/html")) {
                content = htmlToText(content);
            }

            // Truncate if necessary
            if (content.length > input.maxLength) {
                content = content.slice(0, input.maxLength) + "...[truncated]";
            }

            logger.info(
                { url: input.url, contentLength: content.length, traceId: context.traceId },
                "Web page fetched successfully"
            );

            return {
                success: true,
                data: {
                    url: input.url,
                    content,
                    contentType,
                    contentLength: content.length
                },
                metadata: {
                    durationMs: Date.now() - startTime,
                    creditCost: 1
                }
            };
        } catch (error) {
            clearTimeout(timeoutId);

            if (error instanceof Error && error.name === "AbortError") {
                return {
                    success: false,
                    error: {
                        message: "Request timed out after 30 seconds",
                        code: "TIMEOUT",
                        retryable: true
                    },
                    metadata: {
                        durationMs: Date.now() - startTime
                    }
                };
            }

            throw error;
        }
    } catch (error) {
        logger.error({ err: error, traceId: context.traceId }, "Web browse failed");

        return {
            success: false,
            error: {
                message: error instanceof Error ? error.message : "Web browse failed",
                retryable: false
            },
            metadata: {
                durationMs: Date.now() - startTime
            }
        };
    }
}

/**
 * Web Browse Tool Definition
 */
export const webBrowseTool: BuiltInTool = {
    name: "web_browse",
    displayName: "Web Browse",
    description:
        "Fetch and read the content of a web page. Use this to read articles, documentation, or any web content after finding it via search.",
    category: "web",
    riskLevel: "none",
    inputSchema: {
        type: "object",
        properties: {
            url: {
                type: "string",
                format: "uri",
                description: "The URL to fetch"
            },
            extractText: {
                type: "boolean",
                description: "Whether to extract plain text from HTML",
                default: true
            },
            maxLength: {
                type: "number",
                description: "Maximum characters to return",
                minimum: 100,
                maximum: 50000,
                default: 10000
            }
        },
        required: ["url"]
    },
    zodSchema: webBrowseInputSchema,
    enabledByDefault: true,
    creditCost: 1,
    tags: ["browse", "web", "fetch", "read"],
    execute: executeWebBrowse
};
