/**
 * Azure Blob Storage Provider Test Fixtures
 *
 * Comprehensive test fixtures for Azure Storage operations with realistic
 * API response structures.
 */

import type { TestFixture } from "../../sandbox";

/**
 * Sample containers for filterableData testing
 */
const sampleContainers = [
    {
        name: "production-data",
        properties: {
            lastModified: "2024-01-01T00:00:00.000Z",
            etag: "0x8DC12345678ABCD"
        }
    },
    {
        name: "backup-files",
        properties: {
            lastModified: "2024-01-05T00:00:00.000Z",
            etag: "0x8DC12345678EFGH"
        }
    },
    {
        name: "logs",
        properties: {
            lastModified: "2024-01-10T00:00:00.000Z",
            etag: "0x8DC12345678IJKL"
        }
    }
];

/**
 * Sample blobs for filterableData testing
 */
const sampleBlobs = [
    {
        name: "documents/report.pdf",
        properties: {
            creationTime: "2024-01-15T10:00:00.000Z",
            lastModified: "2024-01-15T10:00:00.000Z",
            contentLength: 2456789,
            contentType: "application/pdf",
            blobType: "BlockBlob",
            accessTier: "Hot"
        },
        _container: "production-data",
        _prefix: "documents/"
    },
    {
        name: "images/logo.png",
        properties: {
            creationTime: "2024-01-16T10:00:00.000Z",
            lastModified: "2024-01-16T10:00:00.000Z",
            contentLength: 156789,
            contentType: "image/png",
            blobType: "BlockBlob",
            accessTier: "Hot"
        },
        _container: "production-data",
        _prefix: "images/"
    },
    {
        name: "data.json",
        properties: {
            creationTime: "2024-01-17T10:00:00.000Z",
            lastModified: "2024-01-17T10:00:00.000Z",
            contentLength: 8192,
            contentType: "application/json",
            blobType: "BlockBlob",
            accessTier: "Hot"
        },
        _container: "production-data",
        _prefix: ""
    }
];

export const azureStorageFixtures: TestFixture[] = [
    // ============================================
    // LIST CONTAINERS
    // ============================================
    {
        operationId: "listContainers",
        provider: "azure-storage",
        validCases: [
            {
                name: "list_all_containers",
                description: "List all containers",
                input: {},
                expectedOutput: {
                    containers: sampleContainers
                }
            },
            {
                name: "list_with_prefix",
                description: "List containers with prefix",
                input: {
                    prefix: "prod"
                },
                expectedOutput: {
                    containers: [sampleContainers[0]]
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_credentials",
                description: "Invalid storage credentials",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "AuthenticationFailed",
                    retryable: false
                }
            }
        ]
    },

    // ============================================
    // CREATE CONTAINER
    // ============================================
    {
        operationId: "createContainer",
        provider: "azure-storage",
        validCases: [
            {
                name: "create_container",
                description: "Create a new container",
                input: {
                    name: "new-container"
                },
                expectedOutput: {
                    name: "new-container",
                    created: true
                }
            },
            {
                name: "create_public_container",
                description: "Create a public container",
                input: {
                    name: "public-container",
                    publicAccess: "blob"
                },
                expectedOutput: {
                    name: "public-container",
                    created: true,
                    publicAccess: "blob"
                }
            }
        ],
        errorCases: [
            {
                name: "container_exists",
                description: "Container already exists",
                input: {
                    name: "production-data"
                },
                expectedError: {
                    type: "validation",
                    message: "ContainerAlreadyExists",
                    retryable: false
                }
            }
        ]
    },

    // ============================================
    // DELETE CONTAINER
    // ============================================
    {
        operationId: "deleteContainer",
        provider: "azure-storage",
        validCases: [
            {
                name: "delete_container",
                description: "Delete a container",
                input: {
                    name: "old-container"
                },
                expectedOutput: {
                    deleted: true,
                    name: "old-container"
                }
            }
        ],
        errorCases: [
            {
                name: "container_not_found",
                description: "Container does not exist",
                input: {
                    name: "nonexistent"
                },
                expectedError: {
                    type: "not_found",
                    message: "ContainerNotFound",
                    retryable: false
                }
            }
        ]
    },

    // ============================================
    // LIST BLOBS
    // ============================================
    {
        operationId: "listBlobs",
        provider: "azure-storage",
        filterableData: {
            records: sampleBlobs,
            recordsField: "blobs",
            offsetField: "nextMarker",
            defaultPageSize: 5000,
            maxPageSize: 5000,
            pageSizeParam: "maxResults",
            filterConfig: {
                type: "generic",
                filterableFields: ["_container", "_prefix"]
            }
        },
        validCases: [
            {
                name: "list_all_blobs",
                description: "List all blobs in container",
                input: {
                    container: "production-data"
                },
                expectedOutput: {
                    blobs: sampleBlobs.map(({ _container, _prefix, ...blob }) => blob),
                    blobPrefixes: []
                }
            },
            {
                name: "list_with_prefix",
                description: "List blobs with prefix filter",
                input: {
                    container: "production-data",
                    prefix: "documents/"
                },
                expectedOutput: {
                    blobs: [
                        {
                            name: "documents/report.pdf",
                            properties: {
                                creationTime: "2024-01-15T10:00:00.000Z",
                                lastModified: "2024-01-15T10:00:00.000Z",
                                contentLength: 2456789,
                                contentType: "application/pdf",
                                blobType: "BlockBlob",
                                accessTier: "Hot"
                            }
                        }
                    ],
                    blobPrefixes: []
                }
            }
        ],
        errorCases: [
            {
                name: "container_not_found",
                description: "Container does not exist",
                input: {
                    container: "nonexistent"
                },
                expectedError: {
                    type: "not_found",
                    message: "ContainerNotFound",
                    retryable: false
                }
            }
        ]
    },

    // ============================================
    // UPLOAD BLOB
    // ============================================
    {
        operationId: "uploadBlob",
        provider: "azure-storage",
        validCases: [
            {
                name: "upload_blob",
                description: "Upload a blob",
                input: {
                    container: "production-data",
                    blob: "uploads/new-file.txt",
                    body: "SGVsbG8sIFdvcmxkIQ==",
                    contentType: "text/plain"
                },
                expectedOutput: {
                    container: "production-data",
                    blob: "uploads/new-file.txt",
                    eTag: "0x8DC12345678NEW",
                    lastModified: "2024-01-22T10:00:00.000Z"
                }
            }
        ],
        errorCases: [
            {
                name: "container_not_found",
                description: "Container does not exist",
                input: {
                    container: "nonexistent",
                    blob: "file.txt",
                    body: "SGVsbG8=",
                    contentType: "text/plain"
                },
                expectedError: {
                    type: "not_found",
                    message: "ContainerNotFound",
                    retryable: false
                }
            }
        ]
    },

    // ============================================
    // DOWNLOAD BLOB
    // ============================================
    {
        operationId: "downloadBlob",
        provider: "azure-storage",
        validCases: [
            {
                name: "download_blob",
                description: "Download a blob",
                input: {
                    container: "production-data",
                    blob: "documents/report.pdf"
                },
                expectedOutput: {
                    content: "JVBERi0xLjQKJeLjz9MK...",
                    contentType: "application/pdf",
                    size: 2456789,
                    lastModified: "2024-01-15T10:00:00.000Z",
                    eTag: "0x8DC12345678ABCD"
                }
            }
        ],
        errorCases: [
            {
                name: "blob_not_found",
                description: "Blob does not exist",
                input: {
                    container: "production-data",
                    blob: "nonexistent.txt"
                },
                expectedError: {
                    type: "not_found",
                    message: "BlobNotFound",
                    retryable: false
                }
            }
        ]
    },

    // ============================================
    // DELETE BLOB
    // ============================================
    {
        operationId: "deleteBlob",
        provider: "azure-storage",
        validCases: [
            {
                name: "delete_blob",
                description: "Delete a blob",
                input: {
                    container: "production-data",
                    blob: "documents/report.pdf"
                },
                expectedOutput: {
                    deleted: true,
                    container: "production-data",
                    blob: "documents/report.pdf"
                }
            }
        ],
        errorCases: []
    },

    // ============================================
    // GET BLOB PROPERTIES
    // ============================================
    {
        operationId: "getBlobProperties",
        provider: "azure-storage",
        validCases: [
            {
                name: "get_properties",
                description: "Get blob properties",
                input: {
                    container: "production-data",
                    blob: "documents/report.pdf"
                },
                expectedOutput: {
                    container: "production-data",
                    blob: "documents/report.pdf",
                    contentType: "application/pdf",
                    contentLength: 2456789,
                    lastModified: "2024-01-15T10:00:00.000Z",
                    eTag: "0x8DC12345678ABCD",
                    blobType: "BlockBlob",
                    accessTier: "Hot",
                    metadata: {}
                }
            }
        ],
        errorCases: [
            {
                name: "blob_not_found",
                description: "Blob does not exist",
                input: {
                    container: "production-data",
                    blob: "nonexistent.txt"
                },
                expectedError: {
                    type: "not_found",
                    message: "BlobNotFound",
                    retryable: false
                }
            }
        ]
    },

    // ============================================
    // COPY BLOB
    // ============================================
    {
        operationId: "copyBlob",
        provider: "azure-storage",
        validCases: [
            {
                name: "copy_blob_same_container",
                description: "Copy blob within same container",
                input: {
                    sourceContainer: "production-data",
                    sourceBlob: "documents/report.pdf",
                    destinationContainer: "production-data",
                    destinationBlob: "backup/report-copy.pdf"
                },
                expectedOutput: {
                    sourceContainer: "production-data",
                    sourceBlob: "documents/report.pdf",
                    destinationContainer: "production-data",
                    destinationBlob: "backup/report-copy.pdf",
                    copyId: "copy-id-123",
                    copyStatus: "success"
                }
            }
        ],
        errorCases: [
            {
                name: "source_not_found",
                description: "Source blob does not exist",
                input: {
                    sourceContainer: "production-data",
                    sourceBlob: "nonexistent.pdf",
                    destinationContainer: "production-data",
                    destinationBlob: "copy.pdf"
                },
                expectedError: {
                    type: "not_found",
                    message: "BlobNotFound",
                    retryable: false
                }
            }
        ]
    },

    // ============================================
    // GENERATE SAS URL
    // ============================================
    {
        operationId: "generateSasUrl",
        provider: "azure-storage",
        validCases: [
            {
                name: "generate_read_url",
                description: "Generate read-only SAS URL",
                input: {
                    container: "production-data",
                    blob: "documents/report.pdf",
                    permissions: "r",
                    expiresIn: 3600
                },
                expectedOutput: {
                    url: "https://mystorageaccount.blob.core.windows.net/production-data/documents/report.pdf?...",
                    container: "production-data",
                    blob: "documents/report.pdf",
                    permissions: "r",
                    expiresIn: 3600
                }
            }
        ],
        errorCases: []
    },

    // ============================================
    // SET BLOB TIER
    // ============================================
    {
        operationId: "setBlobTier",
        provider: "azure-storage",
        validCases: [
            {
                name: "set_tier_cool",
                description: "Change blob tier to Cool",
                input: {
                    container: "production-data",
                    blob: "documents/report.pdf",
                    tier: "Cool"
                },
                expectedOutput: {
                    container: "production-data",
                    blob: "documents/report.pdf",
                    tier: "Cool",
                    updated: true
                }
            },
            {
                name: "set_tier_archive",
                description: "Change blob tier to Archive",
                input: {
                    container: "backup-files",
                    blob: "old-data.zip",
                    tier: "Archive"
                },
                expectedOutput: {
                    container: "backup-files",
                    blob: "old-data.zip",
                    tier: "Archive",
                    updated: true
                }
            }
        ],
        errorCases: [
            {
                name: "blob_not_found",
                description: "Blob does not exist",
                input: {
                    container: "production-data",
                    blob: "nonexistent.txt",
                    tier: "Cool"
                },
                expectedError: {
                    type: "not_found",
                    message: "BlobNotFound",
                    retryable: false
                }
            }
        ]
    }
];
