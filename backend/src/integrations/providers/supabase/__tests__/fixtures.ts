/**
 * Supabase Provider Test Fixtures
 *
 * Comprehensive test data for Supabase database operations including:
 * - Query: Select rows with PostgREST filtering
 * - Insert: Insert rows with returning support
 * - Update: Update rows matching filters
 * - Delete: Delete rows matching filters
 * - Upsert: Insert or update on conflict
 * - ListTables: List all tables exposed by PostgREST
 * - RPC: Call PostgreSQL functions
 */

import type { TestFixture } from "../../../sandbox";

export const supabaseFixtures: TestFixture[] = [
    {
        operationId: "query",
        provider: "supabase",
        validCases: [
            {
                name: "simple_select_all",
                description: "Query all rows from a table",
                input: {
                    table: "users",
                    select: "*"
                },
                expectedOutput: {
                    rows: [
                        {
                            id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                            email: "john.doe@example.com",
                            full_name: "John Doe",
                            role: "admin",
                            is_active: true,
                            created_at: "2024-01-15T10:30:00.000Z"
                        },
                        {
                            id: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
                            email: "jane.smith@example.com",
                            full_name: "Jane Smith",
                            role: "user",
                            is_active: true,
                            created_at: "2024-01-16T09:15:00.000Z"
                        },
                        {
                            id: "c3d4e5f6-a7b8-9012-cdef-123456789012",
                            email: "bob.wilson@example.com",
                            full_name: "Bob Wilson",
                            role: "user",
                            is_active: false,
                            created_at: "2024-01-17T16:20:00.000Z"
                        }
                    ],
                    count: 3
                }
            },
            {
                name: "filtered_query",
                description: "Query with equality filter",
                input: {
                    table: "users",
                    select: "id,email,full_name",
                    filter: [{ column: "role", operator: "eq", value: "admin" }]
                },
                expectedOutput: {
                    rows: [
                        {
                            id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                            email: "john.doe@example.com",
                            full_name: "John Doe"
                        }
                    ],
                    count: 1
                }
            },
            {
                name: "query_with_pagination",
                description: "Query with limit and offset",
                input: {
                    table: "products",
                    select: "id,name,price",
                    order: "price.asc",
                    limit: 2,
                    offset: 0
                },
                expectedOutput: {
                    rows: [
                        { id: 1, name: "Widget", price: 9.99 },
                        { id: 2, name: "Gadget", price: 24.99 }
                    ],
                    count: 5
                }
            }
        ],
        errorCases: [
            {
                name: "table_not_found",
                description: "Query references non-existent table",
                input: {
                    table: "nonexistent_table",
                    select: "*"
                },
                expectedError: {
                    type: "server_error",
                    message: 'relation "public.nonexistent_table" does not exist',
                    retryable: false
                }
            },
            {
                name: "invalid_column",
                description: "Query references non-existent column in filter",
                input: {
                    table: "users",
                    select: "*",
                    filter: [{ column: "nonexistent_col", operator: "eq", value: "test" }]
                },
                expectedError: {
                    type: "server_error",
                    message: 'column "nonexistent_col" does not exist',
                    retryable: false
                }
            },
            {
                name: "permission_denied",
                description: "No permission to access table",
                input: {
                    table: "auth.users",
                    select: "*"
                },
                expectedError: {
                    type: "server_error",
                    message: "permission denied for table users",
                    retryable: false
                }
            }
        ],
        edgeCases: []
    },
    {
        operationId: "insert",
        provider: "supabase",
        validCases: [
            {
                name: "insert_single_row",
                description: "Insert a single row with returning",
                input: {
                    table: "users",
                    data: {
                        email: "new.user@example.com",
                        full_name: "New User",
                        role: "user",
                        is_active: true
                    },
                    returning: true
                },
                expectedOutput: {
                    inserted: 1,
                    rows: [
                        {
                            id: "d4e5f6a7-b8c9-0123-def0-234567890123",
                            email: "new.user@example.com",
                            full_name: "New User",
                            role: "user",
                            is_active: true,
                            created_at: "2024-02-01T12:00:00.000Z"
                        }
                    ]
                }
            },
            {
                name: "insert_batch",
                description: "Insert multiple rows",
                input: {
                    table: "products",
                    data: [
                        { name: "Product A", price: 19.99, category: "electronics" },
                        { name: "Product B", price: 29.99, category: "electronics" }
                    ],
                    returning: true
                },
                expectedOutput: {
                    inserted: 2,
                    rows: [
                        {
                            id: 101,
                            name: "Product A",
                            price: 19.99,
                            category: "electronics"
                        },
                        {
                            id: 102,
                            name: "Product B",
                            price: 29.99,
                            category: "electronics"
                        }
                    ]
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
                        full_name: "Duplicate",
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
                name: "not_null_violation",
                description: "Insert missing required column",
                input: {
                    table: "users",
                    data: {
                        full_name: "Missing Email"
                    }
                },
                expectedError: {
                    type: "server_error",
                    message:
                        'null value in column "email" of relation "users" violates not-null constraint',
                    retryable: false
                }
            },
            {
                name: "table_not_found",
                description: "Insert into non-existent table",
                input: {
                    table: "nonexistent_table",
                    data: { field: "value" }
                },
                expectedError: {
                    type: "server_error",
                    message: 'relation "public.nonexistent_table" does not exist',
                    retryable: false
                }
            }
        ],
        edgeCases: []
    },
    {
        operationId: "update",
        provider: "supabase",
        validCases: [
            {
                name: "update_single_row",
                description: "Update a single row by ID",
                input: {
                    table: "users",
                    data: {
                        full_name: "Jonathan Doe",
                        role: "superadmin"
                    },
                    filter: [
                        {
                            column: "id",
                            operator: "eq",
                            value: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
                        }
                    ],
                    returning: true
                },
                expectedOutput: {
                    updated: 1,
                    rows: [
                        {
                            id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                            email: "john.doe@example.com",
                            full_name: "Jonathan Doe",
                            role: "superadmin",
                            is_active: true,
                            created_at: "2024-01-15T10:30:00.000Z"
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "unique_constraint_violation",
                description: "Update violates unique constraint",
                input: {
                    table: "users",
                    data: { email: "john.doe@example.com" },
                    filter: [
                        {
                            column: "id",
                            operator: "eq",
                            value: "b2c3d4e5-f6a7-8901-bcde-f12345678901"
                        }
                    ]
                },
                expectedError: {
                    type: "server_error",
                    message: 'duplicate key value violates unique constraint "users_email_key"',
                    retryable: false
                }
            },
            {
                name: "table_not_found",
                description: "Update non-existent table",
                input: {
                    table: "nonexistent_table",
                    data: { field: "value" },
                    filter: [{ column: "id", operator: "eq", value: 1 }]
                },
                expectedError: {
                    type: "server_error",
                    message: 'relation "public.nonexistent_table" does not exist',
                    retryable: false
                }
            }
        ],
        edgeCases: []
    },
    {
        operationId: "delete",
        provider: "supabase",
        validCases: [
            {
                name: "delete_single_row",
                description: "Delete a single row by ID",
                input: {
                    table: "users",
                    filter: [
                        {
                            column: "id",
                            operator: "eq",
                            value: "c3d4e5f6-a7b8-9012-cdef-123456789012"
                        }
                    ],
                    returning: true
                },
                expectedOutput: {
                    deleted: 1,
                    rows: [
                        {
                            id: "c3d4e5f6-a7b8-9012-cdef-123456789012",
                            email: "bob.wilson@example.com",
                            full_name: "Bob Wilson",
                            role: "user",
                            is_active: false,
                            created_at: "2024-01-17T16:20:00.000Z"
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "foreign_key_violation",
                description: "Delete violates foreign key constraint",
                input: {
                    table: "users",
                    filter: [
                        {
                            column: "id",
                            operator: "eq",
                            value: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
                        }
                    ]
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
                    filter: [{ column: "id", operator: "eq", value: 1 }]
                },
                expectedError: {
                    type: "server_error",
                    message: 'relation "public.nonexistent_table" does not exist',
                    retryable: false
                }
            }
        ],
        edgeCases: []
    },
    {
        operationId: "upsert",
        provider: "supabase",
        validCases: [
            {
                name: "upsert_new_row",
                description: "Upsert inserts a new row when no conflict",
                input: {
                    table: "users",
                    data: {
                        email: "upsert.user@example.com",
                        full_name: "Upsert User",
                        role: "user",
                        is_active: true
                    },
                    onConflict: "email",
                    returning: true
                },
                expectedOutput: {
                    upserted: 1,
                    rows: [
                        {
                            id: "e5f6a7b8-c9d0-1234-ef01-345678901234",
                            email: "upsert.user@example.com",
                            full_name: "Upsert User",
                            role: "user",
                            is_active: true,
                            created_at: "2024-02-01T12:00:00.000Z"
                        }
                    ]
                }
            },
            {
                name: "upsert_existing_row",
                description: "Upsert updates an existing row on conflict",
                input: {
                    table: "users",
                    data: {
                        email: "john.doe@example.com",
                        full_name: "John Doe Updated",
                        role: "admin"
                    },
                    onConflict: "email",
                    returning: true
                },
                expectedOutput: {
                    upserted: 1,
                    rows: [
                        {
                            id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                            email: "john.doe@example.com",
                            full_name: "John Doe Updated",
                            role: "admin",
                            is_active: true,
                            created_at: "2024-01-15T10:30:00.000Z"
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "not_null_violation",
                description: "Upsert missing required column",
                input: {
                    table: "users",
                    data: {
                        full_name: "Missing Email"
                    },
                    onConflict: "email"
                },
                expectedError: {
                    type: "server_error",
                    message:
                        'null value in column "email" of relation "users" violates not-null constraint',
                    retryable: false
                }
            },
            {
                name: "table_not_found",
                description: "Upsert into non-existent table",
                input: {
                    table: "nonexistent_table",
                    data: { field: "value" }
                },
                expectedError: {
                    type: "server_error",
                    message: 'relation "public.nonexistent_table" does not exist',
                    retryable: false
                }
            }
        ],
        edgeCases: []
    },
    {
        operationId: "listTables",
        provider: "supabase",
        validCases: [
            {
                name: "list_all_tables",
                description: "List all tables exposed via PostgREST",
                input: {},
                expectedOutput: {
                    tables: ["audit_logs", "orders", "products", "profiles", "users"]
                }
            }
        ],
        errorCases: [
            {
                name: "connection_failed",
                description: "Supabase project unreachable",
                input: {},
                expectedError: {
                    type: "server_error",
                    message: "Failed to connect to Supabase project",
                    retryable: true
                }
            },
            {
                name: "invalid_api_key",
                description: "Invalid API key provided",
                input: {},
                expectedError: {
                    type: "server_error",
                    message: "Invalid API key",
                    retryable: false
                }
            }
        ],
        edgeCases: []
    },
    {
        operationId: "rpc",
        provider: "supabase",
        validCases: [
            {
                name: "call_simple_function",
                description: "Call a simple RPC function",
                input: {
                    functionName: "get_user_count",
                    params: {}
                },
                expectedOutput: {
                    result: 42
                }
            },
            {
                name: "call_function_with_params",
                description: "Call an RPC function with parameters",
                input: {
                    functionName: "search_users",
                    params: {
                        search_term: "john",
                        limit_count: 10
                    }
                },
                expectedOutput: {
                    result: [
                        {
                            id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                            email: "john.doe@example.com",
                            full_name: "John Doe"
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "function_not_found",
                description: "RPC function does not exist",
                input: {
                    functionName: "nonexistent_function",
                    params: {}
                },
                expectedError: {
                    type: "server_error",
                    message: "function public.nonexistent_function() does not exist",
                    retryable: false
                }
            },
            {
                name: "invalid_params",
                description: "Wrong parameters for function",
                input: {
                    functionName: "get_user_count",
                    params: {
                        unexpected_param: "value"
                    }
                },
                expectedError: {
                    type: "server_error",
                    message:
                        "function public.get_user_count(unexpected_param => text) does not exist",
                    retryable: false
                }
            }
        ],
        edgeCases: []
    }
];
