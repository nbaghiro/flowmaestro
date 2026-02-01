import { z } from "zod";
import { AirtableClient } from "../client/AirtableClient";
import { baseIdSchema, tableIdSchema, recordIdSchema, fieldsSchema } from "../schemas";
import type { AirtableRecord } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const updateRecordSchema = z.object({
    baseId: baseIdSchema,
    tableId: tableIdSchema,
    recordId: recordIdSchema,
    fields: fieldsSchema,
    typecast: z.boolean().optional().describe("Auto-convert field values"),
    destructive: z
        .boolean()
        .optional()
        .describe("If true, replaces all fields (PUT). If false, merges fields (PATCH)")
});

export type UpdateRecordParams = z.infer<typeof updateRecordSchema>;

export const updateRecordOperation: OperationDefinition = {
    id: "updateRecord",
    name: "Update Record",
    description: "Update an existing record",
    category: "data",
    inputSchema: updateRecordSchema,
    retryable: true,
    timeout: 10000
};

export async function executeUpdateRecord(
    client: AirtableClient,
    params: UpdateRecordParams
): Promise<OperationResult> {
    try {
        const body: Record<string, unknown> = {
            fields: params.fields
        };

        if (params.typecast !== undefined) {
            body.typecast = params.typecast;
        }

        const method = params.destructive ? "PUT" : "PATCH";
        const url = `/${params.baseId}/${params.tableId}/${params.recordId}`;

        const response = await client.request<AirtableRecord>({
            method,
            url,
            data: body
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
                message: error instanceof Error ? error.message : "Failed to update record",
                retryable: true
            }
        };
    }
}
