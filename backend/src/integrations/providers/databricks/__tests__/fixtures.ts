/**
 * Databricks Provider Test Fixtures
 *
 * Comprehensive test data for all Databricks SQL operations including
 * query execution, data modification, and catalog management.
 */

import type { TestFixture } from "../../../sandbox";

export const databricksFixtures: TestFixture[] = [
    // ==================== QUERY ====================
    {
        operationId: "query",
        provider: "databricks",
        validCases: [
            {
                name: "select_all_users",
                description: "Query all users from a table",
                input: {
                    query: "SELECT * FROM main.default.users LIMIT 10",
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
                        { name: "id", type: "INT" },
                        { name: "email", type: "STRING" },
                        { name: "name", type: "STRING" },
                        { name: "created_at", type: "TIMESTAMP" }
                    ],
                    count: 3
                }
            },
            {
                name: "select_with_filter",
                description: "Query with WHERE clause filter",
                input: {
                    query: "SELECT id, name, amount FROM main.default.orders WHERE status = 'completed' AND amount > 100",
                    returnFormat: "array"
                },
                expectedOutput: {
                    result: [
                        { id: 101, name: "Order A", amount: 250.0 },
                        { id: 105, name: "Order B", amount: 175.5 },
                        { id: 112, name: "Order C", amount: 450.0 }
                    ],
                    columns: [
                        { name: "id", type: "INT" },
                        { name: "name", type: "STRING" },
                        { name: "amount", type: "DECIMAL" }
                    ],
                    count: 3
                }
            },
            {
                name: "select_single_row",
                description: "Query returning single row",
                input: {
                    query: "SELECT * FROM main.default.users WHERE id = 1",
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
                        { name: "id", type: "INT" },
                        { name: "email", type: "STRING" },
                        { name: "name", type: "STRING" },
                        { name: "created_at", type: "TIMESTAMP" }
                    ],
                    count: 1
                }
            },
            {
                name: "count_query",
                description: "Query with count return format",
                input: {
                    query: "SELECT COUNT(*) as count FROM main.default.users WHERE status = 'active'",
                    returnFormat: "count"
                },
                expectedOutput: {
                    result: 145,
                    columns: [{ name: "count", type: "BIGINT" }],
                    count: 145
                }
            },
            {
                name: "aggregation_query",
                description: "Query with GROUP BY aggregation",
                input: {
                    query: "SELECT category, SUM(revenue) as total_revenue, COUNT(*) as order_count FROM main.default.sales GROUP BY category ORDER BY total_revenue DESC",
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
                        { name: "total_revenue", type: "DECIMAL" },
                        { name: "order_count", type: "BIGINT" }
                    ],
                    count: 3
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
                    message: "SYNTAX_ERROR: Syntax error at or near 'SELEC'",
                    retryable: false
                }
            },
            {
                name: "table_not_found",
                description: "Query references non-existent table",
                input: {
                    query: "SELECT * FROM main.default.nonexistent_table",
                    returnFormat: "array"
                },
                expectedError: {
                    type: "not_found",
                    message: "Table or view 'main.default.nonexistent_table' not found",
                    retryable: false
                }
            },
            {
                name: "warehouse_not_running",
                description: "SQL warehouse is not running",
                input: {
                    query: "SELECT * FROM main.default.users",
                    returnFormat: "array"
                },
                expectedError: {
                    type: "server_error",
                    message:
                        "SQL warehouse is not running. Please start the warehouse and try again.",
                    retryable: true
                }
            },
            {
                name: "query_timeout",
                description: "Query execution timed out",
                input: {
                    query: "SELECT * FROM main.default.very_large_table",
                    timeout: 100
                },
                expectedError: {
                    type: "server_error",
                    message: "Query execution timed out",
                    retryable: true
                }
            }
        ],
        edgeCases: [
            {
                name: "empty_result_set",
                description: "Query returns no rows",
                input: {
                    query: "SELECT * FROM main.default.users WHERE id = -999",
                    returnFormat: "array"
                },
                expectedOutput: {
                    result: [],
                    columns: [
                        { name: "id", type: "INT" },
                        { name: "email", type: "STRING" },
                        { name: "name", type: "STRING" },
                        { name: "created_at", type: "TIMESTAMP" }
                    ],
                    count: 0
                }
            },
            {
                name: "null_values",
                description: "Query with NULL values in result",
                input: {
                    query: "SELECT id, name, optional_field FROM main.default.users WHERE optional_field IS NULL LIMIT 1",
                    returnFormat: "single"
                },
                expectedOutput: {
                    result: {
                        id: 5,
                        name: "Test User",
                        optional_field: null
                    },
                    columns: [
                        { name: "id", type: "INT" },
                        { name: "name", type: "STRING" },
                        { name: "optional_field", type: "STRING" }
                    ],
                    count: 1
                }
            }
        ]
    },

    // ==================== INSERT ====================
    {
        operationId: "insert",
        provider: "databricks",
        validCases: [
            {
                name: "insert_single_row",
                description: "Insert a single row into a table",
                input: {
                    table: "main.default.users",
                    columns: ["email", "name", "status"],
                    values: [["new.user@example.com", "New User", "active"]]
                },
                expectedOutput: {
                    rowsAffected: 1,
                    insertedCount: 1
                }
            },
            {
                name: "insert_multiple_rows",
                description: "Bulk insert multiple rows",
                input: {
                    table: "products",
                    catalog: "main",
                    schema: "default",
                    columns: ["sku", "name", "price", "stock"],
                    values: [
                        ["SKU-001", "Product A", 29.99, 100],
                        ["SKU-002", "Product B", 49.99, 50],
                        ["SKU-003", "Product C", 19.99, 200]
                    ]
                },
                expectedOutput: {
                    rowsAffected: 3,
                    insertedCount: 3
                }
            }
        ],
        errorCases: [
            {
                name: "table_not_found",
                description: "Insert into non-existent table",
                input: {
                    table: "main.default.nonexistent",
                    columns: ["col1"],
                    values: [["value1"]]
                },
                expectedError: {
                    type: "not_found",
                    message: "Table 'main.default.nonexistent' does not exist",
                    retryable: false
                }
            },
            {
                name: "column_mismatch",
                description: "Column count doesn't match value count",
                input: {
                    table: "main.default.users",
                    columns: ["email", "name"],
                    values: [["only.one@value.com"]]
                },
                expectedError: {
                    type: "validation",
                    message: "Number of columns does not match number of values",
                    retryable: false
                }
            }
        ],
        edgeCases: []
    },

    // ==================== UPDATE ====================
    {
        operationId: "update",
        provider: "databricks",
        validCases: [
            {
                name: "update_single_row",
                description: "Update a single row by ID",
                input: {
                    table: "main.default.users",
                    set: {
                        name: "Updated Name",
                        updated_at: "2024-02-20T10:00:00Z"
                    },
                    where: "id = 1"
                },
                expectedOutput: {
                    rowsAffected: 1
                }
            },
            {
                name: "update_multiple_rows",
                description: "Update multiple rows matching condition",
                input: {
                    table: "main.default.products",
                    set: {
                        discount_applied: true,
                        price: 89.99
                    },
                    where: "category = 'Electronics' AND stock > 0"
                },
                expectedOutput: {
                    rowsAffected: 42
                }
            }
        ],
        errorCases: [
            {
                name: "table_not_found",
                description: "Update non-existent table",
                input: {
                    table: "main.default.nonexistent",
                    set: { col1: "value" },
                    where: "id = 1"
                },
                expectedError: {
                    type: "not_found",
                    message: "Table 'main.default.nonexistent' does not exist",
                    retryable: false
                }
            }
        ],
        edgeCases: []
    },

    // ==================== DELETE ====================
    {
        operationId: "delete",
        provider: "databricks",
        validCases: [
            {
                name: "delete_by_id",
                description: "Delete a single row by ID",
                input: {
                    table: "main.default.users",
                    where: "id = 999"
                },
                expectedOutput: {
                    rowsAffected: 1
                }
            },
            {
                name: "delete_by_condition",
                description: "Delete rows matching a condition",
                input: {
                    table: "main.default.sessions",
                    where: "expires_at < '2024-01-01T00:00:00Z'"
                },
                expectedOutput: {
                    rowsAffected: 1247
                }
            }
        ],
        errorCases: [
            {
                name: "table_not_found",
                description: "Delete from non-existent table",
                input: {
                    table: "main.default.nonexistent",
                    where: "id = 1"
                },
                expectedError: {
                    type: "not_found",
                    message: "Table 'main.default.nonexistent' does not exist",
                    retryable: false
                }
            }
        ],
        edgeCases: []
    },

    // ==================== LIST CATALOGS ====================
    {
        operationId: "listCatalogs",
        provider: "databricks",
        validCases: [
            {
                name: "list_all_catalogs",
                description: "List all Unity Catalogs in workspace",
                input: {},
                expectedOutput: {
                    catalogs: [
                        { name: "main", comment: "Default catalog", owner: "admin@company.com" },
                        {
                            name: "development",
                            comment: "Development catalog",
                            owner: "dev-team@company.com"
                        },
                        {
                            name: "production",
                            comment: "Production catalog",
                            owner: "prod-team@company.com"
                        },
                        { name: "sandbox", comment: "Sandbox for testing", owner: "qa@company.com" }
                    ],
                    count: 4
                }
            }
        ],
        errorCases: [
            {
                name: "permission_denied",
                description: "User lacks permission to list catalogs",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "User does not have permission to list catalogs",
                    retryable: false
                }
            }
        ],
        edgeCases: []
    },

    // ==================== LIST SCHEMAS ====================
    {
        operationId: "listSchemas",
        provider: "databricks",
        validCases: [
            {
                name: "list_default_catalog_schemas",
                description: "List schemas in default catalog",
                input: {},
                expectedOutput: {
                    schemas: [
                        { name: "default", catalog_name: "main", comment: "Default schema" },
                        { name: "analytics", catalog_name: "main", comment: "Analytics data" },
                        { name: "raw", catalog_name: "main", comment: "Raw ingested data" },
                        { name: "staging", catalog_name: "main", comment: "Staging tables" }
                    ],
                    count: 4
                }
            },
            {
                name: "list_specific_catalog_schemas",
                description: "List schemas in a specific catalog",
                input: {
                    catalog: "production"
                },
                expectedOutput: {
                    schemas: [
                        { name: "core", catalog_name: "production", comment: "Core business data" },
                        { name: "reports", catalog_name: "production", comment: "Reporting views" }
                    ],
                    count: 2
                }
            }
        ],
        errorCases: [
            {
                name: "catalog_not_found",
                description: "Catalog does not exist",
                input: {
                    catalog: "nonexistent_catalog"
                },
                expectedError: {
                    type: "not_found",
                    message: "Catalog 'nonexistent_catalog' not found",
                    retryable: false
                }
            }
        ],
        edgeCases: []
    },

    // ==================== LIST TABLES ====================
    {
        operationId: "listTables",
        provider: "databricks",
        validCases: [
            {
                name: "list_default_schema_tables",
                description: "List tables in default schema",
                input: {},
                expectedOutput: {
                    tables: [
                        {
                            name: "users",
                            catalog_name: "main",
                            schema_name: "default",
                            table_type: "TABLE"
                        },
                        {
                            name: "orders",
                            catalog_name: "main",
                            schema_name: "default",
                            table_type: "TABLE"
                        },
                        {
                            name: "products",
                            catalog_name: "main",
                            schema_name: "default",
                            table_type: "TABLE"
                        },
                        {
                            name: "order_summary",
                            catalog_name: "main",
                            schema_name: "default",
                            table_type: "VIEW"
                        }
                    ],
                    count: 4
                }
            },
            {
                name: "list_specific_schema_tables",
                description: "List tables in a specific catalog and schema",
                input: {
                    catalog: "production",
                    schema: "core"
                },
                expectedOutput: {
                    tables: [
                        {
                            name: "customers",
                            catalog_name: "production",
                            schema_name: "core",
                            table_type: "TABLE"
                        },
                        {
                            name: "transactions",
                            catalog_name: "production",
                            schema_name: "core",
                            table_type: "TABLE"
                        }
                    ],
                    count: 2
                }
            }
        ],
        errorCases: [
            {
                name: "schema_not_found",
                description: "Schema does not exist",
                input: {
                    catalog: "main",
                    schema: "nonexistent_schema"
                },
                expectedError: {
                    type: "not_found",
                    message: "Schema 'main.nonexistent_schema' not found",
                    retryable: false
                }
            }
        ],
        edgeCases: [
            {
                name: "empty_schema",
                description: "Schema has no tables",
                input: {
                    catalog: "main",
                    schema: "empty_schema"
                },
                expectedOutput: {
                    tables: [],
                    count: 0
                }
            }
        ]
    }
];
