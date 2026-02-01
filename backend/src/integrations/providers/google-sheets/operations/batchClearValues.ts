import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleSheetsClient } from "../client/GoogleSheetsClient";

/**
 * Batch clear values input schema
 */
export const batchClearValuesSchema = z.object({
    spreadsheetId: z.string().min(1).describe("Spreadsheet ID"),
    ranges: z
        .array(z.string().min(1))
        .min(1)
        .describe("Array of A1 notation ranges to clear (e.g., ['Sheet1!A1:B10', 'Sheet2!C1:D5'])")
});

export type BatchClearValuesParams = z.infer<typeof batchClearValuesSchema>;

/**
 * Batch clear values operation definition
 */
export const batchClearValuesOperation: OperationDefinition = {
    id: "batchClearValues",
    name: "Batch Clear Values",
    description: "Clear values from multiple ranges in a spreadsheet",
    category: "values",
    retryable: true,
    inputSchema: batchClearValuesSchema
};

/**
 * Execute batch clear values operation
 */
export async function executeBatchClearValues(
    client: GoogleSheetsClient,
    params: BatchClearValuesParams
): Promise<OperationResult> {
    try {
        const response = await client.batchClearValues(params.spreadsheetId, params.ranges);

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to batch clear values",
                retryable: true
            }
        };
    }
}
