import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleSheetsClient } from "../client/GoogleSheetsClient";

/**
 * Auto resize input schema
 */
export const autoResizeSchema = z.object({
    spreadsheetId: z.string().min(1).describe("Spreadsheet ID"),
    sheetId: z.number().int().describe("Sheet ID (gid)"),
    dimension: z.enum(["COLUMNS", "ROWS"]).describe("Dimension to resize (COLUMNS or ROWS)"),
    startIndex: z.number().int().min(0).describe("Start index (0-based)"),
    endIndex: z.number().int().min(1).describe("End index (exclusive)")
});

export type AutoResizeParams = z.infer<typeof autoResizeSchema>;

/**
 * Auto resize operation definition
 */
export const autoResizeOperation: OperationDefinition = {
    id: "autoResize",
    name: "Auto Resize",
    description: "Automatically resize columns or rows to fit content",
    category: "formatting",
    retryable: true,
    inputSchema: autoResizeSchema
};

/**
 * Execute auto resize operation
 */
export async function executeAutoResize(
    client: GoogleSheetsClient,
    params: AutoResizeParams
): Promise<OperationResult> {
    try {
        const request = {
            autoResizeDimensions: {
                dimensions: {
                    sheetId: params.sheetId,
                    dimension: params.dimension,
                    startIndex: params.startIndex,
                    endIndex: params.endIndex
                }
            }
        };

        const response = await client.batchUpdateSpreadsheet(params.spreadsheetId, [request]);

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to auto resize",
                retryable: true
            }
        };
    }
}
