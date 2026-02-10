import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { ZohoCrmClient } from "../../client/ZohoCrmClient";
import type { ZohoCOQLResponse, ZohoRecord } from "../types";

/**
 * Query Records Parameters
 */
export const queryRecordsSchema = z.object({
    select_query: z
        .string()
        .min(1, "COQL query is required")
        .refine((query) => query.toLowerCase().startsWith("select"), "Query must start with SELECT")
});

export type QueryRecordsParams = z.infer<typeof queryRecordsSchema>;

/**
 * Operation Definition
 */
export const queryRecordsOperation: OperationDefinition = {
    id: "queryRecords",
    name: "Query Records (COQL)",
    description:
        "Execute a COQL (CRM Object Query Language) query to search records across modules",
    category: "crm",
    inputSchema: queryRecordsSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute Query Records
 *
 * COQL supports:
 * - SELECT field1, field2 FROM Module WHERE condition
 * - Comparison operators: =, !=, <, <=, >, >=, like, not like, in, not in
 * - Logical operators: AND, OR
 * - Functions: MAX, MIN, COUNT, SUM, AVG
 * - ORDER BY, LIMIT, OFFSET
 *
 * Example: SELECT First_Name, Last_Name, Email FROM Contacts WHERE Email like '%@example.com' LIMIT 10
 */
export async function executeQueryRecords(
    client: ZohoCrmClient,
    params: QueryRecordsParams
): Promise<OperationResult> {
    try {
        const response = await client.post<ZohoCOQLResponse<ZohoRecord>>("/crm/v8/coql", {
            select_query: params.select_query
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
                message: error instanceof Error ? error.message : "Failed to execute COQL query",
                retryable: false
            }
        };
    }
}
