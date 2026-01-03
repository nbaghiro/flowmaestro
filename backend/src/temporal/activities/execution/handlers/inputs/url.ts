/**
 * URL Node Handler
 *
 * Fetches content from URLs and extracts text and metadata.
 * The URLs are configured directly in the node config panel or provided at trigger time.
 */

import type { JsonObject, JsonValue } from "@flowmaestro/shared";
import { createActivityLogger } from "../../../../core";
import { URLNodeConfigSchema, validateOrThrow, type URLNodeConfig } from "../../../../core/schemas";
import { BaseNodeHandler, type NodeHandlerInput, type NodeHandlerOutput } from "../../types";

const logger = createActivityLogger({ nodeType: "URL" });

// ============================================================================
// TYPES
// ============================================================================

export type { URLNodeConfig };

export interface FetchedURL {
    url: string;
    content: string;
    title?: string;
    description?: string;
    statusCode: number;
    fetchedAt: string;
    error?: string;
}

export interface URLNodeResult {
    urls: FetchedURL[];
    combinedContent: string;
    urlCount: number;
    successCount: number;
    errorCount: number;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Extract metadata from HTML content
 */
function extractMetadata(html: string): { title?: string; description?: string } {
    const result: { title?: string; description?: string } = {};

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    if (titleMatch) {
        result.title = titleMatch[1].trim();
    }

    // Extract meta description
    const descMatch = html.match(
        /<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i
    );
    if (descMatch) {
        result.description = descMatch[1].trim();
    } else {
        // Try alternate format
        const descMatch2 = html.match(
            /<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i
        );
        if (descMatch2) {
            result.description = descMatch2[1].trim();
        }
    }

    return result;
}

/**
 * Extract text content from HTML (basic implementation)
 */
function extractTextFromHTML(html: string): string {
    // Remove script and style tags and their content
    let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
    text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");

    // Remove HTML tags
    text = text.replace(/<[^>]+>/g, " ");

    // Decode HTML entities
    text = text.replace(/&nbsp;/g, " ");
    text = text.replace(/&amp;/g, "&");
    text = text.replace(/&lt;/g, "<");
    text = text.replace(/&gt;/g, ">");
    text = text.replace(/&quot;/g, '"');
    text = text.replace(/&#39;/g, "'");

    // Clean up whitespace
    text = text.replace(/\s+/g, " ").trim();

    return text;
}

/**
 * Fetch a single URL with timeout and redirect handling
 */
async function fetchURL(
    url: string,
    timeout: number,
    followRedirects: boolean,
    includeMetadata: boolean
): Promise<FetchedURL> {
    const controller = new AbortController();
    const timeoutId = globalThis.setTimeout(() => controller.abort(), timeout * 1000);

    try {
        const response = await fetch(url, {
            signal: controller.signal,
            redirect: followRedirects ? "follow" : "manual",
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; FlowMaestro/1.0; +https://flowmaestro.dev)",
                Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
            }
        });

        globalThis.clearTimeout(timeoutId);

        const html = await response.text();
        const textContent = extractTextFromHTML(html);

        const result: FetchedURL = {
            url,
            content: textContent,
            statusCode: response.status,
            fetchedAt: new Date().toISOString()
        };

        if (includeMetadata) {
            const metadata = extractMetadata(html);
            result.title = metadata.title;
            result.description = metadata.description;
        }

        return result;
    } catch (error) {
        globalThis.clearTimeout(timeoutId);

        const errorMessage =
            error instanceof Error
                ? error.name === "AbortError"
                    ? `Request timeout after ${timeout}s`
                    : error.message
                : String(error);

        return {
            url,
            content: "",
            statusCode: 0,
            fetchedAt: new Date().toISOString(),
            error: errorMessage
        };
    }
}

// ============================================================================
// HANDLER
// ============================================================================

/**
 * Handler for URL node type.
 * Fetches URLs and returns their content.
 */
export class URLNodeHandler extends BaseNodeHandler {
    readonly name = "URLNodeHandler";
    readonly supportedNodeTypes = ["url"] as const;

    async execute(input: NodeHandlerInput): Promise<NodeHandlerOutput> {
        const startTime = Date.now();
        const config = validateOrThrow(URLNodeConfigSchema, input.nodeConfig, "URL");

        // Get URLs from workflow inputs or config
        let urlsToFetch = config.urls || [];

        // Check if URLs are provided in workflow inputs (for API trigger)
        const inputUrls = input.context.inputs?.[config.inputName];
        if (inputUrls) {
            if (Array.isArray(inputUrls)) {
                urlsToFetch = inputUrls as string[];
            } else if (typeof inputUrls === "string") {
                urlsToFetch = [inputUrls];
            }
        }

        logger.info("Processing URL node", {
            urlCount: urlsToFetch.length,
            timeout: config.timeout,
            followRedirects: config.followRedirects,
            includeMetadata: config.includeMetadata
        });

        if (urlsToFetch.length === 0) {
            if (config.required) {
                const errorMessage = "No URLs provided";
                logger.error(errorMessage, new Error(errorMessage), {
                    nodeId: input.metadata.nodeId
                });
                throw new Error(
                    "No URLs provided. Add URLs in the config or pass them when triggering the workflow."
                );
            }

            // Return empty result for optional input
            const emptyResult: URLNodeResult = {
                urls: [],
                combinedContent: "",
                urlCount: 0,
                successCount: 0,
                errorCount: 0
            };

            return this.success(
                {
                    [config.outputVariable]: emptyResult as unknown as JsonValue,
                    _urlMetadata: emptyResult as unknown as JsonObject
                },
                {},
                { durationMs: Date.now() - startTime }
            );
        }

        // Fetch all URLs in parallel
        const fetchedUrls = await Promise.all(
            urlsToFetch.map((url) =>
                fetchURL(url, config.timeout, config.followRedirects, config.includeMetadata)
            )
        );

        // Aggregate results
        const successfulUrls = fetchedUrls.filter((u) => !u.error);
        const combinedContent = successfulUrls.map((u) => u.content).join("\n\n");

        const result: URLNodeResult = {
            urls: fetchedUrls,
            combinedContent,
            urlCount: fetchedUrls.length,
            successCount: successfulUrls.length,
            errorCount: fetchedUrls.length - successfulUrls.length
        };

        logger.info("URL fetch completed", {
            urlCount: result.urlCount,
            successCount: result.successCount,
            errorCount: result.errorCount,
            contentLength: combinedContent.length,
            durationMs: Date.now() - startTime
        });

        return this.success(
            {
                [config.outputVariable]: result as unknown as JsonValue,
                _urlMetadata: result as unknown as JsonObject
            },
            {},
            { durationMs: Date.now() - startTime }
        );
    }
}

/**
 * Factory function for creating URL handler.
 */
export function createURLNodeHandler(): URLNodeHandler {
    return new URLNodeHandler();
}
