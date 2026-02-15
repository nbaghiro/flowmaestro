/**
 * Microsoft PowerPoint Provider Test Fixtures
 */

import type { TestFixture } from "../../sandbox";

export const microsoftPowerpointFixtures: TestFixture[] = [
    {
        operationId: "getPresentation",
        provider: "microsoft-powerpoint",
        validCases: [
            {
                name: "get_presentation_metadata",
                description: "Get presentation metadata by ID",
                input: {
                    presentationId: "pres-123"
                },
                expectedOutput: {
                    id: "pres-123",
                    name: "Q1 Sales Deck.pptx",
                    slideCount: 24,
                    size: 2456789,
                    createdAt: "2024-01-15T10:00:00Z",
                    modifiedAt: "2024-01-20T15:30:00Z",
                    webUrl: "https://onedrive.live.com/edit.aspx?pres=123"
                }
            }
        ],
        errorCases: [
            {
                name: "presentation_not_found",
                description: "Presentation does not exist",
                input: {
                    presentationId: "nonexistent-pres"
                },
                expectedError: {
                    type: "not_found",
                    message: "Presentation not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "downloadPresentation",
        provider: "microsoft-powerpoint",
        validCases: [
            {
                name: "download_as_pdf",
                description: "Download presentation as PDF",
                input: {
                    presentationId: "pres-123",
                    format: "pdf"
                },
                expectedOutput: {
                    downloadUrl: "https://download.microsoft.com/temp/pres-123.pdf",
                    expiresAt: "{{iso}}"
                }
            }
        ],
        errorCases: [
            {
                name: "presentation_not_found",
                description: "Presentation does not exist",
                input: {
                    presentationId: "nonexistent-pres",
                    format: "pdf"
                },
                expectedError: {
                    type: "not_found",
                    message: "Presentation not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "convertPresentation",
        provider: "microsoft-powerpoint",
        validCases: [
            {
                name: "convert_to_pdf",
                description: "Convert presentation to PDF format",
                input: {
                    presentationId: "pres-123",
                    targetFormat: "pdf"
                },
                expectedOutput: {
                    convertedPresentationId: "{{uuid}}",
                    format: "pdf",
                    size: 1234567
                }
            }
        ],
        errorCases: [
            {
                name: "unsupported_format",
                description: "Unsupported target format",
                input: {
                    presentationId: "pres-123",
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
        operationId: "uploadPresentation",
        provider: "microsoft-powerpoint",
        validCases: [
            {
                name: "upload_new_presentation",
                description: "Upload a new PowerPoint presentation",
                input: {
                    folderId: "folder-123",
                    fileName: "NewPresentation.pptx",
                    content: "base64-encoded-content"
                },
                expectedOutput: {
                    id: "{{uuid}}",
                    name: "NewPresentation.pptx",
                    webUrl: "https://onedrive.live.com/edit.aspx?pres={{uuid}}"
                }
            }
        ],
        errorCases: [
            {
                name: "folder_not_found",
                description: "Destination folder does not exist",
                input: {
                    folderId: "nonexistent-folder",
                    fileName: "NewPresentation.pptx",
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
        operationId: "replacePresentation",
        provider: "microsoft-powerpoint",
        validCases: [
            {
                name: "replace_presentation_content",
                description: "Replace presentation with new content",
                input: {
                    presentationId: "pres-123",
                    content: "base64-encoded-content"
                },
                expectedOutput: {
                    id: "pres-123",
                    modifiedAt: "{{iso}}"
                }
            }
        ],
        errorCases: [
            {
                name: "presentation_not_found",
                description: "Presentation to replace does not exist",
                input: {
                    presentationId: "nonexistent-pres",
                    content: "base64-encoded-content"
                },
                expectedError: {
                    type: "not_found",
                    message: "Presentation not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "searchPresentations",
        provider: "microsoft-powerpoint",
        validCases: [
            {
                name: "search_by_name",
                description: "Search presentations by name",
                input: {
                    query: "sales deck"
                },
                expectedOutput: {
                    presentations: [
                        {
                            id: "pres-123",
                            name: "Q1 Sales Deck.pptx",
                            webUrl: "https://onedrive.live.com/edit.aspx?pres=123"
                        },
                        {
                            id: "pres-456",
                            name: "Q2 Sales Deck.pptx",
                            webUrl: "https://onedrive.live.com/edit.aspx?pres=456"
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
                    query: "sales deck"
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
        operationId: "copyPresentation",
        provider: "microsoft-powerpoint",
        validCases: [
            {
                name: "copy_presentation",
                description: "Copy presentation to another folder",
                input: {
                    presentationId: "pres-123",
                    destinationFolderId: "folder-456",
                    newName: "Sales Deck Copy.pptx"
                },
                expectedOutput: {
                    id: "{{uuid}}",
                    name: "Sales Deck Copy.pptx",
                    webUrl: "https://onedrive.live.com/edit.aspx?pres={{uuid}}"
                }
            }
        ],
        errorCases: [
            {
                name: "source_not_found",
                description: "Source presentation does not exist",
                input: {
                    presentationId: "nonexistent-pres",
                    destinationFolderId: "folder-456",
                    newName: "Copy.pptx"
                },
                expectedError: {
                    type: "not_found",
                    message: "Presentation not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "deletePresentation",
        provider: "microsoft-powerpoint",
        validCases: [
            {
                name: "delete_presentation",
                description: "Delete a presentation",
                input: {
                    presentationId: "pres-123"
                },
                expectedOutput: {
                    deleted: true
                }
            }
        ],
        errorCases: [
            {
                name: "presentation_not_found",
                description: "Presentation to delete does not exist",
                input: {
                    presentationId: "nonexistent-pres"
                },
                expectedError: {
                    type: "not_found",
                    message: "Presentation not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "createSharingLink",
        provider: "microsoft-powerpoint",
        validCases: [
            {
                name: "create_view_link",
                description: "Create a view-only sharing link",
                input: {
                    presentationId: "pres-123",
                    type: "view"
                },
                expectedOutput: {
                    link: "https://1drv.ms/p/s!AbcDef123",
                    type: "view",
                    expiresAt: null
                }
            }
        ],
        errorCases: [
            {
                name: "presentation_not_found",
                description: "Presentation does not exist",
                input: {
                    presentationId: "nonexistent-pres",
                    type: "view"
                },
                expectedError: {
                    type: "not_found",
                    message: "Presentation not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getPreviewUrl",
        provider: "microsoft-powerpoint",
        validCases: [
            {
                name: "get_preview",
                description: "Get embeddable preview URL",
                input: {
                    presentationId: "pres-123"
                },
                expectedOutput: {
                    previewUrl: "https://onedrive.live.com/embed?pres=123",
                    expiresAt: "{{iso}}"
                }
            }
        ],
        errorCases: [
            {
                name: "presentation_not_found",
                description: "Presentation does not exist",
                input: {
                    presentationId: "nonexistent-pres"
                },
                expectedError: {
                    type: "not_found",
                    message: "Presentation not found",
                    retryable: false
                }
            }
        ]
    }
];
