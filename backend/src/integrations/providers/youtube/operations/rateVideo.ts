import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { YouTubeClient } from "../client/YouTubeClient";

/**
 * Rate video input schema
 */
export const rateVideoSchema = z.object({
    videoId: z.string().min(1).describe("The video ID to rate"),
    rating: z
        .enum(["like", "dislike", "none"])
        .describe("Rating to apply (like, dislike, or none to remove rating)")
});

export type RateVideoParams = z.infer<typeof rateVideoSchema>;

/**
 * Rate video operation definition
 */
export const rateVideoOperation: OperationDefinition = {
    id: "rateVideo",
    name: "Rate Video",
    description: "Like, dislike, or remove rating from a YouTube video",
    category: "videos",
    retryable: true,
    inputSchema: rateVideoSchema,
    inputSchemaJSON: {
        type: "object",
        properties: {
            videoId: {
                type: "string",
                description: "The video ID to rate"
            },
            rating: {
                type: "string",
                enum: ["like", "dislike", "none"],
                description: "Rating to apply (like, dislike, or none to remove rating)"
            }
        },
        required: ["videoId", "rating"]
    }
};

/**
 * Execute rate video operation
 */
export async function executeRateVideo(
    client: YouTubeClient,
    params: RateVideoParams
): Promise<OperationResult> {
    try {
        await client.rateVideo(params.videoId, params.rating);

        return {
            success: true,
            data: {
                videoId: params.videoId,
                rating: params.rating,
                message: `Successfully ${params.rating === "none" ? "removed rating from" : params.rating + "d"} video`
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to rate video",
                retryable: true
            }
        };
    }
}
