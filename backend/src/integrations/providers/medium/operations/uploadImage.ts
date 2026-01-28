import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MediumClient } from "../client/MediumClient";

export const uploadImageSchema = z.object({
    imageBase64: z.string().describe("The image data encoded as a base64 string"),
    contentType: z
        .enum(["image/png", "image/jpeg", "image/gif", "image/tiff"])
        .describe("The MIME type of the image")
});

export type UploadImageParams = z.infer<typeof uploadImageSchema>;

export const uploadImageOperation: OperationDefinition = {
    id: "uploadImage",
    name: "Upload Image",
    description: "Upload an image to Medium. Returns a URL that can be used in post content",
    category: "image",
    inputSchema: uploadImageSchema,
    inputSchemaJSON: toJSONSchema(uploadImageSchema),
    retryable: true,
    timeout: 60000
};

export async function executeUploadImage(
    client: MediumClient,
    params: UploadImageParams
): Promise<OperationResult> {
    try {
        // Decode base64 to buffer
        const imageBuffer = Buffer.from(params.imageBase64, "base64");

        const response = await client.uploadImage(imageBuffer, params.contentType);
        const image = response.data;

        return {
            success: true,
            data: {
                url: image.url,
                md5: image.md5
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to upload image",
                retryable: true
            }
        };
    }
}
