import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { AWSS3Client } from "../client/AWSS3Client";

/**
 * Get pre-signed URL input schema
 */
export const getPresignedUrlSchema = z.object({
    bucket: z.string().min(3).max(63).describe("Bucket name"),
    key: z.string().min(1).max(1024).describe("Object key (path in bucket)"),
    expiresIn: z
        .number()
        .min(1)
        .max(604800)
        .optional()
        .default(3600)
        .describe("URL expiration time in seconds (1-604800, default 3600)"),
    method: z
        .enum(["GET", "PUT"])
        .optional()
        .default("GET")
        .describe("HTTP method for the signed URL (GET for download, PUT for upload)")
});

export type GetPresignedUrlParams = z.infer<typeof getPresignedUrlSchema>;

/**
 * Get pre-signed URL operation definition
 */
export const getPresignedUrlOperation: OperationDefinition = {
    id: "getPresignedUrl",
    name: "Get Pre-signed URL",
    description: "Generate a temporary pre-signed URL for object access",
    category: "objects",
    retryable: true,
    inputSchema: getPresignedUrlSchema
};

/**
 * Execute get pre-signed URL operation
 */
export async function executeGetPresignedUrl(
    client: AWSS3Client,
    params: GetPresignedUrlParams
): Promise<OperationResult> {
    try {
        const url = client.getPresignedUrl({
            bucket: params.bucket,
            key: params.key,
            expiresIn: params.expiresIn,
            method: params.method
        });

        return {
            success: true,
            data: {
                url,
                bucket: params.bucket,
                key: params.key,
                expiresIn: params.expiresIn,
                method: params.method
            }
        };
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Failed to generate pre-signed URL";

        return {
            success: false,
            error: {
                type: "server_error",
                message,
                retryable: false
            }
        };
    }
}
