import { z } from "zod";
import { AirtableClient } from "../client/AirtableClient";
import { baseIdSchema, tableIdSchema, sortSchema } from "../schemas";
import type { AirtableListRecordsResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * List Records operation schema
 */
export const listRecordsSchema = z.object({
    baseId: baseIdSchema,
    tableId: tableIdSchema,
    pageSize: z.number().min(1).max(100).optional().describe("Records per page (default: 100)"),
    offset: z.string().optional().describe("Pagination cursor from previous response"),
    view: z.string().optional().describe("View ID or name to filter by"),
    filterByFormula: z.string().optional().describe("Airtable formula to filter records"),
    sort: z.array(sortSchema).optional().describe("Sort fields"),
    fields: z.array(z.string()).optional().describe("Specific fields to return"),
    maxRecords: z.number().optional().describe("Maximum total records to return")
});

export type ListRecordsParams = z.infer<typeof listRecordsSchema>;

/**
 * List Records operation definition
 */
export const listRecordsOperation: OperationDefinition = {
    id: "listRecords",
    name: "List Records",
    description: "List records from an Airtable table with optional filtering and pagination",
    category: "data",
    inputSchema: listRecordsSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute list records operation
 */
export async function executeListRecords(
    client: AirtableClient,
    params: ListRecordsParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {};

        if (params.pageSize) queryParams.pageSize = params.pageSize;
        if (params.offset) queryParams.offset = params.offset;
        if (params.view) queryParams.view = params.view;
        if (params.filterByFormula) queryParams.filterByFormula = params.filterByFormula;
        if (params.maxRecords) queryParams.maxRecords = params.maxRecords;
        if (params.fields) queryParams.fields = params.fields;
        if (params.sort) {
            queryParams.sort = params.sort.map((s) => ({
                field: s.field,
                direction: s.direction
            }));
        }

        const response = await client.get<AirtableListRecordsResponse>(
            `/${params.baseId}/${params.tableId}`,
            queryParams
        );

        return {
            success: true,
            data: {
                records: response.records,
                offset: response.offset,
                hasMore: !!response.offset
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list records",
                retryable: true
            }
        };
    }
}
