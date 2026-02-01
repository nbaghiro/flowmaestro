import { z } from "zod";
import { AirtableClient } from "../client/AirtableClient";
import { baseIdSchema } from "../schemas";
import type { AirtableTable } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const listTablesSchema = z.object({
    baseId: baseIdSchema
});

export type ListTablesParams = z.infer<typeof listTablesSchema>;

export const listTablesOperation: OperationDefinition = {
    id: "listTables",
    name: "List Tables",
    description: "List all tables in a base (alias for getBaseSchema)",
    category: "schema",
    inputSchema: listTablesSchema,
    retryable: true,
    timeout: 15000
};

export async function executeListTables(
    client: AirtableClient,
    params: ListTablesParams
): Promise<OperationResult> {
    try {
        const response = await client.get<{ tables: AirtableTable[] }>(
            `/meta/bases/${params.baseId}/tables`
        );

        return {
            success: true,
            data: response.tables
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list tables",
                retryable: true
            }
        };
    }
}
