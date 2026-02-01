import { z } from "zod";
import { AirtableClient } from "../client/AirtableClient";
import { baseIdSchema, tableIdSchema, recordIdSchema, fieldsSchema } from "../schemas";
import type { AirtableRecord } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const batchUpdateRecordsSchema = z.object({
    baseId: baseIdSchema,
    tableId: tableIdSchema,
    records: z
        .array(
            z.object({
                id: recordIdSchema,
                fields: fieldsSchema
            })
        )
        .max(10)
        .describe("Up to 10 records to update"),
    typecast: z.boolean().optional()
});

export type BatchUpdateRecordsParams = z.infer<typeof batchUpdateRecordsSchema>;

export const batchUpdateRecordsOperation: OperationDefinition = {
    id: "batchUpdateRecords",
    name: "Batch Update Records",
    description: "Update up to 10 records at once",
    category: "data",
    inputSchema: batchUpdateRecordsSchema,
    retryable: true,
    timeout: 30000
};

export async function executeBatchUpdateRecords(
    client: AirtableClient,
    params: BatchUpdateRecordsParams
): Promise<OperationResult> {
    try {
        const body: Record<string, unknown> = {
            records: params.records
        };

        if (params.typecast !== undefined) {
            body.typecast = params.typecast;
        }

        const response = await client.patch<{ records: AirtableRecord[] }>(
            `/${params.baseId}/${params.tableId}`,
            body
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
                message: error instanceof Error ? error.message : "Failed to update records",
                retryable: true
            }
        };
    }
}
