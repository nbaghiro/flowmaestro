import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { SalesforceClient } from "../client/SalesforceClient";

/**
 * Query records input schema
 */
export const queryRecordsSchema = z.object({
    query: z
        .string()
        .optional()
        .describe("Full SOQL query string (takes precedence over other parameters)"),
    objectType: z
        .string()
        .optional()
        .describe("Object type to query (e.g., Account, Contact, Lead)"),
    fields: z
        .array(z.string())
        .optional()
        .default(["Id", "Name"])
        .describe("Fields to select (default: Id, Name)"),
    where: z.string().optional().describe("WHERE clause conditions (without WHERE keyword)"),
    orderBy: z.string().optional().describe("ORDER BY clause (e.g., 'Name ASC')"),
    limit: z.number().int().positive().max(2000).optional().describe("Maximum records to return"),
    fetchAll: z
        .boolean()
        .optional()
        .default(false)
        .describe("Fetch all pages of results (use with caution for large datasets)")
});

export type QueryRecordsParams = z.infer<typeof queryRecordsSchema>;

/**
 * Query records operation definition
 */
export const queryRecordsOperation: OperationDefinition = {
    id: "queryRecords",
    name: "Query Salesforce Records",
    description:
        "Execute a SOQL query to retrieve records from Salesforce. Supports full SOQL or structured query parameters.",
    category: "query",
    retryable: true,
    inputSchema: queryRecordsSchema
};

/**
 * Build SOQL query from parameters
 */
function buildQuery(params: QueryRecordsParams): string {
    // If full query provided, use it directly
    if (params.query) {
        return params.query;
    }

    // Build query from parameters
    if (!params.objectType) {
        throw new Error("Either 'query' or 'objectType' must be provided");
    }

    const fields = params.fields && params.fields.length > 0 ? params.fields : ["Id", "Name"];

    let soql = `SELECT ${fields.join(", ")} FROM ${params.objectType}`;

    if (params.where) {
        soql += ` WHERE ${params.where}`;
    }

    if (params.orderBy) {
        soql += ` ORDER BY ${params.orderBy}`;
    }

    if (params.limit) {
        soql += ` LIMIT ${params.limit}`;
    }

    return soql;
}

/**
 * Execute query records operation
 */
export async function executeQueryRecords(
    client: SalesforceClient,
    params: QueryRecordsParams
): Promise<OperationResult> {
    try {
        const soql = buildQuery(params);

        if (params.fetchAll) {
            // Fetch all pages
            const records = await client.queryAll(soql);
            return {
                success: true,
                data: {
                    totalSize: records.length,
                    done: true,
                    records
                }
            };
        } else {
            // Single page query
            const result = await client.query(soql);
            return {
                success: true,
                data: {
                    totalSize: result.totalSize,
                    done: result.done,
                    records: result.records,
                    nextRecordsUrl: result.nextRecordsUrl
                }
            };
        }
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to query records",
                retryable: true
            }
        };
    }
}
