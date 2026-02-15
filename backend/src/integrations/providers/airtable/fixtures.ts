/**
 * Airtable Provider Test Fixtures
 *
 * Based on official Airtable API documentation:
 * - Create Record: https://airtable.com/developers/web/api/create-records
 * - List Records: https://airtable.com/developers/web/api/list-records
 * - Get Record: https://airtable.com/developers/web/api/get-record
 * - Delete Record: https://airtable.com/developers/web/api/delete-record
 */

import type { TestFixture } from "../../sandbox";

export const airtableFixtures: TestFixture[] = [
    {
        operationId: "createRecord",
        provider: "airtable",
        validCases: [
            {
                name: "simple_record",
                description: "Create a simple record with text fields",
                input: {
                    baseId: "appXXXXXXXXXXXXXX",
                    tableId: "tblYYYYYYYYYYYYYY",
                    fields: {
                        Name: "Test Record",
                        Status: "Active",
                        Priority: "High"
                    }
                },
                expectedOutput: {
                    id: "recZZZZZZZZZZZZZZ",
                    fields: {
                        Name: "Test Record",
                        Status: "Active",
                        Priority: "High"
                    },
                    createdTime: "{{iso}}"
                }
            },
            {
                name: "record_with_linked_records",
                description: "Create a record with linked record references",
                input: {
                    baseId: "appXXXXXXXXXXXXXX",
                    tableId: "tblTasks",
                    fields: {
                        Name: "Task with Project",
                        Project: ["recProject123456"],
                        Assignee: ["recUser78901234"]
                    }
                },
                expectedOutput: {
                    id: "recTaskABCDEFGH",
                    fields: {
                        Name: "Task with Project",
                        Project: ["recProject123456"],
                        Assignee: ["recUser78901234"]
                    },
                    createdTime: "{{iso}}"
                }
            },
            {
                name: "record_with_various_field_types",
                description: "Create a record with multiple field types",
                input: {
                    baseId: "appXXXXXXXXXXXXXX",
                    tableId: "tblProducts",
                    fields: {
                        Name: "Premium Widget",
                        Price: 99.99,
                        "In Stock": true,
                        "Launch Date": "2024-02-01",
                        Tags: ["featured", "new"],
                        Image: [
                            {
                                url: "https://example.com/widget.jpg"
                            }
                        ]
                    }
                },
                expectedOutput: {
                    id: "recProductXYZ123",
                    fields: {
                        Name: "Premium Widget",
                        Price: 99.99,
                        "In Stock": true,
                        "Launch Date": "2024-02-01",
                        Tags: ["featured", "new"],
                        Image: [
                            {
                                id: "attXXXXXXXXXXXXXX",
                                url: "https://example.com/widget.jpg",
                                filename: "widget.jpg",
                                size: 12345,
                                type: "image/jpeg",
                                thumbnails: {
                                    small: {
                                        url: "https://dl.airtable.com/.attachmentThumbnails/small",
                                        width: 36,
                                        height: 36
                                    },
                                    large: {
                                        url: "https://dl.airtable.com/.attachmentThumbnails/large",
                                        width: 512,
                                        height: 512
                                    }
                                }
                            }
                        ]
                    },
                    createdTime: "{{iso}}"
                }
            }
        ],
        errorCases: [
            {
                name: "base_not_found",
                description: "Base does not exist or no access",
                input: {
                    baseId: "appNonexistent123",
                    tableId: "tbl456def",
                    fields: { Name: "Test" }
                },
                expectedError: {
                    type: "not_found",
                    message: "Could not find base appNonexistent123",
                    retryable: false
                }
            },
            {
                name: "table_not_found",
                description: "Table does not exist in base",
                input: {
                    baseId: "appXXXXXXXXXXXXXX",
                    tableId: "tblNonexistent",
                    fields: { Name: "Test" }
                },
                expectedError: {
                    type: "not_found",
                    message: "Could not find table tblNonexistent in base appXXXXXXXXXXXXXX",
                    retryable: false
                }
            },
            {
                name: "invalid_field",
                description: "Field does not exist in table",
                input: {
                    baseId: "appXXXXXXXXXXXXXX",
                    tableId: "tblYYYYYYYYYYYYYY",
                    fields: { InvalidFieldName: "Test" }
                },
                expectedError: {
                    type: "validation",
                    message: 'Unknown field name: "InvalidFieldName"',
                    retryable: false
                }
            },
            {
                name: "invalid_field_value",
                description: "Field value has wrong type",
                input: {
                    baseId: "appXXXXXXXXXXXXXX",
                    tableId: "tblYYYYYYYYYYYYYY",
                    fields: {
                        Name: "Test",
                        Priority: 123 // Should be string for Single Select
                    }
                },
                expectedError: {
                    type: "validation",
                    message: 'Field "Priority" cannot accept the provided value',
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded (5 requests per second per base)",
                input: {
                    baseId: "appXXXXXXXXXXXXXX",
                    tableId: "tblYYYYYYYYYYYYYY",
                    fields: { Name: "Test" }
                },
                expectedError: {
                    type: "rate_limit",
                    message: "You are sending requests too quickly. Please slow down.",
                    retryable: true
                }
            },
            {
                name: "permission",
                description: "Invalid or expired API key",
                input: {
                    baseId: "appXXXXXXXXXXXXXX",
                    tableId: "tblYYYYYYYYYYYYYY",
                    fields: { Name: "Test" }
                },
                expectedError: {
                    type: "permission",
                    message: "Authentication required",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "listRecords",
        provider: "airtable",
        // Filterable data configuration for dynamic filtering/pagination
        filterableData: {
            recordsField: "records",
            offsetField: "offset",
            defaultPageSize: 100,
            maxPageSize: 100,
            pageSizeParam: "pageSize",
            offsetParam: "offset",
            filterConfig: {
                type: "airtable"
            },
            // Base dataset with enough records to test pagination and filtering
            records: [
                {
                    id: "recwPQIfs4wKPyc9D",
                    fields: {
                        Name: "Record 1",
                        Status: "Active",
                        Priority: "High"
                    },
                    createdTime: "2024-01-14T22:04:31.000Z",
                    // Internal metadata for view filtering (not returned in response)
                    _views: ["All Records", "Active Tasks"]
                },
                {
                    id: "rechOLltN9SpPHq5o",
                    fields: {
                        Name: "Record 2",
                        Status: "Pending",
                        Priority: "Medium"
                    },
                    createdTime: "2024-01-15T15:21:50.000Z",
                    _views: ["All Records"]
                },
                {
                    id: "recABC123456789",
                    fields: {
                        Name: "Record 3",
                        Status: "Active",
                        Priority: "Low"
                    },
                    createdTime: "2024-01-16T09:15:00.000Z",
                    _views: ["All Records", "Active Tasks"]
                },
                {
                    id: "recDEF987654321",
                    fields: {
                        Name: "Record 4",
                        Status: "Completed",
                        Priority: "High"
                    },
                    createdTime: "2024-01-17T14:30:00.000Z",
                    _views: ["All Records", "Completed Tasks"]
                },
                {
                    id: "recGHI456123789",
                    fields: {
                        Name: "Record 5",
                        Status: "Active",
                        Priority: "Medium"
                    },
                    createdTime: "2024-01-18T11:45:00.000Z",
                    _views: ["All Records", "Active Tasks"]
                }
            ]
        },
        validCases: [
            {
                name: "list_all_records",
                description: "List all records in a table",
                input: {
                    baseId: "appXXXXXXXXXXXXXX",
                    tableId: "tblYYYYYYYYYYYYYY"
                },
                // Note: When filterableData is present, expectedOutput is used for reference only
                // The actual response is dynamically generated from filterableData
                expectedOutput: {
                    records: [
                        {
                            id: "recwPQIfs4wKPyc9D",
                            fields: {
                                Name: "Record 1",
                                Status: "Active",
                                Priority: "High"
                            },
                            createdTime: "2024-01-14T22:04:31.000Z"
                        },
                        {
                            id: "rechOLltN9SpPHq5o",
                            fields: {
                                Name: "Record 2",
                                Status: "Pending",
                                Priority: "Medium"
                            },
                            createdTime: "2024-01-15T15:21:50.000Z"
                        }
                    ]
                }
            },
            {
                name: "list_with_pagination",
                description:
                    "List records with pagination - returns first 2 records with offset for next page",
                input: {
                    baseId: "appXXXXXXXXXXXXXX",
                    tableId: "tblYYYYYYYYYYYYYY",
                    pageSize: 2
                },
                expectedOutput: {
                    records: [
                        {
                            id: "recwPQIfs4wKPyc9D",
                            fields: {
                                Name: "Record 1",
                                Status: "Active"
                            },
                            createdTime: "2024-01-14T22:04:31.000Z"
                        },
                        {
                            id: "rechOLltN9SpPHq5o",
                            fields: {
                                Name: "Record 2",
                                Status: "Pending"
                            },
                            createdTime: "2024-01-15T15:21:50.000Z"
                        }
                    ],
                    offset: "itrXXXXXXXXXXXXXX/rechOLltN9SpPHq5o"
                }
            },
            {
                name: "list_with_filter",
                description: "List records with filterByFormula - only Active status records",
                input: {
                    baseId: "appXXXXXXXXXXXXXX",
                    tableId: "tblYYYYYYYYYYYYYY",
                    filterByFormula: "{Status} = 'Active'"
                },
                expectedOutput: {
                    records: [
                        {
                            id: "recwPQIfs4wKPyc9D",
                            fields: {
                                Name: "Record 1",
                                Status: "Active",
                                Priority: "High"
                            },
                            createdTime: "2024-01-14T22:04:31.000Z"
                        }
                    ]
                }
            },
            {
                name: "list_with_view",
                description:
                    "List records from a specific view - only records in Active Tasks view",
                input: {
                    baseId: "appXXXXXXXXXXXXXX",
                    tableId: "tblYYYYYYYYYYYYYY",
                    view: "Active Tasks"
                },
                expectedOutput: {
                    records: [
                        {
                            id: "recwPQIfs4wKPyc9D",
                            fields: {
                                Name: "Record 1",
                                Status: "Active",
                                Priority: "High"
                            },
                            createdTime: "2024-01-14T22:04:31.000Z"
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_formula",
                description: "Invalid filterByFormula syntax",
                input: {
                    baseId: "appXXXXXXXXXXXXXX",
                    tableId: "tblYYYYYYYYYYYYYY",
                    filterByFormula: "INVALID FORMULA"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid formula: INVALID FORMULA",
                    retryable: false
                }
            },
            {
                name: "view_not_found",
                description: "View does not exist",
                input: {
                    baseId: "appXXXXXXXXXXXXXX",
                    tableId: "tblYYYYYYYYYYYYYY",
                    view: "Nonexistent View"
                },
                expectedError: {
                    type: "not_found",
                    message: 'Could not find view "Nonexistent View" in table tblYYYYYYYYYYYYYY',
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getRecord",
        provider: "airtable",
        validCases: [
            {
                name: "get_record_by_id",
                description: "Get a single record by ID",
                input: {
                    baseId: "appXXXXXXXXXXXXXX",
                    tableId: "tblYYYYYYYYYYYYYY",
                    recordId: "recwPQIfs4wKPyc9D"
                },
                expectedOutput: {
                    id: "recwPQIfs4wKPyc9D",
                    fields: {
                        Name: "Test Record",
                        Status: "Active",
                        Priority: "High",
                        Description: "A detailed description of this record.",
                        "Created By": {
                            id: "usrXXXXXXXXXXXXXX",
                            email: "user@example.com",
                            name: "John Doe"
                        },
                        "Last Modified": "2024-01-20T15:30:00.000Z"
                    },
                    createdTime: "2024-01-14T22:04:31.000Z"
                }
            }
        ],
        errorCases: [
            {
                name: "record_not_found",
                description: "Record does not exist",
                input: {
                    baseId: "appXXXXXXXXXXXXXX",
                    tableId: "tblYYYYYYYYYYYYYY",
                    recordId: "recNonexistent123"
                },
                expectedError: {
                    type: "not_found",
                    message: "Could not find record recNonexistent123 in table tblYYYYYYYYYYYYYY",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "updateRecord",
        provider: "airtable",
        validCases: [
            {
                name: "update_record_fields",
                description: "Update specific fields on a record",
                input: {
                    baseId: "appXXXXXXXXXXXXXX",
                    tableId: "tblYYYYYYYYYYYYYY",
                    recordId: "recwPQIfs4wKPyc9D",
                    fields: {
                        Status: "Completed",
                        Priority: "Low"
                    }
                },
                expectedOutput: {
                    id: "recwPQIfs4wKPyc9D",
                    fields: {
                        Name: "Test Record",
                        Status: "Completed",
                        Priority: "Low"
                    },
                    createdTime: "2024-01-14T22:04:31.000Z"
                }
            }
        ],
        errorCases: [
            {
                name: "record_not_found",
                description: "Record does not exist",
                input: {
                    baseId: "appXXXXXXXXXXXXXX",
                    tableId: "tblYYYYYYYYYYYYYY",
                    recordId: "recNonexistent123",
                    fields: { Status: "Active" }
                },
                expectedError: {
                    type: "not_found",
                    message: "Could not find record recNonexistent123",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    baseId: "appXXXXXXXXXXXXXX",
                    tableId: "tblYYYYYYYYYYYYYY",
                    recordId: "recwPQIfs4wKPyc9D",
                    fields: { Status: "Active" }
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after some time.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "deleteRecord",
        provider: "airtable",
        validCases: [
            {
                name: "delete_single_record",
                description: "Delete a single record",
                input: {
                    baseId: "appXXXXXXXXXXXXXX",
                    tableId: "tblYYYYYYYYYYYYYY",
                    recordId: "recwPQIfs4wKPyc9D"
                },
                expectedOutput: {
                    id: "recwPQIfs4wKPyc9D",
                    deleted: true
                }
            }
        ],
        errorCases: [
            {
                name: "record_not_found",
                description: "Record does not exist",
                input: {
                    baseId: "appXXXXXXXXXXXXXX",
                    tableId: "tblYYYYYYYYYYYYYY",
                    recordId: "recNonexistent123"
                },
                expectedError: {
                    type: "not_found",
                    message: "Could not find record recNonexistent123 in table tblYYYYYYYYYYYYYY",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "listBases",
        provider: "airtable",
        validCases: [
            {
                name: "list_all_bases",
                description: "List all accessible bases",
                input: {},
                expectedOutput: {
                    bases: [
                        {
                            id: "appXXXXXXXXXXXXXX",
                            name: "Project Tracker",
                            permissionLevel: "create"
                        },
                        {
                            id: "appYYYYYYYYYYYYYY",
                            name: "CRM Database",
                            permissionLevel: "edit"
                        }
                    ],
                    offset: null
                }
            }
        ],
        errorCases: [
            {
                name: "permission",
                description: "Invalid or expired API key",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "Authentication required",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after some time.",
                    retryable: true
                }
            }
        ]
    }
];
