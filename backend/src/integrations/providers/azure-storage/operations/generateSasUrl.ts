import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { AzureStorageClient } from "../client/AzureStorageClient";

/**
 * Generate SAS URL input schema
 */
export const generateSasUrlSchema = z.object({
    container: z.string().min(3).max(63).describe("Container name"),
    blob: z.string().min(1).max(1024).describe("Blob name (path in container)"),
    permissions: z
        .string()
        .regex(
            /^[rwdl]+$/,
            "Permissions must be a combination of r(read), w(write), d(delete), l(list)"
        )
        .default("r")
        .describe("Permissions: r=read, w=write, d=delete, l=list"),
    expiresIn: z
        .number()
        .min(60)
        .max(604800)
        .optional()
        .default(3600)
        .describe("URL expiration time in seconds (60-604800, default 3600)")
});

export type GenerateSasUrlParams = z.infer<typeof generateSasUrlSchema>;

/**
 * Generate SAS URL operation definition
 */
export const generateSasUrlOperation: OperationDefinition = {
    id: "generateSasUrl",
    name: "Generate SAS URL",
    description: "Generate a Shared Access Signature URL for temporary blob access",
    category: "blobs",
    retryable: true,
    inputSchema: generateSasUrlSchema
};

/**
 * Execute generate SAS URL operation
 */
export async function executeGenerateSasUrl(
    client: AzureStorageClient,
    params: GenerateSasUrlParams
): Promise<OperationResult> {
    try {
        const url = client.generateSasUrl({
            container: params.container,
            blob: params.blob,
            permissions: params.permissions,
            expiresIn: params.expiresIn
        });

        return {
            success: true,
            data: {
                url,
                container: params.container,
                blob: params.blob,
                permissions: params.permissions,
                expiresIn: params.expiresIn
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to generate SAS URL";

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
