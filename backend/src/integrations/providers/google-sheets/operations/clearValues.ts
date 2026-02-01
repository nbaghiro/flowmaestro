import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleSheetsClient } from "../client/GoogleSheetsClient";

/**
 * Clear values input schema
 */
export const clearValuesSchema = z.object({
    spreadsheetId: z.string().min(1).describe("Spreadsheet ID"),
    range: z.string().min(1).describe("A1 notation range to clear (e.g., 'Sheet1!A1:B10')")
});

export type ClearValuesParams = z.infer<typeof clearValuesSchema>;

/**
 * Clear values operation definition
 */
export const clearValuesOperation: OperationDefinition = {
    id: "clearValues",
    name: "Clear Values",
    description: "Clear values from a range in a spreadsheet",
    category: "values",
    retryable: true,
    inputSchema: clearValuesSchema
};

/**
 * Execute clear values operation
 */
export async function executeClearValues(
    client: GoogleSheetsClient,
    params: ClearValuesParams
): Promise<OperationResult> {
    try {
        const response = await client.clearValues(params.spreadsheetId, params.range);

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to clear values",
                retryable: true
            }
        };
    }
}
