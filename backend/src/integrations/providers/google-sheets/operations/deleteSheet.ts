import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleSheetsClient } from "../client/GoogleSheetsClient";

/**
 * Delete sheet input schema
 */
export const deleteSheetSchema = z.object({
    spreadsheetId: z.string().min(1).describe("Spreadsheet ID"),
    sheetId: z.number().int().describe("Sheet ID (gid, not title)")
});

export type DeleteSheetParams = z.infer<typeof deleteSheetSchema>;

/**
 * Delete sheet operation definition
 */
export const deleteSheetOperation: OperationDefinition = {
    id: "deleteSheet",
    name: "Delete Sheet",
    description: "Delete a sheet from a spreadsheet",
    category: "sheets",
    retryable: true,
    inputSchema: deleteSheetSchema
};

/**
 * Execute delete sheet operation
 */
export async function executeDeleteSheet(
    client: GoogleSheetsClient,
    params: DeleteSheetParams
): Promise<OperationResult> {
    try {
        const request = {
            deleteSheet: {
                sheetId: params.sheetId
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
                message: error instanceof Error ? error.message : "Failed to delete sheet",
                retryable: true
            }
        };
    }
}
