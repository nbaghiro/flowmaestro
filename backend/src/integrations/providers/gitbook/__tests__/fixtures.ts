/**
 * GitBook Provider Test Fixtures
 *
 * Based on GitBook API documentation:
 * - API Quickstart: https://gitbook.com/docs/developers/gitbook-api/quickstart
 * - OpenAPI Spec: https://api.gitbook.com/openapi.json
 */

import type { TestFixture } from "../../../sandbox";

export const gitbookFixtures: TestFixture[] = [
    // ============================================
    // Organization Operations
    // ============================================
    {
        operationId: "listOrganizations",
        provider: "gitbook",
        filterableData: {
            recordsField: "organizations",
            offsetField: "next",
            defaultPageSize: 100,
            maxPageSize: 100,
            pageSizeParam: "limit",
            offsetParam: "page",
            filterConfig: {
                type: "generic"
            },
            records: [
                {
                    id: "org-abc123def456",
                    title: "Acme Corp Documentation",
                    type: "organization",
                    createdAt: "2023-06-15T10:30:00.000Z",
                    updatedAt: "2024-01-28T14:22:15.000Z"
                },
                {
                    id: "org-ghi789jkl012",
                    title: "TechStart Knowledge Base",
                    type: "organization",
                    createdAt: "2023-09-01T08:00:00.000Z",
                    updatedAt: "2024-01-27T16:45:00.000Z"
                },
                {
                    id: "user-mno345pqr678",
                    title: "Personal Docs",
                    type: "user",
                    createdAt: "2022-01-10T12:00:00.000Z",
                    updatedAt: "2024-01-25T09:30:00.000Z"
                }
            ]
        },
        validCases: [
            {
                name: "list_all_orgs",
                description: "List all organizations the user has access to",
                input: {},
                expectedOutput: {
                    organizations: [
                        {
                            id: "org-abc123def456",
                            title: "Acme Corp Documentation",
                            type: "organization",
                            createdAt: "2023-06-15T10:30:00.000Z",
                            updatedAt: "2024-01-28T14:22:15.000Z"
                        },
                        {
                            id: "org-ghi789jkl012",
                            title: "TechStart Knowledge Base",
                            type: "organization",
                            createdAt: "2023-09-01T08:00:00.000Z",
                            updatedAt: "2024-01-27T16:45:00.000Z"
                        },
                        {
                            id: "user-mno345pqr678",
                            title: "Personal Docs",
                            type: "user",
                            createdAt: "2022-01-10T12:00:00.000Z",
                            updatedAt: "2024-01-25T09:30:00.000Z"
                        }
                    ],
                    pagination: null
                }
            },
            {
                name: "list_orgs_empty",
                description: "User has no organizations",
                input: {},
                expectedOutput: {
                    organizations: [],
                    pagination: null
                }
            }
        ],
        errorCases: [
            {
                name: "permission",
                description: "Invalid or expired Personal Access Token",
                input: {},
                expectedError: {
                    type: "permission",
                    message:
                        "GitBook authentication failed. Please check your Personal Access Token.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {},
                expectedError: {
                    type: "server_error",
                    message: "GitBook rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getOrganization",
        provider: "gitbook",
        validCases: [
            {
                name: "get_organization_success",
                description: "Get organization details by ID",
                input: {
                    organizationId: "org-abc123def456"
                },
                expectedOutput: {
                    id: "org-abc123def456",
                    title: "Acme Corp Documentation",
                    type: "organization",
                    createdAt: "2023-06-15T10:30:00.000Z",
                    updatedAt: "2024-01-28T14:22:15.000Z",
                    urls: {
                        app: "https://app.gitbook.com/o/org-abc123def456",
                        published: "https://docs.acme.com"
                    }
                }
            },
            {
                name: "get_user_organization",
                description: "Get user (personal) organization details",
                input: {
                    organizationId: "user-mno345pqr678"
                },
                expectedOutput: {
                    id: "user-mno345pqr678",
                    title: "Personal Docs",
                    type: "user",
                    createdAt: "2022-01-10T12:00:00.000Z",
                    updatedAt: "2024-01-25T09:30:00.000Z"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Organization does not exist",
                input: {
                    organizationId: "org-nonexistent"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in GitBook.",
                    retryable: false
                }
            },
            {
                name: "permission",
                description: "No access to organization",
                input: {
                    organizationId: "org-private123"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in GitBook.",
                    retryable: false
                }
            }
        ]
    },

    // ============================================
    // Space Operations
    // ============================================
    {
        operationId: "listSpaces",
        provider: "gitbook",
        filterableData: {
            recordsField: "spaces",
            offsetField: "next",
            defaultPageSize: 100,
            maxPageSize: 100,
            pageSizeParam: "limit",
            offsetParam: "page",
            filterConfig: {
                type: "generic"
            },
            records: [
                {
                    id: "space-api-docs-001",
                    title: "API Documentation",
                    visibility: "public",
                    createdAt: "2023-07-01T09:00:00.000Z",
                    updatedAt: "2024-01-28T11:30:00.000Z"
                },
                {
                    id: "space-internal-wiki-002",
                    title: "Internal Engineering Wiki",
                    visibility: "private",
                    createdAt: "2023-08-15T14:00:00.000Z",
                    updatedAt: "2024-01-27T16:00:00.000Z"
                },
                {
                    id: "space-user-guides-003",
                    title: "User Guides",
                    visibility: "public",
                    createdAt: "2023-09-20T10:30:00.000Z",
                    updatedAt: "2024-01-26T09:15:00.000Z"
                },
                {
                    id: "space-release-notes-004",
                    title: "Release Notes",
                    visibility: "unlisted",
                    createdAt: "2023-10-01T08:00:00.000Z",
                    updatedAt: "2024-01-28T08:00:00.000Z"
                }
            ]
        },
        validCases: [
            {
                name: "list_all_spaces",
                description: "List all spaces in an organization",
                input: {
                    organizationId: "org-abc123def456"
                },
                expectedOutput: {
                    spaces: [
                        {
                            id: "space-api-docs-001",
                            title: "API Documentation",
                            visibility: "public",
                            createdAt: "2023-07-01T09:00:00.000Z",
                            updatedAt: "2024-01-28T11:30:00.000Z"
                        },
                        {
                            id: "space-internal-wiki-002",
                            title: "Internal Engineering Wiki",
                            visibility: "private",
                            createdAt: "2023-08-15T14:00:00.000Z",
                            updatedAt: "2024-01-27T16:00:00.000Z"
                        },
                        {
                            id: "space-user-guides-003",
                            title: "User Guides",
                            visibility: "public",
                            createdAt: "2023-09-20T10:30:00.000Z",
                            updatedAt: "2024-01-26T09:15:00.000Z"
                        }
                    ],
                    pagination: null
                }
            },
            {
                name: "list_spaces_empty",
                description: "Organization has no spaces",
                input: {
                    organizationId: "org-empty123"
                },
                expectedOutput: {
                    spaces: [],
                    pagination: null
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Organization not found",
                input: {
                    organizationId: "org-nonexistent"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in GitBook.",
                    retryable: false
                }
            },
            {
                name: "permission",
                description: "No access to organization",
                input: {
                    organizationId: "org-private123"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in GitBook.",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getSpace",
        provider: "gitbook",
        validCases: [
            {
                name: "get_public_space",
                description: "Get a public space by ID",
                input: {
                    spaceId: "space-api-docs-001"
                },
                expectedOutput: {
                    id: "space-api-docs-001",
                    title: "API Documentation",
                    visibility: "public",
                    createdAt: "2023-07-01T09:00:00.000Z",
                    updatedAt: "2024-01-28T11:30:00.000Z",
                    urls: {
                        app: "https://app.gitbook.com/s/space-api-docs-001",
                        published: "https://docs.acme.com/api"
                    },
                    organization: {
                        id: "org-abc123def456"
                    }
                }
            },
            {
                name: "get_private_space",
                description: "Get a private space by ID",
                input: {
                    spaceId: "space-internal-wiki-002"
                },
                expectedOutput: {
                    id: "space-internal-wiki-002",
                    title: "Internal Engineering Wiki",
                    visibility: "private",
                    createdAt: "2023-08-15T14:00:00.000Z",
                    updatedAt: "2024-01-27T16:00:00.000Z",
                    organization: {
                        id: "org-abc123def456"
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Space does not exist",
                input: {
                    spaceId: "space-nonexistent"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in GitBook.",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "searchSpaceContent",
        provider: "gitbook",
        filterableData: {
            recordsField: "results",
            offsetField: "next",
            defaultPageSize: 20,
            maxPageSize: 100,
            pageSizeParam: "limit",
            offsetParam: "page",
            filterConfig: {
                type: "generic"
            },
            records: [
                {
                    id: "result-001",
                    title: "Authentication",
                    path: "getting-started/authentication",
                    body: "This guide covers how to authenticate with the API using OAuth2 or API keys..."
                },
                {
                    id: "result-002",
                    title: "API Rate Limits",
                    path: "reference/rate-limits",
                    body: "All API endpoints are subject to rate limiting to ensure fair usage..."
                },
                {
                    id: "result-003",
                    title: "Error Handling",
                    path: "reference/errors",
                    body: "Learn how to handle API errors and common error codes..."
                }
            ]
        },
        validCases: [
            {
                name: "search_api_content",
                description: "Search for content about authentication",
                input: {
                    spaceId: "space-api-docs-001",
                    query: "authentication"
                },
                expectedOutput: {
                    results: [
                        {
                            id: "result-001",
                            title: "Authentication",
                            path: "getting-started/authentication",
                            body: "This guide covers how to authenticate with the API using OAuth2 or API keys...",
                            page: {
                                id: "page-auth-001",
                                title: "Authentication",
                                path: "getting-started/authentication"
                            },
                            urls: {
                                app: "https://app.gitbook.com/s/space-api-docs-001/getting-started/authentication",
                                published:
                                    "https://docs.acme.com/api/getting-started/authentication"
                            }
                        }
                    ],
                    pagination: null
                }
            },
            {
                name: "search_multiple_results",
                description: "Search returning multiple results",
                input: {
                    spaceId: "space-api-docs-001",
                    query: "API"
                },
                expectedOutput: {
                    results: [
                        {
                            id: "result-001",
                            title: "Authentication",
                            path: "getting-started/authentication",
                            body: "This guide covers how to authenticate with the API..."
                        },
                        {
                            id: "result-002",
                            title: "API Rate Limits",
                            path: "reference/rate-limits",
                            body: "All API endpoints are subject to rate limiting..."
                        },
                        {
                            id: "result-003",
                            title: "Error Handling",
                            path: "reference/errors",
                            body: "Learn how to handle API errors..."
                        }
                    ],
                    pagination: null
                }
            },
            {
                name: "search_no_results",
                description: "Search with no matching results",
                input: {
                    spaceId: "space-api-docs-001",
                    query: "xyznonexistentterm123"
                },
                expectedOutput: {
                    results: [],
                    pagination: null
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Space not found",
                input: {
                    spaceId: "space-nonexistent",
                    query: "test"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in GitBook.",
                    retryable: false
                }
            },
            {
                name: "validation",
                description: "Empty search query",
                input: {
                    spaceId: "space-api-docs-001",
                    query: ""
                },
                expectedError: {
                    type: "validation",
                    message: "Search query cannot be empty",
                    retryable: false
                }
            }
        ]
    },

    // ============================================
    // Page Operations
    // ============================================
    {
        operationId: "listPages",
        provider: "gitbook",
        filterableData: {
            recordsField: "pages",
            offsetField: undefined,
            defaultPageSize: 100,
            maxPageSize: 500,
            pageSizeParam: "limit",
            offsetParam: undefined,
            filterConfig: {
                type: "generic"
            },
            records: [
                {
                    id: "page-intro-001",
                    title: "Introduction",
                    kind: "document",
                    type: "document",
                    path: "introduction"
                },
                {
                    id: "page-getting-started-group",
                    title: "Getting Started",
                    kind: "group",
                    type: "document",
                    path: "getting-started"
                },
                {
                    id: "page-auth-001",
                    title: "Authentication",
                    kind: "document",
                    type: "document",
                    path: "getting-started/authentication"
                },
                {
                    id: "page-quickstart-001",
                    title: "Quick Start",
                    kind: "document",
                    type: "document",
                    path: "getting-started/quickstart"
                },
                {
                    id: "page-reference-group",
                    title: "API Reference",
                    kind: "group",
                    type: "document",
                    path: "reference"
                },
                {
                    id: "page-endpoints-001",
                    title: "Endpoints",
                    kind: "document",
                    type: "document",
                    path: "reference/endpoints"
                }
            ]
        },
        validCases: [
            {
                name: "list_all_pages",
                description: "List all pages in a space",
                input: {
                    spaceId: "space-api-docs-001"
                },
                expectedOutput: {
                    pages: [
                        {
                            id: "page-intro-001",
                            title: "Introduction",
                            kind: "document",
                            type: "document",
                            path: "introduction"
                        },
                        {
                            id: "page-getting-started-group",
                            title: "Getting Started",
                            kind: "group",
                            type: "document",
                            path: "getting-started",
                            pages: [
                                {
                                    id: "page-auth-001",
                                    title: "Authentication",
                                    kind: "document",
                                    type: "document",
                                    path: "getting-started/authentication"
                                },
                                {
                                    id: "page-quickstart-001",
                                    title: "Quick Start",
                                    kind: "document",
                                    type: "document",
                                    path: "getting-started/quickstart"
                                }
                            ]
                        },
                        {
                            id: "page-reference-group",
                            title: "API Reference",
                            kind: "group",
                            type: "document",
                            path: "reference",
                            pages: [
                                {
                                    id: "page-endpoints-001",
                                    title: "Endpoints",
                                    kind: "document",
                                    type: "document",
                                    path: "reference/endpoints"
                                }
                            ]
                        }
                    ],
                    files: []
                }
            },
            {
                name: "list_pages_empty_space",
                description: "List pages in an empty space",
                input: {
                    spaceId: "space-empty-001"
                },
                expectedOutput: {
                    pages: [],
                    files: []
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Space does not exist",
                input: {
                    spaceId: "space-nonexistent"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in GitBook.",
                    retryable: false
                }
            },
            {
                name: "permission",
                description: "No access to space",
                input: {
                    spaceId: "space-private-no-access"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in GitBook.",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getPage",
        provider: "gitbook",
        validCases: [
            {
                name: "get_page_by_id",
                description: "Get a page by its ID",
                input: {
                    spaceId: "space-api-docs-001",
                    pageId: "page-auth-001"
                },
                expectedOutput: {
                    id: "page-auth-001",
                    title: "Authentication",
                    kind: "document",
                    type: "document",
                    path: "getting-started/authentication",
                    description: "Learn how to authenticate with the API",
                    createdAt: "2023-07-15T10:00:00.000Z",
                    updatedAt: "2024-01-28T14:00:00.000Z",
                    document: {
                        nodes: [
                            {
                                type: "heading-1",
                                object: "block",
                                leaves: [{ text: "Authentication" }]
                            },
                            {
                                type: "paragraph",
                                object: "block",
                                leaves: [
                                    {
                                        text: "This guide covers how to authenticate with the API using OAuth2 or API keys."
                                    }
                                ]
                            }
                        ]
                    },
                    urls: {
                        app: "https://app.gitbook.com/s/space-api-docs-001/getting-started/authentication",
                        published: "https://docs.acme.com/api/getting-started/authentication"
                    }
                }
            },
            {
                name: "get_page_by_path",
                description: "Get a page by its path",
                input: {
                    spaceId: "space-api-docs-001",
                    pagePath: "getting-started/quickstart"
                },
                expectedOutput: {
                    id: "page-quickstart-001",
                    title: "Quick Start",
                    kind: "document",
                    type: "document",
                    path: "getting-started/quickstart",
                    description: "Get up and running in 5 minutes",
                    createdAt: "2023-07-16T11:00:00.000Z",
                    updatedAt: "2024-01-27T09:30:00.000Z",
                    document: {
                        nodes: [
                            {
                                type: "heading-1",
                                object: "block",
                                leaves: [{ text: "Quick Start Guide" }]
                            },
                            {
                                type: "paragraph",
                                object: "block",
                                leaves: [
                                    {
                                        text: "Follow these steps to get started with our API."
                                    }
                                ]
                            },
                            {
                                type: "code-block",
                                object: "block",
                                data: { language: "bash" },
                                leaves: [{ text: "curl https://api.example.com/v1/status" }]
                            }
                        ]
                    }
                }
            },
            {
                name: "get_page_introduction",
                description: "Get the introduction page",
                input: {
                    spaceId: "space-api-docs-001",
                    pageId: "page-intro-001"
                },
                expectedOutput: {
                    id: "page-intro-001",
                    title: "Introduction",
                    kind: "document",
                    type: "document",
                    path: "introduction",
                    description: "Welcome to the API documentation",
                    createdAt: "2023-07-01T09:00:00.000Z",
                    updatedAt: "2024-01-28T10:00:00.000Z"
                }
            }
        ],
        errorCases: [
            {
                name: "page_not_found",
                description: "Page does not exist in the space",
                input: {
                    spaceId: "space-api-docs-001",
                    pageId: "page-nonexistent"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in GitBook.",
                    retryable: false
                }
            },
            {
                name: "path_not_found",
                description: "Page path does not exist",
                input: {
                    spaceId: "space-api-docs-001",
                    pagePath: "nonexistent/path"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in GitBook.",
                    retryable: false
                }
            },
            {
                name: "space_not_found",
                description: "Space does not exist",
                input: {
                    spaceId: "space-nonexistent",
                    pageId: "page-auth-001"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in GitBook.",
                    retryable: false
                }
            },
            {
                name: "validation_no_identifier",
                description: "Neither pageId nor pagePath provided",
                input: {
                    spaceId: "space-api-docs-001"
                },
                expectedError: {
                    type: "validation",
                    message: "Either pageId or pagePath must be provided",
                    retryable: false
                }
            }
        ]
    }
];
