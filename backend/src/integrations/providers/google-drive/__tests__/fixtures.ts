/**
 * Google Drive Provider Test Fixtures
 *
 * Comprehensive test fixtures for Google Drive operations with realistic
 * Google Drive API response structures.
 */

import type { TestFixture } from "../../../sandbox";

/**
 * Sample files for filterableData testing
 * These match the Google Drive API file resource structure
 */
const sampleFiles = [
    {
        kind: "drive#file",
        id: "1a2b3c4d5e6f7g8h9i0j_file001",
        name: "Q4 Sales Report.pdf",
        mimeType: "application/pdf",
        size: "2456789",
        createdTime: "2024-01-15T10:00:00.000Z",
        modifiedTime: "2024-01-20T15:30:00.000Z",
        parents: ["1folder_root_abc123"],
        webViewLink: "https://drive.google.com/file/d/1a2b3c4d5e6f7g8h9i0j_file001/view",
        owners: [{ displayName: "John Doe", emailAddress: "john@example.com" }],
        _mimeType: "application/pdf",
        _folderId: "1folder_root_abc123"
    },
    {
        kind: "drive#file",
        id: "1a2b3c4d5e6f7g8h9i0j_file002",
        name: "Project Proposal.docx",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        size: "156789",
        createdTime: "2024-01-10T09:00:00.000Z",
        modifiedTime: "2024-01-18T14:20:00.000Z",
        parents: ["1folder_documents_def456"],
        webViewLink: "https://drive.google.com/file/d/1a2b3c4d5e6f7g8h9i0j_file002/view",
        owners: [{ displayName: "Jane Smith", emailAddress: "jane@example.com" }],
        _mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        _folderId: "1folder_documents_def456"
    },
    {
        kind: "drive#file",
        id: "1a2b3c4d5e6f7g8h9i0j_file003",
        name: "Budget Spreadsheet",
        mimeType: "application/vnd.google-apps.spreadsheet",
        createdTime: "2024-01-05T08:00:00.000Z",
        modifiedTime: "2024-01-22T16:45:00.000Z",
        parents: ["1folder_finance_ghi789"],
        webViewLink: "https://docs.google.com/spreadsheets/d/1a2b3c4d5e6f7g8h9i0j_file003/edit",
        owners: [{ displayName: "John Doe", emailAddress: "john@example.com" }],
        _mimeType: "application/vnd.google-apps.spreadsheet",
        _folderId: "1folder_finance_ghi789"
    },
    {
        kind: "drive#file",
        id: "1a2b3c4d5e6f7g8h9i0j_file004",
        name: "Team Photo.jpg",
        mimeType: "image/jpeg",
        size: "3456789",
        createdTime: "2024-01-12T11:30:00.000Z",
        modifiedTime: "2024-01-12T11:30:00.000Z",
        parents: ["1folder_images_jkl012"],
        webViewLink: "https://drive.google.com/file/d/1a2b3c4d5e6f7g8h9i0j_file004/view",
        thumbnailLink: "https://lh3.googleusercontent.com/d/1a2b3c4d5e6f7g8h9i0j_file004=s220",
        owners: [{ displayName: "Jane Smith", emailAddress: "jane@example.com" }],
        _mimeType: "image/jpeg",
        _folderId: "1folder_images_jkl012"
    },
    {
        kind: "drive#file",
        id: "1a2b3c4d5e6f7g8h9i0j_folder001",
        name: "Documents",
        mimeType: "application/vnd.google-apps.folder",
        createdTime: "2024-01-01T00:00:00.000Z",
        modifiedTime: "2024-01-20T10:00:00.000Z",
        parents: ["1folder_root_abc123"],
        webViewLink: "https://drive.google.com/drive/folders/1a2b3c4d5e6f7g8h9i0j_folder001",
        owners: [{ displayName: "John Doe", emailAddress: "john@example.com" }],
        _mimeType: "application/vnd.google-apps.folder",
        _folderId: "1folder_root_abc123"
    },
    {
        kind: "drive#file",
        id: "1a2b3c4d5e6f7g8h9i0j_file005",
        name: "Meeting Notes",
        mimeType: "application/vnd.google-apps.document",
        createdTime: "2024-01-19T09:00:00.000Z",
        modifiedTime: "2024-01-21T17:00:00.000Z",
        parents: ["1folder_documents_def456"],
        webViewLink: "https://docs.google.com/document/d/1a2b3c4d5e6f7g8h9i0j_file005/edit",
        owners: [{ displayName: "Jane Smith", emailAddress: "jane@example.com" }],
        _mimeType: "application/vnd.google-apps.document",
        _folderId: "1folder_documents_def456"
    }
];

/**
 * Sample permissions for listPermissions filterableData
 */
const samplePermissions = [
    {
        kind: "drive#permission",
        id: "perm001abc123",
        type: "user",
        role: "owner",
        emailAddress: "john@example.com",
        displayName: "John Doe",
        photoLink: "https://lh3.googleusercontent.com/a/default-user",
        _fileId: "1a2b3c4d5e6f7g8h9i0j_file001"
    },
    {
        kind: "drive#permission",
        id: "perm002def456",
        type: "user",
        role: "writer",
        emailAddress: "jane@example.com",
        displayName: "Jane Smith",
        photoLink: "https://lh3.googleusercontent.com/a/default-user",
        _fileId: "1a2b3c4d5e6f7g8h9i0j_file001"
    },
    {
        kind: "drive#permission",
        id: "perm003ghi789",
        type: "user",
        role: "reader",
        emailAddress: "bob@example.com",
        displayName: "Bob Wilson",
        _fileId: "1a2b3c4d5e6f7g8h9i0j_file001"
    },
    {
        kind: "drive#permission",
        id: "perm004anyone",
        type: "anyone",
        role: "reader",
        allowFileDiscovery: false,
        _fileId: "1a2b3c4d5e6f7g8h9i0j_file002"
    }
];

export const googleDriveFixtures: TestFixture[] = [
    // ============================================
    // LIST FILES
    // ============================================
    {
        operationId: "listFiles",
        provider: "google-drive",
        filterableData: {
            records: sampleFiles,
            recordsField: "files",
            offsetField: "nextPageToken",
            defaultPageSize: 100,
            maxPageSize: 1000,
            pageSizeParam: "pageSize",
            filterConfig: {
                type: "generic",
                filterableFields: ["_mimeType", "_folderId"]
            }
        },
        validCases: [
            {
                name: "list_all_files",
                description: "List all files in Drive",
                input: {},
                expectedOutput: {
                    kind: "drive#fileList",
                    files: sampleFiles.map(({ _mimeType, _folderId, ...file }) => file)
                }
            },
            {
                name: "list_files_with_page_size",
                description: "List files with pagination",
                input: {
                    pageSize: 2
                },
                expectedOutput: {
                    kind: "drive#fileList",
                    files: sampleFiles.slice(0, 2).map(({ _mimeType, _folderId, ...file }) => file),
                    nextPageToken: "token_page_2"
                }
            },
            {
                name: "list_files_with_query",
                description: "Search files with query",
                input: {
                    query: "name contains 'Report'"
                },
                expectedOutput: {
                    kind: "drive#fileList",
                    files: [
                        {
                            kind: "drive#file",
                            id: "1a2b3c4d5e6f7g8h9i0j_file001",
                            name: "Q4 Sales Report.pdf",
                            mimeType: "application/pdf",
                            size: "2456789",
                            createdTime: "2024-01-15T10:00:00.000Z",
                            modifiedTime: "2024-01-20T15:30:00.000Z",
                            parents: ["1folder_root_abc123"],
                            webViewLink:
                                "https://drive.google.com/file/d/1a2b3c4d5e6f7g8h9i0j_file001/view",
                            owners: [{ displayName: "John Doe", emailAddress: "john@example.com" }]
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_query_syntax",
                description: "Invalid Drive query syntax",
                input: {
                    query: "invalid query syntax {{"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid query syntax",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Try again later.",
                    retryable: true
                }
            }
        ]
    },

    // ============================================
    // GET FILE
    // ============================================
    {
        operationId: "getFile",
        provider: "google-drive",
        validCases: [
            {
                name: "get_file_metadata",
                description: "Get file metadata by ID",
                input: {
                    fileId: "1a2b3c4d5e6f7g8h9i0j_file001"
                },
                expectedOutput: {
                    kind: "drive#file",
                    id: "1a2b3c4d5e6f7g8h9i0j_file001",
                    name: "Q4 Sales Report.pdf",
                    mimeType: "application/pdf",
                    size: "2456789",
                    createdTime: "2024-01-15T10:00:00.000Z",
                    modifiedTime: "2024-01-20T15:30:00.000Z",
                    parents: ["1folder_root_abc123"],
                    webViewLink:
                        "https://drive.google.com/file/d/1a2b3c4d5e6f7g8h9i0j_file001/view",
                    owners: [{ displayName: "John Doe", emailAddress: "john@example.com" }]
                }
            },
            {
                name: "get_folder_metadata",
                description: "Get folder metadata by ID",
                input: {
                    fileId: "1a2b3c4d5e6f7g8h9i0j_folder001"
                },
                expectedOutput: {
                    kind: "drive#file",
                    id: "1a2b3c4d5e6f7g8h9i0j_folder001",
                    name: "Documents",
                    mimeType: "application/vnd.google-apps.folder",
                    createdTime: "2024-01-01T00:00:00.000Z",
                    modifiedTime: "2024-01-20T10:00:00.000Z",
                    parents: ["1folder_root_abc123"],
                    webViewLink:
                        "https://drive.google.com/drive/folders/1a2b3c4d5e6f7g8h9i0j_folder001"
                }
            },
            {
                name: "get_google_doc_metadata",
                description: "Get Google Docs file metadata",
                input: {
                    fileId: "1a2b3c4d5e6f7g8h9i0j_file005"
                },
                expectedOutput: {
                    kind: "drive#file",
                    id: "1a2b3c4d5e6f7g8h9i0j_file005",
                    name: "Meeting Notes",
                    mimeType: "application/vnd.google-apps.document",
                    createdTime: "2024-01-19T09:00:00.000Z",
                    modifiedTime: "2024-01-21T17:00:00.000Z",
                    parents: ["1folder_documents_def456"],
                    webViewLink:
                        "https://docs.google.com/document/d/1a2b3c4d5e6f7g8h9i0j_file005/edit"
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
                description: "No access to file",
                input: {
                    fileId: "restricted_file_id"
                },
                expectedError: {
                    type: "permission",
                    message: "You do not have permission to access this file",
                    retryable: false
                }
            }
        ]
    },

    // ============================================
    // UPLOAD FILE
    // ============================================
    {
        operationId: "uploadFile",
        provider: "google-drive",
        validCases: [
            {
                name: "upload_pdf_to_root",
                description: "Upload a PDF file to root directory",
                input: {
                    fileName: "Report.pdf",
                    fileContent: "JVBERi0xLjQKJeLjz9MKMSAwIG9iago...",
                    mimeType: "application/pdf"
                },
                expectedOutput: {
                    kind: "drive#file",
                    id: "1new_uploaded_file_001",
                    name: "Report.pdf",
                    mimeType: "application/pdf",
                    size: "156789",
                    createdTime: "2024-01-22T10:00:00.000Z",
                    modifiedTime: "2024-01-22T10:00:00.000Z",
                    webViewLink: "https://drive.google.com/file/d/1new_uploaded_file_001/view"
                }
            },
            {
                name: "upload_image_to_folder",
                description: "Upload an image to a specific folder",
                input: {
                    fileName: "photo.jpg",
                    fileContent: "/9j/4AAQSkZJRgABAQEASABIAAD...",
                    mimeType: "image/jpeg",
                    folderId: "1folder_images_jkl012",
                    description: "Team photo from offsite"
                },
                expectedOutput: {
                    kind: "drive#file",
                    id: "1new_uploaded_file_002",
                    name: "photo.jpg",
                    mimeType: "image/jpeg",
                    size: "2345678",
                    description: "Team photo from offsite",
                    createdTime: "2024-01-22T10:05:00.000Z",
                    modifiedTime: "2024-01-22T10:05:00.000Z",
                    parents: ["1folder_images_jkl012"],
                    webViewLink: "https://drive.google.com/file/d/1new_uploaded_file_002/view",
                    thumbnailLink: "https://lh3.googleusercontent.com/d/1new_uploaded_file_002=s220"
                }
            }
        ],
        errorCases: [
            {
                name: "folder_not_found",
                description: "Target folder does not exist",
                input: {
                    fileName: "document.pdf",
                    fileContent: "base64content",
                    mimeType: "application/pdf",
                    folderId: "nonexistent_folder"
                },
                expectedError: {
                    type: "not_found",
                    message: "Parent folder not found",
                    retryable: false
                }
            },
            {
                name: "storage_quota_exceeded",
                description: "User storage quota exceeded",
                input: {
                    fileName: "large_file.zip",
                    fileContent: "verylargecontent...",
                    mimeType: "application/zip"
                },
                expectedError: {
                    type: "validation",
                    message: "Storage quota exceeded",
                    retryable: false
                }
            }
        ]
    },

    // ============================================
    // DOWNLOAD FILE
    // ============================================
    {
        operationId: "downloadFile",
        provider: "google-drive",
        validCases: [
            {
                name: "download_pdf",
                description: "Download a PDF file",
                input: {
                    fileId: "1a2b3c4d5e6f7g8h9i0j_file001"
                },
                expectedOutput: {
                    content: "JVBERi0xLjQKJeLjz9MKMSAwIG9iago...",
                    mimeType: "application/pdf",
                    name: "Q4 Sales Report.pdf",
                    size: 2456789
                }
            },
            {
                name: "download_image",
                description: "Download an image file",
                input: {
                    fileId: "1a2b3c4d5e6f7g8h9i0j_file004"
                },
                expectedOutput: {
                    content: "/9j/4AAQSkZJRgABAQEASABIAAD...",
                    mimeType: "image/jpeg",
                    name: "Team Photo.jpg",
                    size: 3456789
                }
            }
        ],
        errorCases: [
            {
                name: "file_not_found",
                description: "File does not exist",
                input: {
                    fileId: "nonexistent_file"
                },
                expectedError: {
                    type: "not_found",
                    message: "File not found",
                    retryable: false
                }
            },
            {
                name: "cannot_download_google_file",
                description: "Cannot download native Google file",
                input: {
                    fileId: "1a2b3c4d5e6f7g8h9i0j_file003"
                },
                expectedError: {
                    type: "validation",
                    message:
                        "Cannot download Google Workspace files directly. Use exportDocument instead.",
                    retryable: false
                }
            }
        ]
    },

    // ============================================
    // CREATE FOLDER
    // ============================================
    {
        operationId: "createFolder",
        provider: "google-drive",
        validCases: [
            {
                name: "create_folder_in_root",
                description: "Create a new folder in root directory",
                input: {
                    folderName: "New Project"
                },
                expectedOutput: {
                    kind: "drive#file",
                    id: "1new_folder_001",
                    name: "New Project",
                    mimeType: "application/vnd.google-apps.folder",
                    createdTime: "2024-01-22T11:00:00.000Z",
                    modifiedTime: "2024-01-22T11:00:00.000Z",
                    webViewLink: "https://drive.google.com/drive/folders/1new_folder_001"
                }
            },
            {
                name: "create_subfolder",
                description: "Create a folder inside another folder",
                input: {
                    folderName: "Q1 2024",
                    parentFolderId: "1folder_finance_ghi789",
                    description: "Financial documents for Q1 2024"
                },
                expectedOutput: {
                    kind: "drive#file",
                    id: "1new_folder_002",
                    name: "Q1 2024",
                    mimeType: "application/vnd.google-apps.folder",
                    description: "Financial documents for Q1 2024",
                    createdTime: "2024-01-22T11:05:00.000Z",
                    modifiedTime: "2024-01-22T11:05:00.000Z",
                    parents: ["1folder_finance_ghi789"],
                    webViewLink: "https://drive.google.com/drive/folders/1new_folder_002"
                }
            }
        ],
        errorCases: [
            {
                name: "parent_folder_not_found",
                description: "Parent folder does not exist",
                input: {
                    folderName: "New Folder",
                    parentFolderId: "nonexistent_parent"
                },
                expectedError: {
                    type: "not_found",
                    message: "Parent folder not found",
                    retryable: false
                }
            }
        ]
    },

    // ============================================
    // DELETE FILE
    // ============================================
    {
        operationId: "deleteFile",
        provider: "google-drive",
        validCases: [
            {
                name: "delete_file",
                description: "Permanently delete a file",
                input: {
                    fileId: "1a2b3c4d5e6f7g8h9i0j_file001"
                },
                expectedOutput: {
                    deleted: true,
                    fileId: "1a2b3c4d5e6f7g8h9i0j_file001"
                }
            }
        ],
        errorCases: [
            {
                name: "file_not_found",
                description: "File does not exist",
                input: {
                    fileId: "nonexistent_file"
                },
                expectedError: {
                    type: "not_found",
                    message: "File not found",
                    retryable: false
                }
            },
            {
                name: "permission",
                description: "No permission to delete",
                input: {
                    fileId: "shared_readonly_file"
                },
                expectedError: {
                    type: "permission",
                    message: "You do not have permission to delete this file",
                    retryable: false
                }
            }
        ]
    },

    // ============================================
    // TRASH FILE
    // ============================================
    {
        operationId: "trashFile",
        provider: "google-drive",
        validCases: [
            {
                name: "trash_file",
                description: "Move a file to trash",
                input: {
                    fileId: "1a2b3c4d5e6f7g8h9i0j_file001"
                },
                expectedOutput: {
                    kind: "drive#file",
                    id: "1a2b3c4d5e6f7g8h9i0j_file001",
                    name: "Q4 Sales Report.pdf",
                    trashed: true,
                    trashedTime: "2024-01-22T12:00:00.000Z"
                }
            }
        ],
        errorCases: [
            {
                name: "file_not_found",
                description: "File does not exist",
                input: {
                    fileId: "nonexistent_file"
                },
                expectedError: {
                    type: "not_found",
                    message: "File not found",
                    retryable: false
                }
            }
        ]
    },

    // ============================================
    // COPY FILE
    // ============================================
    {
        operationId: "copyFile",
        provider: "google-drive",
        validCases: [
            {
                name: "copy_file",
                description: "Create a copy of a file",
                input: {
                    fileId: "1a2b3c4d5e6f7g8h9i0j_file001",
                    newName: "Q4 Report Copy.pdf",
                    destinationFolderId: "1folder_documents_def456"
                },
                expectedOutput: {
                    kind: "drive#file",
                    id: "1copied_file_001",
                    name: "Q4 Report Copy.pdf",
                    mimeType: "application/pdf",
                    size: "2456789",
                    createdTime: "2024-01-22T12:30:00.000Z",
                    modifiedTime: "2024-01-22T12:30:00.000Z",
                    parents: ["1folder_documents_def456"],
                    webViewLink: "https://drive.google.com/file/d/1copied_file_001/view"
                }
            }
        ],
        errorCases: [
            {
                name: "source_file_not_found",
                description: "Source file does not exist",
                input: {
                    fileId: "nonexistent_file"
                },
                expectedError: {
                    type: "not_found",
                    message: "File not found",
                    retryable: false
                }
            },
            {
                name: "destination_folder_not_found",
                description: "Destination folder does not exist",
                input: {
                    fileId: "1a2b3c4d5e6f7g8h9i0j_file001",
                    destinationFolderId: "nonexistent_folder"
                },
                expectedError: {
                    type: "not_found",
                    message: "Destination folder not found",
                    retryable: false
                }
            }
        ]
    },

    // ============================================
    // MOVE FILE
    // ============================================
    {
        operationId: "moveFile",
        provider: "google-drive",
        validCases: [
            {
                name: "move_file_to_folder",
                description: "Move a file from one folder to another",
                input: {
                    fileId: "1a2b3c4d5e6f7g8h9i0j_file001",
                    destinationFolderId: "1folder_documents_def456"
                },
                expectedOutput: {
                    kind: "drive#file",
                    id: "1a2b3c4d5e6f7g8h9i0j_file001",
                    name: "Q4 Sales Report.pdf",
                    mimeType: "application/pdf",
                    parents: ["1folder_documents_def456"],
                    webViewLink: "https://drive.google.com/file/d/1a2b3c4d5e6f7g8h9i0j_file001/view"
                }
            }
        ],
        errorCases: [
            {
                name: "file_not_found",
                description: "File does not exist",
                input: {
                    fileId: "nonexistent_file",
                    destinationFolderId: "1folder_documents_def456"
                },
                expectedError: {
                    type: "not_found",
                    message: "File not found",
                    retryable: false
                }
            },
            {
                name: "destination_folder_not_found",
                description: "Destination folder does not exist",
                input: {
                    fileId: "1a2b3c4d5e6f7g8h9i0j_file001",
                    destinationFolderId: "nonexistent_folder"
                },
                expectedError: {
                    type: "not_found",
                    message: "Destination folder not found",
                    retryable: false
                }
            }
        ]
    },

    // ============================================
    // UPDATE FILE
    // ============================================
    {
        operationId: "updateFile",
        provider: "google-drive",
        validCases: [
            {
                name: "rename_file",
                description: "Rename a file",
                input: {
                    fileId: "1a2b3c4d5e6f7g8h9i0j_file001",
                    name: "Q4 2024 Sales Report.pdf"
                },
                expectedOutput: {
                    kind: "drive#file",
                    id: "1a2b3c4d5e6f7g8h9i0j_file001",
                    name: "Q4 2024 Sales Report.pdf",
                    mimeType: "application/pdf",
                    modifiedTime: "2024-01-22T13:00:00.000Z"
                }
            },
            {
                name: "update_description",
                description: "Update file description",
                input: {
                    fileId: "1a2b3c4d5e6f7g8h9i0j_file001",
                    description: "Final Q4 sales report for 2024 fiscal year"
                },
                expectedOutput: {
                    kind: "drive#file",
                    id: "1a2b3c4d5e6f7g8h9i0j_file001",
                    name: "Q4 Sales Report.pdf",
                    description: "Final Q4 sales report for 2024 fiscal year",
                    modifiedTime: "2024-01-22T13:05:00.000Z"
                }
            }
        ],
        errorCases: [
            {
                name: "file_not_found",
                description: "File does not exist",
                input: {
                    fileId: "nonexistent_file",
                    name: "New Name.pdf"
                },
                expectedError: {
                    type: "not_found",
                    message: "File not found",
                    retryable: false
                }
            }
        ]
    },

    // ============================================
    // SHARE FILE
    // ============================================
    {
        operationId: "shareFile",
        provider: "google-drive",
        validCases: [
            {
                name: "share_with_user",
                description: "Share file with a specific user",
                input: {
                    fileId: "1a2b3c4d5e6f7g8h9i0j_file001",
                    type: "user",
                    role: "writer",
                    emailAddress: "colleague@example.com"
                },
                expectedOutput: {
                    kind: "drive#permission",
                    id: "perm_new_001",
                    type: "user",
                    role: "writer",
                    emailAddress: "colleague@example.com",
                    displayName: "Colleague Name"
                }
            },
            {
                name: "share_with_anyone_view",
                description: "Make file publicly viewable",
                input: {
                    fileId: "1a2b3c4d5e6f7g8h9i0j_file001",
                    type: "anyone",
                    role: "reader"
                },
                expectedOutput: {
                    kind: "drive#permission",
                    id: "perm_new_002",
                    type: "anyone",
                    role: "reader",
                    allowFileDiscovery: false
                }
            },
            {
                name: "share_with_domain",
                description: "Share with everyone in a domain",
                input: {
                    fileId: "1a2b3c4d5e6f7g8h9i0j_file001",
                    type: "domain",
                    role: "commenter",
                    domain: "example.com"
                },
                expectedOutput: {
                    kind: "drive#permission",
                    id: "perm_new_003",
                    type: "domain",
                    role: "commenter",
                    domain: "example.com"
                }
            }
        ],
        errorCases: [
            {
                name: "file_not_found",
                description: "File does not exist",
                input: {
                    fileId: "nonexistent_file",
                    type: "user",
                    role: "reader",
                    emailAddress: "user@example.com"
                },
                expectedError: {
                    type: "not_found",
                    message: "File not found",
                    retryable: false
                }
            },
            {
                name: "missing_email_for_user_type",
                description: "Email required for user type",
                input: {
                    fileId: "1a2b3c4d5e6f7g8h9i0j_file001",
                    type: "user",
                    role: "reader"
                },
                expectedError: {
                    type: "validation",
                    message: "emailAddress is required for type 'user'",
                    retryable: false
                }
            },
            {
                name: "invalid_email_address",
                description: "Invalid email address format",
                input: {
                    fileId: "1a2b3c4d5e6f7g8h9i0j_file001",
                    type: "user",
                    role: "reader",
                    emailAddress: "invalid-email"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid email address",
                    retryable: false
                }
            }
        ]
    },

    // ============================================
    // LIST PERMISSIONS
    // ============================================
    {
        operationId: "listPermissions",
        provider: "google-drive",
        filterableData: {
            records: samplePermissions,
            recordsField: "permissions",
            offsetField: "nextPageToken",
            defaultPageSize: 100,
            maxPageSize: 100,
            pageSizeParam: "pageSize",
            filterConfig: {
                type: "generic",
                filterableFields: ["_fileId"]
            }
        },
        validCases: [
            {
                name: "list_file_permissions",
                description: "List all permissions for a file",
                input: {
                    fileId: "1a2b3c4d5e6f7g8h9i0j_file001"
                },
                expectedOutput: {
                    kind: "drive#permissionList",
                    permissions: [
                        {
                            kind: "drive#permission",
                            id: "perm001abc123",
                            type: "user",
                            role: "owner",
                            emailAddress: "john@example.com",
                            displayName: "John Doe"
                        },
                        {
                            kind: "drive#permission",
                            id: "perm002def456",
                            type: "user",
                            role: "writer",
                            emailAddress: "jane@example.com",
                            displayName: "Jane Smith"
                        },
                        {
                            kind: "drive#permission",
                            id: "perm003ghi789",
                            type: "user",
                            role: "reader",
                            emailAddress: "bob@example.com",
                            displayName: "Bob Wilson"
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "file_not_found",
                description: "File does not exist",
                input: {
                    fileId: "nonexistent_file"
                },
                expectedError: {
                    type: "not_found",
                    message: "File not found",
                    retryable: false
                }
            }
        ]
    },

    // ============================================
    // REVOKE PERMISSION
    // ============================================
    {
        operationId: "revokePermission",
        provider: "google-drive",
        validCases: [
            {
                name: "revoke_user_permission",
                description: "Remove a user's access to a file",
                input: {
                    fileId: "1a2b3c4d5e6f7g8h9i0j_file001",
                    permissionId: "perm002def456"
                },
                expectedOutput: {
                    revoked: true,
                    fileId: "1a2b3c4d5e6f7g8h9i0j_file001",
                    permissionId: "perm002def456"
                }
            }
        ],
        errorCases: [
            {
                name: "permission_not_found",
                description: "Permission does not exist",
                input: {
                    fileId: "1a2b3c4d5e6f7g8h9i0j_file001",
                    permissionId: "nonexistent_perm"
                },
                expectedError: {
                    type: "not_found",
                    message: "Permission not found",
                    retryable: false
                }
            },
            {
                name: "cannot_revoke_owner",
                description: "Cannot revoke owner permission",
                input: {
                    fileId: "1a2b3c4d5e6f7g8h9i0j_file001",
                    permissionId: "perm001abc123"
                },
                expectedError: {
                    type: "validation",
                    message: "Cannot revoke owner permission",
                    retryable: false
                }
            }
        ]
    },

    // ============================================
    // EXPORT DOCUMENT
    // ============================================
    {
        operationId: "exportDocument",
        provider: "google-drive",
        validCases: [
            {
                name: "export_doc_to_pdf",
                description: "Export Google Doc to PDF",
                input: {
                    fileId: "1a2b3c4d5e6f7g8h9i0j_file005",
                    mimeType: "application/pdf"
                },
                expectedOutput: {
                    content: "JVBERi0xLjQKJeLjz9MKMSAwIG9iago...",
                    mimeType: "application/pdf",
                    originalName: "Meeting Notes",
                    exportedFileName: "Meeting Notes.pdf"
                }
            },
            {
                name: "export_doc_to_docx",
                description: "Export Google Doc to Word",
                input: {
                    fileId: "1a2b3c4d5e6f7g8h9i0j_file005",
                    mimeType:
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                },
                expectedOutput: {
                    content: "UEsDBBQAAAAIAA...",
                    mimeType:
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    originalName: "Meeting Notes",
                    exportedFileName: "Meeting Notes.docx"
                }
            },
            {
                name: "export_spreadsheet_to_xlsx",
                description: "Export Google Sheet to Excel",
                input: {
                    fileId: "1a2b3c4d5e6f7g8h9i0j_file003",
                    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                },
                expectedOutput: {
                    content: "UEsDBBQAAAAIAB...",
                    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    originalName: "Budget Spreadsheet",
                    exportedFileName: "Budget Spreadsheet.xlsx"
                }
            }
        ],
        errorCases: [
            {
                name: "file_not_found",
                description: "File does not exist",
                input: {
                    fileId: "nonexistent_file",
                    mimeType: "application/pdf"
                },
                expectedError: {
                    type: "not_found",
                    message: "File not found",
                    retryable: false
                }
            },
            {
                name: "not_a_google_file",
                description: "File is not a Google Workspace file",
                input: {
                    fileId: "1a2b3c4d5e6f7g8h9i0j_file001",
                    mimeType: "application/pdf"
                },
                expectedError: {
                    type: "validation",
                    message:
                        "Export is only available for Google Workspace files (Docs, Sheets, Slides)",
                    retryable: false
                }
            },
            {
                name: "unsupported_export_format",
                description: "Unsupported export format",
                input: {
                    fileId: "1a2b3c4d5e6f7g8h9i0j_file005",
                    mimeType: "application/vnd.invalid.format"
                },
                expectedError: {
                    type: "validation",
                    message: "Unsupported export format for this file type",
                    retryable: false
                }
            }
        ]
    }
];
