import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { toJSONSchema } from "../../../core/schema-utils";
import { HootsuiteClient } from "../client/HootsuiteClient";
import type { HootsuiteMediaUpload } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Upload Media operation schema
 */
export const uploadMediaSchema = z.object({
    sizeBytes: z.number().int().positive().describe("Size of the media file in bytes"),
    mimeType: z.string().describe("MIME type of the media (e.g., image/jpeg, video/mp4)")
});

export type UploadMediaParams = z.infer<typeof uploadMediaSchema>;

/**
 * Upload Media operation definition
 */
export const uploadMediaOperation: OperationDefinition = (() => {
    try {
        return {
            id: "uploadMedia",
            name: "Upload Media",
            description:
                "Create a media upload URL in Hootsuite. Returns an upload URL to PUT your media file to.",
            category: "media",
            inputSchema: uploadMediaSchema,
            inputSchemaJSON: toJSONSchema(uploadMediaSchema),
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "Hootsuite", err: error },
            "Failed to create uploadMediaOperation"
        );
        throw new Error(
            `Failed to create uploadMedia operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute upload media operation
 *
 * Note: This returns an upload URL. The actual file upload is done by
 * PUT-ing the file content to the returned uploadUrl
 */
export async function executeUploadMedia(
    client: HootsuiteClient,
    params: UploadMediaParams
): Promise<OperationResult> {
    try {
        const result = (await client.createMediaUpload({
            sizeBytes: params.sizeBytes,
            mimeType: params.mimeType
        })) as HootsuiteMediaUpload;

        return {
            success: true,
            data: {
                mediaId: result.id,
                uploadUrl: result.uploadUrl,
                uploadUrlDurationSeconds: result.uploadUrlDurationSeconds,
                instructions:
                    "PUT your media file to the uploadUrl. After upload completes, use the mediaId when scheduling messages."
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create media upload",
                retryable: true
            }
        };
    }
}
