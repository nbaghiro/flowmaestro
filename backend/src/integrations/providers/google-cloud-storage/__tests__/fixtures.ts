/**
 * Google Cloud Storage Provider Test Fixtures
 *
 * Comprehensive test fixtures for GCS operations with realistic
 * API response structures.
 */

import type { TestFixture } from "../../../sandbox";

/**
 * Sample buckets for filterableData testing
 */
const sampleBuckets = [
    {
        kind: "storage#bucket",
        id: "my-project-bucket-001",
        name: "my-project-bucket-001",
        projectNumber: "123456789012",
        location: "US",
        storageClass: "STANDARD",
        timeCreated: "2024-01-01T00:00:00.000Z",
        updated: "2024-01-15T10:00:00.000Z",
        selfLink: "https://www.googleapis.com/storage/v1/b/my-project-bucket-001"
    },
    {
        kind: "storage#bucket",
        id: "my-project-backup-bucket",
        name: "my-project-backup-bucket",
        projectNumber: "123456789012",
        location: "EU",
        storageClass: "NEARLINE",
        timeCreated: "2024-01-05T00:00:00.000Z",
        updated: "2024-01-20T14:30:00.000Z",
        selfLink: "https://www.googleapis.com/storage/v1/b/my-project-backup-bucket"
    },
    {
        kind: "storage#bucket",
        id: "my-project-archive",
        name: "my-project-archive",
        projectNumber: "123456789012",
        location: "US-CENTRAL1",
        storageClass: "ARCHIVE",
        timeCreated: "2024-01-10T00:00:00.000Z",
        updated: "2024-01-10T00:00:00.000Z",
        selfLink: "https://www.googleapis.com/storage/v1/b/my-project-archive"
    }
];

/**
 * Sample objects for filterableData testing
 */
const sampleObjects = [
    {
        kind: "storage#object",
        id: "my-project-bucket-001/documents/report.pdf/1705320000000000",
        name: "documents/report.pdf",
        bucket: "my-project-bucket-001",
        generation: "1705320000000000",
        metageneration: "1",
        contentType: "application/pdf",
        size: "2456789",
        timeCreated: "2024-01-15T10:00:00.000Z",
        updated: "2024-01-15T10:00:00.000Z",
        storageClass: "STANDARD",
        selfLink:
            "https://www.googleapis.com/storage/v1/b/my-project-bucket-001/o/documents%2Freport.pdf",
        mediaLink:
            "https://storage.googleapis.com/download/storage/v1/b/my-project-bucket-001/o/documents%2Freport.pdf?alt=media",
        _bucket: "my-project-bucket-001",
        _prefix: "documents/"
    },
    {
        kind: "storage#object",
        id: "my-project-bucket-001/images/logo.png/1705406400000000",
        name: "images/logo.png",
        bucket: "my-project-bucket-001",
        generation: "1705406400000000",
        metageneration: "1",
        contentType: "image/png",
        size: "156789",
        timeCreated: "2024-01-16T10:00:00.000Z",
        updated: "2024-01-16T10:00:00.000Z",
        storageClass: "STANDARD",
        selfLink:
            "https://www.googleapis.com/storage/v1/b/my-project-bucket-001/o/images%2Flogo.png",
        mediaLink:
            "https://storage.googleapis.com/download/storage/v1/b/my-project-bucket-001/o/images%2Flogo.png?alt=media",
        _bucket: "my-project-bucket-001",
        _prefix: "images/"
    },
    {
        kind: "storage#object",
        id: "my-project-bucket-001/data.json/1705492800000000",
        name: "data.json",
        bucket: "my-project-bucket-001",
        generation: "1705492800000000",
        metageneration: "2",
        contentType: "application/json",
        size: "8192",
        timeCreated: "2024-01-17T10:00:00.000Z",
        updated: "2024-01-18T15:30:00.000Z",
        storageClass: "STANDARD",
        selfLink: "https://www.googleapis.com/storage/v1/b/my-project-bucket-001/o/data.json",
        mediaLink:
            "https://storage.googleapis.com/download/storage/v1/b/my-project-bucket-001/o/data.json?alt=media",
        _bucket: "my-project-bucket-001",
        _prefix: ""
    }
];

export const googleCloudStorageFixtures: TestFixture[] = [
    // ============================================
    // LIST BUCKETS
    // ============================================
    {
        operationId: "listBuckets",
        provider: "google-cloud-storage",
        filterableData: {
            records: sampleBuckets,
            recordsField: "items",
            offsetField: "nextPageToken",
            defaultPageSize: 100,
            maxPageSize: 1000,
            pageSizeParam: "maxResults"
        },
        validCases: [
            {
                name: "list_all_buckets",
                description: "List all buckets in project",
                input: {},
                expectedOutput: {
                    kind: "storage#buckets",
                    items: sampleBuckets
                }
            },
            {
                name: "list_buckets_with_pagination",
                description: "List buckets with page size",
                input: {
                    maxResults: 2
                },
                expectedOutput: {
                    kind: "storage#buckets",
                    items: sampleBuckets.slice(0, 2),
                    nextPageToken: "token_page_2"
                }
            }
        ],
        errorCases: [
            {
                name: "permission_denied",
                description: "No permission to list buckets",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "Permission denied to list buckets",
                    retryable: false
                }
            }
        ]
    },

    // ============================================
    // CREATE BUCKET
    // ============================================
    {
        operationId: "createBucket",
        provider: "google-cloud-storage",
        validCases: [
            {
                name: "create_standard_bucket",
                description: "Create a new bucket with default settings",
                input: {
                    name: "new-test-bucket-123"
                },
                expectedOutput: {
                    kind: "storage#bucket",
                    id: "new-test-bucket-123",
                    name: "new-test-bucket-123",
                    location: "US",
                    storageClass: "STANDARD",
                    timeCreated: "2024-01-22T10:00:00.000Z",
                    updated: "2024-01-22T10:00:00.000Z"
                }
            },
            {
                name: "create_eu_bucket",
                description: "Create a bucket in EU region",
                input: {
                    name: "new-eu-bucket-456",
                    location: "EU",
                    storageClass: "NEARLINE"
                },
                expectedOutput: {
                    kind: "storage#bucket",
                    id: "new-eu-bucket-456",
                    name: "new-eu-bucket-456",
                    location: "EU",
                    storageClass: "NEARLINE",
                    timeCreated: "2024-01-22T10:00:00.000Z",
                    updated: "2024-01-22T10:00:00.000Z"
                }
            }
        ],
        errorCases: [
            {
                name: "bucket_already_exists",
                description: "Bucket name already taken",
                input: {
                    name: "existing-bucket"
                },
                expectedError: {
                    type: "validation",
                    message: "Bucket name already exists",
                    retryable: false
                }
            },
            {
                name: "invalid_bucket_name",
                description: "Invalid bucket name format",
                input: {
                    name: "INVALID_BUCKET_NAME"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid bucket name",
                    retryable: false
                }
            }
        ]
    },

    // ============================================
    // DELETE BUCKET
    // ============================================
    {
        operationId: "deleteBucket",
        provider: "google-cloud-storage",
        validCases: [
            {
                name: "delete_empty_bucket",
                description: "Delete an empty bucket",
                input: {
                    bucketName: "my-project-archive"
                },
                expectedOutput: {
                    deleted: true,
                    bucketName: "my-project-archive"
                }
            }
        ],
        errorCases: [
            {
                name: "bucket_not_empty",
                description: "Cannot delete non-empty bucket",
                input: {
                    bucketName: "my-project-bucket-001"
                },
                expectedError: {
                    type: "validation",
                    message: "Bucket is not empty",
                    retryable: false
                }
            },
            {
                name: "bucket_not_found",
                description: "Bucket does not exist",
                input: {
                    bucketName: "nonexistent-bucket"
                },
                expectedError: {
                    type: "not_found",
                    message: "Bucket not found",
                    retryable: false
                }
            }
        ]
    },

    // ============================================
    // LIST OBJECTS
    // ============================================
    {
        operationId: "listObjects",
        provider: "google-cloud-storage",
        filterableData: {
            records: sampleObjects,
            recordsField: "items",
            offsetField: "nextPageToken",
            defaultPageSize: 100,
            maxPageSize: 1000,
            pageSizeParam: "maxResults",
            filterConfig: {
                type: "generic",
                filterableFields: ["_bucket", "_prefix"]
            }
        },
        validCases: [
            {
                name: "list_all_objects",
                description: "List all objects in bucket",
                input: {
                    bucket: "my-project-bucket-001"
                },
                expectedOutput: {
                    kind: "storage#objects",
                    items: sampleObjects.map(({ _bucket, _prefix, ...obj }) => obj)
                }
            },
            {
                name: "list_objects_with_prefix",
                description: "List objects with prefix filter",
                input: {
                    bucket: "my-project-bucket-001",
                    prefix: "documents/"
                },
                expectedOutput: {
                    kind: "storage#objects",
                    items: [
                        {
                            kind: "storage#object",
                            id: "my-project-bucket-001/documents/report.pdf/1705320000000000",
                            name: "documents/report.pdf",
                            bucket: "my-project-bucket-001",
                            contentType: "application/pdf",
                            size: "2456789"
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "bucket_not_found",
                description: "Bucket does not exist",
                input: {
                    bucket: "nonexistent-bucket"
                },
                expectedError: {
                    type: "not_found",
                    message: "Bucket not found",
                    retryable: false
                }
            }
        ]
    },

    // ============================================
    // UPLOAD OBJECT
    // ============================================
    {
        operationId: "uploadObject",
        provider: "google-cloud-storage",
        validCases: [
            {
                name: "upload_file",
                description: "Upload a file to bucket",
                input: {
                    bucket: "my-project-bucket-001",
                    name: "uploads/new-file.txt",
                    data: "SGVsbG8sIFdvcmxkIQ==",
                    contentType: "text/plain"
                },
                expectedOutput: {
                    kind: "storage#object",
                    id: "my-project-bucket-001/uploads/new-file.txt/1705579200000000",
                    name: "uploads/new-file.txt",
                    bucket: "my-project-bucket-001",
                    contentType: "text/plain",
                    size: "13",
                    timeCreated: "2024-01-22T10:00:00.000Z",
                    updated: "2024-01-22T10:00:00.000Z"
                }
            }
        ],
        errorCases: [
            {
                name: "bucket_not_found",
                description: "Target bucket does not exist",
                input: {
                    bucket: "nonexistent-bucket",
                    name: "file.txt",
                    data: "SGVsbG8=",
                    contentType: "text/plain"
                },
                expectedError: {
                    type: "not_found",
                    message: "Bucket not found",
                    retryable: false
                }
            }
        ]
    },

    // ============================================
    // DOWNLOAD OBJECT
    // ============================================
    {
        operationId: "downloadObject",
        provider: "google-cloud-storage",
        validCases: [
            {
                name: "download_file",
                description: "Download a file from bucket",
                input: {
                    bucket: "my-project-bucket-001",
                    object: "documents/report.pdf"
                },
                expectedOutput: {
                    content: "JVBERi0xLjQKJeLjz9MK...",
                    contentType: "application/pdf",
                    name: "documents/report.pdf",
                    size: 2456789
                }
            }
        ],
        errorCases: [
            {
                name: "object_not_found",
                description: "Object does not exist",
                input: {
                    bucket: "my-project-bucket-001",
                    object: "nonexistent-file.txt"
                },
                expectedError: {
                    type: "not_found",
                    message: "Object not found",
                    retryable: false
                }
            }
        ]
    },

    // ============================================
    // DELETE OBJECT
    // ============================================
    {
        operationId: "deleteObject",
        provider: "google-cloud-storage",
        validCases: [
            {
                name: "delete_object",
                description: "Delete an object from bucket",
                input: {
                    bucket: "my-project-bucket-001",
                    object: "documents/report.pdf"
                },
                expectedOutput: {
                    deleted: true,
                    bucket: "my-project-bucket-001",
                    object: "documents/report.pdf"
                }
            }
        ],
        errorCases: [
            {
                name: "object_not_found",
                description: "Object does not exist",
                input: {
                    bucket: "my-project-bucket-001",
                    object: "nonexistent-file.txt"
                },
                expectedError: {
                    type: "not_found",
                    message: "Object not found",
                    retryable: false
                }
            }
        ]
    },

    // ============================================
    // GET OBJECT METADATA
    // ============================================
    {
        operationId: "getObjectMetadata",
        provider: "google-cloud-storage",
        validCases: [
            {
                name: "get_metadata",
                description: "Get object metadata",
                input: {
                    bucket: "my-project-bucket-001",
                    object: "documents/report.pdf"
                },
                expectedOutput: {
                    kind: "storage#object",
                    id: "my-project-bucket-001/documents/report.pdf/1705320000000000",
                    name: "documents/report.pdf",
                    bucket: "my-project-bucket-001",
                    contentType: "application/pdf",
                    size: "2456789",
                    timeCreated: "2024-01-15T10:00:00.000Z",
                    updated: "2024-01-15T10:00:00.000Z",
                    storageClass: "STANDARD"
                }
            }
        ],
        errorCases: [
            {
                name: "object_not_found",
                description: "Object does not exist",
                input: {
                    bucket: "my-project-bucket-001",
                    object: "nonexistent-file.txt"
                },
                expectedError: {
                    type: "not_found",
                    message: "Object not found",
                    retryable: false
                }
            }
        ]
    },

    // ============================================
    // COPY OBJECT
    // ============================================
    {
        operationId: "copyObject",
        provider: "google-cloud-storage",
        validCases: [
            {
                name: "copy_object_same_bucket",
                description: "Copy object within same bucket",
                input: {
                    sourceBucket: "my-project-bucket-001",
                    sourceObject: "documents/report.pdf",
                    destinationBucket: "my-project-bucket-001",
                    destinationObject: "backup/report-copy.pdf"
                },
                expectedOutput: {
                    kind: "storage#object",
                    id: "my-project-bucket-001/backup/report-copy.pdf/1705579200000000",
                    name: "backup/report-copy.pdf",
                    bucket: "my-project-bucket-001",
                    contentType: "application/pdf",
                    size: "2456789",
                    timeCreated: "2024-01-22T10:00:00.000Z"
                }
            },
            {
                name: "copy_object_different_bucket",
                description: "Copy object to different bucket",
                input: {
                    sourceBucket: "my-project-bucket-001",
                    sourceObject: "documents/report.pdf",
                    destinationBucket: "my-project-backup-bucket",
                    destinationObject: "archive/report.pdf"
                },
                expectedOutput: {
                    kind: "storage#object",
                    id: "my-project-backup-bucket/archive/report.pdf/1705579200000000",
                    name: "archive/report.pdf",
                    bucket: "my-project-backup-bucket",
                    contentType: "application/pdf",
                    size: "2456789"
                }
            }
        ],
        errorCases: [
            {
                name: "source_not_found",
                description: "Source object does not exist",
                input: {
                    sourceBucket: "my-project-bucket-001",
                    sourceObject: "nonexistent.pdf",
                    destinationBucket: "my-project-bucket-001",
                    destinationObject: "copy.pdf"
                },
                expectedError: {
                    type: "not_found",
                    message: "Source object not found",
                    retryable: false
                }
            }
        ]
    },

    // ============================================
    // GET SIGNED URL
    // ============================================
    {
        operationId: "getSignedUrl",
        provider: "google-cloud-storage",
        validCases: [
            {
                name: "get_download_url",
                description: "Generate signed URL for download",
                input: {
                    bucket: "my-project-bucket-001",
                    object: "documents/report.pdf",
                    expiresIn: 3600,
                    method: "GET"
                },
                expectedOutput: {
                    url: "https://storage.googleapis.com/storage/v1/b/my-project-bucket-001/o/documents%2Freport.pdf?alt=media",
                    bucket: "my-project-bucket-001",
                    object: "documents/report.pdf",
                    expiresIn: 3600,
                    method: "GET"
                }
            }
        ],
        errorCases: [
            {
                name: "object_not_found",
                description: "Object does not exist",
                input: {
                    bucket: "my-project-bucket-001",
                    object: "nonexistent.pdf"
                },
                expectedError: {
                    type: "not_found",
                    message: "Object not found",
                    retryable: false
                }
            }
        ]
    }
];
