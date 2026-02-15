/**
 * MongoDB Provider Test Fixtures
 *
 * Comprehensive test data for all MongoDB operations including
 * document CRUD, aggregation pipelines, and collection management.
 */

import type { TestFixture } from "../../sandbox";

export const mongodbFixtures: TestFixture[] = [
    // ==================== AGGREGATE ====================
    {
        operationId: "aggregate",
        provider: "mongodb",
        validCases: [
            {
                name: "basic_aggregate_group_by_category",
                description: "Group products by category and count",
                input: {
                    collection: "products",
                    pipeline: [
                        { $match: { status: "active" } },
                        {
                            $group: {
                                _id: "$category",
                                count: { $sum: 1 },
                                totalValue: { $sum: "$price" }
                            }
                        },
                        { $sort: { count: -1 } }
                    ]
                },
                expectedOutput: {
                    result: [
                        { _id: "Electronics", count: 45, totalValue: 67500 },
                        { _id: "Clothing", count: 32, totalValue: 4800 },
                        { _id: "Home & Garden", count: 28, totalValue: 8400 },
                        { _id: "Books", count: 18, totalValue: 450 }
                    ],
                    count: 4
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_collection",
                description: "Collection does not exist",
                input: {
                    collection: "nonexistent_collection",
                    pipeline: [{ $match: { status: "active" } }]
                },
                expectedError: {
                    type: "not_found",
                    message: "Collection 'nonexistent_collection' not found",
                    retryable: false
                }
            },
            {
                name: "invalid_pipeline_operator",
                description: "Invalid aggregation pipeline operator",
                input: {
                    collection: "products",
                    pipeline: [{ $invalidOperator: { field: "value" } }]
                },
                expectedError: {
                    type: "validation",
                    message: "Unrecognized pipeline stage name: '$invalidOperator'",
                    retryable: false
                }
            },
            {
                name: "timeout_exceeded",
                description: "Aggregation exceeded max execution time",
                input: {
                    collection: "large_collection",
                    pipeline: [
                        {
                            $lookup: {
                                from: "other_large_collection",
                                localField: "id",
                                foreignField: "refId",
                                as: "joined"
                            }
                        },
                        { $unwind: "$joined" }
                    ],
                    options: {
                        maxTimeMS: 100
                    }
                },
                expectedError: {
                    type: "server_error",
                    message: "operation exceeded time limit",
                    retryable: true
                }
            }
        ],
        edgeCases: []
    },

    // ==================== DELETE MANY ====================
    {
        operationId: "deleteMany",
        provider: "mongodb",
        validCases: [
            {
                name: "delete_expired_sessions",
                description: "Delete all expired user sessions",
                input: {
                    collection: "sessions",
                    filter: {
                        expiresAt: { $lt: { $date: "2024-01-01T00:00:00Z" } }
                    }
                },
                expectedOutput: {
                    result: {
                        deletedCount: 1247,
                        acknowledged: true
                    },
                    count: 1247
                }
            }
        ],
        errorCases: [
            {
                name: "unauthorized_collection",
                description: "User lacks delete permission on collection",
                input: {
                    collection: "audit_logs",
                    filter: { createdAt: { $lt: { $date: "2024-01-01T00:00:00Z" } } }
                },
                expectedError: {
                    type: "permission",
                    message: "not authorized on database to execute command",
                    retryable: false
                }
            },
            {
                name: "invalid_filter_syntax",
                description: "Malformed filter query",
                input: {
                    collection: "products",
                    filter: { $invalidOp: { field: "value" } }
                },
                expectedError: {
                    type: "validation",
                    message: "unknown operator: $invalidOp",
                    retryable: false
                }
            }
        ],
        edgeCases: []
    },

    // ==================== DELETE ONE ====================
    {
        operationId: "deleteOne",
        provider: "mongodb",
        validCases: [
            {
                name: "delete_by_id",
                description: "Delete a single document by its ID",
                input: {
                    collection: "customers",
                    filter: { _id: "507f1f77bcf86cd799439011" }
                },
                expectedOutput: {
                    result: {
                        deletedCount: 1,
                        acknowledged: true
                    },
                    count: 1
                }
            }
        ],
        errorCases: [
            {
                name: "write_concern_error",
                description: "Write concern acknowledgment failed",
                input: {
                    collection: "critical_data",
                    filter: { _id: "507f1f77bcf86cd799439099" }
                },
                expectedError: {
                    type: "server_error",
                    message: "Write concern error",
                    retryable: true
                }
            }
        ],
        edgeCases: []
    },

    // ==================== FIND ====================
    {
        operationId: "find",
        provider: "mongodb",
        validCases: [
            {
                name: "find_all_active_users",
                description: "Find all users with active status",
                input: {
                    collection: "users",
                    filter: { status: "active" },
                    projection: { _id: 1, email: 1, name: 1, createdAt: 1 },
                    sort: { createdAt: -1 },
                    limit: 10,
                    returnFormat: "array"
                },
                expectedOutput: {
                    result: [
                        {
                            _id: "65a1b2c3d4e5f6789012345a",
                            email: "john.doe@example.com",
                            name: "John Doe",
                            createdAt: "2024-02-15T10:30:00Z"
                        },
                        {
                            _id: "65a1b2c3d4e5f6789012345b",
                            email: "jane.smith@example.com",
                            name: "Jane Smith",
                            createdAt: "2024-02-14T08:15:00Z"
                        },
                        {
                            _id: "65a1b2c3d4e5f6789012345c",
                            email: "mike.wilson@example.com",
                            name: "Mike Wilson",
                            createdAt: "2024-02-13T14:45:00Z"
                        }
                    ],
                    count: 3
                }
            }
        ],
        errorCases: [
            {
                name: "collection_not_found",
                description: "Query on non-existent collection",
                input: {
                    collection: "nonexistent_collection",
                    filter: { status: "active" }
                },
                expectedError: {
                    type: "not_found",
                    message: "Collection 'nonexistent_collection' not found",
                    retryable: false
                }
            },
            {
                name: "invalid_query_operator",
                description: "Unknown query operator in filter",
                input: {
                    collection: "products",
                    filter: { price: { $unknownOp: 100 } }
                },
                expectedError: {
                    type: "validation",
                    message: "unknown operator: $unknownOp",
                    retryable: false
                }
            },
            {
                name: "connection_timeout",
                description: "Database connection timeout",
                input: {
                    collection: "products",
                    filter: { status: "active" }
                },
                expectedError: {
                    type: "server_error",
                    message: "connection timed out",
                    retryable: true
                }
            }
        ],
        edgeCases: []
    },

    // ==================== INSERT MANY ====================
    {
        operationId: "insertMany",
        provider: "mongodb",
        validCases: [
            {
                name: "insert_multiple_products",
                description: "Bulk insert new products",
                input: {
                    collection: "products",
                    documents: [
                        {
                            sku: "PHONE-X12-PRO",
                            name: "SmartPhone X12 Pro",
                            category: "Electronics",
                            price: 999.99,
                            stock: 150,
                            specifications: {
                                display: "6.7 inch AMOLED",
                                processor: "A16 Bionic",
                                storage: "256GB"
                            },
                            tags: ["smartphone", "premium", "5g"],
                            createdAt: "2024-02-20T10:00:00Z"
                        },
                        {
                            sku: "PHONE-X12-LITE",
                            name: "SmartPhone X12 Lite",
                            category: "Electronics",
                            price: 599.99,
                            stock: 250,
                            specifications: {
                                display: "6.1 inch LCD",
                                processor: "A14 Bionic",
                                storage: "128GB"
                            },
                            tags: ["smartphone", "budget", "5g"],
                            createdAt: "2024-02-20T10:00:00Z"
                        },
                        {
                            sku: "TABLET-TAB-10",
                            name: "ProTab 10 inch",
                            category: "Electronics",
                            price: 449.99,
                            stock: 80,
                            specifications: {
                                display: "10.9 inch Liquid Retina",
                                processor: "M1",
                                storage: "64GB"
                            },
                            tags: ["tablet", "productivity"],
                            createdAt: "2024-02-20T10:00:00Z"
                        }
                    ],
                    ordered: true
                },
                expectedOutput: {
                    result: {
                        insertedIds: {
                            "0": "65d4e5f6a7b8c9d0e1f23456",
                            "1": "65d4e5f6a7b8c9d0e1f23457",
                            "2": "65d4e5f6a7b8c9d0e1f23458"
                        },
                        insertedCount: 3,
                        acknowledged: true
                    },
                    count: 3
                }
            }
        ],
        errorCases: [
            {
                name: "duplicate_key_error",
                description: "Insert fails due to duplicate unique key",
                input: {
                    collection: "users",
                    documents: [
                        { email: "existing.user@example.com", name: "New User" },
                        { email: "another.user@example.com", name: "Another User" }
                    ],
                    ordered: true
                },
                expectedError: {
                    type: "validation",
                    message:
                        'E11000 duplicate key error collection: database.users index: email_1 dup key: { email: "existing.user@example.com" }',
                    retryable: false
                }
            },
            {
                name: "document_validation",
                description: "Document fails schema validation",
                input: {
                    collection: "products",
                    documents: [
                        { name: "Valid Product", price: 99.99 },
                        { name: "", price: -10 }
                    ],
                    ordered: true
                },
                expectedError: {
                    type: "validation",
                    message: "Document failed validation",
                    retryable: false
                }
            },
            {
                name: "write_concern_error",
                description: "Write concern acknowledgment failed",
                input: {
                    collection: "critical_data",
                    documents: [{ data: "important" }]
                },
                expectedError: {
                    type: "server_error",
                    message: "Write concern error: Not enough data-bearing members",
                    retryable: true
                }
            }
        ],
        edgeCases: []
    },

    // ==================== INSERT ONE ====================
    {
        operationId: "insertOne",
        provider: "mongodb",
        validCases: [
            {
                name: "insert_new_user",
                description: "Insert a new user document",
                input: {
                    collection: "users",
                    document: {
                        email: "new.user@example.com",
                        name: "New User",
                        password: "$2b$10$hashedpassword123456789",
                        role: "user",
                        status: "active",
                        profile: {
                            firstName: "New",
                            lastName: "User",
                            avatar: null,
                            bio: ""
                        },
                        preferences: {
                            notifications: true,
                            newsletter: false,
                            theme: "light"
                        },
                        createdAt: "2024-02-20T10:00:00Z",
                        updatedAt: "2024-02-20T10:00:00Z"
                    }
                },
                expectedOutput: {
                    result: {
                        insertedId: "65d4e5f6a7b8c9d0e1f23461",
                        acknowledged: true
                    },
                    count: 1
                }
            }
        ],
        errorCases: [
            {
                name: "duplicate_key_error",
                description: "Insert fails due to duplicate unique key",
                input: {
                    collection: "users",
                    document: {
                        email: "existing.user@example.com",
                        name: "Another User"
                    }
                },
                expectedError: {
                    type: "validation",
                    message:
                        'E11000 duplicate key error collection: database.users index: email_1 dup key: { email: "existing.user@example.com" }',
                    retryable: false
                }
            },
            {
                name: "schema_validation_failed",
                description: "Document fails schema validation rules",
                input: {
                    collection: "products",
                    document: {
                        name: "",
                        price: -100
                    }
                },
                expectedError: {
                    type: "validation",
                    message:
                        "Document failed validation: price must be a positive number, name is required",
                    retryable: false
                }
            },
            {
                name: "max_document_size_exceeded",
                description: "Document exceeds 16MB limit",
                input: {
                    collection: "files",
                    document: {
                        name: "large_file.bin",
                        data: "[base64 encoded data exceeding 16MB]"
                    }
                },
                expectedError: {
                    type: "validation",
                    message: "BSONObjectTooLarge: Object size exceeds maximum allowed BSON size",
                    retryable: false
                }
            }
        ],
        edgeCases: []
    },

    // ==================== LIST COLLECTIONS ====================
    {
        operationId: "listCollections",
        provider: "mongodb",
        validCases: [
            {
                name: "list_all_collections",
                description: "List all collections in the database",
                input: {},
                expectedOutput: {
                    result: [
                        {
                            name: "users",
                            type: "collection",
                            options: { validator: { $jsonSchema: {} } },
                            info: { readOnly: false, uuid: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" }
                        },
                        {
                            name: "products",
                            type: "collection",
                            options: { capped: false },
                            info: { readOnly: false, uuid: "b2c3d4e5-f6a7-8901-bcde-f12345678901" }
                        },
                        {
                            name: "orders",
                            type: "collection",
                            options: {},
                            info: { readOnly: false, uuid: "c3d4e5f6-a7b8-9012-cdef-123456789012" }
                        },
                        {
                            name: "sessions",
                            type: "collection",
                            options: { expireAfterSeconds: 86400 },
                            info: { readOnly: false, uuid: "d4e5f6a7-b8c9-0123-def0-234567890123" }
                        },
                        {
                            name: "audit_logs",
                            type: "collection",
                            options: { capped: true, size: 104857600, max: 100000 },
                            info: { readOnly: false, uuid: "e5f6a7b8-c9d0-1234-ef01-345678901234" }
                        }
                    ],
                    count: 5
                }
            }
        ],
        errorCases: [
            {
                name: "unauthorized_access",
                description: "User lacks permission to list collections",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "not authorized to execute command listCollections",
                    retryable: false
                }
            },
            {
                name: "invalid_filter_syntax",
                description: "Invalid filter expression",
                input: {
                    filter: { $invalidOp: "value" }
                },
                expectedError: {
                    type: "validation",
                    message: "unknown operator: $invalidOp",
                    retryable: false
                }
            }
        ],
        edgeCases: []
    },

    // ==================== UPDATE MANY ====================
    {
        operationId: "updateMany",
        provider: "mongodb",
        validCases: [
            {
                name: "update_product_prices",
                description: "Apply 10% discount to all electronics",
                input: {
                    collection: "products",
                    filter: { category: "Electronics", status: "active" },
                    update: {
                        $mul: { price: 0.9 },
                        $set: { discountApplied: true, updatedAt: "2024-02-20T10:00:00Z" }
                    }
                },
                expectedOutput: {
                    result: {
                        matchedCount: 156,
                        modifiedCount: 156,
                        upsertedId: null,
                        upsertedCount: 0,
                        acknowledged: true
                    },
                    count: 156
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_update_operator",
                description: "Unknown update operator",
                input: {
                    collection: "products",
                    filter: { status: "active" },
                    update: { $unknownOp: { field: "value" } }
                },
                expectedError: {
                    type: "validation",
                    message: "Unknown modifier: $unknownOp",
                    retryable: false
                }
            },
            {
                name: "immutable_field_error",
                description: "Attempt to modify immutable field",
                input: {
                    collection: "users",
                    filter: { status: "active" },
                    update: { $set: { _id: "new_id" } }
                },
                expectedError: {
                    type: "validation",
                    message:
                        "Performing an update on the path '_id' would modify the immutable field '_id'",
                    retryable: false
                }
            },
            {
                name: "write_conflict",
                description: "Write conflict during update",
                input: {
                    collection: "counters",
                    filter: { name: "order_sequence" },
                    update: { $inc: { value: 1 } }
                },
                expectedError: {
                    type: "server_error",
                    message: "WriteConflict: write conflict during plan execution",
                    retryable: true
                }
            }
        ],
        edgeCases: []
    },

    // ==================== UPDATE ONE ====================
    {
        operationId: "updateOne",
        provider: "mongodb",
        validCases: [
            {
                name: "update_user_profile",
                description: "Update user profile information",
                input: {
                    collection: "users",
                    filter: { _id: "65a1b2c3d4e5f67890123456" },
                    update: {
                        $set: {
                            "profile.firstName": "Jonathan",
                            "profile.lastName": "Smith",
                            "profile.bio": "Software engineer with 10+ years of experience",
                            "profile.avatar": "https://cdn.example.com/avatars/jsmith.jpg",
                            updatedAt: "2024-02-20T14:30:00Z"
                        }
                    }
                },
                expectedOutput: {
                    result: {
                        matchedCount: 1,
                        modifiedCount: 1,
                        upsertedId: null,
                        upsertedCount: 0,
                        acknowledged: true
                    },
                    count: 1
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_update_operator",
                description: "Unknown update operator",
                input: {
                    collection: "users",
                    filter: { _id: "65a1b2c3d4e5f67890123456" },
                    update: { $badOperator: { field: "value" } }
                },
                expectedError: {
                    type: "validation",
                    message: "Unknown modifier: $badOperator",
                    retryable: false
                }
            },
            {
                name: "type_mismatch_error",
                description: "Update value type mismatch",
                input: {
                    collection: "products",
                    filter: { sku: "LAPTOP-PRO-15" },
                    update: { $inc: { stock: "not_a_number" } }
                },
                expectedError: {
                    type: "validation",
                    message: "Cannot apply $inc to a value of non-numeric type",
                    retryable: false
                }
            },
            {
                name: "array_filter_mismatch",
                description: "Array filter identifier not found",
                input: {
                    collection: "orders",
                    filter: { _id: "65a1b2c3d4e5f67890123456" },
                    update: {
                        $set: { "items.$[elem].status": "shipped" }
                    }
                },
                expectedError: {
                    type: "validation",
                    message: "No array filter found for identifier 'elem'",
                    retryable: false
                }
            }
        ],
        edgeCases: []
    }
];
