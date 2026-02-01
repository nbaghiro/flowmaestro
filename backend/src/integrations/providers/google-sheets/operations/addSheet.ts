import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleSheetsClient } from "../client/GoogleSheetsClient";

/**
 * Add sheet input schema
 */
export const addSheetSchema = z.object({
    spreadsheetId: z.string().min(1).describe("Spreadsheet ID"),
    title: z.string().min(1).max(100).describe("Sheet title"),
    index: z.number().int().min(0).optional().describe("Sheet position index (default: end)"),
    gridProperties: z
        .object({
            rowCount: z.number().int().min(1).optional().describe("Number of rows"),
            columnCount: z.number().int().min(1).optional().describe("Number of columns"),
            frozenRowCount: z.number().int().min(0).optional().describe("Frozen rows"),
            frozenColumnCount: z.number().int().min(0).optional().describe("Frozen columns")
        })
        .optional()
        .describe("Grid properties for the new sheet")
});

export type AddSheetParams = z.infer<typeof addSheetSchema>;

/**
 * Add sheet operation definition
 */
export const addSheetOperation: OperationDefinition = {
    id: "addSheet",
    name: "Add Sheet",
    description: "Add a new sheet to a spreadsheet",
    category: "sheets",
    retryable: true,
    inputSchema: addSheetSchema
};

/**
 * Execute add sheet operation
 */
export async function executeAddSheet(
    client: GoogleSheetsClient,
    params: AddSheetParams
): Promise<OperationResult> {
    try {
        const request = {
            addSheet: {
                properties: {
                    title: params.title,
                    index: params.index,
                    gridProperties: params.gridProperties
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
                message: error instanceof Error ? error.message : "Failed to add sheet",
                retryable: true
            }
        };
    }
}
