import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleSheetsClient } from "../client/GoogleSheetsClient";

/**
 * Copy sheet input schema
 */
export const copySheetSchema = z.object({
    spreadsheetId: z.string().min(1).describe("Source spreadsheet ID"),
    sheetId: z.number().int().describe("Sheet ID to copy (gid)"),
    destinationSpreadsheetId: z
        .string()
        .min(1)
        .describe("Destination spreadsheet ID (can be same as source)")
});

export type CopySheetParams = z.infer<typeof copySheetSchema>;

/**
 * Copy sheet operation definition
 */
export const copySheetOperation: OperationDefinition = {
    id: "copySheet",
    name: "Copy Sheet",
    description: "Copy a sheet to another spreadsheet or within the same spreadsheet",
    category: "sheets",
    retryable: true,
    inputSchema: copySheetSchema
};

/**
 * Execute copy sheet operation
 */
export async function executeCopySheet(
    client: GoogleSheetsClient,
    params: CopySheetParams
): Promise<OperationResult> {
    try {
        // Note: This uses a special endpoint for copying sheets between spreadsheets
        const response = await client.post(
            `/v4/spreadsheets/${params.spreadsheetId}/sheets/${params.sheetId}:copyTo`,
            {
                destinationSpreadsheetId: params.destinationSpreadsheetId
            }
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
                message: error instanceof Error ? error.message : "Failed to copy sheet",
                retryable: true
            }
        };
    }
}
