import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { YouTubeClient } from "../client/YouTubeClient";

/**
 * Search input schema
 */
export const searchSchema = z.object({
    query: z.string().min(1).describe("Search query text"),
    type: z
        .enum(["video", "channel", "playlist"])
        .optional()
        .describe("Type of resource to search for"),
    maxResults: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .default(25)
        .describe("Maximum number of results (1-50)"),
    pageToken: z.string().optional().describe("Token for pagination"),
    order: z
        .enum(["date", "rating", "relevance", "title", "viewCount"])
        .optional()
        .default("relevance")
        .describe("Sort order for results"),
    publishedAfter: z
        .string()
        .optional()
        .describe("Filter by publish date (RFC 3339 format, e.g., 2024-01-01T00:00:00Z)"),
    publishedBefore: z
        .string()
        .optional()
        .describe("Filter by publish date (RFC 3339 format, e.g., 2024-12-31T23:59:59Z)"),
    channelId: z.string().optional().describe("Filter by channel ID"),
    videoDuration: z
        .enum(["any", "short", "medium", "long"])
        .optional()
        .describe("Filter by video duration (short: <4min, medium: 4-20min, long: >20min)"),
    videoDefinition: z
        .enum(["any", "high", "standard"])
        .optional()
        .describe("Filter by video definition (high = HD, standard = SD)"),
    regionCode: z.string().length(2).optional().describe("ISO 3166-1 alpha-2 country code"),
    safeSearch: z
        .enum(["moderate", "none", "strict"])
        .optional()
        .default("moderate")
        .describe("Safe search filtering level")
});

export type SearchParams = z.infer<typeof searchSchema>;

/**
 * Search operation definition
 */
export const searchOperation: OperationDefinition = {
    id: "search",
    name: "Search YouTube",
    description:
        "Search for videos, channels, or playlists on YouTube with optional filters and sorting",
    category: "search",
    retryable: true,
    inputSchema: searchSchema,
    inputSchemaJSON: {
        type: "object",
        properties: {
            query: {
                type: "string",
                description: "Search query text"
            },
            type: {
                type: "string",
                enum: ["video", "channel", "playlist"],
                description: "Type of resource to search for"
            },
            maxResults: {
                type: "number",
                description: "Maximum number of results (1-50)",
                minimum: 1,
                maximum: 50,
                default: 25
            },
            pageToken: {
                type: "string",
                description: "Token for pagination"
            },
            order: {
                type: "string",
                enum: ["date", "rating", "relevance", "title", "viewCount"],
                description: "Sort order for results",
                default: "relevance"
            },
            publishedAfter: {
                type: "string",
                description: "Filter by publish date (RFC 3339 format)"
            },
            publishedBefore: {
                type: "string",
                description: "Filter by publish date (RFC 3339 format)"
            },
            channelId: {
                type: "string",
                description: "Filter by channel ID"
            },
            videoDuration: {
                type: "string",
                enum: ["any", "short", "medium", "long"],
                description: "Filter by video duration"
            },
            videoDefinition: {
                type: "string",
                enum: ["any", "high", "standard"],
                description: "Filter by video definition (HD or SD)"
            },
            regionCode: {
                type: "string",
                description: "ISO 3166-1 alpha-2 country code"
            },
            safeSearch: {
                type: "string",
                enum: ["moderate", "none", "strict"],
                description: "Safe search filtering level",
                default: "moderate"
            }
        },
        required: ["query"]
    }
};

/**
 * Execute search operation
 */
export async function executeSearch(
    client: YouTubeClient,
    params: SearchParams
): Promise<OperationResult> {
    try {
        const response = await client.search({
            q: params.query,
            type: params.type,
            maxResults: params.maxResults || 25,
            pageToken: params.pageToken,
            order: params.order || "relevance",
            publishedAfter: params.publishedAfter,
            publishedBefore: params.publishedBefore,
            channelId: params.channelId,
            videoDuration: params.videoDuration,
            videoDefinition: params.videoDefinition,
            regionCode: params.regionCode,
            safeSearch: params.safeSearch || "moderate"
        });

        // Transform results for easier consumption
        const results = response.items.map((item) => ({
            id:
                item.id.videoId ||
                item.id.channelId ||
                item.id.playlistId ||
                `${item.id.kind}:unknown`,
            type: item.id.videoId ? "video" : item.id.channelId ? "channel" : "playlist",
            title: item.snippet?.title,
            description: item.snippet?.description,
            channelId: item.snippet?.channelId,
            channelTitle: item.snippet?.channelTitle,
            publishedAt: item.snippet?.publishedAt,
            thumbnails: item.snippet?.thumbnails
        }));

        return {
            success: true,
            data: {
                results,
                nextPageToken: response.nextPageToken,
                pageInfo: response.pageInfo
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to search YouTube",
                retryable: true
            }
        };
    }
}
