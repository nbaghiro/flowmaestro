import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleCloudStorageClient } from "../client/GoogleCloudStorageClient";

/**
 * List objects input schema
 */
export const listObjectsSchema = z.object({
    bucket: z.string().min(3).max(63).describe("Bucket name"),
    prefix: z.string().optional().describe("Filter objects by prefix (folder path)"),
    delimiter: z.string().optional().describe("Delimiter for hierarchy (typically '/')"),
    maxResults: z
        .number()
        .min(1)
        .max(1000)
        .optional()
        .describe("Maximum number of objects to return (1-1000)"),
    pageToken: z.string().optional().describe("Page token for pagination")
});

export type ListObjectsParams = z.infer<typeof listObjectsSchema>;

/**
 * List objects operation definition
 */
export const listObjectsOperation: OperationDefinition = {
    id: "listObjects",
    name: "List Objects",
    description: "List objects in a Cloud Storage bucket with optional prefix filtering",
    category: "objects",
    retryable: true,
    inputSchema: listObjectsSchema
};

/**
 * Execute list objects operation
 */
export async function executeListObjects(
    client: GoogleCloudStorageClient,
    params: ListObjectsParams
): Promise<OperationResult> {
    try {
        const response = await client.listObjects({
            bucket: params.bucket,
            prefix: params.prefix,
            delimiter: params.delimiter,
            maxResults: params.maxResults,
            pageToken: params.pageToken
        });

        return {
            success: true,
            data: response
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to list objects";
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
