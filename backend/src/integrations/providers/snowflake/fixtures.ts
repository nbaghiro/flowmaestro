/**
 * Snowflake Provider Test Fixtures
 *
 * Comprehensive test data for Snowflake database operations including:
 * - Query: Execute SELECT queries with various formats
 * - Insert: Insert rows (no RETURNING clause)
 * - Update: Update rows with WHERE conditions
 * - Delete: Delete rows with WHERE conditions
 * - ListTables: List all tables in a schema
 */

import type { TestFixture } from "../../sandbox";

export const snowflakeFixtures: TestFixture[] = [
    {
        operationId: "query",
        provider: "snowflake",
        validCases: [
            {
                name: "simple_select_all",
                description: "Execute a simple SELECT * query",
                input: {
                    query: "SELECT * FROM users",
                    returnFormat: "array"
                },
                expectedOutput: {
                    result: [
                        {
                            ID: 1,
                            EMAIL: "john.doe@example.com",
                            FIRST_NAME: "John",
                            LAST_NAME: "Doe",
                            ROLE: "admin",
                            IS_ACTIVE: true,
                            CREATED_AT: "2024-01-15T10:30:00.000Z",
                            UPDATED_AT: "2024-01-20T14:45:00.000Z"
                        },
                        {
                            ID: 2,
                            EMAIL: "jane.smith@example.com",
                            FIRST_NAME: "Jane",
                            LAST_NAME: "Smith",
                            ROLE: "user",
                            IS_ACTIVE: true,
                            CREATED_AT: "2024-01-16T09:15:00.000Z",
                            UPDATED_AT: "2024-01-16T09:15:00.000Z"
                        },
                        {
                            ID: 3,
                            EMAIL: "bob.wilson@example.com",
                            FIRST_NAME: "Bob",
                            LAST_NAME: "Wilson",
                            ROLE: "user",
                            IS_ACTIVE: false,
                            CREATED_AT: "2024-01-17T16:20:00.000Z",
                            UPDATED_AT: "2024-01-25T11:00:00.000Z"
                        }
                    ],
                    rowCount: 3
                }
            },
            {
                name: "parameterized_query",
                description: "Execute a parameterized SELECT query",
                input: {
                    query: "SELECT * FROM users WHERE ROLE = ? AND IS_ACTIVE = ?",
                    parameters: ["admin", true],
                    returnFormat: "array"
                },
                expectedOutput: {
                    result: [
                        {
                            ID: 1,
                            EMAIL: "john.doe@example.com",
                            FIRST_NAME: "John",
                            LAST_NAME: "Doe",
                            ROLE: "admin",
                            IS_ACTIVE: true,
                            CREATED_AT: "2024-01-15T10:30:00.000Z",
                            UPDATED_AT: "2024-01-20T14:45:00.000Z"
                        }
                    ],
                    rowCount: 1
                }
            },
            {
                name: "single_result_format",
                description: "Execute query with single result format",
                input: {
                    query: "SELECT * FROM users WHERE ID = ?",
                    parameters: [1],
                    returnFormat: "single"
                },
                expectedOutput: {
                    result: {
                        ID: 1,
                        EMAIL: "john.doe@example.com",
                        FIRST_NAME: "John",
                        LAST_NAME: "Doe",
                        ROLE: "admin",
                        IS_ACTIVE: true,
                        CREATED_AT: "2024-01-15T10:30:00.000Z",
                        UPDATED_AT: "2024-01-20T14:45:00.000Z"
                    },
                    rowCount: 1
                }
            },
            {
                name: "empty_result_set",
                description: "Query that returns no results",
                input: {
                    query: "SELECT * FROM users WHERE ID = ?",
                    parameters: [99999],
                    returnFormat: "array"
                },
                expectedOutput: {
                    result: [],
                    rowCount: 0
                }
            }
        ],
        errorCases: [
            {
                name: "syntax_error",
                description: "SQL syntax error in query",
                input: {
                    query: "SELEC * FROM users",
                    returnFormat: "array"
                },
                expectedError: {
                    type: "server_error",
                    message:
                        "SQL compilation error: error line 1 at position 0\nInvalid expression 'SELEC' in query.",
                    retryable: false
                }
            },
            {
                name: "table_not_found",
                description: "Query references non-existent table",
                input: {
                    query: "SELECT * FROM nonexistent_table",
                    returnFormat: "array"
                },
                expectedError: {
                    type: "server_error",
                    message:
                        "SQL compilation error: Object 'NONEXISTENT_TABLE' does not exist or not authorized.",
                    retryable: false
                }
            },
            {
                name: "column_not_found",
                description: "Query references non-existent column",
                input: {
                    query: "SELECT invalid_column FROM users",
                    returnFormat: "array"
                },
                expectedError: {
                    type: "server_error",
                    message: "SQL compilation error: Unknown column 'INVALID_COLUMN'.",
                    retryable: false
                }
            },
            {
                name: "connection_timeout",
                description: "Query execution timeout",
                input: {
                    query: "SELECT * FROM very_large_table",
                    returnFormat: "array"
                },
                expectedError: {
                    type: "server_error",
                    message: "Query execution timeout exceeded",
                    retryable: true
                }
            }
        ],
        edgeCases: []
    },
    {
        operationId: "insert",
        provider: "snowflake",
        validCases: [
            {
                name: "simple_insert",
                description: "Insert a single row",
                input: {
                    table: "users",
                    data: {
                        EMAIL: "new.user@example.com",
                        FIRST_NAME: "New",
                        LAST_NAME: "User",
                        ROLE: "user",
                        IS_ACTIVE: true
                    }
                },
                expectedOutput: {
                    inserted: 1
                }
            },
            {
                name: "insert_with_various_types",
                description: "Insert a row with various data types",
                input: {
                    table: "products",
                    data: {
                        NAME: "Widget Pro",
                        PRICE: 29.99,
                        QUANTITY: 100,
                        IS_AVAILABLE: true,
                        TAGS: "electronics,gadgets"
                    }
                },
                expectedOutput: {
                    inserted: 1
                }
            }
        ],
        errorCases: [
            {
                name: "unique_constraint_violation",
                description: "Insert violates unique constraint",
                input: {
                    table: "users",
                    data: {
                        EMAIL: "john.doe@example.com",
                        FIRST_NAME: "Duplicate",
                        LAST_NAME: "User",
                        ROLE: "user"
                    }
                },
                expectedError: {
                    type: "server_error",
                    message: "Duplicate key value violates unique constraint 'USERS_EMAIL_UNIQUE'.",
                    retryable: false
                }
            },
            {
                name: "not_null_violation",
                description: "Insert missing required column",
                input: {
                    table: "users",
                    data: {
                        FIRST_NAME: "Missing",
                        LAST_NAME: "Email"
                    }
                },
                expectedError: {
                    type: "server_error",
                    message: "NULL result in a non-nullable column. Column 'EMAIL' cannot be null.",
                    retryable: false
                }
            },
            {
                name: "table_not_found",
                description: "Insert into non-existent table",
                input: {
                    table: "nonexistent_table",
                    data: {
                        field: "value"
                    }
                },
                expectedError: {
                    type: "server_error",
                    message:
                        "SQL compilation error: Object 'NONEXISTENT_TABLE' does not exist or not authorized.",
                    retryable: false
                }
            },
            {
                name: "type_mismatch",
                description: "Insert with type mismatch",
                input: {
                    table: "users",
                    data: {
                        ID: "not_a_number",
                        EMAIL: "test@example.com",
                        FIRST_NAME: "Test",
                        LAST_NAME: "User"
                    }
                },
                expectedError: {
                    type: "server_error",
                    message:
                        "SQL execution internal error: Numeric value 'not_a_number' is not recognized.",
                    retryable: false
                }
            }
        ],
        edgeCases: []
    },
    {
        operationId: "update",
        provider: "snowflake",
        validCases: [
            {
                name: "simple_update_by_id",
                description: "Update a single row by primary key",
                input: {
                    table: "users",
                    data: {
                        FIRST_NAME: "Jonathan",
                        UPDATED_AT: "2024-01-28T16:00:00.000Z"
                    },
                    where: "ID = ?",
                    whereParameters: [1]
                },
                expectedOutput: {
                    updated: 1
                }
            },
            {
                name: "update_no_matching_rows",
                description: "Update with no matching rows",
                input: {
                    table: "users",
                    data: {
                        IS_ACTIVE: false
                    },
                    where: "ID = ?",
                    whereParameters: [99999]
                },
                expectedOutput: {
                    updated: 0
                }
            }
        ],
        errorCases: [
            {
                name: "unique_constraint_violation",
                description: "Update violates unique constraint",
                input: {
                    table: "users",
                    data: {
                        EMAIL: "john.doe@example.com"
                    },
                    where: "ID = ?",
                    whereParameters: [2]
                },
                expectedError: {
                    type: "server_error",
                    message: "Duplicate key value violates unique constraint 'USERS_EMAIL_UNIQUE'.",
                    retryable: false
                }
            },
            {
                name: "table_not_found",
                description: "Update non-existent table",
                input: {
                    table: "nonexistent_table",
                    data: {
                        field: "value"
                    },
                    where: "ID = ?",
                    whereParameters: [1]
                },
                expectedError: {
                    type: "server_error",
                    message:
                        "SQL compilation error: Object 'NONEXISTENT_TABLE' does not exist or not authorized.",
                    retryable: false
                }
            },
            {
                name: "invalid_where_clause",
                description: "Invalid SQL in WHERE clause",
                input: {
                    table: "users",
                    data: {
                        IS_ACTIVE: false
                    },
                    where: "invalid_syntax ==== ?",
                    whereParameters: [1]
                },
                expectedError: {
                    type: "server_error",
                    message:
                        "SQL compilation error: error line 1 at position 0\nInvalid expression in WHERE clause.",
                    retryable: false
                }
            }
        ],
        edgeCases: []
    },
    {
        operationId: "delete",
        provider: "snowflake",
        validCases: [
            {
                name: "delete_single_row",
                description: "Delete a single row by primary key",
                input: {
                    table: "users",
                    where: "ID = ?",
                    whereParameters: [3]
                },
                expectedOutput: {
                    deleted: 1
                }
            },
            {
                name: "delete_no_matching_rows",
                description: "Delete with no matching rows",
                input: {
                    table: "users",
                    where: "ID = ?",
                    whereParameters: [99999]
                },
                expectedOutput: {
                    deleted: 0
                }
            }
        ],
        errorCases: [
            {
                name: "table_not_found",
                description: "Delete from non-existent table",
                input: {
                    table: "nonexistent_table",
                    where: "ID = ?",
                    whereParameters: [1]
                },
                expectedError: {
                    type: "server_error",
                    message:
                        "SQL compilation error: Object 'NONEXISTENT_TABLE' does not exist or not authorized.",
                    retryable: false
                }
            },
            {
                name: "invalid_where_syntax",
                description: "Invalid SQL in WHERE clause",
                input: {
                    table: "users",
                    where: "ID === ?",
                    whereParameters: [1]
                },
                expectedError: {
                    type: "server_error",
                    message:
                        "SQL compilation error: error line 1 at position 0\nInvalid expression in WHERE clause.",
                    retryable: false
                }
            },
            {
                name: "parameter_type_mismatch",
                description: "WHERE parameter has wrong type",
                input: {
                    table: "users",
                    where: "ID = ?",
                    whereParameters: ["not_a_number"]
                },
                expectedError: {
                    type: "server_error",
                    message:
                        "SQL execution internal error: Numeric value 'not_a_number' is not recognized.",
                    retryable: false
                }
            }
        ],
        edgeCases: []
    },
    {
        operationId: "listTables",
        provider: "snowflake",
        validCases: [
            {
                name: "list_tables_default_schema",
                description: "List all tables in PUBLIC schema (default)",
                input: {},
                expectedOutput: {
                    tables: [
                        "audit_logs",
                        "blog_posts",
                        "configurations",
                        "contacts",
                        "order_items",
                        "orders",
                        "products",
                        "sessions",
                        "users"
                    ]
                }
            },
            {
                name: "list_tables_custom_schema",
                description: "List tables in a custom schema",
                input: {
                    schema: "ANALYTICS"
                },
                expectedOutput: {
                    tables: ["events", "page_views", "sessions"]
                }
            }
        ],
        errorCases: [
            {
                name: "schema_not_found",
                description: "Schema does not exist",
                input: {
                    schema: "NONEXISTENT_SCHEMA"
                },
                expectedError: {
                    type: "server_error",
                    message:
                        "SQL compilation error: Schema 'NONEXISTENT_SCHEMA' does not exist or not authorized.",
                    retryable: false
                }
            },
            {
                name: "connection_failed",
                description: "Snowflake connection failed",
                input: {
                    schema: "PUBLIC"
                },
                expectedError: {
                    type: "server_error",
                    message:
                        "Unable to connect to Snowflake. Check your account URL and network connectivity.",
                    retryable: true
                }
            },
            {
                name: "warehouse_not_found",
                description: "Specified warehouse does not exist",
                input: {
                    schema: "PUBLIC"
                },
                expectedError: {
                    type: "server_error",
                    message: "The requested warehouse does not exist or not authorized.",
                    retryable: false
                }
            }
        ],
        edgeCases: []
    }
];
