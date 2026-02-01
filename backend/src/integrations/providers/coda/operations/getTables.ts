import { z } from "zod";
import { CodaClient } from "../client/CodaClient";
import { CodaDocIdSchema, CodaLimitSchema } from "../schemas";
import type { CodaTablesResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Get Tables operation schema
 */
export const getTablesSchema = z.object({
    docId: CodaDocIdSchema,
    limit: CodaLimitSchema
});

export type GetTablesParams = z.infer<typeof getTablesSchema>;

/**
 * Get Tables operation definition
 */
export const getTablesOperation: OperationDefinition = {
    id: "getTables",
    name: "Get Tables",
    description: "Get all tables in a Coda document",
    category: "data",
    inputSchema: getTablesSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute get tables operation
 */
export async function executeGetTables(
    client: CodaClient,
    params: GetTablesParams
): Promise<OperationResult> {
    try {
        const response = await client.get<CodaTablesResponse>(`/docs/${params.docId}/tables`, {
            limit: params.limit
        });

        const tables = response.items.map((table) => ({
            id: table.id,
            name: table.name,
            browserLink: table.browserLink
        }));

        return {
            success: true,
            data: {
                tables,
                nextPageToken: response.nextPageToken
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get tables",
                retryable: true
            }
        };
    }
}
