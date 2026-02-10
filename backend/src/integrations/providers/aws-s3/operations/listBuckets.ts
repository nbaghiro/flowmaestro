import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { AWSS3Client } from "../client/AWSS3Client";

/**
 * List buckets input schema (no parameters required)
 */
export const listBucketsSchema = z.object({});

export type ListBucketsParams = z.infer<typeof listBucketsSchema>;

/**
 * List buckets operation definition
 */
export const listBucketsOperation: OperationDefinition = {
    id: "listBuckets",
    name: "List Buckets",
    description: "List all S3 buckets in the AWS account",
    category: "buckets",
    retryable: true,
    inputSchema: listBucketsSchema
};

/**
 * Execute list buckets operation
 */
export async function executeListBuckets(
    client: AWSS3Client,
    _params: ListBucketsParams
): Promise<OperationResult> {
    try {
        const response = await client.listBuckets();

        return {
            success: true,
            data: {
                buckets: response.buckets.map((b) => ({
                    name: b.name,
                    creationDate: b.creationDate
                }))
            }
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
