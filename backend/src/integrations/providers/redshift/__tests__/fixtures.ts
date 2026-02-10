/**
 * Redshift Provider Test Fixtures
 *
 * Comprehensive test data for all Redshift operations including
 * query execution, schema discovery, and data modification.
 */

import type { TestFixture } from "../../../sandbox";

export const redshiftFixtures: TestFixture[] = [
    // ==================== QUERY ====================
    {
        operationId: "query",
        provider: "redshift",
        validCases: [
            {
                name: "select_all_users",
                description: "Query all users from a table",
                input: {
                    sql: "SELECT * FROM public.users LIMIT 10",
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
                        { name: "id", type: "int4" },
                        { name: "email", type: "varchar" },
                        { name: "name", type: "varchar" },
                        { name: "created_at", type: "timestamp" }
                    ],
                    count: 3
                }
            },
            {
                name: "select_with_filter",
                description: "Query with WHERE clause filter",
                input: {
                    sql: "SELECT id, name, amount FROM public.orders WHERE status = 'completed' AND amount > 100",
                    returnFormat: "array"
                },
                expectedOutput: {
                    result: [
                        { id: 101, name: "Order A", amount: 250.0 },
                        { id: 105, name: "Order B", amount: 175.5 },
                        { id: 112, name: "Order C", amount: 450.0 }
                    ],
                    columns: [
                        { name: "id", type: "int4" },
                        { name: "name", type: "varchar" },
                        { name: "amount", type: "numeric" }
                    ],
                    count: 3
                }
            },
            {
                name: "select_single_row",
                description: "Query returning single row",
                input: {
                    sql: "SELECT * FROM public.users WHERE id = 1",
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
                        { name: "id", type: "int4" },
                        { name: "email", type: "varchar" },
                        { name: "name", type: "varchar" },
                        { name: "created_at", type: "timestamp" }
                    ],
                    count: 1
                }
            },
            {
                name: "count_query",
                description: "Query with count return format",
                input: {
                    sql: "SELECT COUNT(*) as count FROM public.users WHERE status = 'active'",
                    returnFormat: "count"
                },
                expectedOutput: {
                    result: 145,
                    columns: [{ name: "count", type: "int8" }],
                    count: 145
                }
            },
            {
                name: "aggregation_query",
                description: "Query with GROUP BY aggregation",
                input: {
                    sql: "SELECT category, SUM(revenue) as total_revenue, COUNT(*) as order_count FROM public.sales GROUP BY category ORDER BY total_revenue DESC",
                    returnFormat: "array"
                },
                expectedOutput: {
                    result: [
                        { category: "Electronics", total_revenue: 125000.0, order_count: 450 },
                        { category: "Clothing", total_revenue: 85000.0, order_count: 1200 },
                        { category: "Home & Garden", total_revenue: 45000.0, order_count: 320 }
                    ],
                    columns: [
                        { name: "category", type: "varchar" },
                        { name: "total_revenue", type: "numeric" },
                        { name: "order_count", type: "int8" }
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
                    sql: "SELEC * FORM users",
                    returnFormat: "array"
                },
                expectedError: {
                    type: "validation",
                    message: 'syntax error at or near "SELEC"',
                    retryable: false
                }
            },
            {
                name: "table_not_found",
                description: "Query references non-existent table",
                input: {
                    sql: "SELECT * FROM public.nonexistent_table",
                    returnFormat: "array"
                },
                expectedError: {
                    type: "not_found",
                    message: 'relation "public.nonexistent_table" does not exist',
                    retryable: false
                }
            },
            {
                name: "permission_denied",
                description: "User lacks permission to query table",
                input: {
                    sql: "SELECT * FROM restricted_schema.sensitive_data",
                    returnFormat: "array"
                },
                expectedError: {
                    type: "permission",
                    message: "permission denied for relation sensitive_data",
                    retryable: false
                }
            },
            {
                name: "query_timeout",
                description: "Query execution timed out",
                input: {
                    sql: "SELECT * FROM public.very_large_table",
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
                    sql: "SELECT * FROM public.users WHERE id = -999",
                    returnFormat: "array"
                },
                expectedOutput: {
                    result: [],
                    columns: [
                        { name: "id", type: "int4" },
                        { name: "email", type: "varchar" },
                        { name: "name", type: "varchar" },
                        { name: "created_at", type: "timestamp" }
                    ],
                    count: 0
                }
            },
            {
                name: "null_values",
                description: "Query with NULL values in result",
                input: {
                    sql: "SELECT id, name, optional_field FROM public.users WHERE optional_field IS NULL LIMIT 1",
                    returnFormat: "single"
                },
                expectedOutput: {
                    result: {
                        id: 5,
                        name: "Test User",
                        optional_field: null
                    },
                    columns: [
                        { name: "id", type: "int4" },
                        { name: "name", type: "varchar" },
                        { name: "optional_field", type: "varchar" }
                    ],
                    count: 1
                }
            }
        ]
    },

    // ==================== LIST DATABASES ====================
    {
        operationId: "listDatabases",
        provider: "redshift",
        validCases: [
            {
                name: "list_all_databases",
                description: "List all databases in the cluster",
                input: {},
                expectedOutput: {
                    databases: [
                        { name: "dev" },
                        { name: "prod" },
                        { name: "analytics" },
                        { name: "staging" }
                    ],
                    count: 4
                }
            }
        ],
        errorCases: [
            {
                name: "permission_denied",
                description: "User lacks permission to list databases",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "permission denied to list databases",
                    retryable: false
                }
            }
        ],
        edgeCases: []
    },

    // ==================== LIST SCHEMAS ====================
    {
        operationId: "listSchemas",
        provider: "redshift",
        validCases: [
            {
                name: "list_default_database_schemas",
                description: "List schemas in default database",
                input: {},
                expectedOutput: {
                    schemas: [
                        { name: "public" },
                        { name: "analytics" },
                        { name: "staging" },
                        { name: "pg_catalog" },
                        { name: "information_schema" }
                    ],
                    count: 5
                }
            },
            {
                name: "list_specific_database_schemas",
                description: "List schemas in a specific database",
                input: {
                    database: "analytics"
                },
                expectedOutput: {
                    schemas: [{ name: "public" }, { name: "dw" }, { name: "reports" }],
                    count: 3
                }
            }
        ],
        errorCases: [
            {
                name: "database_not_found",
                description: "Database does not exist",
                input: {
                    database: "nonexistent_db"
                },
                expectedError: {
                    type: "not_found",
                    message: 'database "nonexistent_db" does not exist',
                    retryable: false
                }
            }
        ],
        edgeCases: []
    },

    // ==================== LIST TABLES ====================
    {
        operationId: "listTables",
        provider: "redshift",
        validCases: [
            {
                name: "list_public_schema_tables",
                description: "List tables in public schema",
                input: {
                    schema: "public"
                },
                expectedOutput: {
                    tables: [
                        { name: "users", schema: "public", type: "TABLE" },
                        { name: "orders", schema: "public", type: "TABLE" },
                        { name: "products", schema: "public", type: "TABLE" },
                        { name: "order_summary", schema: "public", type: "VIEW" }
                    ],
                    count: 4
                }
            },
            {
                name: "list_specific_schema_tables",
                description: "List tables in a specific schema",
                input: {
                    schema: "analytics"
                },
                expectedOutput: {
                    tables: [
                        { name: "events", schema: "analytics", type: "TABLE" },
                        { name: "sessions", schema: "analytics", type: "TABLE" },
                        { name: "daily_metrics", schema: "analytics", type: "VIEW" }
                    ],
                    count: 3
                }
            }
        ],
        errorCases: [
            {
                name: "schema_not_found",
                description: "Schema does not exist",
                input: {
                    schema: "nonexistent_schema"
                },
                expectedError: {
                    type: "not_found",
                    message: 'schema "nonexistent_schema" does not exist',
                    retryable: false
                }
            }
        ],
        edgeCases: [
            {
                name: "empty_schema",
                description: "Schema has no tables",
                input: {
                    schema: "empty_schema"
                },
                expectedOutput: {
                    tables: [],
                    count: 0
                }
            }
        ]
    },

    // ==================== DESCRIBE TABLE ====================
    {
        operationId: "describeTable",
        provider: "redshift",
        validCases: [
            {
                name: "describe_users_table",
                description: "Get column info for users table",
                input: {
                    table: "users",
                    schema: "public"
                },
                expectedOutput: {
                    columns: [
                        { name: "id", type: "int4", nullable: false },
                        { name: "email", type: "varchar", nullable: false, length: 255 },
                        { name: "name", type: "varchar", nullable: true, length: 100 },
                        { name: "created_at", type: "timestamp", nullable: false },
                        { name: "updated_at", type: "timestamp", nullable: true }
                    ],
                    table: "users",
                    schema: "public",
                    count: 5
                }
            },
            {
                name: "describe_orders_table",
                description: "Get column info for orders table with numeric precision",
                input: {
                    table: "orders",
                    schema: "public"
                },
                expectedOutput: {
                    columns: [
                        { name: "id", type: "int4", nullable: false },
                        { name: "user_id", type: "int4", nullable: false },
                        {
                            name: "amount",
                            type: "numeric",
                            nullable: false,
                            precision: 10,
                            scale: 2
                        },
                        { name: "status", type: "varchar", nullable: false, length: 50 },
                        { name: "created_at", type: "timestamp", nullable: false }
                    ],
                    table: "orders",
                    schema: "public",
                    count: 5
                }
            }
        ],
        errorCases: [
            {
                name: "table_not_found",
                description: "Table does not exist",
                input: {
                    table: "nonexistent_table",
                    schema: "public"
                },
                expectedError: {
                    type: "not_found",
                    message: 'relation "public.nonexistent_table" does not exist',
                    retryable: false
                }
            }
        ],
        edgeCases: []
    },

    // ==================== INSERT ====================
    {
        operationId: "insert",
        provider: "redshift",
        validCases: [
            {
                name: "insert_single_row",
                description: "Insert a single row into a table",
                input: {
                    table: "users",
                    schema: "public",
                    columns: ["email", "name", "created_at"],
                    values: [["new.user@example.com", "New User", "2024-02-20T10:00:00Z"]]
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
                    schema: "public",
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
                    table: "nonexistent",
                    schema: "public",
                    columns: ["col1"],
                    values: [["value1"]]
                },
                expectedError: {
                    type: "not_found",
                    message: 'relation "public.nonexistent" does not exist',
                    retryable: false
                }
            },
            {
                name: "type_mismatch",
                description: "Insert with wrong data type",
                input: {
                    table: "users",
                    schema: "public",
                    columns: ["id", "email"],
                    values: [["not-a-number", "test@example.com"]]
                },
                expectedError: {
                    type: "validation",
                    message: 'invalid input syntax for type integer: "not-a-number"',
                    retryable: false
                }
            }
        ],
        edgeCases: []
    }
];
