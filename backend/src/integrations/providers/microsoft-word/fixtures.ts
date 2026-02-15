/**
 * Microsoft Word Provider Test Fixtures
 */

import type { TestFixture } from "../../sandbox";

export const microsoftWordFixtures: TestFixture[] = [
    {
        operationId: "getDocument",
        provider: "microsoft-word",
        validCases: [
            {
                name: "get_document_metadata",
                description: "Get document metadata by ID",
                input: {
                    documentId: "doc-123"
                },
                expectedOutput: {
                    id: "doc-123",
                    name: "Quarterly Report.docx",
                    size: 45678,
                    createdAt: "2024-01-15T10:00:00Z",
                    modifiedAt: "2024-01-20T15:30:00Z",
                    webUrl: "https://onedrive.live.com/edit.aspx?doc=123"
                }
            }
        ],
        errorCases: [
            {
                name: "document_not_found",
                description: "Document does not exist",
                input: {
                    documentId: "nonexistent-doc"
                },
                expectedError: {
                    type: "not_found",
                    message: "Document not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "downloadDocument",
        provider: "microsoft-word",
        validCases: [
            {
                name: "download_as_pdf",
                description: "Download document as PDF",
                input: {
                    documentId: "doc-123",
                    format: "pdf"
                },
                expectedOutput: {
                    downloadUrl: "https://download.microsoft.com/temp/doc-123.pdf",
                    expiresAt: "{{iso}}"
                }
            }
        ],
        errorCases: [
            {
                name: "document_not_found",
                description: "Document does not exist",
                input: {
                    documentId: "nonexistent-doc",
                    format: "pdf"
                },
                expectedError: {
                    type: "not_found",
                    message: "Document not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "convertDocument",
        provider: "microsoft-word",
        validCases: [
            {
                name: "convert_to_pdf",
                description: "Convert document to PDF format",
                input: {
                    documentId: "doc-123",
                    targetFormat: "pdf"
                },
                expectedOutput: {
                    convertedDocumentId: "{{uuid}}",
                    format: "pdf",
                    size: 52341
                }
            }
        ],
        errorCases: [
            {
                name: "unsupported_format",
                description: "Unsupported target format",
                input: {
                    documentId: "doc-123",
                    targetFormat: "invalid"
                },
                expectedError: {
                    type: "validation",
                    message: "Unsupported conversion format: invalid",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "uploadDocument",
        provider: "microsoft-word",
        validCases: [
            {
                name: "upload_new_document",
                description: "Upload a new Word document",
                input: {
                    folderId: "folder-123",
                    fileName: "NewDocument.docx",
                    content: "base64-encoded-content"
                },
                expectedOutput: {
                    id: "{{uuid}}",
                    name: "NewDocument.docx",
                    webUrl: "https://onedrive.live.com/edit.aspx?doc={{uuid}}"
                }
            }
        ],
        errorCases: [
            {
                name: "folder_not_found",
                description: "Destination folder does not exist",
                input: {
                    folderId: "nonexistent-folder",
                    fileName: "NewDocument.docx",
                    content: "base64-encoded-content"
                },
                expectedError: {
                    type: "not_found",
                    message: "Folder not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "replaceDocument",
        provider: "microsoft-word",
        validCases: [
            {
                name: "replace_document_content",
                description: "Replace document with new content",
                input: {
                    documentId: "doc-123",
                    content: "base64-encoded-content"
                },
                expectedOutput: {
                    id: "doc-123",
                    modifiedAt: "{{iso}}"
                }
            }
        ],
        errorCases: [
            {
                name: "document_not_found",
                description: "Document to replace does not exist",
                input: {
                    documentId: "nonexistent-doc",
                    content: "base64-encoded-content"
                },
                expectedError: {
                    type: "not_found",
                    message: "Document not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "searchDocuments",
        provider: "microsoft-word",
        validCases: [
            {
                name: "search_by_name",
                description: "Search documents by name",
                input: {
                    query: "quarterly report"
                },
                expectedOutput: {
                    documents: [
                        {
                            id: "doc-123",
                            name: "Quarterly Report Q1.docx",
                            webUrl: "https://onedrive.live.com/edit.aspx?doc=123"
                        },
                        {
                            id: "doc-456",
                            name: "Quarterly Report Q2.docx",
                            webUrl: "https://onedrive.live.com/edit.aspx?doc=456"
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "rate_limited",
                description: "Too many search requests",
                input: {
                    query: "quarterly report"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Too many requests. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "copyDocument",
        provider: "microsoft-word",
        validCases: [
            {
                name: "copy_document",
                description: "Copy document to another folder",
                input: {
                    documentId: "doc-123",
                    destinationFolderId: "folder-456",
                    newName: "Report Copy.docx"
                },
                expectedOutput: {
                    id: "{{uuid}}",
                    name: "Report Copy.docx",
                    webUrl: "https://onedrive.live.com/edit.aspx?doc={{uuid}}"
                }
            }
        ],
        errorCases: [
            {
                name: "source_not_found",
                description: "Source document does not exist",
                input: {
                    documentId: "nonexistent-doc",
                    destinationFolderId: "folder-456",
                    newName: "Copy.docx"
                },
                expectedError: {
                    type: "not_found",
                    message: "Document not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "deleteDocument",
        provider: "microsoft-word",
        validCases: [
            {
                name: "delete_document",
                description: "Delete a document",
                input: {
                    documentId: "doc-123"
                },
                expectedOutput: {
                    deleted: true
                }
            }
        ],
        errorCases: [
            {
                name: "document_not_found",
                description: "Document to delete does not exist",
                input: {
                    documentId: "nonexistent-doc"
                },
                expectedError: {
                    type: "not_found",
                    message: "Document not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "createSharingLink",
        provider: "microsoft-word",
        validCases: [
            {
                name: "create_view_link",
                description: "Create a view-only sharing link",
                input: {
                    documentId: "doc-123",
                    type: "view"
                },
                expectedOutput: {
                    link: "https://1drv.ms/w/s!AbcDef123",
                    type: "view",
                    expiresAt: null
                }
            }
        ],
        errorCases: [
            {
                name: "document_not_found",
                description: "Document does not exist",
                input: {
                    documentId: "nonexistent-doc",
                    type: "view"
                },
                expectedError: {
                    type: "not_found",
                    message: "Document not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getPreviewUrl",
        provider: "microsoft-word",
        validCases: [
            {
                name: "get_preview",
                description: "Get embeddable preview URL",
                input: {
                    documentId: "doc-123"
                },
                expectedOutput: {
                    previewUrl: "https://onedrive.live.com/embed?doc=123",
                    expiresAt: "{{iso}}"
                }
            }
        ],
        errorCases: [
            {
                name: "document_not_found",
                description: "Document does not exist",
                input: {
                    documentId: "nonexistent-doc"
                },
                expectedError: {
                    type: "not_found",
                    message: "Document not found",
                    retryable: false
                }
            }
        ]
    }
];
