import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleSheetsClient } from "../client/GoogleSheetsClient";

/**
 * Format cells input schema
 */
export const formatCellsSchema = z.object({
    spreadsheetId: z.string().min(1).describe("Spreadsheet ID"),
    sheetId: z.number().int().describe("Sheet ID (gid)"),
    startRowIndex: z.number().int().min(0).describe("Start row index (0-based)"),
    endRowIndex: z.number().int().min(1).describe("End row index (exclusive)"),
    startColumnIndex: z.number().int().min(0).describe("Start column index (0-based)"),
    endColumnIndex: z.number().int().min(1).describe("End column index (exclusive)"),
    format: z
        .object({
            backgroundColor: z
                .object({
                    red: z.number().min(0).max(1).optional(),
                    green: z.number().min(0).max(1).optional(),
                    blue: z.number().min(0).max(1).optional(),
                    alpha: z.number().min(0).max(1).optional()
                })
                .optional(),
            textFormat: z
                .object({
                    bold: z.boolean().optional(),
                    italic: z.boolean().optional(),
                    strikethrough: z.boolean().optional(),
                    underline: z.boolean().optional(),
                    fontSize: z.number().int().min(1).max(400).optional(),
                    foregroundColor: z
                        .object({
                            red: z.number().min(0).max(1).optional(),
                            green: z.number().min(0).max(1).optional(),
                            blue: z.number().min(0).max(1).optional()
                        })
                        .optional()
                })
                .optional(),
            horizontalAlignment: z.enum(["LEFT", "CENTER", "RIGHT"]).optional(),
            verticalAlignment: z.enum(["TOP", "MIDDLE", "BOTTOM"]).optional(),
            numberFormat: z
                .object({
                    type: z.enum(["NUMBER", "CURRENCY", "PERCENT", "DATE", "TIME", "TEXT"]),
                    pattern: z.string().optional()
                })
                .optional()
        })
        .describe("Cell formatting options")
});

export type FormatCellsParams = z.infer<typeof formatCellsSchema>;

/**
 * Format cells operation definition
 */
export const formatCellsOperation: OperationDefinition = {
    id: "formatCells",
    name: "Format Cells",
    description: "Apply formatting to a range of cells",
    category: "formatting",
    retryable: true,
    inputSchema: formatCellsSchema
};

/**
 * Execute format cells operation
 */
export async function executeFormatCells(
    client: GoogleSheetsClient,
    params: FormatCellsParams
): Promise<OperationResult> {
    try {
        const request = {
            repeatCell: {
                range: {
                    sheetId: params.sheetId,
                    startRowIndex: params.startRowIndex,
                    endRowIndex: params.endRowIndex,
                    startColumnIndex: params.startColumnIndex,
                    endColumnIndex: params.endColumnIndex
                },
                cell: {
                    userEnteredFormat: params.format
                },
                fields: "userEnteredFormat"
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
                message: error instanceof Error ? error.message : "Failed to format cells",
                retryable: true
            }
        };
    }
}
