/**
 * GoogleSheets Operation Executor Tests
 *
 * Tests individual operation executors in isolation with mocked clients.
 */

// Spreadsheet operations
import { executeAddSheet, addSheetSchema } from "../operations/addSheet";
import { executeAppendValues, appendValuesSchema } from "../operations/appendValues";
import { executeAutoResize, autoResizeSchema } from "../operations/autoResize";
import { executeBatchClearValues, batchClearValuesSchema } from "../operations/batchClearValues";
import { executeBatchGetValues, batchGetValuesSchema } from "../operations/batchGetValues";
import {
    executeBatchUpdateSpreadsheet,
    batchUpdateSpreadsheetSchema
} from "../operations/batchUpdateSpreadsheet";
import { executeBatchUpdateValues, batchUpdateValuesSchema } from "../operations/batchUpdateValues";
import { executeClearValues, clearValuesSchema } from "../operations/clearValues";
import { executeCopySheet, copySheetSchema } from "../operations/copySheet";
import { executeCreateSpreadsheet, createSpreadsheetSchema } from "../operations/createSpreadsheet";
import { executeDeleteSheet, deleteSheetSchema } from "../operations/deleteSheet";
import { executeGetSpreadsheet, getSpreadsheetSchema } from "../operations/getSpreadsheet";

// Values read operations
import { executeGetValues, getValuesSchema } from "../operations/getValues";

// Values write operations
import { executeMergeCells, mergeCellsSchema } from "../operations/mergeCells";
import { executeUnmergeCells, unmergeCellsSchema } from "../operations/unmergeCells";
import {
    executeUpdateSheetProperties,
    updateSheetPropertiesSchema
} from "../operations/updateSheetProperties";
import { executeUpdateValues, updateValuesSchema } from "../operations/updateValues";

// Sheet management operations

// Formatting operations
import { executeFormatCells, formatCellsSchema } from "../operations/formatCells";

import type { GoogleSheetsClient } from "../client/GoogleSheetsClient";

// Mock GoogleSheetsClient factory
function createMockGoogleSheetsClient(): jest.Mocked<GoogleSheetsClient> {
    return {
        createSpreadsheet: jest.fn(),
        getSpreadsheet: jest.fn(),
        batchUpdateSpreadsheet: jest.fn(),
        getValues: jest.fn(),
        batchGetValues: jest.fn(),
        appendValues: jest.fn(),
        updateValues: jest.fn(),
        batchUpdateValues: jest.fn(),
        clearValues: jest.fn(),
        batchClearValues: jest.fn(),
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
        request: jest.fn()
    } as unknown as jest.Mocked<GoogleSheetsClient>;
}

describe("GoogleSheets Operation Executors", () => {
    let mockClient: jest.Mocked<GoogleSheetsClient>;

    beforeEach(() => {
        mockClient = createMockGoogleSheetsClient();
    });

    // ==================== Spreadsheet Operations ====================

    describe("executeCreateSpreadsheet", () => {
        it("calls client with correct params for minimal input", async () => {
            mockClient.createSpreadsheet.mockResolvedValueOnce({
                spreadsheetId: "abc123",
                properties: { title: "New Spreadsheet" },
                sheets: [{ properties: { sheetId: 0, title: "Sheet1" } }]
            });

            await executeCreateSpreadsheet(mockClient, {
                title: "New Spreadsheet"
            });

            expect(mockClient.createSpreadsheet).toHaveBeenCalledWith({
                title: "New Spreadsheet",
                sheets: undefined
            });
        });

        it("calls client with sheets when provided", async () => {
            mockClient.createSpreadsheet.mockResolvedValueOnce({
                spreadsheetId: "abc123",
                properties: { title: "Test" },
                sheets: [
                    { properties: { sheetId: 0, title: "Data" } },
                    { properties: { sheetId: 1, title: "Summary" } }
                ]
            });

            await executeCreateSpreadsheet(mockClient, {
                title: "Test",
                sheets: [{ title: "Data" }, { title: "Summary" }]
            });

            expect(mockClient.createSpreadsheet).toHaveBeenCalledWith({
                title: "Test",
                sheets: [{ properties: { title: "Data" } }, { properties: { title: "Summary" } }]
            });
        });

        it("returns normalized output on success", async () => {
            const mockResponse = {
                spreadsheetId: "abc123",
                properties: { title: "New Spreadsheet" },
                sheets: [{ properties: { sheetId: 0, title: "Sheet1" } }]
            };
            mockClient.createSpreadsheet.mockResolvedValueOnce(mockResponse);

            const result = await executeCreateSpreadsheet(mockClient, {
                title: "New Spreadsheet"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockResponse);
        });

        it("returns error on client failure", async () => {
            mockClient.createSpreadsheet.mockRejectedValueOnce(new Error("Permission denied"));

            const result = await executeCreateSpreadsheet(mockClient, {
                title: "Test"
            });

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Permission denied");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.createSpreadsheet.mockRejectedValueOnce("string error");

            const result = await executeCreateSpreadsheet(mockClient, {
                title: "Test"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to create spreadsheet");
        });
    });

    describe("executeGetSpreadsheet", () => {
        it("calls client with correct params", async () => {
            mockClient.getSpreadsheet.mockResolvedValueOnce({
                spreadsheetId: "abc123",
                properties: { title: "Test" }
            });

            // Parse through schema to apply defaults
            const params = getSpreadsheetSchema.parse({
                spreadsheetId: "abc123"
            });

            await executeGetSpreadsheet(mockClient, params);

            expect(mockClient.getSpreadsheet).toHaveBeenCalledWith("abc123", false);
        });

        it("calls client with includeGridData when specified", async () => {
            mockClient.getSpreadsheet.mockResolvedValueOnce({
                spreadsheetId: "abc123",
                properties: { title: "Test" },
                sheets: [{ data: [] }]
            });

            const params = getSpreadsheetSchema.parse({
                spreadsheetId: "abc123",
                includeGridData: true
            });

            await executeGetSpreadsheet(mockClient, params);

            expect(mockClient.getSpreadsheet).toHaveBeenCalledWith("abc123", true);
        });

        it("returns normalized output on success", async () => {
            const mockResponse = {
                spreadsheetId: "abc123",
                properties: { title: "Test Spreadsheet" },
                sheets: [{ properties: { sheetId: 0, title: "Sheet1" } }]
            };
            mockClient.getSpreadsheet.mockResolvedValueOnce(mockResponse);

            const params = getSpreadsheetSchema.parse({
                spreadsheetId: "abc123"
            });

            const result = await executeGetSpreadsheet(mockClient, params);

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockResponse);
        });

        it("returns error on client failure", async () => {
            mockClient.getSpreadsheet.mockRejectedValueOnce(new Error("Not found"));

            const params = getSpreadsheetSchema.parse({
                spreadsheetId: "nonexistent"
            });

            const result = await executeGetSpreadsheet(mockClient, params);

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Not found");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeBatchUpdateSpreadsheet", () => {
        it("calls client with correct params", async () => {
            mockClient.batchUpdateSpreadsheet.mockResolvedValueOnce({
                spreadsheetId: "abc123",
                replies: [{}]
            });

            const requests = [{ addSheet: { properties: { title: "NewSheet" } } }];

            await executeBatchUpdateSpreadsheet(mockClient, {
                spreadsheetId: "abc123",
                requests
            });

            expect(mockClient.batchUpdateSpreadsheet).toHaveBeenCalledWith("abc123", requests);
        });

        it("returns normalized output on success", async () => {
            const mockResponse = {
                spreadsheetId: "abc123",
                replies: [{ addSheet: { properties: { sheetId: 1, title: "NewSheet" } } }]
            };
            mockClient.batchUpdateSpreadsheet.mockResolvedValueOnce(mockResponse);

            const result = await executeBatchUpdateSpreadsheet(mockClient, {
                spreadsheetId: "abc123",
                requests: [{ addSheet: { properties: { title: "NewSheet" } } }]
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockResponse);
        });

        it("returns error on client failure", async () => {
            mockClient.batchUpdateSpreadsheet.mockRejectedValueOnce(new Error("Invalid request"));

            const result = await executeBatchUpdateSpreadsheet(mockClient, {
                spreadsheetId: "abc123",
                requests: [{ invalidRequest: {} }]
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Invalid request");
        });
    });

    // ==================== Values Read Operations ====================

    describe("executeGetValues", () => {
        it("calls client with correct params", async () => {
            mockClient.getValues.mockResolvedValueOnce({
                range: "Sheet1!A1:B10",
                values: [
                    ["Name", "Age"],
                    ["John", "30"]
                ]
            });

            // Parse through schema to apply defaults
            const params = getValuesSchema.parse({
                spreadsheetId: "abc123",
                range: "Sheet1!A1:B10"
            });

            await executeGetValues(mockClient, params);

            expect(mockClient.getValues).toHaveBeenCalledWith(
                "abc123",
                "Sheet1!A1:B10",
                "FORMATTED_VALUE"
            );
        });

        it("calls client with custom valueRenderOption", async () => {
            mockClient.getValues.mockResolvedValueOnce({
                range: "Sheet1!A1:B10",
                values: [["=SUM(A1:A10)"]]
            });

            await executeGetValues(mockClient, {
                spreadsheetId: "abc123",
                range: "Sheet1!A1:B10",
                valueRenderOption: "FORMULA"
            });

            expect(mockClient.getValues).toHaveBeenCalledWith("abc123", "Sheet1!A1:B10", "FORMULA");
        });

        it("returns normalized output on success", async () => {
            const mockResponse = {
                range: "Sheet1!A1:B2",
                values: [
                    ["Name", "Age"],
                    ["John", "30"]
                ]
            };
            mockClient.getValues.mockResolvedValueOnce(mockResponse);

            const params = getValuesSchema.parse({
                spreadsheetId: "abc123",
                range: "Sheet1!A1:B2"
            });

            const result = await executeGetValues(mockClient, params);

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockResponse);
        });

        it("returns error on client failure", async () => {
            mockClient.getValues.mockRejectedValueOnce(new Error("Range not found"));

            const params = getValuesSchema.parse({
                spreadsheetId: "abc123",
                range: "NonexistentSheet!A1"
            });

            const result = await executeGetValues(mockClient, params);

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Range not found");
        });
    });

    describe("executeBatchGetValues", () => {
        it("calls client with correct params", async () => {
            mockClient.batchGetValues.mockResolvedValueOnce({
                spreadsheetId: "abc123",
                valueRanges: []
            });

            // Parse through schema to apply defaults
            const params = batchGetValuesSchema.parse({
                spreadsheetId: "abc123",
                ranges: ["Sheet1!A1:B10", "Sheet2!C1:D5"]
            });

            await executeBatchGetValues(mockClient, params);

            expect(mockClient.batchGetValues).toHaveBeenCalledWith(
                "abc123",
                ["Sheet1!A1:B10", "Sheet2!C1:D5"],
                "FORMATTED_VALUE"
            );
        });

        it("calls client with custom valueRenderOption", async () => {
            mockClient.batchGetValues.mockResolvedValueOnce({
                spreadsheetId: "abc123",
                valueRanges: []
            });

            await executeBatchGetValues(mockClient, {
                spreadsheetId: "abc123",
                ranges: ["Sheet1!A1"],
                valueRenderOption: "UNFORMATTED_VALUE"
            });

            expect(mockClient.batchGetValues).toHaveBeenCalledWith(
                "abc123",
                ["Sheet1!A1"],
                "UNFORMATTED_VALUE"
            );
        });

        it("returns normalized output on success", async () => {
            const mockResponse = {
                spreadsheetId: "abc123",
                valueRanges: [
                    { range: "Sheet1!A1:B2", values: [["a", "b"]] },
                    { range: "Sheet2!C1:D2", values: [["c", "d"]] }
                ]
            };
            mockClient.batchGetValues.mockResolvedValueOnce(mockResponse);

            const params = batchGetValuesSchema.parse({
                spreadsheetId: "abc123",
                ranges: ["Sheet1!A1:B2", "Sheet2!C1:D2"]
            });

            const result = await executeBatchGetValues(mockClient, params);

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockResponse);
        });

        it("returns error on client failure", async () => {
            mockClient.batchGetValues.mockRejectedValueOnce(new Error("Invalid range"));

            const params = batchGetValuesSchema.parse({
                spreadsheetId: "abc123",
                ranges: ["Invalid!Range"]
            });

            const result = await executeBatchGetValues(mockClient, params);

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Invalid range");
        });
    });

    // ==================== Values Write Operations ====================

    describe("executeAppendValues", () => {
        it("calls client with correct params", async () => {
            mockClient.appendValues.mockResolvedValueOnce({
                spreadsheetId: "abc123",
                tableRange: "Sheet1!A1:B10",
                updates: { updatedRows: 1 }
            });

            // Parse through schema to apply defaults
            const params = appendValuesSchema.parse({
                spreadsheetId: "abc123",
                range: "Sheet1!A1",
                values: [["John", 30]]
            });

            await executeAppendValues(mockClient, params);

            expect(mockClient.appendValues).toHaveBeenCalledWith(
                "abc123",
                "Sheet1!A1",
                [["John", 30]],
                "USER_ENTERED"
            );
        });

        it("calls client with RAW valueInputOption", async () => {
            mockClient.appendValues.mockResolvedValueOnce({
                spreadsheetId: "abc123",
                updates: { updatedRows: 1 }
            });

            await executeAppendValues(mockClient, {
                spreadsheetId: "abc123",
                range: "Sheet1!A1",
                values: [["=SUM(A1:A10)"]],
                valueInputOption: "RAW"
            });

            expect(mockClient.appendValues).toHaveBeenCalledWith(
                "abc123",
                "Sheet1!A1",
                [["=SUM(A1:A10)"]],
                "RAW"
            );
        });

        it("returns normalized output on success", async () => {
            const mockResponse = {
                spreadsheetId: "abc123",
                tableRange: "Sheet1!A1:B5",
                updates: { updatedRows: 2, updatedColumns: 2, updatedCells: 4 }
            };
            mockClient.appendValues.mockResolvedValueOnce(mockResponse);

            const params = appendValuesSchema.parse({
                spreadsheetId: "abc123",
                range: "Sheet1!A1",
                values: [
                    ["Name", "Age"],
                    ["John", 30]
                ]
            });

            const result = await executeAppendValues(mockClient, params);

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockResponse);
        });

        it("returns error on client failure", async () => {
            mockClient.appendValues.mockRejectedValueOnce(new Error("Permission denied"));

            const params = appendValuesSchema.parse({
                spreadsheetId: "abc123",
                range: "Sheet1!A1",
                values: [["test"]]
            });

            const result = await executeAppendValues(mockClient, params);

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Permission denied");
        });
    });

    describe("executeUpdateValues", () => {
        it("calls client with correct params", async () => {
            mockClient.updateValues.mockResolvedValueOnce({
                spreadsheetId: "abc123",
                updatedRange: "Sheet1!A1:B2",
                updatedRows: 2
            });

            // Parse through schema to apply defaults
            const params = updateValuesSchema.parse({
                spreadsheetId: "abc123",
                range: "Sheet1!A1:B2",
                values: [
                    ["Name", "Age"],
                    ["John", 30]
                ]
            });

            await executeUpdateValues(mockClient, params);

            expect(mockClient.updateValues).toHaveBeenCalledWith(
                "abc123",
                "Sheet1!A1:B2",
                [
                    ["Name", "Age"],
                    ["John", 30]
                ],
                "USER_ENTERED"
            );
        });

        it("calls client with RAW valueInputOption", async () => {
            mockClient.updateValues.mockResolvedValueOnce({
                spreadsheetId: "abc123",
                updatedRange: "Sheet1!A1",
                updatedRows: 1
            });

            await executeUpdateValues(mockClient, {
                spreadsheetId: "abc123",
                range: "Sheet1!A1",
                values: [["literal text"]],
                valueInputOption: "RAW"
            });

            expect(mockClient.updateValues).toHaveBeenCalledWith(
                "abc123",
                "Sheet1!A1",
                [["literal text"]],
                "RAW"
            );
        });

        it("returns normalized output on success", async () => {
            const mockResponse = {
                spreadsheetId: "abc123",
                updatedRange: "Sheet1!A1:B2",
                updatedRows: 2,
                updatedColumns: 2,
                updatedCells: 4
            };
            mockClient.updateValues.mockResolvedValueOnce(mockResponse);

            const params = updateValuesSchema.parse({
                spreadsheetId: "abc123",
                range: "Sheet1!A1:B2",
                values: [
                    ["a", "b"],
                    ["c", "d"]
                ]
            });

            const result = await executeUpdateValues(mockClient, params);

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockResponse);
        });

        it("returns error on client failure", async () => {
            mockClient.updateValues.mockRejectedValueOnce(new Error("Invalid values"));

            const params = updateValuesSchema.parse({
                spreadsheetId: "abc123",
                range: "Sheet1!A1",
                values: [["test"]]
            });

            const result = await executeUpdateValues(mockClient, params);

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Invalid values");
        });
    });

    describe("executeBatchUpdateValues", () => {
        it("calls client with correct params", async () => {
            mockClient.batchUpdateValues.mockResolvedValueOnce({
                spreadsheetId: "abc123",
                totalUpdatedRows: 4
            });

            const data = [
                { range: "Sheet1!A1:B2", values: [["a", "b"]] },
                { range: "Sheet2!C1:D2", values: [["c", "d"]] }
            ];

            // Parse through schema to apply defaults
            const params = batchUpdateValuesSchema.parse({
                spreadsheetId: "abc123",
                data
            });

            await executeBatchUpdateValues(mockClient, params);

            expect(mockClient.batchUpdateValues).toHaveBeenCalledWith(
                "abc123",
                data,
                "USER_ENTERED"
            );
        });

        it("calls client with RAW valueInputOption", async () => {
            mockClient.batchUpdateValues.mockResolvedValueOnce({
                spreadsheetId: "abc123",
                totalUpdatedRows: 1
            });

            await executeBatchUpdateValues(mockClient, {
                spreadsheetId: "abc123",
                data: [{ range: "Sheet1!A1", values: [["test"]] }],
                valueInputOption: "RAW"
            });

            expect(mockClient.batchUpdateValues).toHaveBeenCalledWith(
                "abc123",
                [{ range: "Sheet1!A1", values: [["test"]] }],
                "RAW"
            );
        });

        it("returns normalized output on success", async () => {
            const mockResponse = {
                spreadsheetId: "abc123",
                totalUpdatedRows: 2,
                totalUpdatedColumns: 4,
                totalUpdatedCells: 8,
                responses: []
            };
            mockClient.batchUpdateValues.mockResolvedValueOnce(mockResponse);

            const params = batchUpdateValuesSchema.parse({
                spreadsheetId: "abc123",
                data: [{ range: "Sheet1!A1:B2", values: [["a", "b"]] }]
            });

            const result = await executeBatchUpdateValues(mockClient, params);

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockResponse);
        });

        it("returns error on client failure", async () => {
            mockClient.batchUpdateValues.mockRejectedValueOnce(new Error("Batch failed"));

            const params = batchUpdateValuesSchema.parse({
                spreadsheetId: "abc123",
                data: [{ range: "Sheet1!A1", values: [["test"]] }]
            });

            const result = await executeBatchUpdateValues(mockClient, params);

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Batch failed");
        });
    });

    describe("executeClearValues", () => {
        it("calls client with correct params", async () => {
            mockClient.clearValues.mockResolvedValueOnce({
                spreadsheetId: "abc123",
                clearedRange: "Sheet1!A1:B10"
            });

            await executeClearValues(mockClient, {
                spreadsheetId: "abc123",
                range: "Sheet1!A1:B10"
            });

            expect(mockClient.clearValues).toHaveBeenCalledWith("abc123", "Sheet1!A1:B10");
        });

        it("returns normalized output on success", async () => {
            const mockResponse = {
                spreadsheetId: "abc123",
                clearedRange: "Sheet1!A1:B10"
            };
            mockClient.clearValues.mockResolvedValueOnce(mockResponse);

            const result = await executeClearValues(mockClient, {
                spreadsheetId: "abc123",
                range: "Sheet1!A1:B10"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockResponse);
        });

        it("returns error on client failure", async () => {
            mockClient.clearValues.mockRejectedValueOnce(new Error("Range not found"));

            const result = await executeClearValues(mockClient, {
                spreadsheetId: "abc123",
                range: "Invalid!Range"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Range not found");
        });
    });

    describe("executeBatchClearValues", () => {
        it("calls client with correct params", async () => {
            mockClient.batchClearValues.mockResolvedValueOnce({
                spreadsheetId: "abc123",
                clearedRanges: ["Sheet1!A1:B10", "Sheet2!C1:D5"]
            });

            await executeBatchClearValues(mockClient, {
                spreadsheetId: "abc123",
                ranges: ["Sheet1!A1:B10", "Sheet2!C1:D5"]
            });

            expect(mockClient.batchClearValues).toHaveBeenCalledWith("abc123", [
                "Sheet1!A1:B10",
                "Sheet2!C1:D5"
            ]);
        });

        it("returns normalized output on success", async () => {
            const mockResponse = {
                spreadsheetId: "abc123",
                clearedRanges: ["Sheet1!A1:B10"]
            };
            mockClient.batchClearValues.mockResolvedValueOnce(mockResponse);

            const result = await executeBatchClearValues(mockClient, {
                spreadsheetId: "abc123",
                ranges: ["Sheet1!A1:B10"]
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockResponse);
        });

        it("returns error on client failure", async () => {
            mockClient.batchClearValues.mockRejectedValueOnce(new Error("Clear failed"));

            const result = await executeBatchClearValues(mockClient, {
                spreadsheetId: "abc123",
                ranges: ["Sheet1!A1"]
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Clear failed");
        });
    });

    // ==================== Sheet Management Operations ====================

    describe("executeAddSheet", () => {
        it("calls client with correct params", async () => {
            mockClient.batchUpdateSpreadsheet.mockResolvedValueOnce({
                spreadsheetId: "abc123",
                replies: [{ addSheet: { properties: { sheetId: 1, title: "NewSheet" } } }]
            });

            await executeAddSheet(mockClient, {
                spreadsheetId: "abc123",
                title: "NewSheet"
            });

            expect(mockClient.batchUpdateSpreadsheet).toHaveBeenCalledWith("abc123", [
                {
                    addSheet: {
                        properties: {
                            title: "NewSheet",
                            index: undefined,
                            gridProperties: undefined
                        }
                    }
                }
            ]);
        });

        it("calls client with index and gridProperties", async () => {
            mockClient.batchUpdateSpreadsheet.mockResolvedValueOnce({
                spreadsheetId: "abc123",
                replies: [{ addSheet: { properties: { sheetId: 1 } } }]
            });

            await executeAddSheet(mockClient, {
                spreadsheetId: "abc123",
                title: "DataSheet",
                index: 0,
                gridProperties: {
                    rowCount: 100,
                    columnCount: 26,
                    frozenRowCount: 1
                }
            });

            expect(mockClient.batchUpdateSpreadsheet).toHaveBeenCalledWith("abc123", [
                {
                    addSheet: {
                        properties: {
                            title: "DataSheet",
                            index: 0,
                            gridProperties: {
                                rowCount: 100,
                                columnCount: 26,
                                frozenRowCount: 1
                            }
                        }
                    }
                }
            ]);
        });

        it("returns normalized output on success", async () => {
            const mockResponse = {
                spreadsheetId: "abc123",
                replies: [{ addSheet: { properties: { sheetId: 1, title: "NewSheet" } } }]
            };
            mockClient.batchUpdateSpreadsheet.mockResolvedValueOnce(mockResponse);

            const result = await executeAddSheet(mockClient, {
                spreadsheetId: "abc123",
                title: "NewSheet"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockResponse);
        });

        it("returns error on client failure", async () => {
            mockClient.batchUpdateSpreadsheet.mockRejectedValueOnce(
                new Error("Sheet name already exists")
            );

            const result = await executeAddSheet(mockClient, {
                spreadsheetId: "abc123",
                title: "ExistingSheet"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Sheet name already exists");
        });
    });

    describe("executeDeleteSheet", () => {
        it("calls client with correct params", async () => {
            mockClient.batchUpdateSpreadsheet.mockResolvedValueOnce({
                spreadsheetId: "abc123",
                replies: [{}]
            });

            await executeDeleteSheet(mockClient, {
                spreadsheetId: "abc123",
                sheetId: 123456
            });

            expect(mockClient.batchUpdateSpreadsheet).toHaveBeenCalledWith("abc123", [
                {
                    deleteSheet: {
                        sheetId: 123456
                    }
                }
            ]);
        });

        it("returns normalized output on success", async () => {
            const mockResponse = {
                spreadsheetId: "abc123",
                replies: [{}]
            };
            mockClient.batchUpdateSpreadsheet.mockResolvedValueOnce(mockResponse);

            const result = await executeDeleteSheet(mockClient, {
                spreadsheetId: "abc123",
                sheetId: 123456
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockResponse);
        });

        it("returns error on client failure", async () => {
            mockClient.batchUpdateSpreadsheet.mockRejectedValueOnce(new Error("Sheet not found"));

            const result = await executeDeleteSheet(mockClient, {
                spreadsheetId: "abc123",
                sheetId: 999999
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Sheet not found");
        });
    });

    describe("executeCopySheet", () => {
        it("calls client with correct params", async () => {
            mockClient.post.mockResolvedValueOnce({
                sheetId: 789,
                title: "Copy of Sheet1"
            });

            await executeCopySheet(mockClient, {
                spreadsheetId: "abc123",
                sheetId: 0,
                destinationSpreadsheetId: "xyz789"
            });

            expect(mockClient.post).toHaveBeenCalledWith(
                "/v4/spreadsheets/abc123/sheets/0:copyTo",
                {
                    destinationSpreadsheetId: "xyz789"
                }
            );
        });

        it("copies sheet to same spreadsheet", async () => {
            mockClient.post.mockResolvedValueOnce({
                sheetId: 123,
                title: "Copy of Sheet1"
            });

            await executeCopySheet(mockClient, {
                spreadsheetId: "abc123",
                sheetId: 0,
                destinationSpreadsheetId: "abc123"
            });

            expect(mockClient.post).toHaveBeenCalledWith(
                "/v4/spreadsheets/abc123/sheets/0:copyTo",
                {
                    destinationSpreadsheetId: "abc123"
                }
            );
        });

        it("returns normalized output on success", async () => {
            const mockResponse = {
                sheetId: 789,
                title: "Copy of Sheet1"
            };
            mockClient.post.mockResolvedValueOnce(mockResponse);

            const result = await executeCopySheet(mockClient, {
                spreadsheetId: "abc123",
                sheetId: 0,
                destinationSpreadsheetId: "xyz789"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockResponse);
        });

        it("returns error on client failure", async () => {
            mockClient.post.mockRejectedValueOnce(new Error("Destination not found"));

            const result = await executeCopySheet(mockClient, {
                spreadsheetId: "abc123",
                sheetId: 0,
                destinationSpreadsheetId: "nonexistent"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Destination not found");
        });
    });

    describe("executeUpdateSheetProperties", () => {
        it("calls client with correct params for title update", async () => {
            mockClient.batchUpdateSpreadsheet.mockResolvedValueOnce({
                spreadsheetId: "abc123",
                replies: [{}]
            });

            await executeUpdateSheetProperties(mockClient, {
                spreadsheetId: "abc123",
                sheetId: 0,
                properties: {
                    title: "Renamed Sheet"
                }
            });

            expect(mockClient.batchUpdateSpreadsheet).toHaveBeenCalledWith("abc123", [
                {
                    updateSheetProperties: {
                        properties: {
                            sheetId: 0,
                            title: "Renamed Sheet"
                        },
                        fields: "title"
                    }
                }
            ]);
        });

        it("calls client with multiple properties", async () => {
            mockClient.batchUpdateSpreadsheet.mockResolvedValueOnce({
                spreadsheetId: "abc123",
                replies: [{}]
            });

            await executeUpdateSheetProperties(mockClient, {
                spreadsheetId: "abc123",
                sheetId: 0,
                properties: {
                    title: "New Title",
                    index: 2,
                    hidden: true,
                    tabColor: { red: 1, green: 0, blue: 0 }
                }
            });

            expect(mockClient.batchUpdateSpreadsheet).toHaveBeenCalledWith("abc123", [
                {
                    updateSheetProperties: {
                        properties: {
                            sheetId: 0,
                            title: "New Title",
                            index: 2,
                            hidden: true,
                            tabColor: { red: 1, green: 0, blue: 0 }
                        },
                        fields: "title,index,hidden,tabColor"
                    }
                }
            ]);
        });

        it("returns normalized output on success", async () => {
            const mockResponse = {
                spreadsheetId: "abc123",
                replies: [{}]
            };
            mockClient.batchUpdateSpreadsheet.mockResolvedValueOnce(mockResponse);

            const result = await executeUpdateSheetProperties(mockClient, {
                spreadsheetId: "abc123",
                sheetId: 0,
                properties: { title: "Test" }
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockResponse);
        });

        it("returns error on client failure", async () => {
            mockClient.batchUpdateSpreadsheet.mockRejectedValueOnce(new Error("Update failed"));

            const result = await executeUpdateSheetProperties(mockClient, {
                spreadsheetId: "abc123",
                sheetId: 0,
                properties: { title: "Test" }
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Update failed");
        });
    });

    // ==================== Formatting Operations ====================

    describe("executeFormatCells", () => {
        it("calls client with correct params", async () => {
            mockClient.batchUpdateSpreadsheet.mockResolvedValueOnce({
                spreadsheetId: "abc123",
                replies: [{}]
            });

            await executeFormatCells(mockClient, {
                spreadsheetId: "abc123",
                sheetId: 0,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: 5,
                format: {
                    backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
                    textFormat: { bold: true }
                }
            });

            expect(mockClient.batchUpdateSpreadsheet).toHaveBeenCalledWith("abc123", [
                {
                    repeatCell: {
                        range: {
                            sheetId: 0,
                            startRowIndex: 0,
                            endRowIndex: 1,
                            startColumnIndex: 0,
                            endColumnIndex: 5
                        },
                        cell: {
                            userEnteredFormat: {
                                backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
                                textFormat: { bold: true }
                            }
                        },
                        fields: "userEnteredFormat"
                    }
                }
            ]);
        });

        it("calls client with all formatting options", async () => {
            mockClient.batchUpdateSpreadsheet.mockResolvedValueOnce({
                spreadsheetId: "abc123",
                replies: [{}]
            });

            await executeFormatCells(mockClient, {
                spreadsheetId: "abc123",
                sheetId: 0,
                startRowIndex: 0,
                endRowIndex: 10,
                startColumnIndex: 0,
                endColumnIndex: 1,
                format: {
                    backgroundColor: { red: 1, green: 1, blue: 0 },
                    textFormat: {
                        bold: true,
                        italic: true,
                        fontSize: 12,
                        foregroundColor: { red: 0, green: 0, blue: 0 }
                    },
                    horizontalAlignment: "CENTER",
                    verticalAlignment: "MIDDLE",
                    numberFormat: { type: "CURRENCY", pattern: "$#,##0.00" }
                }
            });

            expect(mockClient.batchUpdateSpreadsheet).toHaveBeenCalled();
        });

        it("returns normalized output on success", async () => {
            const mockResponse = {
                spreadsheetId: "abc123",
                replies: [{}]
            };
            mockClient.batchUpdateSpreadsheet.mockResolvedValueOnce(mockResponse);

            const result = await executeFormatCells(mockClient, {
                spreadsheetId: "abc123",
                sheetId: 0,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: 1,
                format: { textFormat: { bold: true } }
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockResponse);
        });

        it("returns error on client failure", async () => {
            mockClient.batchUpdateSpreadsheet.mockRejectedValueOnce(new Error("Format failed"));

            const result = await executeFormatCells(mockClient, {
                spreadsheetId: "abc123",
                sheetId: 0,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: 1,
                format: {}
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Format failed");
        });
    });

    describe("executeMergeCells", () => {
        it("calls client with correct params", async () => {
            mockClient.batchUpdateSpreadsheet.mockResolvedValueOnce({
                spreadsheetId: "abc123",
                replies: [{}]
            });

            // Parse through schema to apply defaults
            const params = mergeCellsSchema.parse({
                spreadsheetId: "abc123",
                sheetId: 0,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: 5
            });

            await executeMergeCells(mockClient, params);

            expect(mockClient.batchUpdateSpreadsheet).toHaveBeenCalledWith("abc123", [
                {
                    mergeCells: {
                        range: {
                            sheetId: 0,
                            startRowIndex: 0,
                            endRowIndex: 1,
                            startColumnIndex: 0,
                            endColumnIndex: 5
                        },
                        mergeType: "MERGE_ALL"
                    }
                }
            ]);
        });

        it("calls client with custom mergeType", async () => {
            mockClient.batchUpdateSpreadsheet.mockResolvedValueOnce({
                spreadsheetId: "abc123",
                replies: [{}]
            });

            await executeMergeCells(mockClient, {
                spreadsheetId: "abc123",
                sheetId: 0,
                startRowIndex: 0,
                endRowIndex: 5,
                startColumnIndex: 0,
                endColumnIndex: 1,
                mergeType: "MERGE_ROWS"
            });

            expect(mockClient.batchUpdateSpreadsheet).toHaveBeenCalledWith("abc123", [
                {
                    mergeCells: {
                        range: {
                            sheetId: 0,
                            startRowIndex: 0,
                            endRowIndex: 5,
                            startColumnIndex: 0,
                            endColumnIndex: 1
                        },
                        mergeType: "MERGE_ROWS"
                    }
                }
            ]);
        });

        it("returns normalized output on success", async () => {
            const mockResponse = {
                spreadsheetId: "abc123",
                replies: [{}]
            };
            mockClient.batchUpdateSpreadsheet.mockResolvedValueOnce(mockResponse);

            const params = mergeCellsSchema.parse({
                spreadsheetId: "abc123",
                sheetId: 0,
                startRowIndex: 0,
                endRowIndex: 2,
                startColumnIndex: 0,
                endColumnIndex: 2
            });

            const result = await executeMergeCells(mockClient, params);

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockResponse);
        });

        it("returns error on client failure", async () => {
            mockClient.batchUpdateSpreadsheet.mockRejectedValueOnce(new Error("Merge failed"));

            const params = mergeCellsSchema.parse({
                spreadsheetId: "abc123",
                sheetId: 0,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: 1
            });

            const result = await executeMergeCells(mockClient, params);

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Merge failed");
        });
    });

    describe("executeUnmergeCells", () => {
        it("calls client with correct params", async () => {
            mockClient.batchUpdateSpreadsheet.mockResolvedValueOnce({
                spreadsheetId: "abc123",
                replies: [{}]
            });

            await executeUnmergeCells(mockClient, {
                spreadsheetId: "abc123",
                sheetId: 0,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: 5
            });

            expect(mockClient.batchUpdateSpreadsheet).toHaveBeenCalledWith("abc123", [
                {
                    unmergeCells: {
                        range: {
                            sheetId: 0,
                            startRowIndex: 0,
                            endRowIndex: 1,
                            startColumnIndex: 0,
                            endColumnIndex: 5
                        }
                    }
                }
            ]);
        });

        it("returns normalized output on success", async () => {
            const mockResponse = {
                spreadsheetId: "abc123",
                replies: [{}]
            };
            mockClient.batchUpdateSpreadsheet.mockResolvedValueOnce(mockResponse);

            const result = await executeUnmergeCells(mockClient, {
                spreadsheetId: "abc123",
                sheetId: 0,
                startRowIndex: 0,
                endRowIndex: 2,
                startColumnIndex: 0,
                endColumnIndex: 2
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockResponse);
        });

        it("returns error on client failure", async () => {
            mockClient.batchUpdateSpreadsheet.mockRejectedValueOnce(new Error("Unmerge failed"));

            const result = await executeUnmergeCells(mockClient, {
                spreadsheetId: "abc123",
                sheetId: 0,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: 1
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Unmerge failed");
        });
    });

    describe("executeAutoResize", () => {
        it("calls client with correct params for columns", async () => {
            mockClient.batchUpdateSpreadsheet.mockResolvedValueOnce({
                spreadsheetId: "abc123",
                replies: [{}]
            });

            await executeAutoResize(mockClient, {
                spreadsheetId: "abc123",
                sheetId: 0,
                dimension: "COLUMNS",
                startIndex: 0,
                endIndex: 5
            });

            expect(mockClient.batchUpdateSpreadsheet).toHaveBeenCalledWith("abc123", [
                {
                    autoResizeDimensions: {
                        dimensions: {
                            sheetId: 0,
                            dimension: "COLUMNS",
                            startIndex: 0,
                            endIndex: 5
                        }
                    }
                }
            ]);
        });

        it("calls client with correct params for rows", async () => {
            mockClient.batchUpdateSpreadsheet.mockResolvedValueOnce({
                spreadsheetId: "abc123",
                replies: [{}]
            });

            await executeAutoResize(mockClient, {
                spreadsheetId: "abc123",
                sheetId: 0,
                dimension: "ROWS",
                startIndex: 0,
                endIndex: 100
            });

            expect(mockClient.batchUpdateSpreadsheet).toHaveBeenCalledWith("abc123", [
                {
                    autoResizeDimensions: {
                        dimensions: {
                            sheetId: 0,
                            dimension: "ROWS",
                            startIndex: 0,
                            endIndex: 100
                        }
                    }
                }
            ]);
        });

        it("returns normalized output on success", async () => {
            const mockResponse = {
                spreadsheetId: "abc123",
                replies: [{}]
            };
            mockClient.batchUpdateSpreadsheet.mockResolvedValueOnce(mockResponse);

            const result = await executeAutoResize(mockClient, {
                spreadsheetId: "abc123",
                sheetId: 0,
                dimension: "COLUMNS",
                startIndex: 0,
                endIndex: 10
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockResponse);
        });

        it("returns error on client failure", async () => {
            mockClient.batchUpdateSpreadsheet.mockRejectedValueOnce(new Error("Resize failed"));

            const result = await executeAutoResize(mockClient, {
                spreadsheetId: "abc123",
                sheetId: 0,
                dimension: "COLUMNS",
                startIndex: 0,
                endIndex: 1
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Resize failed");
        });
    });

    // ==================== Schema Validation ====================

    describe("schema validation", () => {
        describe("createSpreadsheetSchema", () => {
            it("validates minimal input", () => {
                const result = createSpreadsheetSchema.safeParse({
                    title: "New Spreadsheet"
                });
                expect(result.success).toBe(true);
            });

            it("validates with sheets array", () => {
                const result = createSpreadsheetSchema.safeParse({
                    title: "Test",
                    sheets: [{ title: "Sheet1" }, { title: "Sheet2" }]
                });
                expect(result.success).toBe(true);
            });

            it("rejects empty title", () => {
                const result = createSpreadsheetSchema.safeParse({
                    title: ""
                });
                expect(result.success).toBe(false);
            });

            it("rejects title over 255 characters", () => {
                const result = createSpreadsheetSchema.safeParse({
                    title: "a".repeat(256)
                });
                expect(result.success).toBe(false);
            });
        });

        describe("getSpreadsheetSchema", () => {
            it("validates minimal input", () => {
                const result = getSpreadsheetSchema.safeParse({
                    spreadsheetId: "abc123"
                });
                expect(result.success).toBe(true);
            });

            it("validates with includeGridData", () => {
                const result = getSpreadsheetSchema.safeParse({
                    spreadsheetId: "abc123",
                    includeGridData: true
                });
                expect(result.success).toBe(true);
            });

            it("applies default includeGridData", () => {
                const result = getSpreadsheetSchema.parse({
                    spreadsheetId: "abc123"
                });
                expect(result.includeGridData).toBe(false);
            });

            it("rejects empty spreadsheetId", () => {
                const result = getSpreadsheetSchema.safeParse({
                    spreadsheetId: ""
                });
                expect(result.success).toBe(false);
            });
        });

        describe("batchUpdateSpreadsheetSchema", () => {
            it("validates with requests", () => {
                const result = batchUpdateSpreadsheetSchema.safeParse({
                    spreadsheetId: "abc123",
                    requests: [{ addSheet: { properties: { title: "Test" } } }]
                });
                expect(result.success).toBe(true);
            });

            it("rejects empty requests array", () => {
                const result = batchUpdateSpreadsheetSchema.safeParse({
                    spreadsheetId: "abc123",
                    requests: []
                });
                expect(result.success).toBe(false);
            });
        });

        describe("getValuesSchema", () => {
            it("validates minimal input", () => {
                const result = getValuesSchema.safeParse({
                    spreadsheetId: "abc123",
                    range: "Sheet1!A1:B10"
                });
                expect(result.success).toBe(true);
            });

            it("validates with valueRenderOption", () => {
                const result = getValuesSchema.safeParse({
                    spreadsheetId: "abc123",
                    range: "Sheet1!A1",
                    valueRenderOption: "FORMULA"
                });
                expect(result.success).toBe(true);
            });

            it("applies default valueRenderOption", () => {
                const result = getValuesSchema.parse({
                    spreadsheetId: "abc123",
                    range: "Sheet1!A1"
                });
                expect(result.valueRenderOption).toBe("FORMATTED_VALUE");
            });

            it("rejects invalid valueRenderOption", () => {
                const result = getValuesSchema.safeParse({
                    spreadsheetId: "abc123",
                    range: "Sheet1!A1",
                    valueRenderOption: "INVALID"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("batchGetValuesSchema", () => {
            it("validates with ranges array", () => {
                const result = batchGetValuesSchema.safeParse({
                    spreadsheetId: "abc123",
                    ranges: ["Sheet1!A1:B10", "Sheet2!C1:D5"]
                });
                expect(result.success).toBe(true);
            });

            it("rejects empty ranges array", () => {
                const result = batchGetValuesSchema.safeParse({
                    spreadsheetId: "abc123",
                    ranges: []
                });
                expect(result.success).toBe(false);
            });
        });

        describe("appendValuesSchema", () => {
            it("validates minimal input", () => {
                const result = appendValuesSchema.safeParse({
                    spreadsheetId: "abc123",
                    range: "Sheet1!A1",
                    values: [["Name", "Age"]]
                });
                expect(result.success).toBe(true);
            });

            it("validates with valueInputOption", () => {
                const result = appendValuesSchema.safeParse({
                    spreadsheetId: "abc123",
                    range: "Sheet1!A1",
                    values: [["test"]],
                    valueInputOption: "RAW"
                });
                expect(result.success).toBe(true);
            });

            it("applies default valueInputOption", () => {
                const result = appendValuesSchema.parse({
                    spreadsheetId: "abc123",
                    range: "Sheet1!A1",
                    values: [["test"]]
                });
                expect(result.valueInputOption).toBe("USER_ENTERED");
            });

            it("rejects empty values array", () => {
                const result = appendValuesSchema.safeParse({
                    spreadsheetId: "abc123",
                    range: "Sheet1!A1",
                    values: []
                });
                expect(result.success).toBe(false);
            });
        });

        describe("updateValuesSchema", () => {
            it("validates minimal input", () => {
                const result = updateValuesSchema.safeParse({
                    spreadsheetId: "abc123",
                    range: "Sheet1!A1:B2",
                    values: [["a", "b"]]
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing values", () => {
                const result = updateValuesSchema.safeParse({
                    spreadsheetId: "abc123",
                    range: "Sheet1!A1"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("batchUpdateValuesSchema", () => {
            it("validates with data array", () => {
                const result = batchUpdateValuesSchema.safeParse({
                    spreadsheetId: "abc123",
                    data: [{ range: "Sheet1!A1", values: [["test"]] }]
                });
                expect(result.success).toBe(true);
            });

            it("rejects empty data array", () => {
                const result = batchUpdateValuesSchema.safeParse({
                    spreadsheetId: "abc123",
                    data: []
                });
                expect(result.success).toBe(false);
            });
        });

        describe("clearValuesSchema", () => {
            it("validates minimal input", () => {
                const result = clearValuesSchema.safeParse({
                    spreadsheetId: "abc123",
                    range: "Sheet1!A1:B10"
                });
                expect(result.success).toBe(true);
            });

            it("rejects empty range", () => {
                const result = clearValuesSchema.safeParse({
                    spreadsheetId: "abc123",
                    range: ""
                });
                expect(result.success).toBe(false);
            });
        });

        describe("batchClearValuesSchema", () => {
            it("validates with ranges array", () => {
                const result = batchClearValuesSchema.safeParse({
                    spreadsheetId: "abc123",
                    ranges: ["Sheet1!A1:B10"]
                });
                expect(result.success).toBe(true);
            });

            it("rejects empty ranges array", () => {
                const result = batchClearValuesSchema.safeParse({
                    spreadsheetId: "abc123",
                    ranges: []
                });
                expect(result.success).toBe(false);
            });
        });

        describe("addSheetSchema", () => {
            it("validates minimal input", () => {
                const result = addSheetSchema.safeParse({
                    spreadsheetId: "abc123",
                    title: "NewSheet"
                });
                expect(result.success).toBe(true);
            });

            it("validates with all options", () => {
                const result = addSheetSchema.safeParse({
                    spreadsheetId: "abc123",
                    title: "NewSheet",
                    index: 0,
                    gridProperties: {
                        rowCount: 100,
                        columnCount: 26,
                        frozenRowCount: 1,
                        frozenColumnCount: 0
                    }
                });
                expect(result.success).toBe(true);
            });

            it("rejects title over 100 characters", () => {
                const result = addSheetSchema.safeParse({
                    spreadsheetId: "abc123",
                    title: "a".repeat(101)
                });
                expect(result.success).toBe(false);
            });

            it("rejects negative index", () => {
                const result = addSheetSchema.safeParse({
                    spreadsheetId: "abc123",
                    title: "Test",
                    index: -1
                });
                expect(result.success).toBe(false);
            });
        });

        describe("deleteSheetSchema", () => {
            it("validates with sheetId", () => {
                const result = deleteSheetSchema.safeParse({
                    spreadsheetId: "abc123",
                    sheetId: 123456
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing sheetId", () => {
                const result = deleteSheetSchema.safeParse({
                    spreadsheetId: "abc123"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("copySheetSchema", () => {
            it("validates all required fields", () => {
                const result = copySheetSchema.safeParse({
                    spreadsheetId: "abc123",
                    sheetId: 0,
                    destinationSpreadsheetId: "xyz789"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing destinationSpreadsheetId", () => {
                const result = copySheetSchema.safeParse({
                    spreadsheetId: "abc123",
                    sheetId: 0
                });
                expect(result.success).toBe(false);
            });
        });

        describe("updateSheetPropertiesSchema", () => {
            it("validates with title property", () => {
                const result = updateSheetPropertiesSchema.safeParse({
                    spreadsheetId: "abc123",
                    sheetId: 0,
                    properties: { title: "New Title" }
                });
                expect(result.success).toBe(true);
            });

            it("validates with tabColor", () => {
                const result = updateSheetPropertiesSchema.safeParse({
                    spreadsheetId: "abc123",
                    sheetId: 0,
                    properties: {
                        tabColor: { red: 1, green: 0, blue: 0 }
                    }
                });
                expect(result.success).toBe(true);
            });

            it("rejects color values outside 0-1 range", () => {
                const result = updateSheetPropertiesSchema.safeParse({
                    spreadsheetId: "abc123",
                    sheetId: 0,
                    properties: {
                        tabColor: { red: 255 }
                    }
                });
                expect(result.success).toBe(false);
            });
        });

        describe("formatCellsSchema", () => {
            it("validates with range and format", () => {
                const result = formatCellsSchema.safeParse({
                    spreadsheetId: "abc123",
                    sheetId: 0,
                    startRowIndex: 0,
                    endRowIndex: 1,
                    startColumnIndex: 0,
                    endColumnIndex: 5,
                    format: { textFormat: { bold: true } }
                });
                expect(result.success).toBe(true);
            });

            it("validates all format options", () => {
                const result = formatCellsSchema.safeParse({
                    spreadsheetId: "abc123",
                    sheetId: 0,
                    startRowIndex: 0,
                    endRowIndex: 10,
                    startColumnIndex: 0,
                    endColumnIndex: 5,
                    format: {
                        backgroundColor: { red: 1, green: 1, blue: 0, alpha: 1 },
                        textFormat: {
                            bold: true,
                            italic: true,
                            strikethrough: false,
                            underline: true,
                            fontSize: 14,
                            foregroundColor: { red: 0, green: 0, blue: 0 }
                        },
                        horizontalAlignment: "CENTER",
                        verticalAlignment: "MIDDLE",
                        numberFormat: { type: "CURRENCY", pattern: "$#,##0.00" }
                    }
                });
                expect(result.success).toBe(true);
            });

            it("rejects invalid horizontal alignment", () => {
                const result = formatCellsSchema.safeParse({
                    spreadsheetId: "abc123",
                    sheetId: 0,
                    startRowIndex: 0,
                    endRowIndex: 1,
                    startColumnIndex: 0,
                    endColumnIndex: 1,
                    format: {
                        horizontalAlignment: "JUSTIFY"
                    }
                });
                expect(result.success).toBe(false);
            });

            it("rejects fontSize outside valid range", () => {
                const result = formatCellsSchema.safeParse({
                    spreadsheetId: "abc123",
                    sheetId: 0,
                    startRowIndex: 0,
                    endRowIndex: 1,
                    startColumnIndex: 0,
                    endColumnIndex: 1,
                    format: {
                        textFormat: { fontSize: 500 }
                    }
                });
                expect(result.success).toBe(false);
            });
        });

        describe("mergeCellsSchema", () => {
            it("validates minimal input", () => {
                const result = mergeCellsSchema.safeParse({
                    spreadsheetId: "abc123",
                    sheetId: 0,
                    startRowIndex: 0,
                    endRowIndex: 2,
                    startColumnIndex: 0,
                    endColumnIndex: 2
                });
                expect(result.success).toBe(true);
            });

            it("validates with mergeType", () => {
                const result = mergeCellsSchema.safeParse({
                    spreadsheetId: "abc123",
                    sheetId: 0,
                    startRowIndex: 0,
                    endRowIndex: 5,
                    startColumnIndex: 0,
                    endColumnIndex: 1,
                    mergeType: "MERGE_COLUMNS"
                });
                expect(result.success).toBe(true);
            });

            it("applies default mergeType", () => {
                const result = mergeCellsSchema.parse({
                    spreadsheetId: "abc123",
                    sheetId: 0,
                    startRowIndex: 0,
                    endRowIndex: 2,
                    startColumnIndex: 0,
                    endColumnIndex: 2
                });
                expect(result.mergeType).toBe("MERGE_ALL");
            });

            it("rejects invalid mergeType", () => {
                const result = mergeCellsSchema.safeParse({
                    spreadsheetId: "abc123",
                    sheetId: 0,
                    startRowIndex: 0,
                    endRowIndex: 2,
                    startColumnIndex: 0,
                    endColumnIndex: 2,
                    mergeType: "INVALID"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("unmergeCellsSchema", () => {
            it("validates all required fields", () => {
                const result = unmergeCellsSchema.safeParse({
                    spreadsheetId: "abc123",
                    sheetId: 0,
                    startRowIndex: 0,
                    endRowIndex: 2,
                    startColumnIndex: 0,
                    endColumnIndex: 2
                });
                expect(result.success).toBe(true);
            });

            it("rejects negative row index", () => {
                const result = unmergeCellsSchema.safeParse({
                    spreadsheetId: "abc123",
                    sheetId: 0,
                    startRowIndex: -1,
                    endRowIndex: 2,
                    startColumnIndex: 0,
                    endColumnIndex: 2
                });
                expect(result.success).toBe(false);
            });

            it("rejects endRowIndex less than 1", () => {
                const result = unmergeCellsSchema.safeParse({
                    spreadsheetId: "abc123",
                    sheetId: 0,
                    startRowIndex: 0,
                    endRowIndex: 0,
                    startColumnIndex: 0,
                    endColumnIndex: 2
                });
                expect(result.success).toBe(false);
            });
        });

        describe("autoResizeSchema", () => {
            it("validates columns dimension", () => {
                const result = autoResizeSchema.safeParse({
                    spreadsheetId: "abc123",
                    sheetId: 0,
                    dimension: "COLUMNS",
                    startIndex: 0,
                    endIndex: 10
                });
                expect(result.success).toBe(true);
            });

            it("validates rows dimension", () => {
                const result = autoResizeSchema.safeParse({
                    spreadsheetId: "abc123",
                    sheetId: 0,
                    dimension: "ROWS",
                    startIndex: 0,
                    endIndex: 100
                });
                expect(result.success).toBe(true);
            });

            it("rejects invalid dimension", () => {
                const result = autoResizeSchema.safeParse({
                    spreadsheetId: "abc123",
                    sheetId: 0,
                    dimension: "CELLS",
                    startIndex: 0,
                    endIndex: 10
                });
                expect(result.success).toBe(false);
            });

            it("rejects negative startIndex", () => {
                const result = autoResizeSchema.safeParse({
                    spreadsheetId: "abc123",
                    sheetId: 0,
                    dimension: "COLUMNS",
                    startIndex: -1,
                    endIndex: 10
                });
                expect(result.success).toBe(false);
            });

            it("rejects endIndex less than 1", () => {
                const result = autoResizeSchema.safeParse({
                    spreadsheetId: "abc123",
                    sheetId: 0,
                    dimension: "COLUMNS",
                    startIndex: 0,
                    endIndex: 0
                });
                expect(result.success).toBe(false);
            });
        });
    });
});
