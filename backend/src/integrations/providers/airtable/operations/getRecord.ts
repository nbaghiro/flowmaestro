import { z } from "zod";
import { AirtableClient } from "../client/AirtableClient";
import { baseIdSchema, tableIdSchema, recordIdSchema } from "../schemas";
import type { AirtableRecord } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const getRecordSchema = z.object({
    baseId: baseIdSchema,
    tableId: tableIdSchema,
    recordId: recordIdSchema
});

export type GetRecordParams = z.infer<typeof getRecordSchema>;

export const getRecordOperation: OperationDefinition = {
    id: "getRecord",
    name: "Get Record",
    description: "Get a single record by ID",
    category: "data",
    inputSchema: getRecordSchema,
    retryable: true,
    timeout: 10000
};

export async function executeGetRecord(
    client: AirtableClient,
    params: GetRecordParams
): Promise<OperationResult> {
    try {
        const response = await client.get<AirtableRecord>(
            `/${params.baseId}/${params.tableId}/${params.recordId}`
        );

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get record",
                retryable: true
            }
        };
    }
}
