/**
 * Google Docs Provider Test Fixtures
 *
 * Based on Google Docs API v1 response structures.
 * https://developers.google.com/docs/api/reference/rest
 */

import type { TestFixture } from "../../sandbox";

// Sample document IDs (Google Docs IDs are 44 characters)
const SAMPLE_DOCUMENT_ID = "1a2b3c4d5e6f7g8h9i0jABCDEFGHIJKLMNOPQRSTUV";
const SAMPLE_FOLDER_ID = "1FolderABCDEFGHIJKLMNOPQRSTUVWXYZ123456";

// Sample revision IDs
const SAMPLE_REVISION_ID = "AOV_f4r8mKkZ3hJ9sLpNqTvXyBfDcGiKlMnOpQrStUv";

export const googleDocsFixtures: TestFixture[] = [
    // ========== DOCUMENT OPERATIONS ==========
    {
        operationId: "createDocument",
        provider: "google-docs",
        validCases: [
            {
                name: "create_basic_document",
                description: "Create a new blank document with title",
                input: {
                    title: "Project Requirements Document"
                },
                expectedOutput: {
                    documentId: SAMPLE_DOCUMENT_ID,
                    title: "Project Requirements Document",
                    documentUrl: `https://docs.google.com/document/d/${SAMPLE_DOCUMENT_ID}/edit`,
                    revisionId: SAMPLE_REVISION_ID
                }
            }
        ],
        errorCases: [
            {
                name: "rate_limit",
                description: "Google API quota exceeded",
                input: {
                    title: "Test Document"
                },
                expectedError: {
                    type: "rate_limit",
                    message:
                        "Quota exceeded for quota metric 'Write requests' and limit 'Write requests per minute per user'",
                    retryable: true
                }
            },
            {
                name: "invalid_title",
                description: "Document title exceeds maximum length",
                input: {
                    title: "A".repeat(300)
                },
                expectedError: {
                    type: "validation",
                    message: "Document title must not exceed 256 characters",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getDocument",
        provider: "google-docs",
        validCases: [
            {
                name: "get_document_full",
                description: "Retrieve a document with full content structure",
                input: {
                    documentId: SAMPLE_DOCUMENT_ID
                },
                expectedOutput: {
                    documentId: SAMPLE_DOCUMENT_ID,
                    title: "Engineering Design Document",
                    documentUrl: `https://docs.google.com/document/d/${SAMPLE_DOCUMENT_ID}/edit`,
                    revisionId: SAMPLE_REVISION_ID,
                    body: {
                        content: [
                            {
                                sectionBreak: {
                                    sectionStyle: {
                                        sectionType: "CONTINUOUS"
                                    }
                                }
                            },
                            {
                                paragraph: {
                                    elements: [
                                        {
                                            textRun: {
                                                content: "Engineering Design Document\n",
                                                textStyle: {
                                                    bold: true,
                                                    fontSize: {
                                                        magnitude: 24,
                                                        unit: "PT"
                                                    }
                                                }
                                            }
                                        }
                                    ],
                                    paragraphStyle: {
                                        namedStyleType: "HEADING_1",
                                        alignment: "START"
                                    }
                                },
                                startIndex: 1,
                                endIndex: 30
                            },
                            {
                                paragraph: {
                                    elements: [
                                        {
                                            textRun: {
                                                content: "Overview\n",
                                                textStyle: {
                                                    bold: true,
                                                    fontSize: {
                                                        magnitude: 18,
                                                        unit: "PT"
                                                    }
                                                }
                                            }
                                        }
                                    ],
                                    paragraphStyle: {
                                        namedStyleType: "HEADING_2"
                                    }
                                },
                                startIndex: 30,
                                endIndex: 39
                            },
                            {
                                paragraph: {
                                    elements: [
                                        {
                                            textRun: {
                                                content:
                                                    "This document outlines the technical architecture and design decisions for the new microservices platform. The system is designed to handle 10,000 requests per second with 99.9% uptime.\n",
                                                textStyle: {}
                                            }
                                        }
                                    ],
                                    paragraphStyle: {
                                        namedStyleType: "NORMAL_TEXT"
                                    }
                                },
                                startIndex: 39,
                                endIndex: 225
                            },
                            {
                                paragraph: {
                                    elements: [
                                        {
                                            textRun: {
                                                content: "Architecture Components\n",
                                                textStyle: {
                                                    bold: true
                                                }
                                            }
                                        }
                                    ],
                                    paragraphStyle: {
                                        namedStyleType: "HEADING_2"
                                    }
                                },
                                startIndex: 225,
                                endIndex: 249
                            },
                            {
                                paragraph: {
                                    elements: [
                                        {
                                            textRun: {
                                                content: "API Gateway\n",
                                                textStyle: {}
                                            }
                                        }
                                    ],
                                    bulletStyle: {
                                        listId: "kix.list001"
                                    }
                                },
                                startIndex: 249,
                                endIndex: 261
                            },
                            {
                                paragraph: {
                                    elements: [
                                        {
                                            textRun: {
                                                content: "Service Mesh\n",
                                                textStyle: {}
                                            }
                                        }
                                    ],
                                    bulletStyle: {
                                        listId: "kix.list001"
                                    }
                                },
                                startIndex: 261,
                                endIndex: 274
                            },
                            {
                                paragraph: {
                                    elements: [
                                        {
                                            textRun: {
                                                content: "Message Queue\n",
                                                textStyle: {}
                                            }
                                        }
                                    ],
                                    bulletStyle: {
                                        listId: "kix.list001"
                                    }
                                },
                                startIndex: 274,
                                endIndex: 288
                            }
                        ]
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "document_not_found",
                description: "Document does not exist",
                input: {
                    documentId: "invalid-document-id-that-does-not-exist"
                },
                expectedError: {
                    type: "not_found",
                    message: "Requested entity was not found",
                    retryable: false
                }
            },
            {
                name: "no_permission",
                description: "No permission to access document",
                input: {
                    documentId: "private-document-no-access"
                },
                expectedError: {
                    type: "permission",
                    message: "The caller does not have permission to access this document",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    documentId: SAMPLE_DOCUMENT_ID
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded for read requests",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "deleteDocument",
        provider: "google-docs",
        validCases: [
            {
                name: "delete_document",
                description: "Permanently delete a document via Drive API",
                input: {
                    documentId: SAMPLE_DOCUMENT_ID
                },
                expectedOutput: {
                    deleted: true,
                    documentId: SAMPLE_DOCUMENT_ID
                }
            }
        ],
        errorCases: [
            {
                name: "document_not_found",
                description: "Document does not exist or already deleted",
                input: {
                    documentId: "nonexistent-document-id"
                },
                expectedError: {
                    type: "not_found",
                    message: "File not found: nonexistent-document-id",
                    retryable: false
                }
            },
            {
                name: "no_delete_permission",
                description: "User is not the owner and cannot delete",
                input: {
                    documentId: "shared-document-not-owner"
                },
                expectedError: {
                    type: "permission",
                    message:
                        "The user does not have sufficient permissions for this file. Only the owner can delete this file.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    documentId: SAMPLE_DOCUMENT_ID
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },

    // ========== TEXT OPERATIONS ==========
    {
        operationId: "appendText",
        provider: "google-docs",
        validCases: [
            {
                name: "append_simple_text",
                description: "Append plain text to end of document",
                input: {
                    documentId: SAMPLE_DOCUMENT_ID,
                    text: "This is additional content appended to the document."
                },
                expectedOutput: {
                    documentId: SAMPLE_DOCUMENT_ID,
                    appended: true,
                    textLength: 52
                }
            }
        ],
        errorCases: [
            {
                name: "document_not_found",
                description: "Document does not exist",
                input: {
                    documentId: "invalid-document-id",
                    text: "Test content"
                },
                expectedError: {
                    type: "not_found",
                    message: "Requested entity was not found",
                    retryable: false
                }
            },
            {
                name: "no_edit_permission",
                description: "User only has view access",
                input: {
                    documentId: "view-only-document-id",
                    text: "Attempting to edit"
                },
                expectedError: {
                    type: "permission",
                    message: "The caller does not have permission to edit this document",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    documentId: SAMPLE_DOCUMENT_ID,
                    text: "Test content"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "replaceText",
        provider: "google-docs",
        validCases: [
            {
                name: "replace_single_word",
                description: "Replace a single word throughout document",
                input: {
                    documentId: SAMPLE_DOCUMENT_ID,
                    find: "placeholder",
                    replace: "actual value"
                },
                expectedOutput: {
                    documentId: SAMPLE_DOCUMENT_ID,
                    occurrencesChanged: 5,
                    find: "placeholder",
                    replace: "actual value"
                }
            }
        ],
        errorCases: [
            {
                name: "document_not_found",
                description: "Document does not exist",
                input: {
                    documentId: "nonexistent-doc-id",
                    find: "test",
                    replace: "replacement"
                },
                expectedError: {
                    type: "not_found",
                    message: "Requested entity was not found",
                    retryable: false
                }
            },
            {
                name: "no_edit_permission",
                description: "User cannot edit this document",
                input: {
                    documentId: "readonly-document",
                    find: "text",
                    replace: "new text"
                },
                expectedError: {
                    type: "permission",
                    message: "The caller does not have permission to edit this document",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    documentId: SAMPLE_DOCUMENT_ID,
                    find: "test",
                    replace: "replacement"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },

    // ========== TABLE OPERATIONS ==========
    {
        operationId: "insertTable",
        provider: "google-docs",
        validCases: [
            {
                name: "insert_basic_table",
                description: "Insert a simple 3x3 table at end of document",
                input: {
                    documentId: SAMPLE_DOCUMENT_ID,
                    rows: 3,
                    columns: 3
                },
                expectedOutput: {
                    documentId: SAMPLE_DOCUMENT_ID,
                    inserted: true,
                    rows: 3,
                    columns: 3
                }
            }
        ],
        errorCases: [
            {
                name: "document_not_found",
                description: "Document does not exist",
                input: {
                    documentId: "nonexistent-document",
                    rows: 3,
                    columns: 3
                },
                expectedError: {
                    type: "not_found",
                    message: "Requested entity was not found",
                    retryable: false
                }
            },
            {
                name: "invalid_index",
                description: "Index is out of bounds for document",
                input: {
                    documentId: SAMPLE_DOCUMENT_ID,
                    rows: 3,
                    columns: 3,
                    index: 999999
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid index: The requested index is beyond the end of the document",
                    retryable: false
                }
            },
            {
                name: "too_many_rows",
                description: "Table exceeds maximum row limit",
                input: {
                    documentId: SAMPLE_DOCUMENT_ID,
                    rows: 150,
                    columns: 5
                },
                expectedError: {
                    type: "validation",
                    message: "Table size exceeds maximum allowed dimensions",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    documentId: SAMPLE_DOCUMENT_ID,
                    rows: 3,
                    columns: 3
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },

    // ========== BATCH UPDATE OPERATIONS ==========
    {
        operationId: "batchUpdate",
        provider: "google-docs",
        validCases: [
            {
                name: "insert_text_at_position",
                description: "Insert text at a specific index",
                input: {
                    documentId: SAMPLE_DOCUMENT_ID,
                    requests: [
                        {
                            insertText: {
                                text: "Important: ",
                                location: {
                                    index: 1
                                }
                            }
                        }
                    ]
                },
                expectedOutput: {
                    documentId: SAMPLE_DOCUMENT_ID,
                    replies: [{}],
                    writeControl: {
                        requiredRevisionId: SAMPLE_REVISION_ID
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "document_not_found",
                description: "Document does not exist",
                input: {
                    documentId: "nonexistent-document-id",
                    requests: [
                        {
                            insertText: {
                                text: "Test",
                                endOfSegmentLocation: {
                                    segmentId: ""
                                }
                            }
                        }
                    ]
                },
                expectedError: {
                    type: "not_found",
                    message: "Requested entity was not found",
                    retryable: false
                }
            },
            {
                name: "invalid_range",
                description: "Content range is invalid",
                input: {
                    documentId: SAMPLE_DOCUMENT_ID,
                    requests: [
                        {
                            deleteContentRange: {
                                range: {
                                    startIndex: 100,
                                    endIndex: 50
                                }
                            }
                        }
                    ]
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid range: startIndex must be less than endIndex",
                    retryable: false
                }
            },
            {
                name: "index_out_of_bounds",
                description: "Index exceeds document length",
                input: {
                    documentId: SAMPLE_DOCUMENT_ID,
                    requests: [
                        {
                            insertText: {
                                text: "Test",
                                location: {
                                    index: 999999
                                }
                            }
                        }
                    ]
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid index: exceeds document content length",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    documentId: SAMPLE_DOCUMENT_ID,
                    requests: [
                        {
                            insertText: {
                                text: "Test",
                                endOfSegmentLocation: {
                                    segmentId: ""
                                }
                            }
                        }
                    ]
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },

    // ========== FOLDER OPERATIONS ==========
    {
        operationId: "moveToFolder",
        provider: "google-docs",
        validCases: [
            {
                name: "move_to_folder",
                description: "Move document to a specific Drive folder",
                input: {
                    documentId: SAMPLE_DOCUMENT_ID,
                    folderId: SAMPLE_FOLDER_ID
                },
                expectedOutput: {
                    documentId: SAMPLE_DOCUMENT_ID,
                    folderId: SAMPLE_FOLDER_ID,
                    moved: true
                }
            }
        ],
        errorCases: [
            {
                name: "document_not_found",
                description: "Document does not exist",
                input: {
                    documentId: "nonexistent-doc",
                    folderId: SAMPLE_FOLDER_ID
                },
                expectedError: {
                    type: "not_found",
                    message: "File not found",
                    retryable: false
                }
            },
            {
                name: "folder_not_found",
                description: "Destination folder does not exist",
                input: {
                    documentId: SAMPLE_DOCUMENT_ID,
                    folderId: "nonexistent-folder-id"
                },
                expectedError: {
                    type: "not_found",
                    message: "Folder not found: nonexistent-folder-id",
                    retryable: false
                }
            },
            {
                name: "no_folder_permission",
                description: "No write permission to destination folder",
                input: {
                    documentId: SAMPLE_DOCUMENT_ID,
                    folderId: "restricted-folder-id"
                },
                expectedError: {
                    type: "permission",
                    message: "The caller does not have permission to add files to this folder",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    documentId: SAMPLE_DOCUMENT_ID,
                    folderId: SAMPLE_FOLDER_ID
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    }
];
