import { z } from "zod";
import { AirtableClient } from "../client/AirtableClient";
import { baseIdSchema, tableIdSchema, recordIdSchema } from "../schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const batchDeleteRecordsSchema = z.object({
    baseId: baseIdSchema,
    tableId: tableIdSchema,
    recordIds: z.array(recordIdSchema).max(10).describe("Up to 10 record IDs to delete")
});

export type BatchDeleteRecordsParams = z.infer<typeof batchDeleteRecordsSchema>;

export const batchDeleteRecordsOperation: OperationDefinition = {
    id: "batchDeleteRecords",
    name: "Batch Delete Records",
    description: "Delete up to 10 records at once",
    category: "data",
    inputSchema: batchDeleteRecordsSchema,
    retryable: false,
    timeout: 30000
};

export async function executeBatchDeleteRecords(
    client: AirtableClient,
    params: BatchDeleteRecordsParams
): Promise<OperationResult> {
    try {
        // Build query string with multiple records[] parameters
        const queryParams = params.recordIds.map((id) => `records[]=${id}`).join("&");

        const response = await client.delete<{ records: Array<{ id: string; deleted: boolean }> }>(
            `/${params.baseId}/${params.tableId}?${queryParams}`
        );

        return {
            success: true,
            data: { records: response.records, count: response.records.length }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete records",
                retryable: false
            }
        };
    }
}
