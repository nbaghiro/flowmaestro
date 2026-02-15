/**
 * Google Sheets Provider Test Fixtures
 *
 * Based on Google Sheets API v4 response structures.
 * https://developers.google.com/sheets/api/reference/rest
 */

import type { TestFixture } from "../../sandbox";

// Sample spreadsheet ID
const SAMPLE_SPREADSHEET_ID = "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms";
const SAMPLE_SPREADSHEET_ID_2 = "2CyiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms";

export const googleSheetsFixtures: TestFixture[] = [
    // ========== SPREADSHEET OPERATIONS ==========
    {
        operationId: "createSpreadsheet",
        provider: "google-sheets",
        validCases: [
            {
                name: "create_basic_spreadsheet",
                description: "Create a new spreadsheet with title",
                input: {
                    title: "My New Spreadsheet"
                },
                expectedOutput: {
                    spreadsheetId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
                    spreadsheetUrl:
                        "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit",
                    properties: {
                        title: "My New Spreadsheet",
                        locale: "en_US",
                        autoRecalc: "ON_CHANGE",
                        timeZone: "America/New_York",
                        defaultFormat: {
                            backgroundColor: {
                                red: 1,
                                green: 1,
                                blue: 1
                            },
                            textFormat: {
                                fontFamily: "Arial",
                                fontSize: 10
                            }
                        }
                    },
                    sheets: [
                        {
                            properties: {
                                sheetId: 0,
                                title: "Sheet1",
                                index: 0,
                                sheetType: "GRID",
                                gridProperties: {
                                    rowCount: 1000,
                                    columnCount: 26
                                }
                            }
                        }
                    ]
                }
            },
            {
                name: "create_spreadsheet_with_sheets",
                description: "Create spreadsheet with multiple sheets",
                input: {
                    title: "Multi-Sheet Workbook",
                    sheets: [{ title: "Data" }, { title: "Summary" }, { title: "Charts" }]
                },
                expectedOutput: {
                    spreadsheetId: "2CyiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
                    properties: {
                        title: "Multi-Sheet Workbook"
                    },
                    sheets: [
                        { properties: { sheetId: 0, title: "Data", index: 0 } },
                        { properties: { sheetId: 1, title: "Summary", index: 1 } },
                        { properties: { sheetId: 2, title: "Charts", index: 2 } }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "rate_limit",
                description: "Google API quota exceeded",
                input: {
                    title: "Test Spreadsheet"
                },
                expectedError: {
                    type: "rate_limit",
                    message:
                        "Quota exceeded for quota metric 'Write requests' and limit 'Write requests per minute per user'",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getSpreadsheet",
        provider: "google-sheets",
        validCases: [
            {
                name: "get_spreadsheet_metadata",
                description: "Get spreadsheet metadata and properties",
                input: {
                    spreadsheetId: SAMPLE_SPREADSHEET_ID
                },
                expectedOutput: {
                    spreadsheetId: SAMPLE_SPREADSHEET_ID,
                    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${SAMPLE_SPREADSHEET_ID}/edit`,
                    properties: {
                        title: "Sales Data 2024",
                        locale: "en_US",
                        autoRecalc: "ON_CHANGE",
                        timeZone: "America/New_York"
                    },
                    sheets: [
                        {
                            properties: {
                                sheetId: 0,
                                title: "Q1 Sales",
                                index: 0,
                                sheetType: "GRID",
                                gridProperties: {
                                    rowCount: 1000,
                                    columnCount: 26,
                                    frozenRowCount: 1
                                }
                            }
                        },
                        {
                            properties: {
                                sheetId: 1,
                                title: "Q2 Sales",
                                index: 1,
                                sheetType: "GRID",
                                gridProperties: {
                                    rowCount: 1000,
                                    columnCount: 26,
                                    frozenRowCount: 1
                                }
                            }
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "spreadsheet_not_found",
                description: "Spreadsheet does not exist",
                input: {
                    spreadsheetId: "invalid-spreadsheet-id"
                },
                expectedError: {
                    type: "not_found",
                    message: "Requested entity was not found",
                    retryable: false
                }
            },
            {
                name: "no_permission",
                description: "No permission to access spreadsheet",
                input: {
                    spreadsheetId: "private-spreadsheet-id"
                },
                expectedError: {
                    type: "permission",
                    message: "The caller does not have permission",
                    retryable: false
                }
            }
        ]
    },

    // ========== SHEET OPERATIONS ==========
    {
        operationId: "addSheet",
        provider: "google-sheets",
        validCases: [
            {
                name: "add_basic_sheet",
                description: "Add a new sheet to spreadsheet",
                input: {
                    spreadsheetId: SAMPLE_SPREADSHEET_ID,
                    title: "New Sheet"
                },
                expectedOutput: {
                    spreadsheetId: SAMPLE_SPREADSHEET_ID,
                    replies: [
                        {
                            addSheet: {
                                properties: {
                                    sheetId: 123456789,
                                    title: "New Sheet",
                                    index: 2,
                                    sheetType: "GRID",
                                    gridProperties: {
                                        rowCount: 1000,
                                        columnCount: 26
                                    }
                                }
                            }
                        }
                    ]
                }
            },
            {
                name: "add_sheet_with_properties",
                description: "Add sheet with custom properties",
                input: {
                    spreadsheetId: SAMPLE_SPREADSHEET_ID,
                    title: "Custom Sheet",
                    rowCount: 500,
                    columnCount: 10,
                    tabColor: { red: 0.2, green: 0.8, blue: 0.4 }
                },
                expectedOutput: {
                    spreadsheetId: SAMPLE_SPREADSHEET_ID,
                    replies: [
                        {
                            addSheet: {
                                properties: {
                                    sheetId: 987654321,
                                    title: "Custom Sheet",
                                    index: 2,
                                    sheetType: "GRID",
                                    gridProperties: {
                                        rowCount: 500,
                                        columnCount: 10
                                    },
                                    tabColor: { red: 0.2, green: 0.8, blue: 0.4 }
                                }
                            }
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "duplicate_sheet_name",
                description: "Sheet with same name already exists",
                input: {
                    spreadsheetId: SAMPLE_SPREADSHEET_ID,
                    title: "Sheet1"
                },
                expectedError: {
                    type: "validation",
                    message: "A sheet with the name 'Sheet1' already exists",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "deleteSheet",
        provider: "google-sheets",
        validCases: [
            {
                name: "delete_sheet",
                description: "Delete a sheet from spreadsheet",
                input: {
                    spreadsheetId: SAMPLE_SPREADSHEET_ID,
                    sheetId: 123456789
                },
                expectedOutput: {
                    spreadsheetId: SAMPLE_SPREADSHEET_ID,
                    replies: [{}]
                }
            }
        ],
        errorCases: [
            {
                name: "sheet_not_found",
                description: "Sheet ID does not exist",
                input: {
                    spreadsheetId: SAMPLE_SPREADSHEET_ID,
                    sheetId: 999999999
                },
                expectedError: {
                    type: "not_found",
                    message: "No sheet with id: 999999999",
                    retryable: false
                }
            },
            {
                name: "cannot_delete_last_sheet",
                description: "Cannot delete the only sheet",
                input: {
                    spreadsheetId: SAMPLE_SPREADSHEET_ID,
                    sheetId: 0
                },
                expectedError: {
                    type: "validation",
                    message: "A spreadsheet must contain at least one sheet",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "copySheet",
        provider: "google-sheets",
        validCases: [
            {
                name: "copy_to_same_spreadsheet",
                description: "Copy sheet within same spreadsheet",
                input: {
                    spreadsheetId: SAMPLE_SPREADSHEET_ID,
                    sheetId: 0,
                    destinationSpreadsheetId: SAMPLE_SPREADSHEET_ID
                },
                expectedOutput: {
                    sheetId: 111222333,
                    title: "Copy of Sheet1",
                    index: 3,
                    sheetType: "GRID",
                    gridProperties: {
                        rowCount: 1000,
                        columnCount: 26
                    }
                }
            },
            {
                name: "copy_to_different_spreadsheet",
                description: "Copy sheet to another spreadsheet",
                input: {
                    spreadsheetId: SAMPLE_SPREADSHEET_ID,
                    sheetId: 0,
                    destinationSpreadsheetId: SAMPLE_SPREADSHEET_ID_2
                },
                expectedOutput: {
                    sheetId: 444555666,
                    title: "Sheet1",
                    index: 0,
                    sheetType: "GRID"
                }
            }
        ],
        errorCases: [
            {
                name: "spreadsheet_not_found",
                description: "Spreadsheet does not exist",
                input: {
                    spreadsheetId: "nonexistent-spreadsheet",
                    sheetId: 0,
                    destinationSpreadsheetId: "dest-spreadsheet"
                },
                expectedError: {
                    type: "not_found",
                    message: "Requested entity was not found.",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "updateSheetProperties",
        provider: "google-sheets",
        validCases: [
            {
                name: "rename_sheet",
                description: "Rename a sheet",
                input: {
                    spreadsheetId: SAMPLE_SPREADSHEET_ID,
                    sheetId: 0,
                    title: "Renamed Sheet"
                },
                expectedOutput: {
                    spreadsheetId: SAMPLE_SPREADSHEET_ID,
                    replies: [{}]
                }
            },
            {
                name: "update_tab_color",
                description: "Change sheet tab color",
                input: {
                    spreadsheetId: SAMPLE_SPREADSHEET_ID,
                    sheetId: 0,
                    tabColor: { red: 1.0, green: 0.0, blue: 0.0 }
                },
                expectedOutput: {
                    spreadsheetId: SAMPLE_SPREADSHEET_ID,
                    replies: [{}]
                }
            },
            {
                name: "hide_sheet",
                description: "Hide a sheet",
                input: {
                    spreadsheetId: SAMPLE_SPREADSHEET_ID,
                    sheetId: 1,
                    hidden: true
                },
                expectedOutput: {
                    spreadsheetId: SAMPLE_SPREADSHEET_ID,
                    replies: [{}]
                }
            }
        ],
        errorCases: [
            {
                name: "sheet_not_found",
                description: "Sheet does not exist",
                input: {
                    spreadsheetId: "test-spreadsheet-id",
                    sheetId: 999999,
                    title: "New Name"
                },
                expectedError: {
                    type: "not_found",
                    message: "Sheet with ID 999999 not found",
                    retryable: false
                }
            }
        ]
    },

    // ========== VALUES OPERATIONS ==========
    {
        operationId: "getValues",
        provider: "google-sheets",
        validCases: [
            {
                name: "get_single_range",
                description: "Get values from a single range",
                input: {
                    spreadsheetId: SAMPLE_SPREADSHEET_ID,
                    range: "Sheet1!A1:D5"
                },
                expectedOutput: {
                    range: "Sheet1!A1:D5",
                    majorDimension: "ROWS",
                    values: [
                        ["Name", "Department", "Salary", "Start Date"],
                        ["Alice Smith", "Engineering", "95000", "2023-01-15"],
                        ["Bob Johnson", "Marketing", "75000", "2022-06-01"],
                        ["Carol Williams", "Sales", "85000", "2021-09-20"],
                        ["David Brown", "Engineering", "105000", "2020-03-10"]
                    ]
                }
            },
            {
                name: "get_entire_sheet",
                description: "Get all values from a sheet",
                input: {
                    spreadsheetId: SAMPLE_SPREADSHEET_ID,
                    range: "Sheet1"
                },
                expectedOutput: {
                    range: "Sheet1!A1:Z100",
                    majorDimension: "ROWS",
                    values: [
                        ["Name", "Department", "Salary", "Start Date"],
                        ["Alice Smith", "Engineering", "95000", "2023-01-15"],
                        ["Bob Johnson", "Marketing", "75000", "2022-06-01"]
                    ]
                }
            },
            {
                name: "get_values_unformatted",
                description: "Get raw unformatted values",
                input: {
                    spreadsheetId: SAMPLE_SPREADSHEET_ID,
                    range: "Sheet1!C2:C5",
                    valueRenderOption: "UNFORMATTED_VALUE"
                },
                expectedOutput: {
                    range: "Sheet1!C2:C5",
                    majorDimension: "ROWS",
                    values: [[95000], [75000], [85000], [105000]]
                }
            },
            {
                name: "get_formulas",
                description: "Get formulas instead of calculated values",
                input: {
                    spreadsheetId: SAMPLE_SPREADSHEET_ID,
                    range: "Sheet1!E2",
                    valueRenderOption: "FORMULA"
                },
                expectedOutput: {
                    range: "Sheet1!E2",
                    majorDimension: "ROWS",
                    values: [["=C2*0.3"]]
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_range",
                description: "Invalid A1 notation range",
                input: {
                    spreadsheetId: SAMPLE_SPREADSHEET_ID,
                    range: "InvalidSheet!A1:B2"
                },
                expectedError: {
                    type: "validation",
                    message: "Unable to parse range: InvalidSheet!A1:B2",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "updateValues",
        provider: "google-sheets",
        validCases: [
            {
                name: "update_single_range",
                description: "Update values in a range",
                input: {
                    spreadsheetId: SAMPLE_SPREADSHEET_ID,
                    range: "Sheet1!A2:D2",
                    values: [["John Doe", "HR", "65000", "2024-01-10"]]
                },
                expectedOutput: {
                    spreadsheetId: SAMPLE_SPREADSHEET_ID,
                    updatedRange: "Sheet1!A2:D2",
                    updatedRows: 1,
                    updatedColumns: 4,
                    updatedCells: 4
                }
            },
            {
                name: "update_multiple_rows",
                description: "Update multiple rows at once",
                input: {
                    spreadsheetId: SAMPLE_SPREADSHEET_ID,
                    range: "Sheet1!A2:D4",
                    values: [
                        ["Alice", "Engineering", "100000", "2023-01-15"],
                        ["Bob", "Marketing", "80000", "2022-06-01"],
                        ["Carol", "Sales", "90000", "2021-09-20"]
                    ]
                },
                expectedOutput: {
                    spreadsheetId: SAMPLE_SPREADSHEET_ID,
                    updatedRange: "Sheet1!A2:D4",
                    updatedRows: 3,
                    updatedColumns: 4,
                    updatedCells: 12
                }
            },
            {
                name: "update_with_formulas",
                description: "Update with formulas using USER_ENTERED",
                input: {
                    spreadsheetId: SAMPLE_SPREADSHEET_ID,
                    range: "Sheet1!E2",
                    values: [["=C2*0.3"]],
                    valueInputOption: "USER_ENTERED"
                },
                expectedOutput: {
                    spreadsheetId: SAMPLE_SPREADSHEET_ID,
                    updatedRange: "Sheet1!E2",
                    updatedRows: 1,
                    updatedColumns: 1,
                    updatedCells: 1
                }
            }
        ],
        errorCases: [
            {
                name: "range_out_of_bounds",
                description: "Range exceeds sheet dimensions",
                input: {
                    spreadsheetId: SAMPLE_SPREADSHEET_ID,
                    range: "Sheet1!ZZZ999999",
                    values: [["test"]]
                },
                expectedError: {
                    type: "validation",
                    message: "Range out of bounds",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "appendValues",
        provider: "google-sheets",
        validCases: [
            {
                name: "append_single_row",
                description: "Append a single row to sheet",
                input: {
                    spreadsheetId: SAMPLE_SPREADSHEET_ID,
                    range: "Sheet1",
                    values: [["Eve Wilson", "Finance", "88000", "2024-02-01"]]
                },
                expectedOutput: {
                    spreadsheetId: SAMPLE_SPREADSHEET_ID,
                    tableRange: "Sheet1!A1:D5",
                    updates: {
                        spreadsheetId: SAMPLE_SPREADSHEET_ID,
                        updatedRange: "Sheet1!A6:D6",
                        updatedRows: 1,
                        updatedColumns: 4,
                        updatedCells: 4
                    }
                }
            },
            {
                name: "append_multiple_rows",
                description: "Append multiple rows to sheet",
                input: {
                    spreadsheetId: SAMPLE_SPREADSHEET_ID,
                    range: "Sheet1!A:D",
                    values: [
                        ["Frank Miller", "Legal", "92000", "2024-03-15"],
                        ["Grace Lee", "Engineering", "110000", "2024-04-01"]
                    ]
                },
                expectedOutput: {
                    spreadsheetId: SAMPLE_SPREADSHEET_ID,
                    tableRange: "Sheet1!A1:D6",
                    updates: {
                        spreadsheetId: SAMPLE_SPREADSHEET_ID,
                        updatedRange: "Sheet1!A7:D8",
                        updatedRows: 2,
                        updatedColumns: 4,
                        updatedCells: 8
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "permission_denied",
                description: "No permission to edit spreadsheet",
                input: {
                    spreadsheetId: "test-spreadsheet-id",
                    range: "Sheet1",
                    values: [["test"]]
                },
                expectedError: {
                    type: "permission",
                    message: "The caller does not have permission",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "clearValues",
        provider: "google-sheets",
        validCases: [
            {
                name: "clear_range",
                description: "Clear values from a range",
                input: {
                    spreadsheetId: SAMPLE_SPREADSHEET_ID,
                    range: "Sheet1!A2:D10"
                },
                expectedOutput: {
                    spreadsheetId: SAMPLE_SPREADSHEET_ID,
                    clearedRange: "Sheet1!A2:D10"
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_range",
                description: "Invalid range format",
                input: {
                    spreadsheetId: "test-spreadsheet-id",
                    range: "InvalidSheet!A1:B2"
                },
                expectedError: {
                    type: "validation",
                    message: "Unable to parse range: InvalidSheet!A1:B2",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "batchGetValues",
        provider: "google-sheets",
        validCases: [
            {
                name: "get_multiple_ranges",
                description: "Get values from multiple ranges",
                input: {
                    spreadsheetId: SAMPLE_SPREADSHEET_ID,
                    ranges: ["Sheet1!A1:B3", "Sheet1!D1:D3", "Sheet2!A1:C2"]
                },
                expectedOutput: {
                    spreadsheetId: SAMPLE_SPREADSHEET_ID,
                    valueRanges: [
                        {
                            range: "Sheet1!A1:B3",
                            majorDimension: "ROWS",
                            values: [
                                ["Name", "Department"],
                                ["Alice", "Engineering"],
                                ["Bob", "Marketing"]
                            ]
                        },
                        {
                            range: "Sheet1!D1:D3",
                            majorDimension: "ROWS",
                            values: [["Start Date"], ["2023-01-15"], ["2022-06-01"]]
                        },
                        {
                            range: "Sheet2!A1:C2",
                            majorDimension: "ROWS",
                            values: [
                                ["Product", "Price", "Stock"],
                                ["Widget", "29.99", "150"]
                            ]
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "spreadsheet_not_found",
                description: "Spreadsheet does not exist",
                input: {
                    spreadsheetId: "nonexistent-spreadsheet",
                    ranges: ["Sheet1!A1:B3"]
                },
                expectedError: {
                    type: "not_found",
                    message: "Requested entity was not found.",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "batchUpdateValues",
        provider: "google-sheets",
        validCases: [
            {
                name: "update_multiple_ranges",
                description: "Update values in multiple ranges",
                input: {
                    spreadsheetId: SAMPLE_SPREADSHEET_ID,
                    data: [
                        { range: "Sheet1!A2", values: [["Updated Alice"]] },
                        { range: "Sheet1!C2", values: [["98000"]] },
                        { range: "Sheet2!B2", values: [["34.99"]] }
                    ],
                    valueInputOption: "USER_ENTERED"
                },
                expectedOutput: {
                    spreadsheetId: SAMPLE_SPREADSHEET_ID,
                    totalUpdatedRows: 3,
                    totalUpdatedColumns: 3,
                    totalUpdatedCells: 3,
                    totalUpdatedSheets: 2,
                    responses: [
                        {
                            spreadsheetId: SAMPLE_SPREADSHEET_ID,
                            updatedRange: "Sheet1!A2",
                            updatedCells: 1
                        },
                        {
                            spreadsheetId: SAMPLE_SPREADSHEET_ID,
                            updatedRange: "Sheet1!C2",
                            updatedCells: 1
                        },
                        {
                            spreadsheetId: SAMPLE_SPREADSHEET_ID,
                            updatedRange: "Sheet2!B2",
                            updatedCells: 1
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "permission_denied",
                description: "No permission to edit spreadsheet",
                input: {
                    spreadsheetId: "test-spreadsheet-id",
                    data: [{ range: "Sheet1!A1", values: [["test"]] }],
                    valueInputOption: "USER_ENTERED"
                },
                expectedError: {
                    type: "permission",
                    message: "The caller does not have permission",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "batchClearValues",
        provider: "google-sheets",
        validCases: [
            {
                name: "clear_multiple_ranges",
                description: "Clear values from multiple ranges",
                input: {
                    spreadsheetId: SAMPLE_SPREADSHEET_ID,
                    ranges: ["Sheet1!A10:D20", "Sheet2!A5:C10"]
                },
                expectedOutput: {
                    spreadsheetId: SAMPLE_SPREADSHEET_ID,
                    clearedRanges: ["Sheet1!A10:D20", "Sheet2!A5:C10"]
                }
            }
        ],
        errorCases: [
            {
                name: "spreadsheet_not_found",
                description: "Spreadsheet does not exist",
                input: {
                    spreadsheetId: "nonexistent-spreadsheet",
                    ranges: ["Sheet1!A1:B2"]
                },
                expectedError: {
                    type: "not_found",
                    message: "Requested entity was not found.",
                    retryable: false
                }
            }
        ]
    },

    // ========== FORMATTING OPERATIONS ==========
    {
        operationId: "formatCells",
        provider: "google-sheets",
        validCases: [
            {
                name: "format_header_row",
                description: "Apply bold and background color to header",
                input: {
                    spreadsheetId: SAMPLE_SPREADSHEET_ID,
                    sheetId: 0,
                    range: {
                        startRowIndex: 0,
                        endRowIndex: 1,
                        startColumnIndex: 0,
                        endColumnIndex: 4
                    },
                    format: {
                        backgroundColor: { red: 0.2, green: 0.4, blue: 0.8 },
                        textFormat: {
                            bold: true,
                            foregroundColor: { red: 1, green: 1, blue: 1 }
                        }
                    }
                },
                expectedOutput: {
                    spreadsheetId: SAMPLE_SPREADSHEET_ID,
                    replies: [{}]
                }
            },
            {
                name: "format_currency",
                description: "Format cells as currency",
                input: {
                    spreadsheetId: SAMPLE_SPREADSHEET_ID,
                    sheetId: 0,
                    range: {
                        startRowIndex: 1,
                        endRowIndex: 10,
                        startColumnIndex: 2,
                        endColumnIndex: 3
                    },
                    format: {
                        numberFormat: {
                            type: "CURRENCY",
                            pattern: "$#,##0.00"
                        }
                    }
                },
                expectedOutput: {
                    spreadsheetId: SAMPLE_SPREADSHEET_ID,
                    replies: [{}]
                }
            }
        ],
        errorCases: [
            {
                name: "sheet_not_found",
                description: "Sheet does not exist",
                input: {
                    spreadsheetId: "test-spreadsheet-id",
                    sheetId: 999999,
                    range: {
                        startRowIndex: 0,
                        endRowIndex: 1,
                        startColumnIndex: 0,
                        endColumnIndex: 4
                    },
                    format: { textFormat: { bold: true } }
                },
                expectedError: {
                    type: "not_found",
                    message: "Sheet with ID 999999 not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "mergeCells",
        provider: "google-sheets",
        validCases: [
            {
                name: "merge_title_cells",
                description: "Merge cells for a title row",
                input: {
                    spreadsheetId: SAMPLE_SPREADSHEET_ID,
                    sheetId: 0,
                    range: {
                        startRowIndex: 0,
                        endRowIndex: 1,
                        startColumnIndex: 0,
                        endColumnIndex: 4
                    },
                    mergeType: "MERGE_ALL"
                },
                expectedOutput: {
                    spreadsheetId: SAMPLE_SPREADSHEET_ID,
                    replies: [{}]
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_range",
                description: "Invalid merge range",
                input: {
                    spreadsheetId: "test-spreadsheet-id",
                    sheetId: 0,
                    range: {
                        startRowIndex: 5,
                        endRowIndex: 2,
                        startColumnIndex: 0,
                        endColumnIndex: 4
                    },
                    mergeType: "MERGE_ALL"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid range: startRowIndex must be less than endRowIndex",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "unmergeCells",
        provider: "google-sheets",
        validCases: [
            {
                name: "unmerge_cells",
                description: "Unmerge previously merged cells",
                input: {
                    spreadsheetId: SAMPLE_SPREADSHEET_ID,
                    sheetId: 0,
                    range: {
                        startRowIndex: 0,
                        endRowIndex: 1,
                        startColumnIndex: 0,
                        endColumnIndex: 4
                    }
                },
                expectedOutput: {
                    spreadsheetId: SAMPLE_SPREADSHEET_ID,
                    replies: [{}]
                }
            }
        ],
        errorCases: [
            {
                name: "no_merged_cells",
                description: "No merged cells in range to unmerge",
                input: {
                    spreadsheetId: "test-spreadsheet-id",
                    sheetId: 0,
                    range: {
                        startRowIndex: 0,
                        endRowIndex: 1,
                        startColumnIndex: 0,
                        endColumnIndex: 4
                    }
                },
                expectedError: {
                    type: "validation",
                    message: "No merged cells found in the specified range",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "autoResize",
        provider: "google-sheets",
        validCases: [
            {
                name: "auto_resize_columns",
                description: "Auto-resize columns to fit content",
                input: {
                    spreadsheetId: SAMPLE_SPREADSHEET_ID,
                    sheetId: 0,
                    dimension: "COLUMNS",
                    startIndex: 0,
                    endIndex: 4
                },
                expectedOutput: {
                    spreadsheetId: SAMPLE_SPREADSHEET_ID,
                    replies: [{}]
                }
            },
            {
                name: "auto_resize_rows",
                description: "Auto-resize rows to fit content",
                input: {
                    spreadsheetId: SAMPLE_SPREADSHEET_ID,
                    sheetId: 0,
                    dimension: "ROWS",
                    startIndex: 0,
                    endIndex: 10
                },
                expectedOutput: {
                    spreadsheetId: SAMPLE_SPREADSHEET_ID,
                    replies: [{}]
                }
            }
        ],
        errorCases: [
            {
                name: "sheet_not_found",
                description: "Sheet does not exist",
                input: {
                    spreadsheetId: "test-spreadsheet-id",
                    sheetId: 999999,
                    dimension: "COLUMNS",
                    startIndex: 0,
                    endIndex: 4
                },
                expectedError: {
                    type: "not_found",
                    message: "Sheet with ID 999999 not found",
                    retryable: false
                }
            }
        ]
    },

    // ========== BATCH UPDATE OPERATIONS ==========
    {
        operationId: "batchUpdateSpreadsheet",
        provider: "google-sheets",
        validCases: [
            {
                name: "multiple_updates",
                description: "Apply multiple updates in one request",
                input: {
                    spreadsheetId: SAMPLE_SPREADSHEET_ID,
                    requests: [
                        {
                            updateSheetProperties: {
                                properties: { sheetId: 0, title: "Updated Title" },
                                fields: "title"
                            }
                        },
                        {
                            repeatCell: {
                                range: {
                                    sheetId: 0,
                                    startRowIndex: 0,
                                    endRowIndex: 1
                                },
                                cell: {
                                    userEnteredFormat: {
                                        textFormat: { bold: true }
                                    }
                                },
                                fields: "userEnteredFormat.textFormat.bold"
                            }
                        }
                    ]
                },
                expectedOutput: {
                    spreadsheetId: SAMPLE_SPREADSHEET_ID,
                    replies: [{}, {}],
                    updatedSpreadsheet: {
                        spreadsheetId: SAMPLE_SPREADSHEET_ID,
                        properties: {
                            title: "Sales Data 2024"
                        }
                    }
                }
            },
            {
                name: "add_conditional_formatting",
                description: "Add conditional formatting rule",
                input: {
                    spreadsheetId: SAMPLE_SPREADSHEET_ID,
                    requests: [
                        {
                            addConditionalFormatRule: {
                                rule: {
                                    ranges: [
                                        {
                                            sheetId: 0,
                                            startRowIndex: 1,
                                            endRowIndex: 100,
                                            startColumnIndex: 2,
                                            endColumnIndex: 3
                                        }
                                    ],
                                    booleanRule: {
                                        condition: {
                                            type: "NUMBER_GREATER",
                                            values: [{ userEnteredValue: "100000" }]
                                        },
                                        format: {
                                            backgroundColor: { red: 0.8, green: 1, blue: 0.8 }
                                        }
                                    }
                                },
                                index: 0
                            }
                        }
                    ]
                },
                expectedOutput: {
                    spreadsheetId: SAMPLE_SPREADSHEET_ID,
                    replies: [{}]
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_request",
                description: "Invalid batch update request",
                input: {
                    spreadsheetId: SAMPLE_SPREADSHEET_ID,
                    requests: [
                        {
                            updateSheetProperties: {
                                properties: { sheetId: 999999 },
                                fields: "title"
                            }
                        }
                    ]
                },
                expectedError: {
                    type: "validation",
                    message: "No sheet with id: 999999",
                    retryable: false
                }
            }
        ]
    }
];
