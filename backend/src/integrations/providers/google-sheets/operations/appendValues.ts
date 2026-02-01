import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleSheetsClient } from "../client/GoogleSheetsClient";

/**
 * Append values input schema
 */
export const appendValuesSchema = z.object({
    spreadsheetId: z.string().min(1).describe("Spreadsheet ID"),
    range: z.string().min(1).describe("A1 notation range (e.g., 'Sheet1!A1')"),
    values: z
        .array(z.array(z.unknown()))
        .min(1)
        .describe("2D array of values to append (e.g., [['Name', 'Age'], ['John', 30]])"),
    valueInputOption: z
        .enum(["RAW", "USER_ENTERED"])
        .optional()
        .default("USER_ENTERED")
        .describe(
            "How input data should be interpreted (RAW = as-is, USER_ENTERED = parse formulas/formats)"
        )
});

export type AppendValuesParams = z.infer<typeof appendValuesSchema>;

/**
 * Append values operation definition
 */
export const appendValuesOperation: OperationDefinition = {
    id: "appendValues",
    name: "Append Values",
    description: "Append values to the end of a range in a spreadsheet",
    category: "values",
    retryable: true,
    inputSchema: appendValuesSchema
};

/**
 * Execute append values operation
 */
export async function executeAppendValues(
    client: GoogleSheetsClient,
    params: AppendValuesParams
): Promise<OperationResult> {
    try {
        const response = await client.appendValues(
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
                message: error instanceof Error ? error.message : "Failed to append values",
                retryable: true
            }
        };
    }
}
