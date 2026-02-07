import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ElasticsearchClient } from "../client/ElasticsearchClient";

/**
 * Bulk operation item schema
 */
const bulkOperationSchema = z.object({
    action: z.enum(["index", "create", "update", "delete"]).describe("Operation type"),
    index: z.string().min(1).describe("Target index"),
    id: z.string().optional().describe("Document ID (required for update/delete)"),
    document: z.record(z.unknown()).optional().describe("Document data (not needed for delete)")
});

/**
 * Bulk operation schema
 */
export const bulkSchema = z.object({
    operations: z.array(bulkOperationSchema).min(1).describe("Array of bulk operations to execute")
});

export type BulkParams = z.infer<typeof bulkSchema>;

/**
 * Bulk operation definition
 */
export const bulkOperation: OperationDefinition = {
    id: "bulk",
    name: "Bulk Operations",
    description: "Execute multiple index, create, update, or delete operations in a single request",
    category: "database",
    inputSchema: bulkSchema,
    retryable: false,
    timeout: 120000
};

/**
 * Execute bulk operation
 */
export async function executeBulk(
    client: ElasticsearchClient,
    params: BulkParams
): Promise<OperationResult> {
    try {
        const response = await client.bulk(params.operations);

        // Count successes and failures
        let successful = 0;
        let failed = 0;
        const errors: Array<{ index: string; id?: string; error: string }> = [];

        for (const item of response.items) {
            const [_action, result] = Object.entries(item)[0];
            if (result.error) {
                failed++;
                errors.push({
                    index: result._index,
                    id: result._id,
                    error: result.error.reason
                });
            } else {
                successful++;
            }
        }

        return {
            success: !response.errors,
            data: {
                took: response.took,
                successful,
                failed,
                total: params.operations.length,
                errors: errors.length > 0 ? errors : undefined
            }
        };
    } catch (error) {
        return mapError(error);
    }
}

/**
 * Map errors to OperationResult
 */
function mapError(error: unknown): OperationResult {
    const message = error instanceof Error ? error.message : "Bulk operation failed";
    const statusCode = (error as { statusCode?: number }).statusCode;

    return {
        success: false,
        error: {
            type: "server_error",
            message,
            retryable: statusCode === 503 || statusCode === 429
        }
    };
}
