import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { SalesforceClient } from "../client/SalesforceClient";

/**
 * Search records input schema
 */
export const searchRecordsSchema = z.object({
    searchQuery: z
        .string()
        .optional()
        .describe("Full SOSL search query (takes precedence over other parameters)"),
    searchTerm: z
        .string()
        .optional()
        .describe("Text to search for (will be wrapped in FIND clause)"),
    objectTypes: z
        .array(z.string())
        .optional()
        .describe("Object types to search in (e.g., ['Account', 'Contact'])"),
    returningFields: z
        .record(z.array(z.string()))
        .optional()
        .describe("Fields to return per object type (e.g., { Account: ['Name', 'Website'] })")
});

export type SearchRecordsParams = z.infer<typeof searchRecordsSchema>;

/**
 * Search records operation definition
 */
export const searchRecordsOperation: OperationDefinition = {
    id: "searchRecords",
    name: "Search Salesforce Records",
    description:
        "Execute a SOSL search across multiple Salesforce objects. Useful for finding records by text across fields.",
    category: "search",
    retryable: true,
    inputSchema: searchRecordsSchema
};

/**
 * Build SOSL search query from parameters
 */
function buildSearchQuery(params: SearchRecordsParams): string {
    // If full query provided, use it directly
    if (params.searchQuery) {
        return params.searchQuery;
    }

    // Build query from parameters
    if (!params.searchTerm) {
        throw new Error("Either 'searchQuery' or 'searchTerm' must be provided");
    }

    // Escape special characters in search term
    const escapedTerm = params.searchTerm
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"');

    let sosl = `FIND {${escapedTerm}} IN ALL FIELDS`;

    // Add RETURNING clause if object types specified
    if (params.objectTypes && params.objectTypes.length > 0) {
        const returningParts = params.objectTypes.map((objType) => {
            const fields = params.returningFields?.[objType];
            if (fields && fields.length > 0) {
                return `${objType}(${fields.join(", ")})`;
            }
            return `${objType}(Id, Name)`;
        });

        sosl += ` RETURNING ${returningParts.join(", ")}`;
    }

    return sosl;
}

/**
 * Execute search records operation
 */
export async function executeSearchRecords(
    client: SalesforceClient,
    params: SearchRecordsParams
): Promise<OperationResult> {
    try {
        const sosl = buildSearchQuery(params);
        const result = await client.search(sosl);

        // Group results by object type
        const groupedResults: Record<string, unknown[]> = {};

        for (const record of result.searchRecords) {
            const objectType = record.attributes.type;
            if (!groupedResults[objectType]) {
                groupedResults[objectType] = [];
            }
            groupedResults[objectType].push(record);
        }

        return {
            success: true,
            data: {
                totalCount: result.searchRecords.length,
                records: result.searchRecords,
                groupedByType: groupedResults
            }
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to search records";

        // Check if it's a malformed query error
        if (errorMessage.includes("MALFORMED_SEARCH")) {
            return {
                success: false,
                error: {
                    type: "validation",
                    message: `Invalid search query: ${errorMessage}`,
                    retryable: false
                }
            };
        }

        return {
            success: false,
            error: {
                type: "server_error",
                message: errorMessage,
                retryable: true
            }
        };
    }
}
