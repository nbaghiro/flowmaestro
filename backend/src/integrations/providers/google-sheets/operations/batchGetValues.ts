import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleSheetsClient } from "../client/GoogleSheetsClient";

/**
 * Batch get values input schema
 */
export const batchGetValuesSchema = z.object({
    spreadsheetId: z.string().min(1).describe("Spreadsheet ID"),
    ranges: z
        .array(z.string().min(1))
        .min(1)
        .describe("Array of A1 notation ranges (e.g., ['Sheet1!A1:B10', 'Sheet2!C1:D5'])"),
    valueRenderOption: z
        .enum(["FORMATTED_VALUE", "UNFORMATTED_VALUE", "FORMULA"])
        .optional()
        .default("FORMATTED_VALUE")
        .describe("How values should be represented (default: FORMATTED_VALUE)")
});

export type BatchGetValuesParams = z.infer<typeof batchGetValuesSchema>;

/**
 * Batch get values operation definition
 */
export const batchGetValuesOperation: OperationDefinition = {
    id: "batchGetValues",
    name: "Batch Get Values",
    description: "Get values from multiple ranges in a spreadsheet",
    category: "values",
    retryable: true,
    inputSchema: batchGetValuesSchema
};

/**
 * Execute batch get values operation
 */
export async function executeBatchGetValues(
    client: GoogleSheetsClient,
    params: BatchGetValuesParams
): Promise<OperationResult> {
    try {
        const response = await client.batchGetValues(
            params.spreadsheetId,
            params.ranges,
            params.valueRenderOption
        );

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to batch get values",
                retryable: true
            }
        };
    }
}
