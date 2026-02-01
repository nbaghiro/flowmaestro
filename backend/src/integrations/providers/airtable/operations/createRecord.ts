import { z } from "zod";
import { AirtableClient } from "../client/AirtableClient";
import { baseIdSchema, tableIdSchema, fieldsSchema } from "../schemas";
import type { AirtableRecord } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const createRecordSchema = z.object({
    baseId: baseIdSchema,
    tableId: tableIdSchema,
    fields: fieldsSchema,
    typecast: z.boolean().optional().describe("Auto-convert field values to correct types")
});

export type CreateRecordParams = z.infer<typeof createRecordSchema>;

export const createRecordOperation: OperationDefinition = {
    id: "createRecord",
    name: "Create Record",
    description: "Create a new record in a table",
    category: "data",
    inputSchema: createRecordSchema,
    retryable: true,
    timeout: 10000
};

export async function executeCreateRecord(
    client: AirtableClient,
    params: CreateRecordParams
): Promise<OperationResult> {
    try {
        const body: Record<string, unknown> = {
            fields: params.fields
        };

        if (params.typecast !== undefined) {
            body.typecast = params.typecast;
        }

        const response = await client.post<AirtableRecord>(
            `/${params.baseId}/${params.tableId}`,
            body
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
                message: error instanceof Error ? error.message : "Failed to create record",
                retryable: true
            }
        };
    }
}
