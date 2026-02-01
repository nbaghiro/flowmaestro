import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleSheetsClient } from "../client/GoogleSheetsClient";

/**
 * Update values input schema
 */
export const updateValuesSchema = z.object({
    spreadsheetId: z.string().min(1).describe("Spreadsheet ID"),
    range: z.string().min(1).describe("A1 notation range (e.g., 'Sheet1!A1:B10')"),
    values: z
        .array(z.array(z.unknown()))
        .min(1)
        .describe("2D array of values to set (e.g., [['Name', 'Age'], ['John', 30]])"),
    valueInputOption: z
        .enum(["RAW", "USER_ENTERED"])
        .optional()
        .default("USER_ENTERED")
        .describe(
            "How input data should be interpreted (RAW = as-is, USER_ENTERED = parse formulas/formats)"
        )
});

export type UpdateValuesParams = z.infer<typeof updateValuesSchema>;

/**
 * Update values operation definition
 */
export const updateValuesOperation: OperationDefinition = {
    id: "updateValues",
    name: "Update Values",
    description: "Update values in a specific range of a spreadsheet",
    category: "values",
    retryable: true,
    inputSchema: updateValuesSchema
};

/**
 * Execute update values operation
 */
export async function executeUpdateValues(
    client: GoogleSheetsClient,
    params: UpdateValuesParams
): Promise<OperationResult> {
    try {
        const response = await client.updateValues(
            params.spreadsheetId,
            params.range,
            params.values,
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
                message: error instanceof Error ? error.message : "Failed to update values",
                retryable: true
            }
        };
    }
}
