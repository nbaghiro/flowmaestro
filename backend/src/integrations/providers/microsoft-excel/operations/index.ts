import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MicrosoftExcelClient } from "../client/MicrosoftExcelClient";

// ============================================================================
// Get Worksheets Operation
// ============================================================================

export const getWorksheetsSchema = z.object({
    itemId: z.string().describe("OneDrive item ID of the Excel workbook")
});

export type GetWorksheetsParams = z.infer<typeof getWorksheetsSchema>;

export const getWorksheetsOperation: OperationDefinition = {
    id: "getWorksheets",
    name: "Get Worksheets",
    description: "List all worksheets in an Excel workbook",
    category: "worksheets",
    inputSchema: getWorksheetsSchema,
    retryable: true
};

export async function executeGetWorksheets(
    client: MicrosoftExcelClient,
    params: GetWorksheetsParams
): Promise<OperationResult> {
    try {
        const result = await client.getWorksheets(params.itemId);
        return {
            success: true,
            data: { worksheets: result.value }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get worksheets",
                retryable: true
            }
        };
    }
}

// ============================================================================
// Read Range Operation
// ============================================================================

export const readRangeSchema = z.object({
    itemId: z.string().describe("OneDrive item ID of the Excel workbook"),
    worksheetName: z.string().describe("Name or ID of the worksheet"),
    address: z.string().describe("Cell range address (e.g., 'A1:D10', 'Sheet1!A1:B5')")
});

export type ReadRangeParams = z.infer<typeof readRangeSchema>;

export const readRangeOperation: OperationDefinition = {
    id: "readRange",
    name: "Read Range",
    description: "Read data from a range of cells in an Excel worksheet",
    category: "data",
    inputSchema: readRangeSchema,
    retryable: true
};

export async function executeReadRange(
    client: MicrosoftExcelClient,
    params: ReadRangeParams
): Promise<OperationResult> {
    try {
        const result = await client.readRange(params.itemId, params.worksheetName, params.address);
        return {
            success: true,
            data: {
                address: result.address,
                values: result.values,
                text: result.text,
                formulas: result.formulas,
                rowCount: result.rowCount,
                columnCount: result.columnCount
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to read range",
                retryable: true
            }
        };
    }
}

// ============================================================================
// Write Range Operation
// ============================================================================

export const writeRangeSchema = z.object({
    itemId: z.string().describe("OneDrive item ID of the Excel workbook"),
    worksheetName: z.string().describe("Name or ID of the worksheet"),
    address: z.string().describe("Cell range address (e.g., 'A1:B2')"),
    values: z.array(z.array(z.unknown())).describe("2D array of values to write")
});

export type WriteRangeParams = z.infer<typeof writeRangeSchema>;

export const writeRangeOperation: OperationDefinition = {
    id: "writeRange",
    name: "Write Range",
    description: "Write data to a range of cells in an Excel worksheet",
    category: "data",
    inputSchema: writeRangeSchema,
    retryable: true
};

export async function executeWriteRange(
    client: MicrosoftExcelClient,
    params: WriteRangeParams
): Promise<OperationResult> {
    try {
        const result = await client.writeRange(
            params.itemId,
            params.worksheetName,
            params.address,
            params.values
        );
        return {
            success: true,
            data: {
                address: result.address,
                values: result.values,
                rowCount: result.rowCount,
                columnCount: result.columnCount
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to write range",
                retryable: true
            }
        };
    }
}

// ============================================================================
// Get Tables Operation
// ============================================================================

export const getTablesSchema = z.object({
    itemId: z.string().describe("OneDrive item ID of the Excel workbook")
});

export type GetTablesParams = z.infer<typeof getTablesSchema>;

export const getTablesOperation: OperationDefinition = {
    id: "getTables",
    name: "Get Tables",
    description: "List all tables in an Excel workbook",
    category: "tables",
    inputSchema: getTablesSchema,
    retryable: true
};

export async function executeGetTables(
    client: MicrosoftExcelClient,
    params: GetTablesParams
): Promise<OperationResult> {
    try {
        const result = await client.getTables(params.itemId);
        return {
            success: true,
            data: { tables: result.value }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get tables",
                retryable: true
            }
        };
    }
}

// ============================================================================
// Get Table Rows Operation
// ============================================================================

export const getTableRowsSchema = z.object({
    itemId: z.string().describe("OneDrive item ID of the Excel workbook"),
    tableName: z.string().describe("Name or ID of the table")
});

export type GetTableRowsParams = z.infer<typeof getTableRowsSchema>;

export const getTableRowsOperation: OperationDefinition = {
    id: "getTableRows",
    name: "Get Table Rows",
    description: "Get all rows from an Excel table",
    category: "tables",
    inputSchema: getTableRowsSchema,
    retryable: true
};

export async function executeGetTableRows(
    client: MicrosoftExcelClient,
    params: GetTableRowsParams
): Promise<OperationResult> {
    try {
        const result = await client.getTableRows(params.itemId, params.tableName);
        return {
            success: true,
            data: {
                rows: result.value.map((row) => ({
                    index: row.index,
                    values: row.values[0] // Flatten the nested array
                }))
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get table rows",
                retryable: true
            }
        };
    }
}

// ============================================================================
// Add Table Row Operation
// ============================================================================

export const addTableRowSchema = z.object({
    itemId: z.string().describe("OneDrive item ID of the Excel workbook"),
    tableName: z.string().describe("Name or ID of the table"),
    values: z.array(z.unknown()).describe("Array of values for the new row")
});

export type AddTableRowParams = z.infer<typeof addTableRowSchema>;

export const addTableRowOperation: OperationDefinition = {
    id: "addTableRow",
    name: "Add Table Row",
    description: "Add a new row to an Excel table",
    category: "tables",
    inputSchema: addTableRowSchema,
    retryable: true
};

export async function executeAddTableRow(
    client: MicrosoftExcelClient,
    params: AddTableRowParams
): Promise<OperationResult> {
    try {
        const result = await client.addTableRow(params.itemId, params.tableName, params.values);
        return {
            success: true,
            data: {
                index: result.index,
                values: result.values[0]
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to add table row",
                retryable: true
            }
        };
    }
}

// ============================================================================
// Create Worksheet Operation
// ============================================================================

export const createWorksheetSchema = z.object({
    itemId: z.string().describe("OneDrive item ID of the Excel workbook"),
    name: z.string().optional().describe("Name for the new worksheet")
});

export type CreateWorksheetParams = z.infer<typeof createWorksheetSchema>;

export const createWorksheetOperation: OperationDefinition = {
    id: "createWorksheet",
    name: "Create Worksheet",
    description: "Create a new worksheet in an Excel workbook",
    category: "worksheets",
    inputSchema: createWorksheetSchema,
    retryable: true
};

export async function executeCreateWorksheet(
    client: MicrosoftExcelClient,
    params: CreateWorksheetParams
): Promise<OperationResult> {
    try {
        const result = await client.createWorksheet(params.itemId, params.name);
        return {
            success: true,
            data: result
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create worksheet",
                retryable: true
            }
        };
    }
}

// ============================================================================
// Get Used Range Operation
// ============================================================================

export const getUsedRangeSchema = z.object({
    itemId: z.string().describe("OneDrive item ID of the Excel workbook"),
    worksheetName: z.string().describe("Name or ID of the worksheet")
});

export type GetUsedRangeParams = z.infer<typeof getUsedRangeSchema>;

export const getUsedRangeOperation: OperationDefinition = {
    id: "getUsedRange",
    name: "Get Used Range",
    description: "Get the used range (area with data) in a worksheet",
    category: "data",
    inputSchema: getUsedRangeSchema,
    retryable: true
};

export async function executeGetUsedRange(
    client: MicrosoftExcelClient,
    params: GetUsedRangeParams
): Promise<OperationResult> {
    try {
        const result = await client.getUsedRange(params.itemId, params.worksheetName);
        return {
            success: true,
            data: {
                address: result.address,
                values: result.values,
                rowCount: result.rowCount,
                columnCount: result.columnCount
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get used range",
                retryable: true
            }
        };
    }
}

// ============================================================================
// Clear Range Operation
// ============================================================================

export const clearRangeSchema = z.object({
    itemId: z.string().describe("OneDrive item ID of the Excel workbook"),
    worksheetName: z.string().describe("Name or ID of the worksheet"),
    address: z.string().describe("Cell range address to clear"),
    applyTo: z.enum(["all", "formats", "contents"]).optional().describe("What to clear")
});

export type ClearRangeParams = z.infer<typeof clearRangeSchema>;

export const clearRangeOperation: OperationDefinition = {
    id: "clearRange",
    name: "Clear Range",
    description: "Clear contents, formats, or both from a range of cells",
    category: "data",
    inputSchema: clearRangeSchema,
    retryable: false
};

export async function executeClearRange(
    client: MicrosoftExcelClient,
    params: ClearRangeParams
): Promise<OperationResult> {
    try {
        await client.clearRange(
            params.itemId,
            params.worksheetName,
            params.address,
            params.applyTo
        );
        return {
            success: true,
            data: { cleared: true }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to clear range",
                retryable: true
            }
        };
    }
}
