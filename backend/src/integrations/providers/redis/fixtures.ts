/**
 * Redis Provider Test Fixtures
 *
 * Comprehensive test data for Redis operations including:
 * - Get: Retrieve values by key (single and multi)
 * - Set: Store key-value pairs with optional TTL and conditions
 * - Delete: Remove keys
 * - Keys: Scan keys matching a pattern
 * - HashGet: Retrieve hash fields
 * - HashSet: Set hash fields
 * - ListPush: Push values to lists
 * - ListRange: Retrieve list elements by range
 */

import type { TestFixture } from "../../sandbox";

export const redisFixtures: TestFixture[] = [
    {
        operationId: "get",
        provider: "redis",
        validCases: [
            {
                name: "single_key_lookup",
                description: "Get a single value by key",
                input: {
                    key: "user:1:name"
                },
                expectedOutput: {
                    value: "John Doe"
                }
            },
            {
                name: "multi_key_lookup",
                description: "Get multiple values using MGET",
                input: {
                    keys: ["user:1:name", "user:2:name", "user:3:name"]
                },
                expectedOutput: {
                    values: {
                        "user:1:name": "John Doe",
                        "user:2:name": "Jane Smith",
                        "user:3:name": null
                    }
                }
            },
            {
                name: "key_not_found",
                description: "Get a key that does not exist returns null",
                input: {
                    key: "nonexistent:key"
                },
                expectedOutput: {
                    value: null
                }
            }
        ],
        errorCases: [
            {
                name: "wrong_type",
                description: "GET on a key that holds a non-string type",
                input: {
                    key: "myhash"
                },
                expectedError: {
                    type: "server_error",
                    message: "WRONGTYPE Operation against a key holding the wrong kind of value",
                    retryable: false
                }
            },
            {
                name: "authentication_required",
                description: "Connection requires authentication",
                input: {
                    key: "test:key"
                },
                expectedError: {
                    type: "server_error",
                    message: "NOAUTH Authentication required",
                    retryable: false
                }
            },
            {
                name: "connection_refused",
                description: "Redis server unreachable",
                input: {
                    key: "test:key"
                },
                expectedError: {
                    type: "server_error",
                    message: "connect ECONNREFUSED",
                    retryable: true
                }
            }
        ],
        edgeCases: []
    },
    {
        operationId: "set",
        provider: "redis",
        validCases: [
            {
                name: "basic_set",
                description: "Set a simple key-value pair",
                input: {
                    key: "user:1:name",
                    value: "John Doe"
                },
                expectedOutput: {
                    set: true
                }
            },
            {
                name: "set_with_ttl",
                description: "Set a key-value pair with TTL of 3600 seconds",
                input: {
                    key: "session:abc123",
                    value: '{"userId":"1","role":"admin"}',
                    ttl: 3600
                },
                expectedOutput: {
                    set: true
                }
            },
            {
                name: "set_with_nx_condition",
                description: "Set only if key does not exist (NX)",
                input: {
                    key: "lock:resource:1",
                    value: "owner-123",
                    ttl: 30,
                    condition: "NX"
                },
                expectedOutput: {
                    set: true
                }
            },
            {
                name: "set_nx_key_exists",
                description: "NX fails when key already exists",
                input: {
                    key: "user:1:name",
                    value: "New Value",
                    condition: "NX"
                },
                expectedOutput: {
                    set: false
                }
            }
        ],
        errorCases: [
            {
                name: "wrong_password",
                description: "Invalid password for Redis authentication",
                input: {
                    key: "test:key",
                    value: "test"
                },
                expectedError: {
                    type: "server_error",
                    message: "WRONGPASS invalid username-password pair or user is disabled",
                    retryable: false
                }
            }
        ],
        edgeCases: []
    },
    {
        operationId: "delete",
        provider: "redis",
        validCases: [
            {
                name: "delete_single_key",
                description: "Delete a single key",
                input: {
                    keys: ["user:1:name"]
                },
                expectedOutput: {
                    deleted: 1
                }
            },
            {
                name: "delete_multiple_keys",
                description: "Delete multiple keys at once",
                input: {
                    keys: ["user:1:name", "user:2:name", "user:3:name"]
                },
                expectedOutput: {
                    deleted: 2
                }
            },
            {
                name: "delete_nonexistent_key",
                description: "Delete a key that does not exist returns 0",
                input: {
                    keys: ["nonexistent:key"]
                },
                expectedOutput: {
                    deleted: 0
                }
            }
        ],
        errorCases: [
            {
                name: "connection_refused",
                description: "Redis server unreachable",
                input: {
                    keys: ["test:key"]
                },
                expectedError: {
                    type: "server_error",
                    message: "connect ECONNREFUSED",
                    retryable: false
                }
            }
        ],
        edgeCases: []
    },
    {
        operationId: "keys",
        provider: "redis",
        validCases: [
            {
                name: "match_all_keys",
                description: "Scan all keys using default pattern *",
                input: {},
                expectedOutput: {
                    keys: [
                        "user:1:name",
                        "user:1:email",
                        "user:2:name",
                        "session:abc123",
                        "config:app:theme"
                    ],
                    total: 5
                }
            },
            {
                name: "match_pattern",
                description: "Scan keys matching user:* pattern",
                input: {
                    pattern: "user:*"
                },
                expectedOutput: {
                    keys: ["user:1:name", "user:1:email", "user:2:name"],
                    total: 3
                }
            },
            {
                name: "no_matches",
                description: "Scan returns empty when no keys match",
                input: {
                    pattern: "nonexistent:*"
                },
                expectedOutput: {
                    keys: [],
                    total: 0
                }
            }
        ],
        errorCases: [
            {
                name: "connection_refused",
                description: "Redis server unreachable",
                input: {
                    pattern: "*"
                },
                expectedError: {
                    type: "server_error",
                    message: "connect ECONNREFUSED",
                    retryable: false
                }
            }
        ],
        edgeCases: []
    },
    {
        operationId: "hashGet",
        provider: "redis",
        validCases: [
            {
                name: "get_all_fields",
                description: "Get all fields from a hash using HGETALL",
                input: {
                    key: "user:1:profile"
                },
                expectedOutput: {
                    fields: {
                        name: "John Doe",
                        email: "john@example.com",
                        role: "admin",
                        created_at: "2024-01-15T10:30:00Z"
                    }
                }
            },
            {
                name: "get_specific_fields",
                description: "Get specific fields from a hash using HMGET",
                input: {
                    key: "user:1:profile",
                    fields: ["name", "email"]
                },
                expectedOutput: {
                    fields: {
                        name: "John Doe",
                        email: "john@example.com"
                    }
                }
            },
            {
                name: "hash_not_found",
                description: "HGETALL on nonexistent key returns empty object",
                input: {
                    key: "nonexistent:hash"
                },
                expectedOutput: {
                    fields: {}
                }
            }
        ],
        errorCases: [
            {
                name: "wrong_type",
                description: "HGETALL on a key that holds a non-hash type",
                input: {
                    key: "string:key"
                },
                expectedError: {
                    type: "server_error",
                    message: "WRONGTYPE Operation against a key holding the wrong kind of value",
                    retryable: false
                }
            }
        ],
        edgeCases: []
    },
    {
        operationId: "hashSet",
        provider: "redis",
        validCases: [
            {
                name: "set_new_fields",
                description: "Set new fields on a hash",
                input: {
                    key: "user:3:profile",
                    fields: {
                        name: "Bob Wilson",
                        email: "bob@example.com",
                        role: "user"
                    }
                },
                expectedOutput: {
                    added: 3
                }
            },
            {
                name: "update_existing_fields",
                description: "Update existing fields returns 0 (no new fields added)",
                input: {
                    key: "user:1:profile",
                    fields: {
                        name: "John Updated",
                        email: "john.updated@example.com"
                    }
                },
                expectedOutput: {
                    added: 0
                }
            }
        ],
        errorCases: [
            {
                name: "wrong_type",
                description: "HSET on a key that holds a non-hash type",
                input: {
                    key: "string:key",
                    fields: {
                        field1: "value1"
                    }
                },
                expectedError: {
                    type: "server_error",
                    message: "WRONGTYPE Operation against a key holding the wrong kind of value",
                    retryable: false
                }
            }
        ],
        edgeCases: []
    },
    {
        operationId: "listPush",
        provider: "redis",
        validCases: [
            {
                name: "push_single_value",
                description: "Push a single value to the right of a list",
                input: {
                    key: "tasks:queue",
                    values: ["task-001"]
                },
                expectedOutput: {
                    length: 1
                }
            },
            {
                name: "push_multiple_values",
                description: "Push multiple values to the right of a list",
                input: {
                    key: "tasks:queue",
                    values: ["task-002", "task-003", "task-004"]
                },
                expectedOutput: {
                    length: 4
                }
            },
            {
                name: "left_push",
                description: "Push a value to the left (head) of a list",
                input: {
                    key: "tasks:priority",
                    values: ["urgent-task"],
                    direction: "left"
                },
                expectedOutput: {
                    length: 1
                }
            }
        ],
        errorCases: [
            {
                name: "wrong_type",
                description: "RPUSH on a key that holds a non-list type",
                input: {
                    key: "string:key",
                    values: ["value"]
                },
                expectedError: {
                    type: "server_error",
                    message: "WRONGTYPE Operation against a key holding the wrong kind of value",
                    retryable: false
                }
            }
        ],
        edgeCases: []
    },
    {
        operationId: "listRange",
        provider: "redis",
        validCases: [
            {
                name: "full_range",
                description: "Get all elements from a list",
                input: {
                    key: "tasks:queue"
                },
                expectedOutput: {
                    values: ["task-001", "task-002", "task-003", "task-004"],
                    length: 4
                }
            },
            {
                name: "partial_range",
                description: "Get first two elements from a list",
                input: {
                    key: "tasks:queue",
                    start: 0,
                    stop: 1
                },
                expectedOutput: {
                    values: ["task-001", "task-002"],
                    length: 2
                }
            },
            {
                name: "empty_list",
                description: "LRANGE on nonexistent key returns empty array",
                input: {
                    key: "nonexistent:list"
                },
                expectedOutput: {
                    values: [],
                    length: 0
                }
            }
        ],
        errorCases: [
            {
                name: "wrong_type",
                description: "LRANGE on a key that holds a non-list type",
                input: {
                    key: "string:key",
                    start: 0,
                    stop: -1
                },
                expectedError: {
                    type: "server_error",
                    message: "WRONGTYPE Operation against a key holding the wrong kind of value",
                    retryable: false
                }
            }
        ],
        edgeCases: []
    }
];
