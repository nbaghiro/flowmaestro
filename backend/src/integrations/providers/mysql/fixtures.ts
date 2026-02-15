/**
 * MySQL Provider Test Fixtures
 *
 * Comprehensive test data for MySQL database operations including:
 * - Query: Execute SELECT queries with various formats
 * - Insert: Insert rows (no RETURNING clause, uses insertId)
 * - Update: Update rows with WHERE conditions
 * - Delete: Delete rows with WHERE conditions
 * - ListTables: List all tables in a database
 */

import type { TestFixture } from "../../sandbox";

export const mysqlFixtures: TestFixture[] = [
    {
        operationId: "query",
        provider: "mysql",
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
                            is_active: 1,
                            created_at: "2024-01-15T10:30:00.000Z",
                            updated_at: "2024-01-20T14:45:00.000Z"
                        },
                        {
                            id: 2,
                            email: "jane.smith@example.com",
                            first_name: "Jane",
                            last_name: "Smith",
                            role: "user",
                            is_active: 1,
                            created_at: "2024-01-16T09:15:00.000Z",
                            updated_at: "2024-01-16T09:15:00.000Z"
                        },
                        {
                            id: 3,
                            email: "bob.wilson@example.com",
                            first_name: "Bob",
                            last_name: "Wilson",
                            role: "user",
                            is_active: 0,
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
                    message:
                        "You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near 'SELEC * FROM users'",
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
                    message: "Table 'mydb.nonexistent_table' doesn't exist",
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
                    message: "Unknown column 'invalid_column' in 'field list'",
                    retryable: false
                }
            },
            {
                name: "parameter_mismatch",
                description: "Number of parameters does not match placeholders",
                input: {
                    query: "SELECT * FROM users WHERE id = ? AND role = ?",
                    parameters: [1],
                    returnFormat: "array"
                },
                expectedError: {
                    type: "server_error",
                    message: "Incorrect arguments to mysqld_stmt_execute",
                    retryable: false
                }
            },
            {
                name: "connection_timeout",
                description: "Database connection timeout",
                input: {
                    query: "SELECT SLEEP(60)",
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
        provider: "mysql",
        validCases: [
            {
                name: "simple_insert",
                description: "Insert a single row",
                input: {
                    table: "users",
                    data: {
                        email: "new.user@example.com",
                        first_name: "New",
                        last_name: "User",
                        role: "user",
                        is_active: 1
                    }
                },
                expectedOutput: {
                    inserted: 1,
                    insertId: 4
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
                    message: "Duplicate entry 'john.doe@example.com' for key 'users.email'",
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
                        "Cannot add or update a child row: a foreign key constraint fails (`mydb`.`orders`, CONSTRAINT `orders_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`))",
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
                    message: "Field 'email' doesn't have a default value",
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
                    message: "Check constraint 'products_price_check' is violated.",
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
                    message: "Table 'mydb.nonexistent_table' doesn't exist",
                    retryable: false
                }
            }
        ],
        edgeCases: []
    },
    {
        operationId: "update",
        provider: "mysql",
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
                    where: "id = ?",
                    whereParameters: [1]
                },
                expectedOutput: {
                    updated: 1
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
                    where: "id = ?",
                    whereParameters: [2]
                },
                expectedError: {
                    type: "server_error",
                    message: "Duplicate entry 'john.doe@example.com' for key 'users.email'",
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
                    where: "id = ?",
                    whereParameters: [1001]
                },
                expectedError: {
                    type: "server_error",
                    message:
                        "Cannot add or update a child row: a foreign key constraint fails (`mydb`.`orders`, CONSTRAINT `orders_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`))",
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
                    where: "id = ?",
                    whereParameters: [1001]
                },
                expectedError: {
                    type: "server_error",
                    message: "Check constraint 'products_price_check' is violated.",
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
                    where: "id = ?",
                    whereParameters: [1]
                },
                expectedError: {
                    type: "server_error",
                    message: "Table 'mydb.nonexistent_table' doesn't exist",
                    retryable: false
                }
            },
            {
                name: "invalid_where_clause",
                description: "Invalid SQL in WHERE clause",
                input: {
                    table: "users",
                    data: {
                        is_active: 0
                    },
                    where: "invalid_syntax ==== ?",
                    whereParameters: [1]
                },
                expectedError: {
                    type: "server_error",
                    message:
                        "You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near '==== ?'",
                    retryable: false
                }
            }
        ],
        edgeCases: []
    },
    {
        operationId: "delete",
        provider: "mysql",
        validCases: [
            {
                name: "delete_single_row",
                description: "Delete a single row by primary key",
                input: {
                    table: "users",
                    where: "id = ?",
                    whereParameters: [3]
                },
                expectedOutput: {
                    deleted: 1
                }
            }
        ],
        errorCases: [
            {
                name: "foreign_key_violation",
                description: "Delete violates foreign key constraint (referenced by other rows)",
                input: {
                    table: "users",
                    where: "id = ?",
                    whereParameters: [1]
                },
                expectedError: {
                    type: "server_error",
                    message:
                        "Cannot delete or update a parent row: a foreign key constraint fails (`mydb`.`orders`, CONSTRAINT `orders_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`))",
                    retryable: false
                }
            },
            {
                name: "table_not_found",
                description: "Delete from non-existent table",
                input: {
                    table: "nonexistent_table",
                    where: "id = ?",
                    whereParameters: [1]
                },
                expectedError: {
                    type: "server_error",
                    message: "Table 'mydb.nonexistent_table' doesn't exist",
                    retryable: false
                }
            },
            {
                name: "invalid_where_syntax",
                description: "Invalid SQL in WHERE clause",
                input: {
                    table: "users",
                    where: "id === ?",
                    whereParameters: [1]
                },
                expectedError: {
                    type: "server_error",
                    message:
                        "You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near '=== ?'",
                    retryable: false
                }
            },
            {
                name: "parameter_type_mismatch",
                description: "WHERE parameter has wrong type",
                input: {
                    table: "users",
                    where: "id = ?",
                    whereParameters: ["not_a_number"]
                },
                expectedError: {
                    type: "server_error",
                    message: "Incorrect integer value: 'not_a_number' for column 'id'",
                    retryable: false
                }
            }
        ],
        edgeCases: []
    },
    {
        operationId: "listTables",
        provider: "mysql",
        validCases: [
            {
                name: "list_database_tables",
                description: "List all tables in the connected database (default)",
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
                name: "database_not_found",
                description: "Database does not exist",
                input: {
                    database: "nonexistent_database"
                },
                expectedError: {
                    type: "server_error",
                    message: "Unknown database 'nonexistent_database'",
                    retryable: false
                }
            },
            {
                name: "permission",
                description: "User does not have permission to access database",
                input: {
                    database: "restricted_database"
                },
                expectedError: {
                    type: "permission",
                    message: "Access denied for user to database 'restricted_database'",
                    retryable: false
                }
            },
            {
                name: "connection_failed",
                description: "Database connection failed",
                input: {
                    database: "mydb"
                },
                expectedError: {
                    type: "server_error",
                    message: "connect ECONNREFUSED",
                    retryable: true
                }
            }
        ],
        edgeCases: []
    }
];
