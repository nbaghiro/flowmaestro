import { z } from "zod";
import { AirtableClient } from "../client/AirtableClient";
import { baseIdSchema, tableIdSchema, fieldsSchema } from "../schemas";
import type { AirtableRecord } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const batchCreateRecordsSchema = z.object({
    baseId: baseIdSchema,
    tableId: tableIdSchema,
    records: z
        .array(z.object({ fields: fieldsSchema }))
        .max(10)
        .describe("Up to 10 records to create"),
    typecast: z.boolean().optional()
});

export type BatchCreateRecordsParams = z.infer<typeof batchCreateRecordsSchema>;

export const batchCreateRecordsOperation: OperationDefinition = {
    id: "batchCreateRecords",
    name: "Batch Create Records",
    description: "Create up to 10 records at once",
    category: "data",
    inputSchema: batchCreateRecordsSchema,
    retryable: true,
    timeout: 30000
};

export async function executeBatchCreateRecords(
    client: AirtableClient,
    params: BatchCreateRecordsParams
): Promise<OperationResult> {
    try {
        const body: Record<string, unknown> = {
            records: params.records
        };

        if (params.typecast !== undefined) {
            body.typecast = params.typecast;
        }

        const response = await client.post<{ records: AirtableRecord[] }>(
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
                message: error instanceof Error ? error.message : "Failed to create records",
                retryable: true
            }
        };
    }
}
