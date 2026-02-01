import { z } from "zod";
import { AirtableClient } from "../client/AirtableClient";
import { baseIdSchema } from "../schemas";
import type { AirtableTable } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const getBaseSchemaSchema = z.object({
    baseId: baseIdSchema
});

export type GetBaseSchemaParams = z.infer<typeof getBaseSchemaSchema>;

export const getBaseSchemaOperation: OperationDefinition = {
    id: "getBaseSchema",
    name: "Get Base Schema",
    description: "Get complete schema for a base including all tables, fields, and views",
    category: "schema",
    inputSchema: getBaseSchemaSchema,
    retryable: true,
    timeout: 15000
};

export async function executeGetBaseSchema(
    client: AirtableClient,
    params: GetBaseSchemaParams
): Promise<OperationResult> {
    try {
        const response = await client.get<{ tables: AirtableTable[] }>(
            `/meta/bases/${params.baseId}/tables`
        );

        return {
            success: true,
            data: {
                tables: response.tables,
                tableCount: response.tables.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get base schema",
                retryable: true
            }
        };
    }
}
