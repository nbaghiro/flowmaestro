import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleSheetsClient } from "../client/GoogleSheetsClient";

/**
 * Batch update values input schema
 */
export const batchUpdateValuesSchema = z.object({
    spreadsheetId: z.string().min(1).describe("Spreadsheet ID"),
    data: z
        .array(
            z.object({
                range: z.string().min(1).describe("A1 notation range"),
                values: z.array(z.array(z.unknown())).describe("2D array of values")
            })
        )
        .min(1)
        .describe("Array of range/values pairs to update"),
    valueInputOption: z
        .enum(["RAW", "USER_ENTERED"])
        .optional()
        .default("USER_ENTERED")
        .describe(
            "How input data should be interpreted (RAW = as-is, USER_ENTERED = parse formulas/formats)"
        )
});

export type BatchUpdateValuesParams = z.infer<typeof batchUpdateValuesSchema>;

/**
 * Batch update values operation definition
 */
export const batchUpdateValuesOperation: OperationDefinition = {
    id: "batchUpdateValues",
    name: "Batch Update Values",
    description: "Update values in multiple ranges of a spreadsheet",
    category: "values",
    retryable: true,
    inputSchema: batchUpdateValuesSchema
};

/**
 * Execute batch update values operation
 */
export async function executeBatchUpdateValues(
    client: GoogleSheetsClient,
    params: BatchUpdateValuesParams
): Promise<OperationResult> {
    try {
        const response = await client.batchUpdateValues(
            params.spreadsheetId,
            params.data,
            params.valueInputOption
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
                message: error instanceof Error ? error.message : "Failed to batch update values",
                retryable: true
            }
        };
    }
}
