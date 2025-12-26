import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { toJSONSchema } from "../../../core/schema-utils";
import { InstagramClient } from "../client/InstagramClient";
import type { InstagramPublishResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Carousel media item schema
 */
const carouselItemSchema = z.object({
    type: z.enum(["IMAGE", "VIDEO"]).describe("Type of media"),
    url: z.string().url().describe("Public URL of the media file")
});

/**
 * Publish Carousel operation schema
 */
export const publishCarouselSchema = z.object({
    igAccountId: z.string().describe("The Instagram Business Account ID"),
    mediaItems: z
        .array(carouselItemSchema)
        .min(2)
        .max(10)
        .describe("Media items for the carousel (2-10 items)"),
    caption: z.string().max(2200).optional().describe("Caption for the post (max 2200 characters)"),
    locationId: z.string().optional().describe("Location ID to tag in the post")
});

export type PublishCarouselParams = z.infer<typeof publishCarouselSchema>;

/**
 * Publish Carousel operation definition
 */
export const publishCarouselOperation: OperationDefinition = (() => {
    try {
        return {
            id: "publishCarousel",
            name: "Publish Carousel",
            description: "Publish a carousel post (multi-image/video) to Instagram feed",
            category: "publishing",
            inputSchema: publishCarouselSchema,
            inputSchemaJSON: toJSONSchema(publishCarouselSchema),
            retryable: true,
            timeout: 180000 // 3 minutes for video processing
        };
    } catch (error) {
        logger.error(
            { component: "Instagram", err: error },
            "Failed to create publishCarouselOperation"
        );
        throw new Error(
            `Failed to create publishCarousel operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute publish carousel operation
 */
export async function executePublishCarousel(
    client: InstagramClient,
    params: PublishCarouselParams
): Promise<OperationResult> {
    try {
        const response = await client.publishCarousel(
            params.igAccountId,
            params.mediaItems,
            params.caption,
            params.locationId
        );

        // Get the permalink for the published post
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
                message: error instanceof Error ? error.message : "Failed to publish carousel",
                retryable: true
            }
        };
    }
}
