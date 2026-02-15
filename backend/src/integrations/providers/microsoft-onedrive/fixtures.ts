/**
 * Microsoft OneDrive Provider Test Fixtures
 */

import type { TestFixture } from "../../sandbox";

export const microsoftOnedriveFixtures: TestFixture[] = [
    {
        operationId: "listFiles",
        provider: "microsoft-onedrive",
        validCases: [
            {
                name: "list_root_files",
                description: "List files in root directory",
                input: {
                    folderId: "root"
                },
                expectedOutput: {
                    items: [
                        {
                            id: "folder-1",
                            name: "Documents",
                            type: "folder",
                            size: 0
                        },
                        {
                            id: "file-1",
                            name: "readme.txt",
                            type: "file",
                            size: 1024
                        }
                    ],
                    nextLink: null
                }
            }
        ],
        errorCases: [
            {
                name: "folder_not_found",
                description: "Folder does not exist",
                input: {
                    folderId: "nonexistent-folder"
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
        operationId: "getFile",
        provider: "microsoft-onedrive",
        validCases: [
            {
                name: "get_file_metadata",
                description: "Get file metadata by ID",
                input: {
                    fileId: "file-123"
                },
                expectedOutput: {
                    id: "file-123",
                    name: "report.pdf",
                    size: 102400,
                    mimeType: "application/pdf",
                    createdAt: "2024-01-15T10:00:00Z",
                    modifiedAt: "2024-01-20T15:30:00Z",
                    downloadUrl: "https://download.microsoft.com/file-123"
                }
            }
        ],
        errorCases: [
            {
                name: "file_not_found",
                description: "File does not exist",
                input: {
                    fileId: "nonexistent-file"
                },
                expectedError: {
                    type: "not_found",
                    message: "File not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "uploadFile",
        provider: "microsoft-onedrive",
        validCases: [
            {
                name: "upload_small_file",
                description: "Upload a small file",
                input: {
                    folderId: "folder-123",
                    fileName: "document.pdf",
                    content: "base64-encoded-content"
                },
                expectedOutput: {
                    id: "{{uuid}}",
                    name: "document.pdf",
                    size: 45678,
                    webUrl: "https://onedrive.live.com/view?id={{uuid}}"
                }
            }
        ],
        errorCases: [
            {
                name: "rate_limit",
                description: "Storage quota exceeded",
                input: {
                    folderId: "folder-123",
                    fileName: "large-file.zip",
                    content: "base64-encoded-content"
                },
                expectedError: {
                    type: "validation",
                    message: "Storage quota exceeded",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "createFolder",
        provider: "microsoft-onedrive",
        validCases: [
            {
                name: "create_new_folder",
                description: "Create a new folder",
                input: {
                    parentFolderId: "root",
                    name: "New Folder"
                },
                expectedOutput: {
                    id: "{{uuid}}",
                    name: "New Folder",
                    type: "folder",
                    webUrl: "https://onedrive.live.com/folder?id={{uuid}}"
                }
            }
        ],
        errorCases: [
            {
                name: "duplicate_name",
                description: "Folder with same name exists",
                input: {
                    parentFolderId: "root",
                    name: "Documents"
                },
                expectedError: {
                    type: "validation",
                    message: "A folder with this name already exists",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "deleteFile",
        provider: "microsoft-onedrive",
        validCases: [
            {
                name: "delete_file",
                description: "Delete a file",
                input: {
                    fileId: "file-123"
                },
                expectedOutput: {
                    deleted: true
                }
            }
        ],
        errorCases: [
            {
                name: "file_not_found",
                description: "File to delete does not exist",
                input: {
                    fileId: "nonexistent-file"
                },
                expectedError: {
                    type: "not_found",
                    message: "File not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "searchFiles",
        provider: "microsoft-onedrive",
        validCases: [
            {
                name: "search_by_name",
                description: "Search files by name",
                input: {
                    query: "report"
                },
                expectedOutput: {
                    items: [
                        {
                            id: "file-1",
                            name: "Annual Report.pdf",
                            type: "file",
                            size: 204800
                        },
                        {
                            id: "file-2",
                            name: "Report Template.docx",
                            type: "file",
                            size: 51200
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
                    query: "report"
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
        operationId: "createSharingLink",
        provider: "microsoft-onedrive",
        validCases: [
            {
                name: "create_sharing_link",
                description: "Create a sharing link for a file",
                input: {
                    fileId: "file-123",
                    type: "view",
                    scope: "anonymous"
                },
                expectedOutput: {
                    link: "https://1drv.ms/b/s!AbcDef123456",
                    type: "view",
                    scope: "anonymous"
                }
            }
        ],
        errorCases: [
            {
                name: "file_not_found",
                description: "File does not exist",
                input: {
                    fileId: "nonexistent-file",
                    type: "view",
                    scope: "anonymous"
                },
                expectedError: {
                    type: "not_found",
                    message: "File not found",
                    retryable: false
                }
            }
        ]
    }
];
