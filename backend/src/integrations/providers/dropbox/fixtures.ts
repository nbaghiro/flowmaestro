/**
 * Dropbox Provider Test Fixtures
 *
 * Comprehensive test fixtures for Dropbox cloud storage operations including
 * files, folders, downloads, uploads, and sharing functionality.
 */

import type { TestFixture } from "../../sandbox";

export const dropboxFixtures: TestFixture[] = [
    // ==================== CREATE FOLDER ====================
    {
        operationId: "createFolder",
        provider: "dropbox",
        validCases: [
            {
                name: "basic_createFolder",
                description: "Create a new folder in Dropbox. Returns the created folder metadata.",
                input: {
                    path: "/Documents/Projects/Q4-2025"
                },
                expectedOutput: {
                    id: "id:a4ayc_80_OEAAAAAAAAAXw",
                    name: "Q4-2025",
                    path: "/Documents/Projects/Q4-2025"
                }
            },
            {
                name: "createFolder_with_autorename",
                description: "Create a folder with autorename enabled to handle naming conflicts",
                input: {
                    path: "/Documents/Reports",
                    autorename: true
                },
                expectedOutput: {
                    id: "id:b5bzd_91_PFBAAAAAAAAYx",
                    name: "Reports (1)",
                    path: "/Documents/Reports (1)"
                }
            },
            {
                name: "createFolder_nested_deep",
                description: "Create a deeply nested folder structure",
                input: {
                    path: "/Work/Clients/Acme Corp/Contracts/2025/January"
                },
                expectedOutput: {
                    id: "id:c6cae_02_QGCAAAAAAAAZy",
                    name: "January",
                    path: "/Work/Clients/Acme Corp/Contracts/2025/January"
                }
            },
            {
                name: "createFolder_at_root",
                description: "Create a folder at the root level",
                input: {
                    path: "/Marketing Assets"
                },
                expectedOutput: {
                    id: "id:d7dbf_13_RHDAAAAAAAAaz",
                    name: "Marketing Assets",
                    path: "/Marketing Assets"
                }
            },
            {
                name: "createFolder_with_special_characters",
                description: "Create a folder with special characters in the name",
                input: {
                    path: "/Documents/Project (Final) - v2.0"
                },
                expectedOutput: {
                    id: "id:e8ecg_24_SIEAAAAAAAAbA",
                    name: "Project (Final) - v2.0",
                    path: "/Documents/Project (Final) - v2.0"
                }
            }
        ],
        errorCases: [
            {
                name: "folder_already_exists",
                description: "Attempt to create a folder that already exists without autorename",
                input: {
                    path: "/Documents/Projects",
                    autorename: false
                },
                expectedError: {
                    type: "validation",
                    message: "Folder already exists at /Documents/Projects",
                    retryable: false
                }
            },
            {
                name: "invalid_path",
                description: "Attempt to create folder with invalid path characters",
                input: {
                    path: "/Documents/Folder:Invalid"
                },
                expectedError: {
                    type: "validation",
                    message: "Path contains invalid characters",
                    retryable: false
                }
            },
            {
                name: "path_too_long",
                description: "Path exceeds maximum length limit",
                input: {
                    path: "/Documents/" + "A".repeat(500)
                },
                expectedError: {
                    type: "validation",
                    message: "Path exceeds maximum length of 260 characters",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when creating folder",
                input: {
                    path: "/Documents/New Folder"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Retry after 30 seconds.",
                    retryable: true
                }
            },
            {
                name: "insufficient_space",
                description: "No space available to create folder",
                input: {
                    path: "/Documents/Archive"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Dropbox storage quota exceeded",
                    retryable: true
                }
            }
        ]
    },

    // ==================== DELETE FILE ====================
    {
        operationId: "deleteFile",
        provider: "dropbox",
        validCases: [
            {
                name: "basic_deleteFile",
                description:
                    "Delete a file from Dropbox. Moves to trash for recovery within retention period.",
                input: {
                    path: "/Documents/old-report.pdf"
                },
                expectedOutput: {
                    deleted: true,
                    type: "file",
                    id: "id:f9fdi_35_TJFAAAAAAAAcB",
                    name: "old-report.pdf",
                    path: "/Documents/old-report.pdf"
                }
            },
            {
                name: "deleteFile_folder",
                description: "Delete a folder and all its contents",
                input: {
                    path: "/Documents/Archived Projects"
                },
                expectedOutput: {
                    deleted: true,
                    type: "folder",
                    id: "id:g0gej_46_UKGAAAAAAAAdC",
                    name: "Archived Projects",
                    path: "/Documents/Archived Projects"
                }
            },
            {
                name: "deleteFile_image",
                description: "Delete an image file from a photos folder",
                input: {
                    path: "/Photos/2024/vacation-001.jpg"
                },
                expectedOutput: {
                    deleted: true,
                    type: "file",
                    id: "id:h1hfk_57_VLHAAAAAAAAeD",
                    name: "vacation-001.jpg",
                    path: "/Photos/2024/vacation-001.jpg"
                }
            },
            {
                name: "deleteFile_document",
                description: "Delete a Word document",
                input: {
                    path: "/Work/Proposals/draft-proposal.docx"
                },
                expectedOutput: {
                    deleted: true,
                    type: "file",
                    id: "id:i2igl_68_WMIAAAAAAAAfE",
                    name: "draft-proposal.docx",
                    path: "/Work/Proposals/draft-proposal.docx"
                }
            },
            {
                name: "deleteFile_spreadsheet",
                description: "Delete an Excel spreadsheet",
                input: {
                    path: "/Finance/Q3-budget-2024.xlsx"
                },
                expectedOutput: {
                    deleted: true,
                    type: "file",
                    id: "id:j3jhm_79_XNJAAAAAAAAgF",
                    name: "Q3-budget-2024.xlsx",
                    path: "/Finance/Q3-budget-2024.xlsx"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "File or folder does not exist at specified path",
                input: {
                    path: "/Documents/nonexistent-file.pdf"
                },
                expectedError: {
                    type: "not_found",
                    message: "File or folder not found at path /Documents/nonexistent-file.pdf",
                    retryable: false
                }
            },
            {
                name: "permission",
                description: "User does not have permission to delete this file",
                input: {
                    path: "/Shared/Team Documents/protected-file.pdf"
                },
                expectedError: {
                    type: "permission",
                    message: "You do not have permission to delete this file",
                    retryable: false
                }
            },
            {
                name: "file_locked",
                description: "File is locked and cannot be deleted",
                input: {
                    path: "/Documents/locked-contract.pdf"
                },
                expectedError: {
                    type: "permission",
                    message: "File is locked and cannot be deleted",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when deleting file",
                input: {
                    path: "/Documents/temp-file.txt"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Retry after 30 seconds.",
                    retryable: true
                }
            }
        ]
    },

    // ==================== DOWNLOAD FILE ====================
    {
        operationId: "downloadFile",
        provider: "dropbox",
        validCases: [
            {
                name: "basic_downloadFile",
                description:
                    "Download a file from Dropbox. Returns base64 encoded content and metadata.",
                input: {
                    path: "/Documents/quarterly-report.pdf"
                },
                expectedOutput: {
                    content:
                        "JVBERi0xLjQKJeLjz9MKMyAwIG9iago8PC9UeXBlIC9QYWdlCi9QYXJlbnQgMSAwIFI...",
                    contentEncoding: "base64",
                    metadata: {
                        id: "id:k4kin_80_YOKAAAAAAAAhG",
                        name: "quarterly-report.pdf",
                        path: "/Documents/quarterly-report.pdf",
                        size: 2457600,
                        modifiedAt: "2025-01-15T14:30:00Z",
                        contentHash:
                            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                    }
                }
            },
            {
                name: "downloadFile_image",
                description: "Download a JPEG image file",
                input: {
                    path: "/Photos/profile-picture.jpg"
                },
                expectedOutput: {
                    content: "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEB...",
                    contentEncoding: "base64",
                    metadata: {
                        id: "id:l5ljo_91_ZPLAAAAAAAAiH",
                        name: "profile-picture.jpg",
                        path: "/Photos/profile-picture.jpg",
                        size: 524288,
                        modifiedAt: "2025-01-10T09:15:00Z",
                        contentHash:
                            "d7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592"
                    }
                }
            },
            {
                name: "downloadFile_text",
                description: "Download a plain text file",
                input: {
                    path: "/Notes/meeting-notes.txt"
                },
                expectedOutput: {
                    content:
                        "TWVldGluZyBOb3RlcyAtIEphbnVhcnkgMjAyNQoKQXR0ZW5kZWVzOiBKb2huLCBKYW5lLCBCb2I=",
                    contentEncoding: "base64",
                    metadata: {
                        id: "id:m6mkp_02_aQMAAAAAAAAjI",
                        name: "meeting-notes.txt",
                        path: "/Notes/meeting-notes.txt",
                        size: 4096,
                        modifiedAt: "2025-01-20T11:00:00Z",
                        contentHash:
                            "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"
                    }
                }
            },
            {
                name: "downloadFile_spreadsheet",
                description: "Download an Excel spreadsheet",
                input: {
                    path: "/Finance/budget-2025.xlsx"
                },
                expectedOutput: {
                    content: "UEsDBBQAAAAIANVBJkMAAAAAAAAAAAAAAAAYAAAAeGwvd29ya3NoZWV0...",
                    contentEncoding: "base64",
                    metadata: {
                        id: "id:n7nlq_13_bRNAAAAAAAAkJ",
                        name: "budget-2025.xlsx",
                        path: "/Finance/budget-2025.xlsx",
                        size: 1048576,
                        modifiedAt: "2025-01-18T16:45:00Z",
                        contentHash:
                            "a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b55b046bbb7db3d86"
                    }
                }
            },
            {
                name: "downloadFile_video",
                description: "Download a video file",
                input: {
                    path: "/Videos/product-demo.mp4"
                },
                expectedOutput: {
                    content: "AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQ==...",
                    contentEncoding: "base64",
                    metadata: {
                        id: "id:o8omr_24_cSOAAAAAAAAlK",
                        name: "product-demo.mp4",
                        path: "/Videos/product-demo.mp4",
                        size: 52428800,
                        modifiedAt: "2025-01-05T10:30:00Z",
                        contentHash:
                            "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "File does not exist at specified path",
                input: {
                    path: "/Documents/missing-file.pdf"
                },
                expectedError: {
                    type: "not_found",
                    message: "File not found at path /Documents/missing-file.pdf",
                    retryable: false
                }
            },
            {
                name: "is_folder",
                description: "Specified path is a folder, not a file",
                input: {
                    path: "/Documents/Projects"
                },
                expectedError: {
                    type: "validation",
                    message: "Cannot download a folder. Specified path is a directory.",
                    retryable: false
                }
            },
            {
                name: "file_too_large",
                description: "File exceeds maximum download size",
                input: {
                    path: "/Videos/large-archive.zip"
                },
                expectedError: {
                    type: "validation",
                    message: "File size exceeds maximum download limit of 4GB",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when downloading",
                input: {
                    path: "/Documents/report.pdf"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Retry after 60 seconds.",
                    retryable: true
                }
            },
            {
                name: "restricted_content",
                description: "File content is restricted by policy",
                input: {
                    path: "/Legal/restricted-document.pdf"
                },
                expectedError: {
                    type: "permission",
                    message: "Access to this file is restricted by an administrator policy",
                    retryable: false
                }
            }
        ]
    },

    // ==================== LIST FILES ====================
    {
        operationId: "listFiles",
        provider: "dropbox",
        validCases: [
            {
                name: "basic_listFiles",
                description:
                    "List files and folders in a Dropbox directory with metadata including names, paths, sizes.",
                input: {
                    path: "/Documents"
                },
                expectedOutput: {
                    path: "/Documents",
                    itemCount: 5,
                    items: [
                        {
                            type: "folder",
                            name: "Projects",
                            path: "/Documents/Projects",
                            id: "id:p9pns_35_dTPAAAAAAAAmL"
                        },
                        {
                            type: "folder",
                            name: "Reports",
                            path: "/Documents/Reports",
                            id: "id:q0qot_46_eUQAAAAAAAAnM"
                        },
                        {
                            type: "file",
                            name: "annual-review.pdf",
                            path: "/Documents/annual-review.pdf",
                            id: "id:r1rpu_57_fVRAAAAAAAAoN",
                            size: 3145728,
                            modifiedAt: "2025-01-12T08:30:00Z",
                            isDownloadable: true
                        },
                        {
                            type: "file",
                            name: "meeting-agenda.docx",
                            path: "/Documents/meeting-agenda.docx",
                            id: "id:s2sqv_68_gWSAAAAAAAApO",
                            size: 45056,
                            modifiedAt: "2025-01-19T15:20:00Z",
                            isDownloadable: true
                        },
                        {
                            type: "file",
                            name: "notes.txt",
                            path: "/Documents/notes.txt",
                            id: "id:t3trw_79_hXTAAAAAAAAqP",
                            size: 2048,
                            modifiedAt: "2025-01-20T10:00:00Z",
                            isDownloadable: true
                        }
                    ]
                }
            },
            {
                name: "listFiles_root",
                description: "List files at the root directory",
                input: {
                    path: ""
                },
                expectedOutput: {
                    path: "/",
                    itemCount: 4,
                    items: [
                        {
                            type: "folder",
                            name: "Documents",
                            path: "/Documents",
                            id: "id:u4usx_80_iYUAAAAAAAArQ"
                        },
                        {
                            type: "folder",
                            name: "Photos",
                            path: "/Photos",
                            id: "id:v5vty_91_jZVAAAAAAAAsR"
                        },
                        {
                            type: "folder",
                            name: "Videos",
                            path: "/Videos",
                            id: "id:w6wuz_02_kaWAAAAAAAAtS"
                        },
                        {
                            type: "file",
                            name: "welcome.txt",
                            path: "/welcome.txt",
                            id: "id:x7xvA_13_lbXAAAAAAAAuT",
                            size: 1024,
                            modifiedAt: "2024-12-01T00:00:00Z",
                            isDownloadable: true
                        }
                    ]
                }
            },
            {
                name: "listFiles_recursive",
                description: "List files recursively in all subfolders",
                input: {
                    path: "/Projects",
                    recursive: true
                },
                expectedOutput: {
                    path: "/Projects",
                    itemCount: 8,
                    items: [
                        {
                            type: "folder",
                            name: "Website",
                            path: "/Projects/Website",
                            id: "id:y8ywB_24_mcYAAAAAAAAvU"
                        },
                        {
                            type: "folder",
                            name: "Mobile App",
                            path: "/Projects/Mobile App",
                            id: "id:z9zxC_35_ndZAAAAAAAAwV"
                        },
                        {
                            type: "file",
                            name: "index.html",
                            path: "/Projects/Website/index.html",
                            id: "id:A0AyD_46_oeaAAAAAAAAxW",
                            size: 8192,
                            modifiedAt: "2025-01-15T11:30:00Z",
                            isDownloadable: true
                        },
                        {
                            type: "file",
                            name: "styles.css",
                            path: "/Projects/Website/styles.css",
                            id: "id:B1BzE_57_pfbAAAAAAAAyX",
                            size: 4096,
                            modifiedAt: "2025-01-15T11:35:00Z",
                            isDownloadable: true
                        },
                        {
                            type: "file",
                            name: "app.js",
                            path: "/Projects/Website/app.js",
                            id: "id:C2CAF_68_qgcAAAAAAAAzY",
                            size: 16384,
                            modifiedAt: "2025-01-16T09:00:00Z",
                            isDownloadable: true
                        },
                        {
                            type: "file",
                            name: "App.tsx",
                            path: "/Projects/Mobile App/App.tsx",
                            id: "id:D3DBG_79_rhdAAAAAAAA0Z",
                            size: 12288,
                            modifiedAt: "2025-01-17T14:20:00Z",
                            isDownloadable: true
                        },
                        {
                            type: "file",
                            name: "package.json",
                            path: "/Projects/Mobile App/package.json",
                            id: "id:E4ECH_80_sieAAAAAAAA1a",
                            size: 2048,
                            modifiedAt: "2025-01-14T10:00:00Z",
                            isDownloadable: true
                        },
                        {
                            type: "file",
                            name: "README.md",
                            path: "/Projects/README.md",
                            id: "id:F5FDI_91_tjfAAAAAAAA2b",
                            size: 3072,
                            modifiedAt: "2025-01-10T08:00:00Z",
                            isDownloadable: true
                        }
                    ]
                }
            },
            {
                name: "listFiles_photos_folder",
                description: "List image files in a photos folder",
                input: {
                    path: "/Photos/2025/January"
                },
                expectedOutput: {
                    path: "/Photos/2025/January",
                    itemCount: 4,
                    items: [
                        {
                            type: "file",
                            name: "IMG_0001.jpg",
                            path: "/Photos/2025/January/IMG_0001.jpg",
                            id: "id:G6GEJ_02_ukgAAAAAAAA3c",
                            size: 4194304,
                            modifiedAt: "2025-01-02T12:00:00Z",
                            isDownloadable: true
                        },
                        {
                            type: "file",
                            name: "IMG_0002.jpg",
                            path: "/Photos/2025/January/IMG_0002.jpg",
                            id: "id:H7HFK_13_vlhAAAAAAAA4d",
                            size: 3670016,
                            modifiedAt: "2025-01-05T15:30:00Z",
                            isDownloadable: true
                        },
                        {
                            type: "file",
                            name: "screenshot.png",
                            path: "/Photos/2025/January/screenshot.png",
                            id: "id:I8IGL_24_wmiAAAAAAAA5e",
                            size: 1048576,
                            modifiedAt: "2025-01-10T09:45:00Z",
                            isDownloadable: true
                        },
                        {
                            type: "file",
                            name: "vacation-video.mp4",
                            path: "/Photos/2025/January/vacation-video.mp4",
                            id: "id:J9JHM_35_xnjAAAAAAAA6f",
                            size: 104857600,
                            modifiedAt: "2025-01-08T18:00:00Z",
                            isDownloadable: true
                        }
                    ]
                }
            },
            {
                name: "listFiles_empty_folder",
                description: "List an empty folder returns zero items",
                input: {
                    path: "/Documents/Empty Folder"
                },
                expectedOutput: {
                    path: "/Documents/Empty Folder",
                    itemCount: 0,
                    items: []
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Folder does not exist at specified path",
                input: {
                    path: "/NonexistentFolder"
                },
                expectedError: {
                    type: "not_found",
                    message: "Folder not found at path /NonexistentFolder",
                    retryable: false
                }
            },
            {
                name: "is_file",
                description: "Specified path is a file, not a folder",
                input: {
                    path: "/Documents/report.pdf"
                },
                expectedError: {
                    type: "validation",
                    message: "Cannot list contents of a file. Specified path is not a directory.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when listing files",
                input: {
                    path: "/Documents"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Retry after 30 seconds.",
                    retryable: true
                }
            },
            {
                name: "access_denied",
                description: "User does not have access to shared folder",
                input: {
                    path: "/Team Folder/Restricted"
                },
                expectedError: {
                    type: "permission",
                    message: "You do not have permission to access this folder",
                    retryable: false
                }
            }
        ]
    },

    // ==================== SHARE FILE ====================
    {
        operationId: "shareFile",
        provider: "dropbox",
        validCases: [
            {
                name: "basic_shareFile",
                description:
                    "Create a public shared link for a file. Returns shareable URL accessible by anyone.",
                input: {
                    path: "/Documents/presentation.pptx"
                },
                expectedOutput: {
                    url: "https://www.dropbox.com/scl/fi/abc123xyz789/presentation.pptx?rlkey=def456&dl=0",
                    name: "presentation.pptx",
                    id: "id:K0KIN_46_yokAAAAAAAA7g",
                    type: "file",
                    visibility: "public",
                    canRevoke: true
                }
            },
            {
                name: "shareFile_team_only",
                description: "Create a shared link visible only to team members",
                input: {
                    path: "/Work/internal-roadmap.pdf",
                    visibility: "team_only"
                },
                expectedOutput: {
                    url: "https://www.dropbox.com/scl/fi/ghi456uvw012/internal-roadmap.pdf?rlkey=jkl789&dl=0",
                    name: "internal-roadmap.pdf",
                    id: "id:L1LJO_57_zplAAAAAAAA8h",
                    type: "file",
                    visibility: "team_only",
                    canRevoke: true
                }
            },
            {
                name: "shareFile_password_protected",
                description: "Create a password-protected shared link",
                input: {
                    path: "/Finance/confidential-report.xlsx",
                    visibility: "password",
                    password: "SecureP@ss123"
                },
                expectedOutput: {
                    url: "https://www.dropbox.com/scl/fi/mno789rst345/confidential-report.xlsx?rlkey=pqr012&dl=0",
                    name: "confidential-report.xlsx",
                    id: "id:M2MKP_68_Aqm AAAAAAAA9i",
                    type: "file",
                    visibility: "password",
                    canRevoke: true
                }
            },
            {
                name: "shareFile_with_expiration",
                description: "Create a shared link with an expiration date",
                input: {
                    path: "/Marketing/campaign-assets.zip",
                    visibility: "public",
                    expires: "2025-03-31T23:59:59Z"
                },
                expectedOutput: {
                    url: "https://www.dropbox.com/scl/fi/stu678vwx901/campaign-assets.zip?rlkey=yza234&dl=0",
                    name: "campaign-assets.zip",
                    id: "id:N3NLQ_79_BrnAAAAAAAA0j",
                    type: "file",
                    visibility: "public",
                    canRevoke: true,
                    expires: "2025-03-31T23:59:59Z"
                }
            },
            {
                name: "shareFile_folder",
                description: "Create a shared link for an entire folder",
                input: {
                    path: "/Projects/Client Deliverables"
                },
                expectedOutput: {
                    url: "https://www.dropbox.com/scl/fo/bcd567efg890/Client%20Deliverables?rlkey=hij123&dl=0",
                    name: "Client Deliverables",
                    id: "id:O4OMR_80_CsoAAAAAAAA1k",
                    type: "folder",
                    visibility: "public",
                    canRevoke: true
                }
            },
            {
                name: "shareFile_existing_link",
                description: "Return existing shared link when one already exists",
                input: {
                    path: "/Documents/shared-doc.pdf"
                },
                expectedOutput: {
                    url: "https://www.dropbox.com/scl/fi/klm890nop123/shared-doc.pdf?rlkey=qrs456&dl=0",
                    name: "shared-doc.pdf",
                    id: "id:P5PNS_91_DtpAAAAAAAA2l",
                    type: "file",
                    visibility: "public",
                    canRevoke: true,
                    existingLink: true
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "File or folder does not exist at specified path",
                input: {
                    path: "/Documents/nonexistent-file.pdf"
                },
                expectedError: {
                    type: "not_found",
                    message: "File or folder not found at path /Documents/nonexistent-file.pdf",
                    retryable: false
                }
            },
            {
                name: "sharing_disabled",
                description: "Sharing is disabled by admin policy",
                input: {
                    path: "/Restricted/confidential.pdf"
                },
                expectedError: {
                    type: "permission",
                    message: "Sharing is disabled for this file by administrator policy",
                    retryable: false
                }
            },
            {
                name: "password_required",
                description: "Password is required when visibility is set to password",
                input: {
                    path: "/Documents/secure-file.pdf",
                    visibility: "password"
                },
                expectedError: {
                    type: "validation",
                    message: "Password is required when visibility is set to 'password'",
                    retryable: false
                }
            },
            {
                name: "invalid_expiration",
                description: "Expiration date is in the past",
                input: {
                    path: "/Documents/file.pdf",
                    expires: "2024-01-01T00:00:00Z"
                },
                expectedError: {
                    type: "validation",
                    message: "Expiration date must be in the future",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when creating shared link",
                input: {
                    path: "/Documents/report.pdf"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Retry after 30 seconds.",
                    retryable: true
                }
            },
            {
                name: "team_only_not_available",
                description: "Team-only visibility not available for personal accounts",
                input: {
                    path: "/Documents/file.pdf",
                    visibility: "team_only"
                },
                expectedError: {
                    type: "validation",
                    message: "Team-only visibility is only available for Dropbox Business accounts",
                    retryable: false
                }
            }
        ]
    },

    // ==================== UPLOAD FILE ====================
    {
        operationId: "uploadFile",
        provider: "dropbox",
        validCases: [
            {
                name: "basic_uploadFile",
                description:
                    "Upload a file to Dropbox with base64 encoded content. Returns uploaded file metadata.",
                input: {
                    path: "/Documents/new-report.pdf",
                    content:
                        "JVBERi0xLjQKJeLjz9MKMyAwIG9iago8PC9UeXBlIC9QYWdlCi9QYXJlbnQgMSAwIFI..."
                },
                expectedOutput: {
                    id: "id:Q6QOT_02_EuqAAAAAAAA3m",
                    name: "new-report.pdf",
                    path: "/Documents/new-report.pdf",
                    size: 1048576,
                    modifiedAt: "2025-01-20T12:00:00Z",
                    contentHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                    isDownloadable: true
                }
            },
            {
                name: "uploadFile_overwrite",
                description: "Upload and overwrite an existing file",
                input: {
                    path: "/Documents/existing-file.txt",
                    content: "VXBkYXRlZCBmaWxlIGNvbnRlbnQgZ29lcyBoZXJlLi4u",
                    mode: "overwrite"
                },
                expectedOutput: {
                    id: "id:R7RPU_13_FvrAAAAAAAA4n",
                    name: "existing-file.txt",
                    path: "/Documents/existing-file.txt",
                    size: 2048,
                    modifiedAt: "2025-01-20T12:05:00Z",
                    contentHash: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
                    isDownloadable: true
                }
            },
            {
                name: "uploadFile_autorename",
                description: "Upload with autorename to handle conflicts",
                input: {
                    path: "/Documents/report.pdf",
                    content:
                        "JVBERi0xLjQKJeLjz9MKNCAwIG9iago8PC9UeXBlIC9QYWdlCi9QYXJlbnQgMiAwIFI...",
                    mode: "add",
                    autorename: true
                },
                expectedOutput: {
                    id: "id:S8SQV_24_GwsAAAAAAAA5o",
                    name: "report (1).pdf",
                    path: "/Documents/report (1).pdf",
                    size: 524288,
                    modifiedAt: "2025-01-20T12:10:00Z",
                    contentHash: "d7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592",
                    isDownloadable: true
                }
            },
            {
                name: "uploadFile_image",
                description: "Upload a JPEG image file",
                input: {
                    path: "/Photos/2025/new-photo.jpg",
                    content: "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEB..."
                },
                expectedOutput: {
                    id: "id:T9TRW_35_HxtAAAAAAAA6p",
                    name: "new-photo.jpg",
                    path: "/Photos/2025/new-photo.jpg",
                    size: 2097152,
                    modifiedAt: "2025-01-20T12:15:00Z",
                    contentHash: "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
                    isDownloadable: true
                }
            },
            {
                name: "uploadFile_json",
                description: "Upload a JSON configuration file",
                input: {
                    path: "/Projects/config.json",
                    content:
                        "ewogICJuYW1lIjogIm15LXByb2plY3QiLAogICJ2ZXJzaW9uIjogIjEuMC4wIiwKICAiZGVzY3JpcHRpb24iOiAiQSBzYW1wbGUgcHJvamVjdCIKfQ=="
                },
                expectedOutput: {
                    id: "id:U0USX_46_IyuAAAAAAAA7q",
                    name: "config.json",
                    path: "/Projects/config.json",
                    size: 128,
                    modifiedAt: "2025-01-20T12:20:00Z",
                    contentHash: "a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b55b046bbb7db3d86",
                    isDownloadable: true
                }
            },
            {
                name: "uploadFile_to_nested_path",
                description: "Upload to a deeply nested folder path",
                input: {
                    path: "/Work/Clients/Acme Corp/Projects/2025/deliverable.zip",
                    content: "UEsDBBQAAAAIANVBJkMAAAAAAAAAAAAAAAAYAAAA..."
                },
                expectedOutput: {
                    id: "id:V1VTY_57_JzvAAAAAAAA8r",
                    name: "deliverable.zip",
                    path: "/Work/Clients/Acme Corp/Projects/2025/deliverable.zip",
                    size: 10485760,
                    modifiedAt: "2025-01-20T12:25:00Z",
                    contentHash: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
                    isDownloadable: true
                }
            }
        ],
        errorCases: [
            {
                name: "file_exists",
                description: "File already exists and mode is 'add' without autorename",
                input: {
                    path: "/Documents/existing-file.pdf",
                    content: "JVBERi0xLjQK...",
                    mode: "add",
                    autorename: false
                },
                expectedError: {
                    type: "validation",
                    message: "File already exists at /Documents/existing-file.pdf",
                    retryable: false
                }
            },
            {
                name: "invalid_content",
                description: "Content is not valid base64 encoded data",
                input: {
                    path: "/Documents/file.txt",
                    content: "not-valid-base64!!!"
                },
                expectedError: {
                    type: "validation",
                    message: "Content is not valid base64 encoded data",
                    retryable: false
                }
            },
            {
                name: "rate_limit",
                description: "User storage quota exceeded",
                input: {
                    path: "/Documents/large-file.zip",
                    content: "UEsDBBQAAAAI..."
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Storage quota exceeded. Available space: 0 bytes",
                    retryable: true
                }
            },
            {
                name: "file_too_large",
                description: "File exceeds maximum upload size",
                input: {
                    path: "/Videos/huge-video.mp4",
                    content: "AAAAIGZ0eXBpc29t..."
                },
                expectedError: {
                    type: "validation",
                    message: "File size exceeds maximum upload limit of 150MB for this endpoint",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when uploading",
                input: {
                    path: "/Documents/file.pdf",
                    content: "JVBERi0xLjQK..."
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Retry after 60 seconds.",
                    retryable: true
                }
            },
            {
                name: "invalid_path",
                description: "Upload path contains invalid characters",
                input: {
                    path: "/Documents/file<name>.txt",
                    content: "SGVsbG8gV29ybGQ="
                },
                expectedError: {
                    type: "validation",
                    message: 'Path contains invalid characters: < > : " | ? *',
                    retryable: false
                }
            },
            {
                name: "restricted_extension",
                description: "File extension is blocked by policy",
                input: {
                    path: "/Documents/script.exe",
                    content: "TVqQAAMAAAAEAAAA..."
                },
                expectedError: {
                    type: "permission",
                    message: "File type .exe is blocked by administrator policy",
                    retryable: false
                }
            }
        ]
    }
];
