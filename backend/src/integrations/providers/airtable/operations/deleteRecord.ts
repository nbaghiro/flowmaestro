import { z } from "zod";
import { AirtableClient } from "../client/AirtableClient";
import { baseIdSchema, tableIdSchema, recordIdSchema } from "../schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const deleteRecordSchema = z.object({
    baseId: baseIdSchema,
    tableId: tableIdSchema,
    recordId: recordIdSchema
});

export type DeleteRecordParams = z.infer<typeof deleteRecordSchema>;

export const deleteRecordOperation: OperationDefinition = {
    id: "deleteRecord",
    name: "Delete Record",
    description: "Delete a record by ID",
    category: "data",
    inputSchema: deleteRecordSchema,
    retryable: false, // Don't retry deletes
    timeout: 10000
};

export async function executeDeleteRecord(
    client: AirtableClient,
    params: DeleteRecordParams
): Promise<OperationResult> {
    try {
        await client.delete(`/${params.baseId}/${params.tableId}/${params.recordId}`);

        return {
            success: true,
            data: { deleted: true, id: params.recordId }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete record",
                retryable: false
            }
        };
    }
}
