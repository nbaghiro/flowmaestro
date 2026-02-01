/**
 * Box Provider Test Fixtures
 *
 * Comprehensive test fixtures for Box operations with realistic
 * Box API response structures for cloud file storage operations.
 */

import type { TestFixture } from "../../../sandbox";

/**
 * Sample files for filterableData testing
 * These match the Box API file/folder resource structure
 */
const sampleItems = [
    {
        type: "file" as const,
        id: "928347561234",
        name: "Q4_Sales_Report_2024.pdf",
        size: 2456789,
        created_at: "2024-01-15T10:00:00-08:00",
        modified_at: "2024-01-20T15:30:00-08:00",
        path_collection: {
            total_count: 2,
            entries: [
                { id: "0", name: "All Files" },
                { id: "847293651234", name: "Reports" }
            ]
        },
        shared_link: null,
        _parentId: "847293651234"
    },
    {
        type: "file" as const,
        id: "928347561235",
        name: "Project_Proposal_Draft.docx",
        size: 156789,
        created_at: "2024-01-10T09:00:00-08:00",
        modified_at: "2024-01-18T14:20:00-08:00",
        path_collection: {
            total_count: 2,
            entries: [
                { id: "0", name: "All Files" },
                { id: "847293651235", name: "Documents" }
            ]
        },
        shared_link: {
            url: "https://app.box.com/s/abc123def456",
            access: "open"
        },
        _parentId: "847293651235"
    },
    {
        type: "file" as const,
        id: "928347561236",
        name: "Team_Photo_Offsite_2024.jpg",
        size: 3456789,
        created_at: "2024-01-12T11:30:00-08:00",
        modified_at: "2024-01-12T11:30:00-08:00",
        path_collection: {
            total_count: 2,
            entries: [
                { id: "0", name: "All Files" },
                { id: "847293651236", name: "Images" }
            ]
        },
        shared_link: null,
        _parentId: "847293651236"
    },
    {
        type: "folder" as const,
        id: "847293651234",
        name: "Reports",
        created_at: "2024-01-01T00:00:00-08:00",
        modified_at: "2024-01-20T10:00:00-08:00",
        path_collection: {
            total_count: 1,
            entries: [{ id: "0", name: "All Files" }]
        },
        shared_link: null,
        _parentId: "0"
    },
    {
        type: "folder" as const,
        id: "847293651235",
        name: "Documents",
        created_at: "2024-01-02T08:00:00-08:00",
        modified_at: "2024-01-18T16:45:00-08:00",
        path_collection: {
            total_count: 1,
            entries: [{ id: "0", name: "All Files" }]
        },
        shared_link: null,
        _parentId: "0"
    },
    {
        type: "folder" as const,
        id: "847293651236",
        name: "Images",
        created_at: "2024-01-03T09:15:00-08:00",
        modified_at: "2024-01-12T11:30:00-08:00",
        path_collection: {
            total_count: 1,
            entries: [{ id: "0", name: "All Files" }]
        },
        shared_link: null,
        _parentId: "0"
    },
    {
        type: "file" as const,
        id: "928347561237",
        name: "Budget_Spreadsheet_2024.xlsx",
        size: 89456,
        created_at: "2024-01-05T08:00:00-08:00",
        modified_at: "2024-01-22T16:45:00-08:00",
        path_collection: {
            total_count: 3,
            entries: [
                { id: "0", name: "All Files" },
                { id: "847293651234", name: "Reports" },
                { id: "847293651237", name: "Finance" }
            ]
        },
        shared_link: {
            url: "https://app.box.com/s/xyz789abc123",
            access: "company"
        },
        _parentId: "847293651237"
    },
    {
        type: "file" as const,
        id: "928347561238",
        name: "Meeting_Notes_Jan_2024.txt",
        size: 12345,
        created_at: "2024-01-19T09:00:00-08:00",
        modified_at: "2024-01-21T17:00:00-08:00",
        path_collection: {
            total_count: 2,
            entries: [
                { id: "0", name: "All Files" },
                { id: "847293651235", name: "Documents" }
            ]
        },
        shared_link: null,
        _parentId: "847293651235"
    }
];

export const boxFixtures: TestFixture[] = [
    // ============================================
    // CREATE FOLDER
    // ============================================
    {
        operationId: "createFolder",
        provider: "box",
        validCases: [
            {
                name: "create_folder_in_root",
                description: "Create a new folder in the root directory",
                input: {
                    name: "New Project Files",
                    parentId: "0"
                },
                expectedOutput: {
                    id: "847293651240",
                    name: "New Project Files",
                    createdAt: "2024-01-22T10:00:00-08:00",
                    modifiedAt: "2024-01-22T10:00:00-08:00",
                    parentId: "0",
                    parentName: "All Files",
                    path: "All Files/New Project Files"
                }
            }
        ],
        errorCases: [
            {
                name: "folder_already_exists",
                description: "Folder with same name already exists in location",
                input: {
                    name: "Reports",
                    parentId: "0"
                },
                expectedError: {
                    type: "validation",
                    message: 'A folder named "Reports" already exists in this location.',
                    retryable: false
                }
            },
            {
                name: "parent_not_found",
                description: "Parent folder does not exist",
                input: {
                    name: "New Folder",
                    parentId: "nonexistent_folder_id"
                },
                expectedError: {
                    type: "not_found",
                    message: "Parent folder not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    name: "Test Folder",
                    parentId: "0"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Try again later.",
                    retryable: true
                }
            }
        ]
    },

    // ============================================
    // DELETE FILE
    // ============================================
    {
        operationId: "deleteFile",
        provider: "box",
        validCases: [
            {
                name: "delete_file",
                description: "Delete a file (moves to trash)",
                input: {
                    fileId: "928347561234",
                    type: "file"
                },
                expectedOutput: {
                    deleted: true,
                    id: "928347561234",
                    type: "file",
                    message: "File moved to trash successfully."
                }
            }
        ],
        errorCases: [
            {
                name: "file_not_found",
                description: "File does not exist",
                input: {
                    fileId: "nonexistent_file_id",
                    type: "file"
                },
                expectedError: {
                    type: "not_found",
                    message: "File not found.",
                    retryable: false
                }
            },
            {
                name: "folder_not_found",
                description: "Folder does not exist",
                input: {
                    fileId: "nonexistent_folder_id",
                    type: "folder"
                },
                expectedError: {
                    type: "not_found",
                    message: "Folder not found.",
                    retryable: false
                }
            },
            {
                name: "permission_denied_file",
                description: "No permission to delete file",
                input: {
                    fileId: "restricted_file_id",
                    type: "file"
                },
                expectedError: {
                    type: "permission",
                    message: "You don't have permission to delete this file.",
                    retryable: false
                }
            },
            {
                name: "permission_denied_folder",
                description: "No permission to delete folder",
                input: {
                    fileId: "restricted_folder_id",
                    type: "folder"
                },
                expectedError: {
                    type: "permission",
                    message: "You don't have permission to delete this folder.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    fileId: "928347561234",
                    type: "file"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Try again later.",
                    retryable: true
                }
            }
        ]
    },

    // ============================================
    // DOWNLOAD FILE
    // ============================================
    {
        operationId: "downloadFile",
        provider: "box",
        validCases: [
            {
                name: "download_pdf",
                description: "Download a PDF document",
                input: {
                    fileId: "928347561234"
                },
                expectedOutput: {
                    id: "928347561234",
                    name: "Q4_Sales_Report_2024.pdf",
                    size: 2456789,
                    modifiedAt: "2024-01-20T15:30:00-08:00",
                    createdAt: "2024-01-15T10:00:00-08:00",
                    path: "All Files/Reports/Q4_Sales_Report_2024.pdf",
                    content: "JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZw...",
                    contentEncoding: "base64"
                }
            }
        ],
        errorCases: [
            {
                name: "file_not_found",
                description: "File does not exist",
                input: {
                    fileId: "nonexistent_file_id"
                },
                expectedError: {
                    type: "not_found",
                    message: "File not found",
                    retryable: false
                }
            },
            {
                name: "permission",
                description: "No permission to download file",
                input: {
                    fileId: "restricted_file_id"
                },
                expectedError: {
                    type: "permission",
                    message: "You do not have permission to download this file",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    fileId: "928347561234"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Try again later.",
                    retryable: true
                }
            }
        ]
    },

    // ============================================
    // LIST FILES
    // ============================================
    {
        operationId: "listFiles",
        provider: "box",
        filterableData: {
            records: sampleItems,
            recordsField: "items",
            offsetField: "offset",
            defaultPageSize: 100,
            maxPageSize: 1000,
            pageSizeParam: "limit",
            filterConfig: {
                type: "generic",
                filterableFields: ["_parentId", "type"]
            }
        },
        validCases: [
            {
                name: "list_root_folder",
                description: "List all items in root folder",
                input: {
                    folderId: "0"
                },
                expectedOutput: {
                    folderId: "0",
                    totalCount: 3,
                    offset: 0,
                    limit: 100,
                    hasMore: false,
                    itemCount: 3,
                    items: [
                        {
                            type: "folder",
                            id: "847293651234",
                            name: "Reports",
                            path: "All Files/Reports",
                            sharedLink: null
                        },
                        {
                            type: "folder",
                            id: "847293651235",
                            name: "Documents",
                            path: "All Files/Documents",
                            sharedLink: null
                        },
                        {
                            type: "folder",
                            id: "847293651236",
                            name: "Images",
                            path: "All Files/Images",
                            sharedLink: null
                        }
                    ]
                }
            },
            {
                name: "list_subfolder",
                description: "List contents of a specific folder",
                input: {
                    folderId: "847293651235"
                },
                expectedOutput: {
                    folderId: "847293651235",
                    totalCount: 2,
                    offset: 0,
                    limit: 100,
                    hasMore: false,
                    itemCount: 2,
                    items: [
                        {
                            type: "file",
                            id: "928347561235",
                            name: "Project_Proposal_Draft.docx",
                            size: 156789,
                            modifiedAt: "2024-01-18T14:20:00-08:00",
                            createdAt: "2024-01-10T09:00:00-08:00",
                            path: "All Files/Documents/Project_Proposal_Draft.docx",
                            sharedLink: "https://app.box.com/s/abc123def456"
                        },
                        {
                            type: "file",
                            id: "928347561238",
                            name: "Meeting_Notes_Jan_2024.txt",
                            size: 12345,
                            modifiedAt: "2024-01-21T17:00:00-08:00",
                            createdAt: "2024-01-19T09:00:00-08:00",
                            path: "All Files/Documents/Meeting_Notes_Jan_2024.txt",
                            sharedLink: null
                        }
                    ]
                }
            },
            {
                name: "list_with_pagination",
                description: "List files with pagination",
                input: {
                    folderId: "0",
                    limit: 2,
                    offset: 0
                },
                expectedOutput: {
                    folderId: "0",
                    totalCount: 3,
                    offset: 0,
                    limit: 2,
                    hasMore: true,
                    itemCount: 2,
                    items: [
                        {
                            type: "folder",
                            id: "847293651234",
                            name: "Reports",
                            path: "All Files/Reports",
                            sharedLink: null
                        },
                        {
                            type: "folder",
                            id: "847293651235",
                            name: "Documents",
                            path: "All Files/Documents",
                            sharedLink: null
                        }
                    ]
                }
            },
            {
                name: "list_default_folder",
                description: "List files with default folder (root)",
                input: {},
                expectedOutput: {
                    folderId: "0",
                    totalCount: 3,
                    offset: 0,
                    limit: 100,
                    hasMore: false,
                    itemCount: 3,
                    items: [
                        {
                            type: "folder",
                            id: "847293651234",
                            name: "Reports",
                            path: "All Files/Reports",
                            sharedLink: null
                        },
                        {
                            type: "folder",
                            id: "847293651235",
                            name: "Documents",
                            path: "All Files/Documents",
                            sharedLink: null
                        },
                        {
                            type: "folder",
                            id: "847293651236",
                            name: "Images",
                            path: "All Files/Images",
                            sharedLink: null
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "folder_not_found",
                description: "Folder does not exist",
                input: {
                    folderId: "nonexistent_folder_id"
                },
                expectedError: {
                    type: "not_found",
                    message: "Folder not found",
                    retryable: false
                }
            },
            {
                name: "permission",
                description: "No permission to access folder",
                input: {
                    folderId: "restricted_folder_id"
                },
                expectedError: {
                    type: "permission",
                    message: "You do not have permission to access this folder",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    folderId: "0"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Try again later.",
                    retryable: true
                }
            }
        ]
    },

    // ============================================
    // SHARE FILE
    // ============================================
    {
        operationId: "shareFile",
        provider: "box",
        validCases: [
            {
                name: "share_file_open_access",
                description: "Share a file with open access (anyone with link)",
                input: {
                    fileId: "928347561234",
                    access: "open"
                },
                expectedOutput: {
                    id: "928347561234",
                    name: "Q4_Sales_Report_2024.pdf",
                    url: "https://app.box.com/s/qrs789tuv012",
                    downloadUrl: "https://app.box.com/shared/static/qrs789tuv012.pdf",
                    access: "open",
                    effectiveAccess: "open",
                    isPasswordEnabled: false,
                    permissions: {
                        can_download: true,
                        can_preview: true,
                        can_edit: false
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "file_not_found",
                description: "File does not exist",
                input: {
                    fileId: "nonexistent_file_id",
                    access: "open"
                },
                expectedError: {
                    type: "not_found",
                    message: "File not found.",
                    retryable: false
                }
            },
            {
                name: "permission",
                description: "No permission to share file",
                input: {
                    fileId: "restricted_file_id",
                    access: "open"
                },
                expectedError: {
                    type: "permission",
                    message: "You don't have permission to share this file.",
                    retryable: false
                }
            },
            {
                name: "sharing_disabled",
                description: "Sharing is disabled for this file",
                input: {
                    fileId: "no_share_file_id",
                    access: "open"
                },
                expectedError: {
                    type: "server_error",
                    message: "Failed to create shared link. The file may not support sharing.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    fileId: "928347561234",
                    access: "open"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Try again later.",
                    retryable: true
                }
            }
        ]
    },

    // ============================================
    // UPLOAD FILE
    // ============================================
    {
        operationId: "uploadFile",
        provider: "box",
        validCases: [
            {
                name: "upload_pdf_to_root",
                description: "Upload a PDF file to root directory",
                input: {
                    fileName: "Annual_Report_2024.pdf",
                    content: "JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZw...",
                    parentId: "0"
                },
                expectedOutput: {
                    id: "928347561240",
                    name: "Annual_Report_2024.pdf",
                    size: 1567890,
                    createdAt: "2024-01-22T11:00:00-08:00",
                    modifiedAt: "2024-01-22T11:00:00-08:00",
                    parentId: "0",
                    parentName: "All Files"
                }
            }
        ],
        errorCases: [
            {
                name: "file_too_large",
                description: "File exceeds 50MB upload limit",
                input: {
                    fileName: "Large_Video.mp4",
                    content: "AAAAHGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDE...",
                    parentId: "0"
                },
                expectedError: {
                    type: "validation",
                    message: "File size (75MB) exceeds the 50MB limit for direct upload.",
                    retryable: false
                }
            },
            {
                name: "parent_folder_not_found",
                description: "Parent folder does not exist",
                input: {
                    fileName: "Document.pdf",
                    content: "JVBERi0xLjQ...",
                    parentId: "nonexistent_folder_id"
                },
                expectedError: {
                    type: "not_found",
                    message: "Parent folder not found",
                    retryable: false
                }
            },
            {
                name: "permission",
                description: "No permission to upload to folder",
                input: {
                    fileName: "Document.pdf",
                    content: "JVBERi0xLjQ...",
                    parentId: "restricted_folder_id"
                },
                expectedError: {
                    type: "permission",
                    message: "You do not have permission to upload to this folder",
                    retryable: false
                }
            },
            {
                name: "storage_quota_exceeded",
                description: "Storage quota has been exceeded",
                input: {
                    fileName: "Large_File.zip",
                    content: "UEsDBBQAAAAI...",
                    parentId: "0"
                },
                expectedError: {
                    type: "validation",
                    message: "Storage quota exceeded",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    fileName: "Test.txt",
                    content: "dGVzdA==",
                    parentId: "0"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Try again later.",
                    retryable: true
                }
            }
        ]
    }
];
