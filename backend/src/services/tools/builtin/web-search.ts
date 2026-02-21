/**
 * Web Search Tool
 *
 * Performs web searches using search APIs (Tavily, Serper, etc.)
 */

import { z } from "zod";
import { createServiceLogger } from "../../../core/logging";
import type { BuiltInTool, ToolExecutionContext, ToolExecutionResult } from "../types";

const logger = createServiceLogger("WebSearchTool");

/**
 * Input schema for web search
 */
export const webSearchInputSchema = z.object({
    query: z.string().min(1).max(500).describe("The search query"),
    maxResults: z
        .number()
        .int()
        .min(1)
        .max(20)
        .default(5)
        .describe("Maximum number of results to return"),
    searchType: z
        .enum(["general", "news", "images"])
        .default("general")
        .describe("Type of search to perform")
});

export type WebSearchInput = z.infer<typeof webSearchInputSchema>;

/**
 * Search result item
 */
export interface SearchResult {
    title: string;
    url: string;
    snippet: string;
    publishedDate?: string;
}

/**
 * Execute web search
 */
async function executeWebSearch(
    params: Record<string, unknown>,
    context: ToolExecutionContext
): Promise<ToolExecutionResult> {
    const startTime = Date.now();

    try {
        // Validate input
        const input = webSearchInputSchema.parse(params);

        logger.info({ query: input.query, traceId: context.traceId }, "Executing web search");

        // TODO: Implement actual search provider integration
        // For now, return a placeholder result
        // Integration options: Tavily, Serper, Brave Search API

        const tavilyApiKey = process.env.TAVILY_API_KEY;
        if (!tavilyApiKey) {
            logger.warn("TAVILY_API_KEY not configured, returning placeholder results");
            return {
                success: true,
                data: {
                    query: input.query,
                    results: [] as SearchResult[],
                    message: "Search API not configured. Set TAVILY_API_KEY to enable web search."
                },
                metadata: {
                    durationMs: Date.now() - startTime,
                    creditCost: 0
                }
            };
        }

        // Call Tavily API
        const response = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                api_key: tavilyApiKey,
                query: input.query,
                max_results: input.maxResults,
                search_depth: "basic"
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            logger.error({ status: response.status, error: errorText }, "Tavily API error");
            return {
                success: false,
                error: {
                    message: `Search API error: ${response.status}`,
                    retryable: response.status >= 500
                },
                metadata: {
                    durationMs: Date.now() - startTime
                }
            };
        }

        const data = (await response.json()) as {
            results: Array<{
                title: string;
                url: string;
                content: string;
                published_date?: string;
            }>;
        };

        const results: SearchResult[] = data.results.map((r) => ({
            title: r.title,
            url: r.url,
            snippet: r.content,
            publishedDate: r.published_date
        }));

        logger.info(
            { resultCount: results.length, traceId: context.traceId },
            "Web search completed"
        );

        return {
            success: true,
            data: {
                query: input.query,
                results
            },
            metadata: {
                durationMs: Date.now() - startTime,
                creditCost: 1 // 1 credit per search
            }
        };
    } catch (error) {
        logger.error({ err: error, traceId: context.traceId }, "Web search failed");

        return {
            success: false,
            error: {
                message: error instanceof Error ? error.message : "Web search failed",
                retryable: false
            },
            metadata: {
                durationMs: Date.now() - startTime
            }
        };
    }
}

/**
 * Web Search Tool Definition
 */
export const webSearchTool: BuiltInTool = {
    name: "web_search",
    displayName: "Web Search",
    description:
        "Search the web for information. Use this to find current information, research topics, or answer questions that require up-to-date knowledge.",
    category: "web",
    riskLevel: "none",
    inputSchema: {
        type: "object",
        properties: {
            query: {
                type: "string",
                description: "The search query",
                minLength: 1,
                maxLength: 500
            },
            maxResults: {
                type: "number",
                description: "Maximum number of results to return",
                minimum: 1,
                maximum: 20,
                default: 5
            },
            searchType: {
                type: "string",
                enum: ["general", "news", "images"],
                description: "Type of search to perform",
                default: "general"
            }
        },
        required: ["query"]
    },
    zodSchema: webSearchInputSchema,
    enabledByDefault: true,
    creditCost: 1,
    tags: ["search", "web", "research"],
    execute: executeWebSearch
};
