import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleSlidesClient } from "../client/GoogleSlidesClient";

/**
 * Get thumbnail input schema
 */
export const getThumbnailSchema = z.object({
    presentationId: z.string().min(1).describe("The ID of the presentation"),
    pageObjectId: z
        .string()
        .min(1)
        .describe("The object ID of the page (slide) to get thumbnail for"),
    thumbnailSize: z
        .enum(["LARGE", "MEDIUM", "SMALL"])
        .optional()
        .describe("Size of the thumbnail (LARGE, MEDIUM, or SMALL)")
});

export type GetThumbnailParams = z.infer<typeof getThumbnailSchema>;

/**
 * Get thumbnail operation definition
 */
export const getThumbnailOperation: OperationDefinition = {
    id: "getThumbnail",
    name: "Get Thumbnail",
    description: "Get a thumbnail image URL for a specific slide in a presentation",
    category: "pages",
    retryable: true,
    inputSchema: getThumbnailSchema,
    inputSchemaJSON: {
        type: "object",
        properties: {
            presentationId: {
                type: "string",
                description: "The ID of the presentation"
            },
            pageObjectId: {
                type: "string",
                description: "The object ID of the page (slide) to get thumbnail for"
            },
            thumbnailSize: {
                type: "string",
                enum: ["LARGE", "MEDIUM", "SMALL"],
                description: "Size of the thumbnail"
            }
        },
        required: ["presentationId", "pageObjectId"]
    }
};

interface ThumbnailResponse {
    contentUrl: string;
    width?: number;
    height?: number;
}

/**
 * Execute get thumbnail operation
 */
export async function executeGetThumbnail(
    client: GoogleSlidesClient,
    params: GetThumbnailParams
): Promise<OperationResult> {
    try {
        const response = (await client.getThumbnail(
            params.presentationId,
            params.pageObjectId,
            params.thumbnailSize
        )) as ThumbnailResponse;

        return {
            success: true,
            data: {
                contentUrl: response.contentUrl,
                width: response.width,
                height: response.height
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get thumbnail",
                retryable: true
            }
        };
    }
}
