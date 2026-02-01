/**
 * PostgreSQL Provider Test Fixtures
 *
 * Comprehensive test data for PostgreSQL database operations including:
 * - Query: Execute SELECT queries with various formats
 * - Insert: Insert rows with RETURNING clause support
 * - Update: Update rows with WHERE conditions
 * - Delete: Delete rows with WHERE conditions
 * - ListTables: List all tables in a schema
 */

import type { TestFixture } from "../../../sandbox";

export const postgresqlFixtures: TestFixture[] = [
    {
        operationId: "query",
        provider: "postgresql",
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
                            id: 1,
                            email: "john.doe@example.com",
                            first_name: "John",
                            last_name: "Doe",
                            role: "admin",
                            is_active: true,
                            created_at: "2024-01-15T10:30:00.000Z",
                            updated_at: "2024-01-20T14:45:00.000Z"
                        },
                        {
                            id: 2,
                            email: "jane.smith@example.com",
                            first_name: "Jane",
                            last_name: "Smith",
                            role: "user",
                            is_active: true,
                            created_at: "2024-01-16T09:15:00.000Z",
                            updated_at: "2024-01-16T09:15:00.000Z"
                        },
                        {
                            id: 3,
                            email: "bob.wilson@example.com",
                            first_name: "Bob",
                            last_name: "Wilson",
                            role: "user",
                            is_active: false,
                            created_at: "2024-01-17T16:20:00.000Z",
                            updated_at: "2024-01-25T11:00:00.000Z"
                        }
                    ],
                    rowCount: 3
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
                    message: 'syntax error at or near "SELEC"',
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
                    message: 'relation "nonexistent_table" does not exist',
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
                    message: 'column "invalid_column" does not exist',
                    retryable: false
                }
            },
            {
                name: "parameter_mismatch",
                description: "Number of parameters does not match placeholders",
                input: {
                    query: "SELECT * FROM users WHERE id = $1 AND role = $2",
                    parameters: [1],
                    returnFormat: "array"
                },
                expectedError: {
                    type: "server_error",
                    message:
                        "bind message supplies 1 parameters, but prepared statement requires 2",
                    retryable: false
                }
            },
            {
                name: "connection_timeout",
                description: "Database connection timeout",
                input: {
                    query: "SELECT pg_sleep(60)",
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
        provider: "postgresql",
        validCases: [
            {
                name: "simple_insert",
                description: "Insert a single row without RETURNING clause",
                input: {
                    table: "users",
                    data: {
                        email: "new.user@example.com",
                        first_name: "New",
                        last_name: "User",
                        role: "user",
                        is_active: true
                    }
                },
                expectedOutput: {
                    inserted: 1,
                    returning: undefined
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
                        email: "john.doe@example.com",
                        first_name: "Duplicate",
                        last_name: "User",
                        role: "user"
                    }
                },
                expectedError: {
                    type: "server_error",
                    message: 'duplicate key value violates unique constraint "users_email_key"',
                    retryable: false
                }
            },
            {
                name: "foreign_key_violation",
                description: "Insert violates foreign key constraint",
                input: {
                    table: "orders",
                    data: {
                        user_id: 99999,
                        status: "pending",
                        total_amount: 100.0
                    }
                },
                expectedError: {
                    type: "server_error",
                    message:
                        'insert or update on table "orders" violates foreign key constraint "orders_user_id_fkey"',
                    retryable: false
                }
            },
            {
                name: "not_null_violation",
                description: "Insert missing required column",
                input: {
                    table: "users",
                    data: {
                        first_name: "Missing",
                        last_name: "Email"
                    }
                },
                expectedError: {
                    type: "server_error",
                    message: 'null value in column "email" violates not-null constraint',
                    retryable: false
                }
            },
            {
                name: "check_constraint_violation",
                description: "Insert violates check constraint",
                input: {
                    table: "products",
                    data: {
                        name: "Invalid Product",
                        price: -10.0,
                        category: "electronics"
                    }
                },
                expectedError: {
                    type: "server_error",
                    message:
                        'new row for relation "products" violates check constraint "products_price_check"',
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
                    message: 'relation "nonexistent_table" does not exist',
                    retryable: false
                }
            }
        ],
        edgeCases: []
    },
    {
        operationId: "update",
        provider: "postgresql",
        validCases: [
            {
                name: "simple_update_by_id",
                description: "Update a single row by primary key",
                input: {
                    table: "users",
                    data: {
                        first_name: "Jonathan",
                        updated_at: "2024-01-28T16:00:00.000Z"
                    },
                    where: "id = $1",
                    whereParameters: [1]
                },
                expectedOutput: {
                    updated: 1,
                    returning: undefined
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
                        email: "john.doe@example.com"
                    },
                    where: "id = $1",
                    whereParameters: [2]
                },
                expectedError: {
                    type: "server_error",
                    message: 'duplicate key value violates unique constraint "users_email_key"',
                    retryable: false
                }
            },
            {
                name: "foreign_key_violation",
                description: "Update violates foreign key constraint",
                input: {
                    table: "orders",
                    data: {
                        user_id: 99999
                    },
                    where: "id = $1",
                    whereParameters: [1001]
                },
                expectedError: {
                    type: "server_error",
                    message:
                        'insert or update on table "orders" violates foreign key constraint "orders_user_id_fkey"',
                    retryable: false
                }
            },
            {
                name: "check_constraint_violation",
                description: "Update violates check constraint",
                input: {
                    table: "products",
                    data: {
                        price: -50.0
                    },
                    where: "id = $1",
                    whereParameters: [1001]
                },
                expectedError: {
                    type: "server_error",
                    message:
                        'new row for relation "products" violates check constraint "products_price_check"',
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
                    where: "id = $1",
                    whereParameters: [1]
                },
                expectedError: {
                    type: "server_error",
                    message: 'relation "nonexistent_table" does not exist',
                    retryable: false
                }
            },
            {
                name: "invalid_where_clause",
                description: "Invalid SQL in WHERE clause",
                input: {
                    table: "users",
                    data: {
                        is_active: false
                    },
                    where: "invalid_syntax ==== $1",
                    whereParameters: [1]
                },
                expectedError: {
                    type: "server_error",
                    message: 'syntax error at or near "="',
                    retryable: false
                }
            }
        ],
        edgeCases: []
    },
    {
        operationId: "delete",
        provider: "postgresql",
        validCases: [
            {
                name: "delete_single_row",
                description: "Delete a single row by primary key",
                input: {
                    table: "users",
                    where: "id = $1",
                    whereParameters: [3]
                },
                expectedOutput: {
                    deleted: 1,
                    returning: undefined
                }
            }
        ],
        errorCases: [
            {
                name: "foreign_key_violation",
                description: "Delete violates foreign key constraint (referenced by other rows)",
                input: {
                    table: "users",
                    where: "id = $1",
                    whereParameters: [1]
                },
                expectedError: {
                    type: "server_error",
                    message:
                        'update or delete on table "users" violates foreign key constraint "orders_user_id_fkey" on table "orders"',
                    retryable: false
                }
            },
            {
                name: "table_not_found",
                description: "Delete from non-existent table",
                input: {
                    table: "nonexistent_table",
                    where: "id = $1",
                    whereParameters: [1]
                },
                expectedError: {
                    type: "server_error",
                    message: 'relation "nonexistent_table" does not exist',
                    retryable: false
                }
            },
            {
                name: "invalid_where_syntax",
                description: "Invalid SQL in WHERE clause",
                input: {
                    table: "users",
                    where: "id === $1",
                    whereParameters: [1]
                },
                expectedError: {
                    type: "server_error",
                    message: 'syntax error at or near "="',
                    retryable: false
                }
            },
            {
                name: "parameter_type_mismatch",
                description: "WHERE parameter has wrong type",
                input: {
                    table: "users",
                    where: "id = $1",
                    whereParameters: ["not_a_number"]
                },
                expectedError: {
                    type: "server_error",
                    message: 'invalid input syntax for type integer: "not_a_number"',
                    retryable: false
                }
            }
        ],
        edgeCases: []
    },
    {
        operationId: "listTables",
        provider: "postgresql",
        validCases: [
            {
                name: "list_public_schema_tables",
                description: "List all tables in the public schema (default)",
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
                    type: "server_error",
                    message: 'schema "nonexistent_schema" does not exist',
                    retryable: false
                }
            },
            {
                name: "permission",
                description: "User does not have permission to access schema",
                input: {
                    schema: "restricted_schema"
                },
                expectedError: {
                    type: "permission",
                    message: "permission denied for schema restricted_schema",
                    retryable: false
                }
            },
            {
                name: "connection_failed",
                description: "Database connection failed",
                input: {
                    schema: "public"
                },
                expectedError: {
                    type: "server_error",
                    message: "connection to server failed",
                    retryable: true
                }
            }
        ],
        edgeCases: []
    }
];
