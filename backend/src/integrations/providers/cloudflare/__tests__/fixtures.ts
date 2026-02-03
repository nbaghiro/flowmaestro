/**
 * Test fixtures for Cloudflare provider operations
 *
 * These fixtures are used for integration testing and validation
 */

import type { TestFixture } from "../../../sandbox";

// ============================================
// Zone Fixtures
// ============================================

const zones_listZones: TestFixture = {
    operationId: "zones_listZones",
    provider: "cloudflare",
    validCases: [
        {
            name: "list_all_zones",
            description: "List all zones in account",
            input: {},
            expectedOutput: {
                zones: [
                    {
                        id: "023e105f4ecef8ad9ca31a8372d0c353",
                        name: "example.com",
                        status: "active"
                    }
                ]
            }
        },
        {
            name: "list_with_pagination",
            description: "List zones with pagination",
            input: { page: 1, per_page: 10 },
            expectedOutput: {
                zones: [],
                pagination: { page: 1, perPage: 10 }
            }
        }
    ],
    errorCases: []
};

const zones_getZone: TestFixture = {
    operationId: "zones_getZone",
    provider: "cloudflare",
    validCases: [
        {
            name: "get_zone_details",
            description: "Get zone details by ID",
            input: { zoneId: "023e105f4ecef8ad9ca31a8372d0c353" },
            expectedOutput: {
                id: "023e105f4ecef8ad9ca31a8372d0c353",
                name: "example.com",
                status: "active"
            }
        }
    ],
    errorCases: [
        {
            name: "zone_not_found",
            description: "Zone does not exist",
            input: { zoneId: "00000000000000000000000000000000" },
            expectedError: {
                type: "not_found",
                message: "Zone not found",
                retryable: false
            }
        }
    ]
};

// ============================================
// DNS Fixtures
// ============================================

const dns_listRecords: TestFixture = {
    operationId: "dns_listRecords",
    provider: "cloudflare",
    validCases: [
        {
            name: "list_all_records",
            description: "List all DNS records for a zone",
            input: { zoneId: "023e105f4ecef8ad9ca31a8372d0c353" },
            expectedOutput: {
                records: [
                    {
                        id: "372e67954025e0ba6aaa6d586b9e0b59",
                        name: "example.com",
                        type: "A",
                        content: "192.0.2.1"
                    }
                ]
            }
        }
    ],
    errorCases: []
};

const dns_getRecord: TestFixture = {
    operationId: "dns_getRecord",
    provider: "cloudflare",
    validCases: [
        {
            name: "get_record_details",
            description: "Get DNS record details",
            input: {
                zoneId: "023e105f4ecef8ad9ca31a8372d0c353",
                recordId: "372e67954025e0ba6aaa6d586b9e0b59"
            },
            expectedOutput: {
                id: "372e67954025e0ba6aaa6d586b9e0b59",
                name: "example.com",
                type: "A",
                content: "192.0.2.1"
            }
        }
    ],
    errorCases: []
};

const dns_createRecord: TestFixture = {
    operationId: "dns_createRecord",
    provider: "cloudflare",
    validCases: [
        {
            name: "create_a_record",
            description: "Create an A record",
            input: {
                zoneId: "023e105f4ecef8ad9ca31a8372d0c353",
                type: "A",
                name: "www",
                content: "192.0.2.1",
                proxied: true
            },
            expectedOutput: {
                id: "372e67954025e0ba6aaa6d586b9e0b59",
                name: "www.example.com",
                type: "A",
                content: "192.0.2.1",
                proxied: true
            }
        }
    ],
    errorCases: []
};

const dns_updateRecord: TestFixture = {
    operationId: "dns_updateRecord",
    provider: "cloudflare",
    validCases: [
        {
            name: "update_record_content",
            description: "Update DNS record content",
            input: {
                zoneId: "023e105f4ecef8ad9ca31a8372d0c353",
                recordId: "372e67954025e0ba6aaa6d586b9e0b59",
                content: "192.0.2.2"
            },
            expectedOutput: {
                id: "372e67954025e0ba6aaa6d586b9e0b59",
                content: "192.0.2.2"
            }
        }
    ],
    errorCases: []
};

const dns_deleteRecord: TestFixture = {
    operationId: "dns_deleteRecord",
    provider: "cloudflare",
    validCases: [
        {
            name: "delete_record",
            description: "Delete a DNS record",
            input: {
                zoneId: "023e105f4ecef8ad9ca31a8372d0c353",
                recordId: "372e67954025e0ba6aaa6d586b9e0b59"
            },
            expectedOutput: {
                id: "372e67954025e0ba6aaa6d586b9e0b59",
                message: "DNS record deleted successfully"
            }
        }
    ],
    errorCases: []
};

// ============================================
// Workers Fixtures
// ============================================

const workers_listScripts: TestFixture = {
    operationId: "workers_listScripts",
    provider: "cloudflare",
    validCases: [
        {
            name: "list_all_workers",
            description: "List all Worker scripts",
            input: {},
            expectedOutput: {
                workers: [
                    {
                        id: "my-worker",
                        handlers: ["fetch"]
                    }
                ]
            }
        }
    ],
    errorCases: []
};

const workers_getScript: TestFixture = {
    operationId: "workers_getScript",
    provider: "cloudflare",
    validCases: [
        {
            name: "get_worker_content",
            description: "Get Worker script content",
            input: { scriptName: "my-worker" },
            expectedOutput: {
                scriptName: "my-worker",
                content: "export default { fetch() { return new Response('Hello'); } }"
            }
        }
    ],
    errorCases: []
};

const workers_uploadScript: TestFixture = {
    operationId: "workers_uploadScript",
    provider: "cloudflare",
    validCases: [
        {
            name: "upload_worker",
            description: "Upload a Worker script",
            input: {
                scriptName: "my-worker",
                content: "export default { fetch() { return new Response('Hello'); } }",
                compatibilityDate: "2024-01-01"
            },
            expectedOutput: {
                id: "my-worker",
                scriptName: "my-worker",
                message: "Worker script uploaded successfully"
            }
        }
    ],
    errorCases: []
};

const workers_deleteScript: TestFixture = {
    operationId: "workers_deleteScript",
    provider: "cloudflare",
    validCases: [
        {
            name: "delete_worker",
            description: "Delete a Worker script",
            input: { scriptName: "my-worker" },
            expectedOutput: {
                scriptName: "my-worker",
                message: "Worker script deleted successfully"
            }
        }
    ],
    errorCases: []
};

const workers_getSettings: TestFixture = {
    operationId: "workers_getSettings",
    provider: "cloudflare",
    validCases: [
        {
            name: "get_worker_settings",
            description: "Get Worker settings and bindings",
            input: { scriptName: "my-worker" },
            expectedOutput: {
                scriptName: "my-worker",
                bindings: []
            }
        }
    ],
    errorCases: []
};

// ============================================
// KV Fixtures
// ============================================

const kv_listNamespaces: TestFixture = {
    operationId: "kv_listNamespaces",
    provider: "cloudflare",
    validCases: [
        {
            name: "list_all_namespaces",
            description: "List all KV namespaces",
            input: {},
            expectedOutput: {
                namespaces: [
                    {
                        id: "0f2ac74b498b48028cb68387c421e279",
                        title: "my-namespace"
                    }
                ]
            }
        }
    ],
    errorCases: []
};

const kv_createNamespace: TestFixture = {
    operationId: "kv_createNamespace",
    provider: "cloudflare",
    validCases: [
        {
            name: "create_namespace",
            description: "Create a new KV namespace",
            input: { title: "my-namespace" },
            expectedOutput: {
                id: "0f2ac74b498b48028cb68387c421e279",
                title: "my-namespace"
            }
        }
    ],
    errorCases: []
};

const kv_deleteNamespace: TestFixture = {
    operationId: "kv_deleteNamespace",
    provider: "cloudflare",
    validCases: [
        {
            name: "delete_namespace",
            description: "Delete a KV namespace",
            input: { namespaceId: "0f2ac74b498b48028cb68387c421e279" },
            expectedOutput: {
                namespaceId: "0f2ac74b498b48028cb68387c421e279",
                message: "KV namespace deleted successfully"
            }
        }
    ],
    errorCases: []
};

const kv_listKeys: TestFixture = {
    operationId: "kv_listKeys",
    provider: "cloudflare",
    validCases: [
        {
            name: "list_all_keys",
            description: "List keys in a namespace",
            input: { namespaceId: "0f2ac74b498b48028cb68387c421e279" },
            expectedOutput: {
                keys: [{ name: "my-key" }]
            }
        }
    ],
    errorCases: []
};

const kv_getValue: TestFixture = {
    operationId: "kv_getValue",
    provider: "cloudflare",
    validCases: [
        {
            name: "get_value",
            description: "Get a value by key",
            input: {
                namespaceId: "0f2ac74b498b48028cb68387c421e279",
                key: "my-key"
            },
            expectedOutput: {
                key: "my-key",
                value: "my-value"
            }
        }
    ],
    errorCases: []
};

const kv_putValue: TestFixture = {
    operationId: "kv_putValue",
    provider: "cloudflare",
    validCases: [
        {
            name: "put_value",
            description: "Write a value to a key",
            input: {
                namespaceId: "0f2ac74b498b48028cb68387c421e279",
                key: "my-key",
                value: "my-value"
            },
            expectedOutput: {
                key: "my-key",
                message: "KV value written successfully"
            }
        }
    ],
    errorCases: []
};

const kv_deleteKey: TestFixture = {
    operationId: "kv_deleteKey",
    provider: "cloudflare",
    validCases: [
        {
            name: "delete_key",
            description: "Delete a key",
            input: {
                namespaceId: "0f2ac74b498b48028cb68387c421e279",
                key: "my-key"
            },
            expectedOutput: {
                key: "my-key",
                message: "KV key deleted successfully"
            }
        }
    ],
    errorCases: []
};

const kv_bulkWrite: TestFixture = {
    operationId: "kv_bulkWrite",
    provider: "cloudflare",
    validCases: [
        {
            name: "bulk_write_keys",
            description: "Write multiple key-value pairs",
            input: {
                namespaceId: "0f2ac74b498b48028cb68387c421e279",
                pairs: [
                    { key: "key1", value: "value1" },
                    { key: "key2", value: "value2" }
                ]
            },
            expectedOutput: {
                keysWritten: 2,
                message: "Successfully wrote 2 key-value pair(s)"
            }
        }
    ],
    errorCases: []
};

/**
 * Export all Cloudflare fixtures as an array
 */
export const cloudflareFixtures: TestFixture[] = [
    // Zones
    zones_listZones,
    zones_getZone,
    // DNS
    dns_listRecords,
    dns_getRecord,
    dns_createRecord,
    dns_updateRecord,
    dns_deleteRecord,
    // Workers
    workers_listScripts,
    workers_getScript,
    workers_uploadScript,
    workers_deleteScript,
    workers_getSettings,
    // KV
    kv_listNamespaces,
    kv_createNamespace,
    kv_deleteNamespace,
    kv_listKeys,
    kv_getValue,
    kv_putValue,
    kv_deleteKey,
    kv_bulkWrite
];
