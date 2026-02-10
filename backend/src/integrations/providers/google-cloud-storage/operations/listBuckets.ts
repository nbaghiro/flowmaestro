import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleCloudStorageClient } from "../client/GoogleCloudStorageClient";

/**
 * List buckets input schema
 */
export const listBucketsSchema = z.object({
    maxResults: z
        .number()
        .min(1)
        .max(1000)
        .optional()
        .describe("Maximum number of buckets to return (1-1000)"),
    pageToken: z.string().optional().describe("Page token for pagination"),
    prefix: z.string().optional().describe("Filter by bucket name prefix")
});

export type ListBucketsParams = z.infer<typeof listBucketsSchema>;

/**
 * List buckets operation definition
 */
export const listBucketsOperation: OperationDefinition = {
    id: "listBuckets",
    name: "List Buckets",
    description: "List all Cloud Storage buckets in the project",
    category: "buckets",
    retryable: true,
    inputSchema: listBucketsSchema
};

/**
 * Execute list buckets operation
 */
export async function executeListBuckets(
    client: GoogleCloudStorageClient,
    params: ListBucketsParams
): Promise<OperationResult> {
    try {
        const response = await client.listBuckets({
            maxResults: params.maxResults,
            pageToken: params.pageToken,
            prefix: params.prefix
        });

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list buckets",
                retryable: true
            }
        };
    }
}
