import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleSheetsClient } from "../client/GoogleSheetsClient";

/**
 * Get values input schema
 */
export const getValuesSchema = z.object({
    spreadsheetId: z.string().min(1).describe("Spreadsheet ID"),
    range: z.string().min(1).describe("A1 notation range (e.g., 'Sheet1!A1:B10' or 'Sheet1')"),
    valueRenderOption: z
        .enum(["FORMATTED_VALUE", "UNFORMATTED_VALUE", "FORMULA"])
        .optional()
        .default("FORMATTED_VALUE")
        .describe("How values should be represented (default: FORMATTED_VALUE)")
});

export type GetValuesParams = z.infer<typeof getValuesSchema>;

/**
 * Get values operation definition
 */
export const getValuesOperation: OperationDefinition = {
    id: "getValues",
    name: "Get Values",
    description: "Get values from a range in a spreadsheet",
    category: "values",
    retryable: true,
    inputSchema: getValuesSchema
};

/**
 * Execute get values operation
 */
export async function executeGetValues(
    client: GoogleSheetsClient,
    params: GetValuesParams
): Promise<OperationResult> {
    try {
        const response = await client.getValues(
            params.spreadsheetId,
            params.range,
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
                message: error instanceof Error ? error.message : "Failed to get values",
                retryable: true
            }
        };
    }
}
