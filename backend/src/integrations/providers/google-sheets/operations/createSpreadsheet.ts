import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleSheetsClient } from "../client/GoogleSheetsClient";

/**
 * Create spreadsheet input schema
 */
export const createSpreadsheetSchema = z.object({
    title: z.string().min(1).max(255).describe("Spreadsheet title"),
    sheets: z
        .array(
            z.object({
                title: z.string().min(1).describe("Sheet title")
            })
        )
        .optional()
        .describe("Initial sheets to create (optional)")
});

export type CreateSpreadsheetParams = z.infer<typeof createSpreadsheetSchema>;

/**
 * Create spreadsheet operation definition
 */
export const createSpreadsheetOperation: OperationDefinition = {
    id: "createSpreadsheet",
    name: "Create Spreadsheet",
    description: "Create a new Google Sheets spreadsheet",
    category: "spreadsheets",
    retryable: true,
    inputSchema: createSpreadsheetSchema
};

/**
 * Execute create spreadsheet operation
 */
export async function executeCreateSpreadsheet(
    client: GoogleSheetsClient,
    params: CreateSpreadsheetParams
): Promise<OperationResult> {
    try {
        const sheets = params.sheets?.map((sheet) => ({
            properties: { title: sheet.title }
        }));

        const response = await client.createSpreadsheet({
            title: params.title,
            sheets
        });

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create spreadsheet",
                retryable: true
            }
        };
    }
}
