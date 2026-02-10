import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleCloudStorageClient } from "../client/GoogleCloudStorageClient";

/**
 * Upload object input schema
 */
export const uploadObjectSchema = z.object({
    bucket: z.string().min(3).max(63).describe("Bucket name"),
    name: z.string().min(1).max(1024).describe("Object name (path in bucket)"),
    data: z.string().describe("File content as base64 encoded string or data URL"),
    contentType: z
        .string()
        .default("application/octet-stream")
        .describe("MIME type of the object (e.g., image/png, application/pdf)"),
    metadata: z.record(z.string()).optional().describe("Custom metadata key-value pairs")
});

export type UploadObjectParams = z.infer<typeof uploadObjectSchema>;

/**
 * Upload object operation definition
 */
export const uploadObjectOperation: OperationDefinition = {
    id: "uploadObject",
    name: "Upload Object",
    description: "Upload a file to a Cloud Storage bucket",
    category: "objects",
    retryable: true,
    inputSchema: uploadObjectSchema
};

/**
 * Execute upload object operation
 */
export async function executeUploadObject(
    client: GoogleCloudStorageClient,
    params: UploadObjectParams
): Promise<OperationResult> {
    try {
        const response = await client.uploadObject({
            bucket: params.bucket,
            name: params.name,
            data: params.data,
            contentType: params.contentType,
            metadata: params.metadata
        });

        return {
            success: true,
            data: response
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to upload object";
        const isNotFound = message.includes("not found");

        return {
            success: false,
            error: {
                type: isNotFound ? "not_found" : "server_error",
                message,
                retryable: !isNotFound
            }
        };
    }
}
