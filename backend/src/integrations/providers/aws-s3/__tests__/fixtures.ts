/**
 * AWS S3 Provider Test Fixtures
 *
 * Comprehensive test fixtures for S3 operations with realistic
 * API response structures.
 */

import type { TestFixture } from "../../../sandbox";

/**
 * Sample buckets for filterableData testing
 */
const sampleBuckets = [
    {
        name: "my-production-bucket",
        creationDate: "2024-01-01T00:00:00.000Z"
    },
    {
        name: "my-backup-bucket",
        creationDate: "2024-01-05T00:00:00.000Z"
    },
    {
        name: "my-logs-bucket",
        creationDate: "2024-01-10T00:00:00.000Z"
    }
];

/**
 * Sample objects for filterableData testing
 */
const sampleObjects = [
    {
        key: "documents/report.pdf",
        lastModified: "2024-01-15T10:00:00.000Z",
        eTag: "d41d8cd98f00b204e9800998ecf8427e",
        size: "2456789",
        storageClass: "STANDARD",
        _bucket: "my-production-bucket",
        _prefix: "documents/"
    },
    {
        key: "images/logo.png",
        lastModified: "2024-01-16T10:00:00.000Z",
        eTag: "098f6bcd4621d373cade4e832627b4f6",
        size: "156789",
        storageClass: "STANDARD",
        _bucket: "my-production-bucket",
        _prefix: "images/"
    },
    {
        key: "data.json",
        lastModified: "2024-01-17T10:00:00.000Z",
        eTag: "5d41402abc4b2a76b9719d911017c592",
        size: "8192",
        storageClass: "STANDARD",
        _bucket: "my-production-bucket",
        _prefix: ""
    }
];

export const awsS3Fixtures: TestFixture[] = [
    // ============================================
    // LIST BUCKETS
    // ============================================
    {
        operationId: "listBuckets",
        provider: "aws-s3",
        validCases: [
            {
                name: "list_all_buckets",
                description: "List all S3 buckets",
                input: {},
                expectedOutput: {
                    buckets: sampleBuckets
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_credentials",
                description: "Invalid AWS credentials",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "Access Denied",
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
        provider: "aws-s3",
        validCases: [
            {
                name: "create_bucket",
                description: "Create a new S3 bucket",
                input: {
                    bucket: "new-test-bucket-123"
                },
                expectedOutput: {
                    bucket: "new-test-bucket-123",
                    created: true
                }
            }
        ],
        errorCases: [
            {
                name: "bucket_already_exists",
                description: "Bucket name already taken",
                input: {
                    bucket: "existing-bucket"
                },
                expectedError: {
                    type: "validation",
                    message: "BucketAlreadyExists",
                    retryable: false
                }
            },
            {
                name: "invalid_bucket_name",
                description: "Invalid bucket name",
                input: {
                    bucket: "INVALID_NAME"
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
        provider: "aws-s3",
        validCases: [
            {
                name: "delete_bucket",
                description: "Delete an empty bucket",
                input: {
                    bucket: "my-empty-bucket"
                },
                expectedOutput: {
                    deleted: true,
                    bucket: "my-empty-bucket"
                }
            }
        ],
        errorCases: [
            {
                name: "bucket_not_empty",
                description: "Bucket is not empty",
                input: {
                    bucket: "my-production-bucket"
                },
                expectedError: {
                    type: "validation",
                    message: "BucketNotEmpty",
                    retryable: false
                }
            },
            {
                name: "bucket_not_found",
                description: "Bucket does not exist",
                input: {
                    bucket: "nonexistent-bucket"
                },
                expectedError: {
                    type: "not_found",
                    message: "NoSuchBucket",
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
        provider: "aws-s3",
        filterableData: {
            records: sampleObjects,
            recordsField: "contents",
            offsetField: "nextContinuationToken",
            defaultPageSize: 1000,
            maxPageSize: 1000,
            pageSizeParam: "maxKeys",
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
                    bucket: "my-production-bucket"
                },
                expectedOutput: {
                    contents: sampleObjects.map(({ _bucket, _prefix, ...obj }) => obj),
                    isTruncated: false,
                    commonPrefixes: []
                }
            },
            {
                name: "list_with_prefix",
                description: "List objects with prefix filter",
                input: {
                    bucket: "my-production-bucket",
                    prefix: "documents/"
                },
                expectedOutput: {
                    contents: [
                        {
                            key: "documents/report.pdf",
                            lastModified: "2024-01-15T10:00:00.000Z",
                            eTag: "d41d8cd98f00b204e9800998ecf8427e",
                            size: "2456789",
                            storageClass: "STANDARD"
                        }
                    ],
                    isTruncated: false,
                    commonPrefixes: []
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
                    message: "NoSuchBucket",
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
        provider: "aws-s3",
        validCases: [
            {
                name: "upload_file",
                description: "Upload a file to S3",
                input: {
                    bucket: "my-production-bucket",
                    key: "uploads/new-file.txt",
                    body: "SGVsbG8sIFdvcmxkIQ==",
                    contentType: "text/plain"
                },
                expectedOutput: {
                    bucket: "my-production-bucket",
                    key: "uploads/new-file.txt",
                    eTag: "5eb63bbbe01eeed093cb22bb8f5acdc3"
                }
            }
        ],
        errorCases: [
            {
                name: "bucket_not_found",
                description: "Bucket does not exist",
                input: {
                    bucket: "nonexistent-bucket",
                    key: "file.txt",
                    body: "SGVsbG8=",
                    contentType: "text/plain"
                },
                expectedError: {
                    type: "not_found",
                    message: "NoSuchBucket",
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
        provider: "aws-s3",
        validCases: [
            {
                name: "download_file",
                description: "Download a file from S3",
                input: {
                    bucket: "my-production-bucket",
                    key: "documents/report.pdf"
                },
                expectedOutput: {
                    content: "JVBERi0xLjQKJeLjz9MK...",
                    contentType: "application/pdf",
                    size: 2456789,
                    lastModified: "2024-01-15T10:00:00.000Z",
                    eTag: "d41d8cd98f00b204e9800998ecf8427e"
                }
            }
        ],
        errorCases: [
            {
                name: "object_not_found",
                description: "Object does not exist",
                input: {
                    bucket: "my-production-bucket",
                    key: "nonexistent.txt"
                },
                expectedError: {
                    type: "not_found",
                    message: "NoSuchKey",
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
        provider: "aws-s3",
        validCases: [
            {
                name: "delete_object",
                description: "Delete an object from S3",
                input: {
                    bucket: "my-production-bucket",
                    key: "documents/report.pdf"
                },
                expectedOutput: {
                    deleted: true,
                    bucket: "my-production-bucket",
                    key: "documents/report.pdf"
                }
            }
        ],
        errorCases: []
    },

    // ============================================
    // DELETE MULTIPLE OBJECTS
    // ============================================
    {
        operationId: "deleteObjects",
        provider: "aws-s3",
        validCases: [
            {
                name: "delete_multiple",
                description: "Delete multiple objects at once",
                input: {
                    bucket: "my-production-bucket",
                    keys: ["documents/report.pdf", "images/logo.png"]
                },
                expectedOutput: {
                    deleted: ["documents/report.pdf", "images/logo.png"],
                    errors: [],
                    deletedCount: 2,
                    errorCount: 0
                }
            }
        ],
        errorCases: []
    },

    // ============================================
    // GET OBJECT METADATA
    // ============================================
    {
        operationId: "getObjectMetadata",
        provider: "aws-s3",
        validCases: [
            {
                name: "get_metadata",
                description: "Get object metadata",
                input: {
                    bucket: "my-production-bucket",
                    key: "documents/report.pdf"
                },
                expectedOutput: {
                    bucket: "my-production-bucket",
                    key: "documents/report.pdf",
                    contentType: "application/pdf",
                    contentLength: 2456789,
                    lastModified: "2024-01-15T10:00:00.000Z",
                    eTag: "d41d8cd98f00b204e9800998ecf8427e",
                    metadata: {}
                }
            }
        ],
        errorCases: [
            {
                name: "object_not_found",
                description: "Object does not exist",
                input: {
                    bucket: "my-production-bucket",
                    key: "nonexistent.txt"
                },
                expectedError: {
                    type: "not_found",
                    message: "NoSuchKey",
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
        provider: "aws-s3",
        validCases: [
            {
                name: "copy_object_same_bucket",
                description: "Copy object within same bucket",
                input: {
                    sourceBucket: "my-production-bucket",
                    sourceKey: "documents/report.pdf",
                    destinationBucket: "my-production-bucket",
                    destinationKey: "backup/report-copy.pdf"
                },
                expectedOutput: {
                    sourceBucket: "my-production-bucket",
                    sourceKey: "documents/report.pdf",
                    destinationBucket: "my-production-bucket",
                    destinationKey: "backup/report-copy.pdf",
                    eTag: "d41d8cd98f00b204e9800998ecf8427e",
                    lastModified: "2024-01-22T10:00:00.000Z"
                }
            }
        ],
        errorCases: [
            {
                name: "source_not_found",
                description: "Source object does not exist",
                input: {
                    sourceBucket: "my-production-bucket",
                    sourceKey: "nonexistent.pdf",
                    destinationBucket: "my-production-bucket",
                    destinationKey: "copy.pdf"
                },
                expectedError: {
                    type: "not_found",
                    message: "NoSuchKey",
                    retryable: false
                }
            }
        ]
    },

    // ============================================
    // GET PRE-SIGNED URL
    // ============================================
    {
        operationId: "getPresignedUrl",
        provider: "aws-s3",
        validCases: [
            {
                name: "get_download_url",
                description: "Generate pre-signed URL for download",
                input: {
                    bucket: "my-production-bucket",
                    key: "documents/report.pdf",
                    expiresIn: 3600
                },
                expectedOutput: {
                    url: "https://my-production-bucket.s3.us-east-1.amazonaws.com/documents/report.pdf?...",
                    bucket: "my-production-bucket",
                    key: "documents/report.pdf",
                    expiresIn: 3600,
                    method: "GET"
                }
            },
            {
                name: "get_upload_url",
                description: "Generate pre-signed URL for upload",
                input: {
                    bucket: "my-production-bucket",
                    key: "uploads/new-file.pdf",
                    expiresIn: 3600,
                    method: "PUT"
                },
                expectedOutput: {
                    url: "https://my-production-bucket.s3.us-east-1.amazonaws.com/uploads/new-file.pdf?...",
                    bucket: "my-production-bucket",
                    key: "uploads/new-file.pdf",
                    expiresIn: 3600,
                    method: "PUT"
                }
            }
        ],
        errorCases: []
    }
];
