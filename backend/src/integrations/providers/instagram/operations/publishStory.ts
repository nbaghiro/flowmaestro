import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import { InstagramClient } from "../client/InstagramClient";
import type { InstagramPublishResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import { getLogger } from "../../../../core/logging";

const logger = getLogger();

/**
 * Publish Story operation schema
 */
export const publishStorySchema = z.object({
    igAccountId: z.string().describe("The Instagram Business Account ID"),
    mediaUrl: z.string().url().describe("Public URL of the image or video"),
    mediaType: z.enum(["image", "video"]).describe("Type of media")
});

export type PublishStoryParams = z.infer<typeof publishStorySchema>;

/**
 * Publish Story operation definition
 */
export const publishStoryOperation: OperationDefinition = (() => {
    try {
        return {
            id: "publishStory",
            name: "Publish Story",
            description: "Publish a story (image or video) to Instagram Stories",
            category: "publishing",
            inputSchema: publishStorySchema,
            inputSchemaJSON: toJSONSchema(publishStorySchema),
            retryable: true,
            timeout: 120000 // 2 minutes for video processing
        };
    } catch (error) {
        logger.error({ component: "Instagram", err: error }, "Failed to create publishStoryOperation");
        throw new Error(
            `Failed to create publishStory operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute publish story operation
 */
export async function executePublishStory(
    client: InstagramClient,
    params: PublishStoryParams
): Promise<OperationResult> {
    try {
        const response = await client.publishStory(
            params.igAccountId,
            params.mediaUrl,
            params.mediaType
        );

        const data: InstagramPublishResponse = {
            mediaId: response.id
            // Note: Stories don't have permalinks
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
                message: error instanceof Error ? error.message : "Failed to publish story",
                retryable: true
            }
        };
    }
}
