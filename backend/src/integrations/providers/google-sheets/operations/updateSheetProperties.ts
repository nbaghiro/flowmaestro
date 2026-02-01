import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleSheetsClient } from "../client/GoogleSheetsClient";

/**
 * Update sheet properties input schema
 */
export const updateSheetPropertiesSchema = z.object({
    spreadsheetId: z.string().min(1).describe("Spreadsheet ID"),
    sheetId: z.number().int().describe("Sheet ID (gid)"),
    properties: z
        .object({
            title: z.string().min(1).max(100).optional().describe("Sheet title"),
            index: z.number().int().min(0).optional().describe("Sheet position index"),
            hidden: z.boolean().optional().describe("Whether sheet is hidden"),
            tabColor: z
                .object({
                    red: z.number().min(0).max(1).optional(),
                    green: z.number().min(0).max(1).optional(),
                    blue: z.number().min(0).max(1).optional(),
                    alpha: z.number().min(0).max(1).optional()
                })
                .optional()
                .describe("Tab color (RGB values 0-1)"),
            gridProperties: z
                .object({
                    rowCount: z.number().int().min(1).optional(),
                    columnCount: z.number().int().min(1).optional(),
                    frozenRowCount: z.number().int().min(0).optional(),
                    frozenColumnCount: z.number().int().min(0).optional()
                })
                .optional()
        })
        .describe("Properties to update")
});

export type UpdateSheetPropertiesParams = z.infer<typeof updateSheetPropertiesSchema>;

/**
 * Update sheet properties operation definition
 */
export const updateSheetPropertiesOperation: OperationDefinition = {
    id: "updateSheetProperties",
    name: "Update Sheet Properties",
    description: "Update properties of a sheet (title, color, visibility, etc.)",
    category: "sheets",
    retryable: true,
    inputSchema: updateSheetPropertiesSchema
};

/**
 * Execute update sheet properties operation
 */
export async function executeUpdateSheetProperties(
    client: GoogleSheetsClient,
    params: UpdateSheetPropertiesParams
): Promise<OperationResult> {
    try {
        // Build fields mask based on provided properties
        const fields: string[] = [];
        if (params.properties.title !== undefined) fields.push("title");
        if (params.properties.index !== undefined) fields.push("index");
        if (params.properties.hidden !== undefined) fields.push("hidden");
        if (params.properties.tabColor !== undefined) fields.push("tabColor");
        if (params.properties.gridProperties !== undefined) fields.push("gridProperties");

        const request = {
            updateSheetProperties: {
                properties: {
                    sheetId: params.sheetId,
                    ...params.properties
                },
                fields: fields.join(",")
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
                message:
                    error instanceof Error ? error.message : "Failed to update sheet properties",
                retryable: true
            }
        };
    }
}
