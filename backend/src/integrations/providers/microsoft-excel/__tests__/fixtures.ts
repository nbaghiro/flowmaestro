/**
 * Microsoft Excel Provider Test Fixtures
 */

import type { TestFixture } from "../../../sandbox";

export const microsoftExcelFixtures: TestFixture[] = [
    {
        operationId: "getWorksheets",
        provider: "microsoft-excel",
        validCases: [
            {
                name: "list_worksheets",
                description: "List all worksheets in a workbook",
                input: {
                    workbookId: "workbook-123"
                },
                expectedOutput: {
                    worksheets: [
                        { id: "sheet-1", name: "Sheet1", position: 0 },
                        { id: "sheet-2", name: "Data", position: 1 },
                        { id: "sheet-3", name: "Summary", position: 2 }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "workbook_not_found",
                description: "Workbook does not exist",
                input: {
                    workbookId: "nonexistent-workbook"
                },
                expectedError: {
                    type: "not_found",
                    message: "Workbook not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "readRange",
        provider: "microsoft-excel",
        validCases: [
            {
                name: "read_cell_range",
                description: "Read a range of cells",
                input: {
                    workbookId: "workbook-123",
                    worksheetId: "sheet-1",
                    range: "A1:C3"
                },
                expectedOutput: {
                    values: [
                        ["Name", "Age", "City"],
                        ["Alice", 30, "New York"],
                        ["Bob", 25, "Los Angeles"]
                    ],
                    address: "Sheet1!A1:C3"
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_range",
                description: "Invalid range format",
                input: {
                    workbookId: "workbook-123",
                    worksheetId: "sheet-1",
                    range: "invalid"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid range format",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "writeRange",
        provider: "microsoft-excel",
        validCases: [
            {
                name: "write_cell_range",
                description: "Write values to a range of cells",
                input: {
                    workbookId: "workbook-123",
                    worksheetId: "sheet-1",
                    range: "A1:B2",
                    values: [
                        ["Header1", "Header2"],
                        ["Value1", "Value2"]
                    ]
                },
                expectedOutput: {
                    updatedRange: "Sheet1!A1:B2",
                    rowCount: 2,
                    columnCount: 2
                }
            }
        ],
        errorCases: [
            {
                name: "dimension_mismatch",
                description: "Values dimensions don't match range",
                input: {
                    workbookId: "workbook-123",
                    worksheetId: "sheet-1",
                    range: "A1:B2",
                    values: [["single"]]
                },
                expectedError: {
                    type: "validation",
                    message: "Value dimensions do not match the specified range",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getTables",
        provider: "microsoft-excel",
        validCases: [
            {
                name: "list_tables",
                description: "List all tables in a worksheet",
                input: {
                    workbookId: "workbook-123",
                    worksheetId: "sheet-1"
                },
                expectedOutput: {
                    tables: [
                        {
                            id: "table-1",
                            name: "SalesData",
                            range: "A1:D100",
                            showHeaders: true
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "worksheet_not_found",
                description: "Worksheet does not exist",
                input: {
                    workbookId: "workbook-123",
                    worksheetId: "nonexistent-sheet"
                },
                expectedError: {
                    type: "not_found",
                    message: "Worksheet not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getTableRows",
        provider: "microsoft-excel",
        validCases: [
            {
                name: "get_table_rows",
                description: "Get rows from a table",
                input: {
                    workbookId: "workbook-123",
                    tableId: "table-1"
                },
                expectedOutput: {
                    rows: [
                        { index: 0, values: ["Product A", 100, 29.99, 2999] },
                        { index: 1, values: ["Product B", 50, 49.99, 2499.5] }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "table_not_found",
                description: "Table does not exist",
                input: {
                    workbookId: "workbook-123",
                    tableId: "nonexistent-table"
                },
                expectedError: {
                    type: "not_found",
                    message: "Table not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "addTableRow",
        provider: "microsoft-excel",
        validCases: [
            {
                name: "add_row_to_table",
                description: "Add a new row to a table",
                input: {
                    workbookId: "workbook-123",
                    tableId: "table-1",
                    values: ["Product C", 75, 39.99, 2999.25]
                },
                expectedOutput: {
                    index: 2,
                    values: ["Product C", 75, 39.99, 2999.25]
                }
            }
        ],
        errorCases: [
            {
                name: "column_count_mismatch",
                description: "Wrong number of values for table columns",
                input: {
                    workbookId: "workbook-123",
                    tableId: "table-1",
                    values: ["Product C", 75]
                },
                expectedError: {
                    type: "validation",
                    message: "Number of values does not match number of table columns",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "createWorksheet",
        provider: "microsoft-excel",
        validCases: [
            {
                name: "create_new_worksheet",
                description: "Create a new worksheet",
                input: {
                    workbookId: "workbook-123",
                    name: "NewSheet"
                },
                expectedOutput: {
                    id: "{{uuid}}",
                    name: "NewSheet",
                    position: 3
                }
            }
        ],
        errorCases: [
            {
                name: "duplicate_name",
                description: "Worksheet name already exists",
                input: {
                    workbookId: "workbook-123",
                    name: "Sheet1"
                },
                expectedError: {
                    type: "validation",
                    message: "A worksheet with this name already exists",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getUsedRange",
        provider: "microsoft-excel",
        validCases: [
            {
                name: "get_used_range",
                description: "Get the used range of a worksheet",
                input: {
                    workbookId: "workbook-123",
                    worksheetId: "sheet-1"
                },
                expectedOutput: {
                    address: "Sheet1!A1:D100",
                    rowCount: 100,
                    columnCount: 4
                }
            }
        ],
        errorCases: [
            {
                name: "worksheet_not_found",
                description: "Worksheet does not exist",
                input: {
                    workbookId: "workbook-123",
                    worksheetId: "nonexistent-sheet"
                },
                expectedError: {
                    type: "not_found",
                    message: "Worksheet not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "clearRange",
        provider: "microsoft-excel",
        validCases: [
            {
                name: "clear_cell_range",
                description: "Clear a range of cells",
                input: {
                    workbookId: "workbook-123",
                    worksheetId: "sheet-1",
                    range: "A1:B10"
                },
                expectedOutput: {
                    clearedRange: "Sheet1!A1:B10"
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_range",
                description: "Invalid range format",
                input: {
                    workbookId: "workbook-123",
                    worksheetId: "sheet-1",
                    range: "invalid"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid range format",
                    retryable: false
                }
            }
        ]
    }
];
