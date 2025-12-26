import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import { InstagramClient } from "../client/InstagramClient";
import type { InstagramPublishResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import { getLogger } from "../../../../core/logging";

const logger = getLogger();

/**
 * Publish Reel operation schema
 */
export const publishReelSchema = z.object({
    igAccountId: z.string().describe("The Instagram Business Account ID"),
    videoUrl: z.string().url().describe("Public URL of the video (MP4, 3-60 seconds, max 1GB)"),
    caption: z.string().max(2200).optional().describe("Caption for the reel (max 2200 characters)"),
    shareToFeed: z
        .boolean()
        .optional()
        .default(true)
        .describe("Whether to also share the reel to the feed"),
    coverUrl: z.string().url().optional().describe("Public URL of a cover image for the reel"),
    thumbOffset: z.number().min(0).optional().describe("Thumbnail offset in milliseconds")
});

export type PublishReelParams = z.infer<typeof publishReelSchema>;

/**
 * Publish Reel operation definition
 */
export const publishReelOperation: OperationDefinition = (() => {
    try {
        return {
            id: "publishReel",
            name: "Publish Reel",
            description: "Publish a video reel to Instagram",
            category: "publishing",
            inputSchema: publishReelSchema,
            inputSchemaJSON: toJSONSchema(publishReelSchema),
            retryable: true,
            timeout: 180000 // 3 minutes for video processing
        };
    } catch (error) {
        logger.error({ component: "Instagram", err: error }, "Failed to create publishReelOperation");
        throw new Error(
            `Failed to create publishReel operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute publish reel operation
 */
export async function executePublishReel(
    client: InstagramClient,
    params: PublishReelParams
): Promise<OperationResult> {
    try {
        const response = await client.publishReel(
            params.igAccountId,
            params.videoUrl,
            params.caption,
            {
                shareToFeed: params.shareToFeed,
                coverUrl: params.coverUrl,
                thumbOffset: params.thumbOffset
            }
        );

        // Get the permalink for the published reel
        const media = await client.getMedia(response.id);

        const data: InstagramPublishResponse = {
            mediaId: response.id,
            permalink: media.permalink
        };

        return {
            success: true,
            data
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to publish reel",
                retryable: true
            }
        };
    }
}
