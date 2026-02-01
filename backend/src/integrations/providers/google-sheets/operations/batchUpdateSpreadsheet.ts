import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleSheetsClient } from "../client/GoogleSheetsClient";

/**
 * Batch update spreadsheet input schema
 */
export const batchUpdateSpreadsheetSchema = z.object({
    spreadsheetId: z.string().min(1).describe("Spreadsheet ID"),
    requests: z
        .array(z.record(z.unknown()))
        .min(1)
        .describe("Array of update requests (see Google Sheets API documentation)")
});

export type BatchUpdateSpreadsheetParams = z.infer<typeof batchUpdateSpreadsheetSchema>;

/**
 * Batch update spreadsheet operation definition
 */
export const batchUpdateSpreadsheetOperation: OperationDefinition = {
    id: "batchUpdateSpreadsheet",
    name: "Batch Update Spreadsheet",
    description: "Apply one or more updates to spreadsheet (formatting, properties, sheets, etc.)",
    category: "spreadsheets",
    retryable: true,
    inputSchema: batchUpdateSpreadsheetSchema
};

/**
 * Execute batch update spreadsheet operation
 */
export async function executeBatchUpdateSpreadsheet(
    client: GoogleSheetsClient,
    params: BatchUpdateSpreadsheetParams
): Promise<OperationResult> {
    try {
        const response = await client.batchUpdateSpreadsheet(params.spreadsheetId, params.requests);

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message:
                    error instanceof Error ? error.message : "Failed to batch update spreadsheet",
                retryable: true
            }
        };
    }
}
