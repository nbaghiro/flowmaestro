import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleCloudStorageClient } from "../client/GoogleCloudStorageClient";

/**
 * Get signed URL input schema
 */
export const getSignedUrlSchema = z.object({
    bucket: z.string().min(3).max(63).describe("Bucket name"),
    object: z.string().min(1).max(1024).describe("Object name (path in bucket)"),
    expiresIn: z
        .number()
        .min(60)
        .max(604800)
        .optional()
        .default(3600)
        .describe("URL expiration time in seconds (60-604800, default 3600)"),
    method: z
        .enum(["GET", "PUT"])
        .optional()
        .default("GET")
        .describe("HTTP method for the signed URL (GET for download, PUT for upload)")
});

export type GetSignedUrlParams = z.infer<typeof getSignedUrlSchema>;

/**
 * Get signed URL operation definition
 */
export const getSignedUrlOperation: OperationDefinition = {
    id: "getSignedUrl",
    name: "Get Signed URL",
    description: "Generate a temporary signed URL for object access",
    category: "objects",
    retryable: true,
    inputSchema: getSignedUrlSchema
};

/**
 * Execute get signed URL operation
 *
 * Note: For OAuth-based authentication, generating classic signed URLs requires
 * the IAM Credentials API. This implementation returns an authenticated URL
 * that works when the access token is still valid.
 */
export async function executeGetSignedUrl(
    client: GoogleCloudStorageClient,
    params: GetSignedUrlParams
): Promise<OperationResult> {
    try {
        const url = await client.getSignedUrl({
            bucket: params.bucket,
            object: params.object,
            expiresIn: params.expiresIn,
            method: params.method
        });

        return {
            success: true,
            data: {
                url,
                bucket: params.bucket,
                object: params.object,
                expiresIn: params.expiresIn,
                method: params.method,
                note: "For OAuth authentication, this URL requires a valid access token in the Authorization header"
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to generate signed URL";
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
