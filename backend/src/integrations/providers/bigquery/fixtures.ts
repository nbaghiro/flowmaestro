/**
 * BigQuery Provider Test Fixtures
 *
 * Comprehensive test data for all BigQuery operations including
 * query execution, dataset/table management, and streaming inserts.
 */

import type { TestFixture } from "../../sandbox";

export const bigqueryFixtures: TestFixture[] = [
    // ==================== QUERY ====================
    {
        operationId: "query",
        provider: "bigquery",
        validCases: [
            {
                name: "select_all_users",
                description: "Query all users from a table",
                input: {
                    query: "SELECT * FROM `my-project.my_dataset.users` LIMIT 10",
                    returnFormat: "array"
                },
                expectedOutput: {
                    result: [
                        {
                            id: 1,
                            email: "john.doe@example.com",
                            name: "John Doe",
                            created_at: "2024-02-15T10:30:00Z"
                        },
                        {
                            id: 2,
                            email: "jane.smith@example.com",
                            name: "Jane Smith",
                            created_at: "2024-02-14T08:15:00Z"
                        },
                        {
                            id: 3,
                            email: "mike.wilson@example.com",
                            name: "Mike Wilson",
                            created_at: "2024-02-13T14:45:00Z"
                        }
                    ],
                    columns: [
                        { name: "id", type: "INTEGER" },
                        { name: "email", type: "STRING" },
                        { name: "name", type: "STRING" },
                        { name: "created_at", type: "TIMESTAMP" }
                    ],
                    count: 3,
                    totalBytesProcessed: 1024
                }
            },
            {
                name: "select_with_filter",
                description: "Query with WHERE clause filter",
                input: {
                    query: "SELECT id, name, amount FROM `my-project.my_dataset.orders` WHERE status = 'completed' AND amount > 100",
                    returnFormat: "array"
                },
                expectedOutput: {
                    result: [
                        { id: 101, name: "Order A", amount: 250.0 },
                        { id: 105, name: "Order B", amount: 175.5 },
                        { id: 112, name: "Order C", amount: 450.0 }
                    ],
                    columns: [
                        { name: "id", type: "INTEGER" },
                        { name: "name", type: "STRING" },
                        { name: "amount", type: "FLOAT" }
                    ],
                    count: 3,
                    totalBytesProcessed: 512
                }
            },
            {
                name: "select_single_row",
                description: "Query returning single row",
                input: {
                    query: "SELECT * FROM `my-project.my_dataset.users` WHERE id = 1",
                    returnFormat: "single"
                },
                expectedOutput: {
                    result: {
                        id: 1,
                        email: "john.doe@example.com",
                        name: "John Doe",
                        created_at: "2024-02-15T10:30:00Z"
                    },
                    columns: [
                        { name: "id", type: "INTEGER" },
                        { name: "email", type: "STRING" },
                        { name: "name", type: "STRING" },
                        { name: "created_at", type: "TIMESTAMP" }
                    ],
                    count: 1,
                    totalBytesProcessed: 256
                }
            },
            {
                name: "count_query",
                description: "Query with count return format",
                input: {
                    query: "SELECT COUNT(*) as count FROM `my-project.my_dataset.users` WHERE status = 'active'",
                    returnFormat: "count"
                },
                expectedOutput: {
                    result: 145,
                    columns: [{ name: "count", type: "INTEGER" }],
                    count: 145,
                    totalBytesProcessed: 128
                }
            },
            {
                name: "aggregation_query",
                description: "Query with GROUP BY aggregation",
                input: {
                    query: "SELECT category, SUM(revenue) as total_revenue, COUNT(*) as order_count FROM `my-project.my_dataset.sales` GROUP BY category ORDER BY total_revenue DESC",
                    returnFormat: "array"
                },
                expectedOutput: {
                    result: [
                        { category: "Electronics", total_revenue: 125000.0, order_count: 450 },
                        { category: "Clothing", total_revenue: 85000.0, order_count: 1200 },
                        { category: "Home & Garden", total_revenue: 45000.0, order_count: 320 }
                    ],
                    columns: [
                        { name: "category", type: "STRING" },
                        { name: "total_revenue", type: "FLOAT" },
                        { name: "order_count", type: "INTEGER" }
                    ],
                    count: 3,
                    totalBytesProcessed: 2048
                }
            }
        ],
        errorCases: [
            {
                name: "syntax_error",
                description: "SQL syntax error in query",
                input: {
                    query: "SELEC * FORM users",
                    returnFormat: "array"
                },
                expectedError: {
                    type: "validation",
                    message: "Syntax error: Expected keyword SELECT but got identifier 'SELEC'",
                    retryable: false
                }
            },
            {
                name: "table_not_found",
                description: "Query references non-existent table",
                input: {
                    query: "SELECT * FROM `my-project.my_dataset.nonexistent_table`",
                    returnFormat: "array"
                },
                expectedError: {
                    type: "not_found",
                    message: "Not found: Table my-project:my_dataset.nonexistent_table",
                    retryable: false
                }
            },
            {
                name: "permission_denied",
                description: "User lacks permission to query table",
                input: {
                    query: "SELECT * FROM `restricted-project.private_dataset.sensitive_data`",
                    returnFormat: "array"
                },
                expectedError: {
                    type: "permission",
                    message:
                        "Access Denied: Table restricted-project:private_dataset.sensitive_data",
                    retryable: false
                }
            },
            {
                name: "query_timeout",
                description: "Query execution timed out",
                input: {
                    query: "SELECT * FROM `my-project.my_dataset.very_large_table`",
                    timeout: 100
                },
                expectedError: {
                    type: "server_error",
                    message: "Query timed out",
                    retryable: true
                }
            }
        ],
        edgeCases: [
            {
                name: "empty_result_set",
                description: "Query returns no rows",
                input: {
                    query: "SELECT * FROM `my-project.my_dataset.users` WHERE id = -999",
                    returnFormat: "array"
                },
                expectedOutput: {
                    result: [],
                    columns: [
                        { name: "id", type: "INTEGER" },
                        { name: "email", type: "STRING" },
                        { name: "name", type: "STRING" },
                        { name: "created_at", type: "TIMESTAMP" }
                    ],
                    count: 0,
                    totalBytesProcessed: 0
                }
            },
            {
                name: "null_values",
                description: "Query with NULL values in result",
                input: {
                    query: "SELECT id, name, optional_field FROM `my-project.my_dataset.users` WHERE optional_field IS NULL LIMIT 1",
                    returnFormat: "single"
                },
                expectedOutput: {
                    result: {
                        id: 5,
                        name: "Test User",
                        optional_field: null
                    },
                    columns: [
                        { name: "id", type: "INTEGER" },
                        { name: "name", type: "STRING" },
                        { name: "optional_field", type: "STRING" }
                    ],
                    count: 1,
                    totalBytesProcessed: 64
                }
            }
        ]
    },

    // ==================== LIST DATASETS ====================
    {
        operationId: "listDatasets",
        provider: "bigquery",
        validCases: [
            {
                name: "list_all_datasets",
                description: "List all datasets in project",
                input: {},
                expectedOutput: {
                    datasets: [
                        {
                            id: "analytics",
                            location: "US",
                            createdAt: "2024-01-15T10:00:00Z",
                            description: "Analytics data warehouse"
                        },
                        {
                            id: "raw_data",
                            location: "US",
                            createdAt: "2024-01-10T08:30:00Z",
                            description: "Raw ingested data"
                        },
                        {
                            id: "staging",
                            location: "US",
                            createdAt: "2024-01-12T14:00:00Z",
                            description: "Staging tables for ETL"
                        }
                    ],
                    count: 3
                }
            },
            {
                name: "list_datasets_with_limit",
                description: "List datasets with max results",
                input: {
                    maxResults: 2
                },
                expectedOutput: {
                    datasets: [
                        {
                            id: "analytics",
                            location: "US",
                            createdAt: "2024-01-15T10:00:00Z",
                            description: "Analytics data warehouse"
                        },
                        {
                            id: "raw_data",
                            location: "US",
                            createdAt: "2024-01-10T08:30:00Z",
                            description: "Raw ingested data"
                        }
                    ],
                    count: 2
                }
            }
        ],
        errorCases: [
            {
                name: "permission_denied",
                description: "User lacks permission to list datasets",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "Access Denied: User does not have permission to list datasets",
                    retryable: false
                }
            }
        ],
        edgeCases: []
    },

    // ==================== LIST TABLES ====================
    {
        operationId: "listTables",
        provider: "bigquery",
        validCases: [
            {
                name: "list_dataset_tables",
                description: "List all tables in a dataset",
                input: {
                    datasetId: "analytics"
                },
                expectedOutput: {
                    tables: [
                        {
                            id: "users",
                            datasetId: "analytics",
                            type: "TABLE",
                            createdAt: "2024-02-01T09:00:00Z",
                            numRows: 50000
                        },
                        {
                            id: "events",
                            datasetId: "analytics",
                            type: "TABLE",
                            createdAt: "2024-02-01T09:05:00Z",
                            numRows: 1500000
                        },
                        {
                            id: "daily_summary",
                            datasetId: "analytics",
                            type: "VIEW",
                            createdAt: "2024-02-02T10:00:00Z"
                        }
                    ],
                    count: 3
                }
            }
        ],
        errorCases: [
            {
                name: "dataset_not_found",
                description: "Dataset does not exist",
                input: {
                    datasetId: "nonexistent_dataset"
                },
                expectedError: {
                    type: "not_found",
                    message: "Not found: Dataset my-project:nonexistent_dataset",
                    retryable: false
                }
            }
        ],
        edgeCases: [
            {
                name: "empty_dataset",
                description: "Dataset has no tables",
                input: {
                    datasetId: "empty_dataset"
                },
                expectedOutput: {
                    tables: [],
                    count: 0
                }
            }
        ]
    },

    // ==================== GET TABLE SCHEMA ====================
    {
        operationId: "getTableSchema",
        provider: "bigquery",
        validCases: [
            {
                name: "get_simple_schema",
                description: "Get schema for a simple table",
                input: {
                    datasetId: "analytics",
                    tableId: "users"
                },
                expectedOutput: {
                    schema: [
                        { name: "id", type: "INTEGER", mode: "REQUIRED" },
                        { name: "email", type: "STRING", mode: "REQUIRED" },
                        { name: "name", type: "STRING", mode: "NULLABLE" },
                        { name: "created_at", type: "TIMESTAMP", mode: "REQUIRED" },
                        { name: "metadata", type: "JSON", mode: "NULLABLE" }
                    ],
                    tableId: "users",
                    datasetId: "analytics",
                    numRows: 50000,
                    numBytes: 5242880
                }
            },
            {
                name: "get_nested_schema",
                description: "Get schema for a table with nested fields",
                input: {
                    datasetId: "analytics",
                    tableId: "events"
                },
                expectedOutput: {
                    schema: [
                        { name: "event_id", type: "STRING", mode: "REQUIRED" },
                        { name: "event_type", type: "STRING", mode: "REQUIRED" },
                        {
                            name: "properties",
                            type: "RECORD",
                            mode: "NULLABLE",
                            fields: [
                                { name: "page_url", type: "STRING", mode: "NULLABLE" },
                                { name: "referrer", type: "STRING", mode: "NULLABLE" }
                            ]
                        },
                        { name: "timestamp", type: "TIMESTAMP", mode: "REQUIRED" }
                    ],
                    tableId: "events",
                    datasetId: "analytics",
                    numRows: 1500000,
                    numBytes: 157286400
                }
            }
        ],
        errorCases: [
            {
                name: "table_not_found",
                description: "Table does not exist",
                input: {
                    datasetId: "analytics",
                    tableId: "nonexistent_table"
                },
                expectedError: {
                    type: "not_found",
                    message: "Not found: Table my-project:analytics.nonexistent_table",
                    retryable: false
                }
            }
        ],
        edgeCases: []
    },

    // ==================== INSERT ====================
    {
        operationId: "insert",
        provider: "bigquery",
        validCases: [
            {
                name: "insert_single_row",
                description: "Insert a single row using streaming insert",
                input: {
                    datasetId: "analytics",
                    tableId: "users",
                    rows: [
                        {
                            id: 100,
                            email: "new.user@example.com",
                            name: "New User",
                            created_at: "2024-02-20T10:00:00Z"
                        }
                    ]
                },
                expectedOutput: {
                    insertedCount: 1
                }
            },
            {
                name: "insert_multiple_rows",
                description: "Bulk insert multiple rows",
                input: {
                    datasetId: "analytics",
                    tableId: "events",
                    rows: [
                        {
                            event_id: "evt-001",
                            event_type: "page_view",
                            properties: { page_url: "/home" },
                            timestamp: "2024-02-20T10:00:00Z"
                        },
                        {
                            event_id: "evt-002",
                            event_type: "click",
                            properties: { page_url: "/products" },
                            timestamp: "2024-02-20T10:00:05Z"
                        },
                        {
                            event_id: "evt-003",
                            event_type: "page_view",
                            properties: { page_url: "/checkout" },
                            timestamp: "2024-02-20T10:00:10Z"
                        }
                    ]
                },
                expectedOutput: {
                    insertedCount: 3
                }
            }
        ],
        errorCases: [
            {
                name: "table_not_found",
                description: "Insert into non-existent table",
                input: {
                    datasetId: "analytics",
                    tableId: "nonexistent",
                    rows: [{ col1: "value1" }]
                },
                expectedError: {
                    type: "not_found",
                    message: "Not found: Table my-project:analytics.nonexistent",
                    retryable: false
                }
            },
            {
                name: "invalid_data",
                description: "Insert with invalid data types",
                input: {
                    datasetId: "analytics",
                    tableId: "users",
                    rows: [{ id: "not-a-number", email: "test@example.com" }]
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid value for field id: expected INTEGER",
                    retryable: false
                }
            }
        ],
        edgeCases: []
    }
];
