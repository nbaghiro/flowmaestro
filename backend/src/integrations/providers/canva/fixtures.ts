/**
 * Canva Provider Test Fixtures
 *
 * Realistic test data for Canva design platform operations including
 * designs, folders, assets, and exports.
 */

import type { TestFixture } from "../../sandbox";

export const canvaFixtures: TestFixture[] = [
    {
        operationId: "listDesigns",
        provider: "canva",
        validCases: [
            {
                name: "list_all_designs",
                description: "List all designs in the user's account",
                input: {},
                expectedOutput: {
                    items: [
                        {
                            id: "DAF_abc123def",
                            title: "Q4 Marketing Campaign",
                            owner: {
                                user_id: "UAF_user001",
                                team_id: "TAF_team001"
                            },
                            thumbnail: {
                                url: "https://document-export.canva.com/thumbnails/abc123.png",
                                width: 400,
                                height: 300
                            },
                            urls: {
                                edit_url: "https://www.canva.com/design/DAF_abc123def/edit",
                                view_url: "https://www.canva.com/design/DAF_abc123def/view"
                            },
                            created_at: "2024-03-10T08:00:00Z",
                            updated_at: "2024-03-15T14:30:00Z"
                        },
                        {
                            id: "DAF_ghi456jkl",
                            title: "Product Launch Presentation",
                            owner: {
                                user_id: "UAF_user001",
                                team_id: "TAF_team001"
                            },
                            thumbnail: {
                                url: "https://document-export.canva.com/thumbnails/ghi456.png",
                                width: 400,
                                height: 225
                            },
                            urls: {
                                edit_url: "https://www.canva.com/design/DAF_ghi456jkl/edit",
                                view_url: "https://www.canva.com/design/DAF_ghi456jkl/view"
                            },
                            created_at: "2024-03-05T12:00:00Z",
                            updated_at: "2024-03-14T09:45:00Z"
                        }
                    ],
                    continuation: "cont_token_abc123"
                }
            },
            {
                name: "search_designs",
                description: "Search designs by query string",
                input: {
                    query: "marketing"
                },
                expectedOutput: {
                    items: [
                        {
                            id: "DAF_abc123def",
                            title: "Q4 Marketing Campaign",
                            owner: {
                                user_id: "UAF_user001",
                                team_id: "TAF_team001"
                            },
                            thumbnail: {
                                url: "https://document-export.canva.com/thumbnails/abc123.png",
                                width: 400,
                                height: 300
                            },
                            urls: {
                                edit_url: "https://www.canva.com/design/DAF_abc123def/edit",
                                view_url: "https://www.canva.com/design/DAF_abc123def/view"
                            },
                            created_at: "2024-03-10T08:00:00Z",
                            updated_at: "2024-03-15T14:30:00Z"
                        }
                    ]
                }
            },
            {
                name: "list_owned_designs",
                description: "List only designs owned by the user",
                input: {
                    ownership: "owned"
                },
                expectedOutput: {
                    items: [
                        {
                            id: "DAF_mno789pqr",
                            title: "Social Media Templates",
                            owner: {
                                user_id: "UAF_user001"
                            },
                            thumbnail: {
                                url: "https://document-export.canva.com/thumbnails/mno789.png",
                                width: 400,
                                height: 400
                            },
                            urls: {
                                edit_url: "https://www.canva.com/design/DAF_mno789pqr/edit",
                                view_url: "https://www.canva.com/design/DAF_mno789pqr/view"
                            },
                            created_at: "2024-02-20T10:00:00Z",
                            updated_at: "2024-03-12T16:20:00Z"
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "rate_limited",
                description: "Rate limit exceeded when listing designs",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Canva rate limit exceeded. Retry after 60 seconds.",
                    retryable: true
                }
            },
            {
                name: "unauthorized",
                description: "Authentication token expired",
                input: {},
                expectedError: {
                    type: "server_error",
                    message: "Canva authentication failed. Please reconnect.",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getDesign",
        provider: "canva",
        validCases: [
            {
                name: "get_design_details",
                description: "Retrieve detailed information about a specific design",
                input: {
                    designId: "DAF_abc123def"
                },
                expectedOutput: {
                    design: {
                        id: "DAF_abc123def",
                        title: "Q4 Marketing Campaign",
                        owner: {
                            user_id: "UAF_user001",
                            team_id: "TAF_team001"
                        },
                        thumbnail: {
                            url: "https://document-export.canva.com/thumbnails/abc123.png",
                            width: 400,
                            height: 300
                        },
                        urls: {
                            edit_url: "https://www.canva.com/design/DAF_abc123def/edit",
                            view_url: "https://www.canva.com/design/DAF_abc123def/view"
                        },
                        page_count: 5,
                        created_at: "2024-03-10T08:00:00Z",
                        updated_at: "2024-03-15T14:30:00Z"
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "design_not_found",
                description: "Get a non-existent design",
                input: {
                    designId: "DAF_nonexistent123"
                },
                expectedError: {
                    type: "not_found",
                    message: "Canva resource not found.",
                    retryable: false
                }
            },
            {
                name: "access_denied",
                description: "User lacks permission to view design",
                input: {
                    designId: "DAF_private999"
                },
                expectedError: {
                    type: "permission",
                    message: "You don't have permission to access this Canva resource.",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "createDesign",
        provider: "canva",
        validCases: [
            {
                name: "create_basic_design",
                description: "Create a new design with just a title",
                input: {
                    title: "New Brand Guidelines"
                },
                expectedOutput: {
                    design: {
                        id: "DAF_new123abc",
                        title: "New Brand Guidelines",
                        owner: {
                            user_id: "UAF_user001"
                        },
                        urls: {
                            edit_url: "https://www.canva.com/design/DAF_new123abc/edit",
                            view_url: "https://www.canva.com/design/DAF_new123abc/view"
                        },
                        created_at: "2024-03-16T10:00:00Z",
                        updated_at: "2024-03-16T10:00:00Z"
                    }
                }
            },
            {
                name: "create_presentation",
                description: "Create a new presentation design",
                input: {
                    title: "Quarterly Business Review",
                    designType: "Presentation"
                },
                expectedOutput: {
                    design: {
                        id: "DAF_pres456def",
                        title: "Quarterly Business Review",
                        owner: {
                            user_id: "UAF_user001"
                        },
                        urls: {
                            edit_url: "https://www.canva.com/design/DAF_pres456def/edit",
                            view_url: "https://www.canva.com/design/DAF_pres456def/view"
                        },
                        created_at: "2024-03-16T10:15:00Z",
                        updated_at: "2024-03-16T10:15:00Z"
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "rate_limited",
                description: "Rate limit exceeded when creating design",
                input: {
                    title: "Rate Limited Design"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Canva rate limit exceeded. Retry after 30 seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listFolders",
        provider: "canva",
        validCases: [
            {
                name: "list_all_folders",
                description: "List all folders in the user's account",
                input: {},
                expectedOutput: {
                    items: [
                        {
                            id: "FAF_folder001",
                            name: "Marketing Assets",
                            created_at: "2024-01-15T09:00:00Z",
                            updated_at: "2024-03-14T11:30:00Z"
                        },
                        {
                            id: "FAF_folder002",
                            name: "Brand Guidelines",
                            created_at: "2024-02-01T14:00:00Z",
                            updated_at: "2024-03-10T16:45:00Z"
                        },
                        {
                            id: "FAF_folder003",
                            name: "Social Media",
                            created_at: "2024-02-15T10:30:00Z",
                            updated_at: "2024-03-15T08:20:00Z"
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "unauthorized",
                description: "Authentication token expired",
                input: {},
                expectedError: {
                    type: "server_error",
                    message: "Canva authentication failed. Please reconnect.",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "createFolder",
        provider: "canva",
        validCases: [
            {
                name: "create_root_folder",
                description: "Create a new folder at the root level",
                input: {
                    name: "Q2 Campaign Assets"
                },
                expectedOutput: {
                    folder: {
                        id: "FAF_newfolder001",
                        name: "Q2 Campaign Assets",
                        created_at: "2024-03-16T10:00:00Z",
                        updated_at: "2024-03-16T10:00:00Z"
                    }
                }
            },
            {
                name: "create_subfolder",
                description: "Create a folder inside an existing folder",
                input: {
                    name: "Instagram Posts",
                    parentFolderId: "FAF_folder003"
                },
                expectedOutput: {
                    folder: {
                        id: "FAF_subfolder001",
                        name: "Instagram Posts",
                        created_at: "2024-03-16T10:05:00Z",
                        updated_at: "2024-03-16T10:05:00Z"
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "parent_not_found",
                description: "Create folder with non-existent parent",
                input: {
                    name: "Orphan Folder",
                    parentFolderId: "FAF_nonexistent"
                },
                expectedError: {
                    type: "not_found",
                    message: "Canva resource not found.",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "listAssets",
        provider: "canva",
        validCases: [
            {
                name: "list_all_assets",
                description: "List all uploaded assets",
                input: {},
                expectedOutput: {
                    items: [
                        {
                            id: "AAF_asset001",
                            name: "company-logo.png",
                            tags: ["logo", "brand"],
                            created_at: "2024-01-10T08:00:00Z",
                            updated_at: "2024-01-10T08:00:00Z",
                            thumbnail: {
                                url: "https://document-export.canva.com/assets/thumb_001.png",
                                width: 200,
                                height: 200
                            }
                        },
                        {
                            id: "AAF_asset002",
                            name: "hero-banner.jpg",
                            tags: ["banner", "marketing"],
                            created_at: "2024-02-20T15:30:00Z",
                            updated_at: "2024-02-20T15:30:00Z",
                            thumbnail: {
                                url: "https://document-export.canva.com/assets/thumb_002.jpg",
                                width: 400,
                                height: 200
                            }
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "rate_limited",
                description: "Rate limit exceeded when listing assets",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Canva rate limit exceeded. Retry after 60 seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "uploadAsset",
        provider: "canva",
        validCases: [
            {
                name: "upload_image_asset",
                description: "Upload an image asset to Canva",
                input: {
                    name: "team-photo.jpg",
                    dataUrl: "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
                },
                expectedOutput: {
                    asset: {
                        id: "AAF_uploaded001",
                        name: "team-photo.jpg",
                        tags: [],
                        created_at: "2024-03-16T10:30:00Z",
                        updated_at: "2024-03-16T10:30:00Z"
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_data_url",
                description: "Upload with invalid data URL",
                input: {
                    name: "bad-file.jpg",
                    dataUrl: "not-a-valid-data-url"
                },
                expectedError: {
                    type: "validation",
                    message: "Canva API error: Invalid asset data",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "exportDesign",
        provider: "canva",
        validCases: [
            {
                name: "export_as_pdf",
                description: "Export a design as PDF",
                input: {
                    designId: "DAF_abc123def",
                    format: "pdf"
                },
                expectedOutput: {
                    job: {
                        id: "EXP_job001",
                        status: "success",
                        urls: ["https://export.canva.com/downloads/abc123/design.pdf"]
                    }
                }
            },
            {
                name: "export_as_png",
                description: "Export a design as PNG image",
                input: {
                    designId: "DAF_ghi456jkl",
                    format: "png"
                },
                expectedOutput: {
                    job: {
                        id: "EXP_job002",
                        status: "success",
                        urls: [
                            "https://export.canva.com/downloads/ghi456/page_1.png",
                            "https://export.canva.com/downloads/ghi456/page_2.png"
                        ]
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "design_not_found",
                description: "Export a non-existent design",
                input: {
                    designId: "DAF_nonexistent123",
                    format: "pdf"
                },
                expectedError: {
                    type: "not_found",
                    message: "Canva resource not found.",
                    retryable: false
                }
            }
        ]
    }
];
