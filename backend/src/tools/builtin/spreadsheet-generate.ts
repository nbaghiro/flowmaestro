/**
 * Spreadsheet Generation Tool
 *
 * Generates Excel (.xlsx) or CSV files from structured data using exceljs
 */

import { writeFile, mkdir, stat } from "fs/promises";
import { join } from "path";
import { z } from "zod";
import { createServiceLogger } from "../../core/logging";
import type { BuiltInTool, ToolExecutionContext, ToolExecutionResult } from "../types";

const logger = createServiceLogger("SpreadsheetGenerateTool");

/**
 * Column configuration schema
 */
const columnConfigSchema = z.object({
    key: z.string().describe("Key in the data object"),
    header: z.string().describe("Column header text"),
    width: z.number().optional().describe("Column width"),
    format: z
        .enum(["text", "number", "currency", "date", "percentage"])
        .optional()
        .describe("Column format")
});

/**
 * Sheet configuration schema
 */
const sheetConfigSchema = z.object({
    name: z.string().min(1).max(31).describe("Sheet name (max 31 chars for Excel)"),
    data: z.array(z.record(z.unknown())).describe("Array of row objects"),
    columns: z.array(columnConfigSchema).optional().describe("Column configuration")
});

/**
 * Styling options schema
 */
const stylingSchema = z.object({
    headerStyle: z
        .object({
            bold: z.boolean().optional(),
            backgroundColor: z.string().optional(),
            fontColor: z.string().optional()
        })
        .optional(),
    alternateRows: z.boolean().optional().describe("Alternate row colors"),
    freezeHeader: z.boolean().optional().describe("Freeze header row")
});

/**
 * Input schema for spreadsheet generation
 */
export const spreadsheetGenerateInputSchema = z.object({
    data: z
        .array(z.record(z.unknown()))
        .optional()
        .describe("Array of row objects (for single sheet)"),
    format: z.enum(["xlsx", "csv"]).default("xlsx").describe("Output format"),
    filename: z
        .string()
        .min(1)
        .max(255)
        .default("spreadsheet")
        .describe("Output filename without extension"),
    sheets: z.array(sheetConfigSchema).optional().describe("Multiple sheets (xlsx only)"),
    styling: stylingSchema.optional().describe("Styling options (xlsx only)")
});

export type SpreadsheetGenerateInput = z.infer<typeof spreadsheetGenerateInputSchema>;

/**
 * Spreadsheet generation result
 */
export interface SpreadsheetGenerateOutput {
    path: string;
    filename: string;
    format: string;
    size: number;
    sheetCount: number;
    rowCount: number;
}

/**
 * Convert hex color to ARGB format (exceljs expects ARGB)
 */
function hexToArgb(hex: string): string {
    const cleanHex = hex.replace("#", "");
    // Add FF for full opacity if not already present
    return cleanHex.length === 6 ? `FF${cleanHex}` : cleanHex;
}

/**
 * Escape CSV field value
 */
function escapeCsvField(value: unknown): string {
    const str = String(value ?? "");
    // If contains comma, newline, or quote, wrap in quotes and escape internal quotes
    if (str.includes(",") || str.includes("\n") || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

/**
 * Generate CSV content
 */
function generateCsv(data: Record<string, unknown>[]): string {
    if (data.length === 0) return "";

    const headers = Object.keys(data[0]);
    const lines: string[] = [];

    // Header row
    lines.push(headers.map((h) => escapeCsvField(h)).join(","));

    // Data rows
    for (const row of data) {
        const values = headers.map((h) => escapeCsvField(row[h]));
        lines.push(values.join(","));
    }

    return lines.join("\n");
}

/**
 * Generate XLSX using exceljs
 */
async function generateXlsx(
    input: SpreadsheetGenerateInput,
    outputPath: string
): Promise<{ rowCount: number; sheetCount: number }> {
    // Dynamic import for optional dependency
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ExcelJS = await import("exceljs");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const workbook = new (ExcelJS as any).Workbook();

    const sheets = input.sheets || [{ name: "Sheet1", data: input.data || [] }];
    const styling = input.styling || {};

    let totalRows = 0;

    for (const sheetConfig of sheets) {
        const worksheet = workbook.addWorksheet(sheetConfig.name.slice(0, 31));
        const data = sheetConfig.data;

        if (data.length === 0) continue;

        // Determine headers and keys
        let headers: string[];
        let keys: string[];

        if (sheetConfig.columns && sheetConfig.columns.length > 0) {
            headers = sheetConfig.columns.map((col) => col.header);
            keys = sheetConfig.columns.map((col) => col.key);
        } else {
            keys = Object.keys(data[0]);
            headers = keys;
        }

        // Set up columns with headers
        worksheet.columns = keys.map((key, index) => {
            const colConfig = sheetConfig.columns?.[index];
            return {
                header: headers[index],
                key,
                width: colConfig?.width ?? Math.min(Math.max(headers[index].length + 2, 10), 50)
            };
        });

        // Style header row
        const headerRow = worksheet.getRow(1);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        headerRow.eachCell((cell: any) => {
            if (styling.headerStyle?.bold) {
                cell.font = { bold: true };
            }
            if (styling.headerStyle?.backgroundColor) {
                cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: hexToArgb(styling.headerStyle.backgroundColor) }
                };
            }
            if (styling.headerStyle?.fontColor) {
                cell.font = {
                    ...cell.font,
                    color: { argb: hexToArgb(styling.headerStyle.fontColor) }
                };
            }
        });

        // Add data rows
        for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
            const rowData = data[rowIndex];
            const values: unknown[] = keys.map((key) => rowData[key] ?? "");
            const row = worksheet.addRow(values);

            // Alternate row coloring
            if (styling.alternateRows && rowIndex % 2 === 1) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                row.eachCell((cell: any) => {
                    cell.fill = {
                        type: "pattern",
                        pattern: "solid",
                        fgColor: { argb: "FFF5F5F5" } // Light gray
                    };
                });
            }

            // Apply column formats
            if (sheetConfig.columns) {
                sheetConfig.columns.forEach((colConfig, colIndex) => {
                    const cell = row.getCell(colIndex + 1);
                    switch (colConfig.format) {
                        case "currency":
                            cell.numFmt = '"$"#,##0.00';
                            break;
                        case "percentage":
                            cell.numFmt = "0.00%";
                            break;
                        case "date":
                            cell.numFmt = "yyyy-mm-dd";
                            break;
                        case "number":
                            cell.numFmt = "#,##0.00";
                            break;
                    }
                });
            }
        }

        // Freeze header row
        if (styling.freezeHeader) {
            worksheet.views = [{ state: "frozen", ySplit: 1, xSplit: 0 }];
        }

        // Auto-fit columns based on content (if no width specified)
        if (!sheetConfig.columns) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            worksheet.columns.forEach((column: any) => {
                let maxLength = 0;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                column.eachCell?.({ includeEmpty: true }, (cell: any) => {
                    const cellLength = cell.value ? String(cell.value).length : 0;
                    maxLength = Math.max(maxLength, cellLength);
                });
                column.width = Math.min(maxLength + 2, 50);
            });
        }

        totalRows += data.length;
    }

    // Write to file
    await workbook.xlsx.writeFile(outputPath);

    return { rowCount: totalRows, sheetCount: sheets.length };
}

/**
 * Execute spreadsheet generation
 */
async function executeSpreadsheetGenerate(
    params: Record<string, unknown>,
    context: ToolExecutionContext
): Promise<ToolExecutionResult> {
    const startTime = Date.now();

    try {
        const input = spreadsheetGenerateInputSchema.parse(params);

        logger.info(
            {
                format: input.format,
                filename: input.filename,
                sheetCount: input.sheets?.length || 1,
                traceId: context.traceId
            },
            "Generating spreadsheet"
        );

        // Validate input
        if (!input.data && !input.sheets) {
            return {
                success: false,
                error: {
                    message: "Either 'data' or 'sheets' must be provided",
                    code: "VALIDATION_ERROR",
                    retryable: false
                },
                metadata: { durationMs: Date.now() - startTime }
            };
        }

        // Determine output directory
        const outputDir = context.traceId ? `/tmp/fm-workspace/${context.traceId}` : "/tmp";
        const filename = `${input.filename}.${input.format}`;
        const outputPath = join(outputDir, filename);

        // Ensure output directory exists
        try {
            await mkdir(outputDir, { recursive: true });
        } catch {
            // Directory may already exist
        }

        let rowCount: number;
        let sheetCount: number;

        if (input.format === "csv") {
            // Generate CSV
            const data = input.data || (input.sheets?.[0]?.data ?? []);
            const csvContent = generateCsv(data);
            await writeFile(outputPath, csvContent, "utf-8");
            rowCount = data.length;
            sheetCount = 1;
        } else {
            // Generate XLSX
            const result = await generateXlsx(input, outputPath);
            rowCount = result.rowCount;
            sheetCount = result.sheetCount;
        }

        // Get file stats
        const stats = await stat(outputPath);

        const output: SpreadsheetGenerateOutput = {
            path: outputPath,
            filename,
            format: input.format,
            size: stats.size,
            sheetCount,
            rowCount
        };

        logger.info(
            {
                path: output.path,
                size: output.size,
                rowCount: output.rowCount,
                sheetCount: output.sheetCount,
                traceId: context.traceId
            },
            "Spreadsheet generated successfully"
        );

        return {
            success: true,
            data: output,
            metadata: {
                durationMs: Date.now() - startTime,
                creditCost: 1
            }
        };
    } catch (error) {
        logger.error({ err: error, traceId: context.traceId }, "Spreadsheet generation failed");

        // Check for missing exceljs dependency
        if (error instanceof Error && error.message.includes("exceljs")) {
            return {
                success: false,
                error: {
                    message:
                        "Spreadsheet generation requires the 'exceljs' package. Install with: npm install exceljs",
                    code: "MISSING_DEPENDENCY",
                    retryable: false
                },
                metadata: { durationMs: Date.now() - startTime }
            };
        }

        return {
            success: false,
            error: {
                message: error instanceof Error ? error.message : "Spreadsheet generation failed",
                retryable: false
            },
            metadata: { durationMs: Date.now() - startTime }
        };
    }
}

/**
 * Spreadsheet Generate Tool Definition
 */
export const spreadsheetGenerateTool: BuiltInTool = {
    name: "spreadsheet_generate",
    displayName: "Generate Spreadsheet",
    description:
        "Generate Excel (.xlsx) or CSV files from structured data. Supports multiple sheets, column formatting, and styling options.",
    category: "data",
    riskLevel: "medium",
    inputSchema: {
        type: "object",
        properties: {
            data: {
                type: "array",
                items: { type: "object" },
                description: "Array of row objects (for single sheet)"
            },
            format: {
                type: "string",
                enum: ["xlsx", "csv"],
                description: "Output format",
                default: "xlsx"
            },
            filename: {
                type: "string",
                description: "Output filename without extension",
                default: "spreadsheet"
            },
            sheets: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        name: { type: "string", description: "Sheet name" },
                        data: { type: "array", items: { type: "object" } },
                        columns: { type: "array", items: { type: "object" } }
                    },
                    required: ["name", "data"]
                },
                description: "Multiple sheets configuration (xlsx only)"
            },
            styling: {
                type: "object",
                properties: {
                    headerStyle: { type: "object" },
                    alternateRows: { type: "boolean" },
                    freezeHeader: { type: "boolean" }
                },
                description: "Styling options (xlsx only)"
            }
        }
    },
    zodSchema: spreadsheetGenerateInputSchema,
    enabledByDefault: true,
    creditCost: 1,
    tags: ["spreadsheet", "excel", "csv", "data", "export"],
    execute: executeSpreadsheetGenerate
};
