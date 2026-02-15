/**
 * Elasticsearch Provider Test Fixtures
 *
 * Comprehensive test data for all Elasticsearch operations including
 * search, document CRUD, bulk operations, and index management.
 */

import type { TestFixture } from "../../sandbox";

export const elasticsearchFixtures: TestFixture[] = [
    // ==================== SEARCH ====================
    {
        operationId: "search",
        provider: "elasticsearch",
        validCases: [
            {
                name: "simple_match_query",
                description: "Search with a simple match query",
                input: {
                    index: "products",
                    query: { match: { name: "laptop" } },
                    size: 10
                },
                expectedOutput: {
                    hits: [
                        {
                            _id: "prod-001",
                            _index: "products",
                            _score: 5.2,
                            name: "Gaming Laptop Pro",
                            category: "Electronics",
                            price: 1299.99
                        },
                        {
                            _id: "prod-002",
                            _index: "products",
                            _score: 4.8,
                            name: "Business Laptop Elite",
                            category: "Electronics",
                            price: 999.99
                        }
                    ],
                    total: 25,
                    took: 5,
                    timedOut: false
                }
            },
            {
                name: "bool_query_with_filters",
                description: "Search with boolean query and filters",
                input: {
                    index: "products",
                    query: {
                        bool: {
                            must: [{ match: { category: "Electronics" } }],
                            filter: [{ range: { price: { gte: 100, lte: 500 } } }]
                        }
                    },
                    size: 20,
                    sort: [{ price: "asc" }]
                },
                expectedOutput: {
                    hits: [
                        {
                            _id: "prod-010",
                            _index: "products",
                            _score: null,
                            name: "Wireless Earbuds",
                            category: "Electronics",
                            price: 129.99
                        },
                        {
                            _id: "prod-015",
                            _index: "products",
                            _score: null,
                            name: "Portable Charger",
                            category: "Electronics",
                            price: 49.99
                        }
                    ],
                    total: 42,
                    took: 8,
                    timedOut: false
                }
            },
            {
                name: "aggregation_query",
                description: "Search with aggregations",
                input: {
                    index: "orders",
                    query: { match_all: {} },
                    size: 0,
                    aggregations: {
                        by_status: {
                            terms: { field: "status" }
                        },
                        total_revenue: {
                            sum: { field: "amount" }
                        }
                    }
                },
                expectedOutput: {
                    hits: [],
                    total: 10000,
                    took: 15,
                    timedOut: false,
                    aggregations: {
                        by_status: {
                            buckets: [
                                { key: "completed", doc_count: 7500 },
                                { key: "pending", doc_count: 1800 },
                                { key: "cancelled", doc_count: 700 }
                            ]
                        },
                        total_revenue: { value: 1250000.0 }
                    }
                }
            },
            {
                name: "search_with_highlight",
                description: "Search with highlighting",
                input: {
                    index: "articles",
                    query: { match: { content: "elasticsearch" } },
                    highlight: {
                        fields: { content: {} }
                    },
                    size: 5
                },
                expectedOutput: {
                    hits: [
                        {
                            _id: "article-001",
                            _index: "articles",
                            _score: 12.5,
                            title: "Getting Started with Elasticsearch",
                            content: "Learn how to use Elasticsearch for full-text search...",
                            _highlight: {
                                content: [
                                    "Learn how to use <em>Elasticsearch</em> for full-text search..."
                                ]
                            }
                        }
                    ],
                    total: 156,
                    took: 12,
                    timedOut: false
                }
            }
        ],
        errorCases: [
            {
                name: "index_not_found",
                description: "Search on non-existent index",
                input: {
                    index: "nonexistent_index",
                    query: { match_all: {} }
                },
                expectedError: {
                    type: "not_found",
                    message: "no such index [nonexistent_index]",
                    retryable: false
                }
            },
            {
                name: "invalid_query_syntax",
                description: "Malformed query DSL",
                input: {
                    index: "products",
                    query: { invalid_operator: { field: "value" } }
                },
                expectedError: {
                    type: "validation",
                    message: "no [query] registered for [invalid_operator]",
                    retryable: false
                }
            }
        ],
        edgeCases: [
            {
                name: "empty_results",
                description: "Query returns no results",
                input: {
                    index: "products",
                    query: { term: { sku: "NONEXISTENT-SKU" } }
                },
                expectedOutput: {
                    hits: [],
                    total: 0,
                    took: 2,
                    timedOut: false
                }
            }
        ]
    },

    // ==================== GET DOCUMENT ====================
    {
        operationId: "getDocument",
        provider: "elasticsearch",
        validCases: [
            {
                name: "get_existing_document",
                description: "Retrieve a document by ID",
                input: {
                    index: "users",
                    id: "user-123"
                },
                expectedOutput: {
                    _id: "user-123",
                    _index: "users",
                    email: "john.doe@example.com",
                    name: "John Doe",
                    role: "admin",
                    created_at: "2024-01-15T10:30:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "document_not_found",
                description: "Document does not exist",
                input: {
                    index: "users",
                    id: "nonexistent-id"
                },
                expectedError: {
                    type: "not_found",
                    message: "Document 'nonexistent-id' not found in index 'users'",
                    retryable: false
                }
            },
            {
                name: "index_not_found",
                description: "Index does not exist",
                input: {
                    index: "nonexistent_index",
                    id: "doc-1"
                },
                expectedError: {
                    type: "not_found",
                    message: "Document 'doc-1' not found in index 'nonexistent_index'",
                    retryable: false
                }
            }
        ],
        edgeCases: []
    },

    // ==================== INDEX DOCUMENT ====================
    {
        operationId: "indexDocument",
        provider: "elasticsearch",
        validCases: [
            {
                name: "index_with_id",
                description: "Index a document with specific ID",
                input: {
                    index: "products",
                    id: "prod-new-001",
                    document: {
                        name: "New Product",
                        category: "Electronics",
                        price: 299.99,
                        in_stock: true
                    }
                },
                expectedOutput: {
                    _id: "prod-new-001",
                    _index: "products",
                    _version: 1,
                    result: "created",
                    created: true
                }
            },
            {
                name: "index_auto_id",
                description: "Index a document with auto-generated ID",
                input: {
                    index: "logs",
                    document: {
                        level: "info",
                        message: "Application started",
                        timestamp: "2024-02-20T10:00:00Z"
                    }
                },
                expectedOutput: {
                    _id: "auto-generated-id-123",
                    _index: "logs",
                    _version: 1,
                    result: "created",
                    created: true
                }
            },
            {
                name: "update_existing_document",
                description: "Overwrite an existing document",
                input: {
                    index: "products",
                    id: "prod-001",
                    document: {
                        name: "Updated Product",
                        category: "Electronics",
                        price: 349.99,
                        in_stock: false
                    }
                },
                expectedOutput: {
                    _id: "prod-001",
                    _index: "products",
                    _version: 2,
                    result: "updated",
                    created: false
                }
            }
        ],
        errorCases: [
            {
                name: "mapping_error",
                description: "Document violates index mapping",
                input: {
                    index: "products",
                    document: {
                        name: "Test",
                        price: "not-a-number"
                    }
                },
                expectedError: {
                    type: "validation",
                    message:
                        "mapper_parsing_exception: failed to parse field [price] of type [float]",
                    retryable: false
                }
            }
        ],
        edgeCases: []
    },

    // ==================== UPDATE DOCUMENT ====================
    {
        operationId: "updateDocument",
        provider: "elasticsearch",
        validCases: [
            {
                name: "partial_update",
                description: "Partially update a document",
                input: {
                    index: "users",
                    id: "user-123",
                    doc: {
                        last_login: "2024-02-20T15:30:00Z",
                        login_count: 42
                    }
                },
                expectedOutput: {
                    _id: "user-123",
                    _index: "users",
                    _version: 5,
                    result: "updated"
                }
            },
            {
                name: "upsert_document",
                description: "Update or create document if not exists",
                input: {
                    index: "counters",
                    id: "page-views",
                    doc: { count: 100 },
                    upsert: true
                },
                expectedOutput: {
                    _id: "page-views",
                    _index: "counters",
                    _version: 1,
                    result: "created"
                }
            }
        ],
        errorCases: [
            {
                name: "document_not_found",
                description: "Update non-existent document without upsert",
                input: {
                    index: "users",
                    id: "nonexistent-user",
                    doc: { name: "Test" }
                },
                expectedError: {
                    type: "not_found",
                    message: "Document 'nonexistent-user' not found in index 'users'",
                    retryable: false
                }
            }
        ],
        edgeCases: []
    },

    // ==================== DELETE DOCUMENT ====================
    {
        operationId: "deleteDocument",
        provider: "elasticsearch",
        validCases: [
            {
                name: "delete_existing_document",
                description: "Delete a document by ID",
                input: {
                    index: "users",
                    id: "user-to-delete"
                },
                expectedOutput: {
                    _id: "user-to-delete",
                    _index: "users",
                    result: "deleted",
                    deleted: true
                }
            }
        ],
        errorCases: [
            {
                name: "document_not_found",
                description: "Delete non-existent document",
                input: {
                    index: "users",
                    id: "nonexistent-id"
                },
                expectedError: {
                    type: "not_found",
                    message: "Document 'nonexistent-id' not found in index 'users'",
                    retryable: false
                }
            }
        ],
        edgeCases: []
    },

    // ==================== DELETE BY QUERY ====================
    {
        operationId: "deleteByQuery",
        provider: "elasticsearch",
        validCases: [
            {
                name: "delete_old_logs",
                description: "Delete logs older than a date",
                input: {
                    index: "logs",
                    query: {
                        range: {
                            timestamp: { lt: "2024-01-01T00:00:00Z" }
                        }
                    }
                },
                expectedOutput: {
                    deleted: 15000,
                    total: 15000,
                    failures: []
                }
            },
            {
                name: "delete_by_status",
                description: "Delete documents matching a term",
                input: {
                    index: "tasks",
                    query: {
                        term: { status: "cancelled" }
                    }
                },
                expectedOutput: {
                    deleted: 250,
                    total: 250,
                    failures: []
                }
            }
        ],
        errorCases: [
            {
                name: "index_not_found",
                description: "Delete from non-existent index",
                input: {
                    index: "nonexistent_index",
                    query: { match_all: {} }
                },
                expectedError: {
                    type: "not_found",
                    message: "no such index [nonexistent_index]",
                    retryable: false
                }
            }
        ],
        edgeCases: []
    },

    // ==================== BULK ====================
    {
        operationId: "bulk",
        provider: "elasticsearch",
        validCases: [
            {
                name: "bulk_mixed_operations",
                description: "Execute multiple operations in bulk",
                input: {
                    operations: [
                        {
                            action: "index",
                            index: "products",
                            id: "prod-bulk-001",
                            document: { name: "Bulk Product 1", price: 99.99 }
                        },
                        {
                            action: "index",
                            index: "products",
                            id: "prod-bulk-002",
                            document: { name: "Bulk Product 2", price: 149.99 }
                        },
                        {
                            action: "update",
                            index: "products",
                            id: "prod-001",
                            document: { price: 79.99 }
                        },
                        {
                            action: "delete",
                            index: "products",
                            id: "prod-old-001"
                        }
                    ]
                },
                expectedOutput: {
                    took: 30,
                    successful: 4,
                    failed: 0,
                    total: 4
                }
            }
        ],
        errorCases: [],
        edgeCases: [
            {
                name: "partial_failure",
                description: "Some operations fail in bulk",
                input: {
                    operations: [
                        {
                            action: "index",
                            index: "products",
                            id: "prod-001",
                            document: { name: "Valid", price: 99.99 }
                        },
                        {
                            action: "index",
                            index: "products",
                            id: "prod-002",
                            document: { name: "Invalid", price: "not-a-number" }
                        }
                    ]
                },
                expectedOutput: {
                    took: 15,
                    successful: 1,
                    failed: 1,
                    total: 2,
                    errors: [
                        {
                            index: "products",
                            id: "prod-002",
                            error: "mapper_parsing_exception: failed to parse field [price]"
                        }
                    ]
                }
            }
        ]
    },

    // ==================== CREATE INDEX ====================
    {
        operationId: "createIndex",
        provider: "elasticsearch",
        validCases: [
            {
                name: "create_simple_index",
                description: "Create a new index with default settings",
                input: {
                    index: "new-index"
                },
                expectedOutput: {
                    index: "new-index",
                    acknowledged: true,
                    shards_acknowledged: true
                }
            },
            {
                name: "create_index_with_mappings",
                description: "Create index with custom mappings",
                input: {
                    index: "products-v2",
                    settings: {
                        number_of_shards: 3,
                        number_of_replicas: 1
                    },
                    mappings: {
                        properties: {
                            name: { type: "text" },
                            price: { type: "float" },
                            category: { type: "keyword" },
                            created_at: { type: "date" }
                        }
                    }
                },
                expectedOutput: {
                    index: "products-v2",
                    acknowledged: true,
                    shards_acknowledged: true
                }
            }
        ],
        errorCases: [
            {
                name: "index_already_exists",
                description: "Attempt to create existing index",
                input: {
                    index: "products"
                },
                expectedError: {
                    type: "validation",
                    message: "Index 'products' already exists",
                    retryable: false
                }
            },
            {
                name: "invalid_settings",
                description: "Invalid index settings",
                input: {
                    index: "bad-index",
                    settings: {
                        number_of_shards: -1
                    }
                },
                expectedError: {
                    type: "validation",
                    message: "Failed to parse value [-1] for setting [index.number_of_shards]",
                    retryable: false
                }
            }
        ],
        edgeCases: []
    },

    // ==================== DELETE INDEX ====================
    {
        operationId: "deleteIndex",
        provider: "elasticsearch",
        validCases: [
            {
                name: "delete_existing_index",
                description: "Delete an index",
                input: {
                    index: "old-index"
                },
                expectedOutput: {
                    acknowledged: true,
                    index: "old-index"
                }
            }
        ],
        errorCases: [
            {
                name: "index_not_found",
                description: "Delete non-existent index",
                input: {
                    index: "nonexistent_index"
                },
                expectedError: {
                    type: "not_found",
                    message: "Index 'nonexistent_index' not found",
                    retryable: false
                }
            }
        ],
        edgeCases: []
    },

    // ==================== LIST INDICES ====================
    {
        operationId: "listIndices",
        provider: "elasticsearch",
        validCases: [
            {
                name: "list_all_indices",
                description: "List all indices in the cluster",
                input: {},
                expectedOutput: {
                    indices: [
                        {
                            name: "products",
                            health: "green",
                            status: "open",
                            primaryShards: 5,
                            replicaShards: 1,
                            docsCount: 10000,
                            docsDeleted: 50,
                            storeSize: "25mb",
                            primaryStoreSize: "12.5mb"
                        },
                        {
                            name: "users",
                            health: "green",
                            status: "open",
                            primaryShards: 3,
                            replicaShards: 1,
                            docsCount: 5000,
                            docsDeleted: 10,
                            storeSize: "10mb",
                            primaryStoreSize: "5mb"
                        },
                        {
                            name: "logs-2024.02",
                            health: "yellow",
                            status: "open",
                            primaryShards: 5,
                            replicaShards: 1,
                            docsCount: 1000000,
                            docsDeleted: 0,
                            storeSize: "500mb",
                            primaryStoreSize: "250mb"
                        }
                    ],
                    count: 3
                }
            },
            {
                name: "list_indices_with_pattern",
                description: "List indices matching a pattern",
                input: {
                    pattern: "logs-*"
                },
                expectedOutput: {
                    indices: [
                        {
                            name: "logs-2024.01",
                            health: "green",
                            status: "open",
                            primaryShards: 5,
                            replicaShards: 1,
                            docsCount: 2000000,
                            docsDeleted: 0,
                            storeSize: "1gb",
                            primaryStoreSize: "512mb"
                        },
                        {
                            name: "logs-2024.02",
                            health: "yellow",
                            status: "open",
                            primaryShards: 5,
                            replicaShards: 1,
                            docsCount: 1000000,
                            docsDeleted: 0,
                            storeSize: "500mb",
                            primaryStoreSize: "250mb"
                        }
                    ],
                    count: 2
                }
            }
        ],
        errorCases: [],
        edgeCases: [
            {
                name: "no_matching_indices",
                description: "Pattern matches no indices",
                input: {
                    pattern: "nonexistent-*"
                },
                expectedOutput: {
                    indices: [],
                    count: 0
                }
            }
        ]
    }
];
