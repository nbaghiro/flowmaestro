import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleSheetsClient } from "../client/GoogleSheetsClient";

/**
 * Unmerge cells input schema
 */
export const unmergeCellsSchema = z.object({
    spreadsheetId: z.string().min(1).describe("Spreadsheet ID"),
    sheetId: z.number().int().describe("Sheet ID (gid)"),
    startRowIndex: z.number().int().min(0).describe("Start row index (0-based)"),
    endRowIndex: z.number().int().min(1).describe("End row index (exclusive)"),
    startColumnIndex: z.number().int().min(0).describe("Start column index (0-based)"),
    endColumnIndex: z.number().int().min(1).describe("End column index (exclusive)")
});

export type UnmergeCellsParams = z.infer<typeof unmergeCellsSchema>;

/**
 * Unmerge cells operation definition
 */
export const unmergeCellsOperation: OperationDefinition = {
    id: "unmergeCells",
    name: "Unmerge Cells",
    description: "Unmerge merged cells in a range",
    category: "formatting",
    retryable: true,
    inputSchema: unmergeCellsSchema
};

/**
 * Execute unmerge cells operation
 */
export async function executeUnmergeCells(
    client: GoogleSheetsClient,
    params: UnmergeCellsParams
): Promise<OperationResult> {
    try {
        const request = {
            unmergeCells: {
                range: {
                    sheetId: params.sheetId,
                    startRowIndex: params.startRowIndex,
                    endRowIndex: params.endRowIndex,
                    startColumnIndex: params.startColumnIndex,
                    endColumnIndex: params.endColumnIndex
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
                message: error instanceof Error ? error.message : "Failed to unmerge cells",
                retryable: true
            }
        };
    }
}
