/**
 * Confluence Provider Test Fixtures
 */

import type { TestFixture } from "../../../sandbox";

export const confluenceFixtures: TestFixture[] = [
    {
        operationId: "listSpaces",
        provider: "confluence",
        validCases: [
            {
                name: "list_all_spaces",
                description: "List all accessible spaces",
                input: {},
                expectedOutput: {
                    spaces: [
                        {
                            id: "65536",
                            key: "ENG",
                            name: "Engineering",
                            type: "global",
                            status: "current"
                        },
                        {
                            id: "65537",
                            key: "DOCS",
                            name: "Documentation",
                            type: "global",
                            status: "current"
                        }
                    ],
                    hasMore: false
                }
            }
        ],
        errorCases: [
            {
                name: "permission_denied",
                description: "No permission to list spaces",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "Insufficient permissions for this Confluence operation",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getSpace",
        provider: "confluence",
        validCases: [
            {
                name: "get_space_details",
                description: "Get details of a specific space",
                input: {
                    spaceId: "65536"
                },
                expectedOutput: {
                    id: "65536",
                    key: "ENG",
                    name: "Engineering",
                    type: "global",
                    status: "current",
                    homepageId: "131072"
                }
            }
        ],
        errorCases: [
            {
                name: "space_not_found",
                description: "Space does not exist",
                input: {
                    spaceId: "99999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in Confluence",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "listPages",
        provider: "confluence",
        validCases: [
            {
                name: "list_pages_in_space",
                description: "List pages filtered by space",
                input: {
                    spaceId: "65536"
                },
                expectedOutput: {
                    pages: [
                        {
                            id: "131072",
                            title: "Getting Started",
                            status: "current",
                            spaceId: "65536"
                        },
                        {
                            id: "131073",
                            title: "Architecture Overview",
                            status: "current",
                            spaceId: "65536"
                        }
                    ],
                    hasMore: false
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_space",
                description: "Space ID does not exist",
                input: {
                    spaceId: "invalid"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in Confluence",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getPage",
        provider: "confluence",
        validCases: [
            {
                name: "get_page_with_body",
                description: "Get page details with storage body",
                input: {
                    pageId: "131072",
                    bodyFormat: "storage"
                },
                expectedOutput: {
                    id: "131072",
                    title: "Getting Started",
                    status: "current",
                    spaceId: "65536",
                    body: {
                        storage: {
                            value: "<p>Welcome to the Getting Started guide.</p>",
                            representation: "storage"
                        }
                    },
                    version: { number: 3 }
                }
            }
        ],
        errorCases: [
            {
                name: "page_not_found",
                description: "Page does not exist",
                input: {
                    pageId: "999999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in Confluence",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "createPage",
        provider: "confluence",
        validCases: [
            {
                name: "create_page",
                description: "Create a new page in a space",
                input: {
                    spaceId: "65536",
                    title: "New Feature Spec",
                    body: "<p>Feature specification content</p>"
                },
                expectedOutput: {
                    id: "{{uuid}}",
                    title: "New Feature Spec",
                    status: "current",
                    spaceId: "65536",
                    version: { number: 1 }
                }
            }
        ],
        errorCases: [
            {
                name: "duplicate_title",
                description: "Page with same title exists in space",
                input: {
                    spaceId: "65536",
                    title: "Getting Started",
                    body: "<p>Duplicate</p>"
                },
                expectedError: {
                    type: "validation",
                    message: "A page with this title already exists in the space",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "updatePage",
        provider: "confluence",
        validCases: [
            {
                name: "update_page",
                description: "Update an existing page",
                input: {
                    pageId: "131072",
                    title: "Getting Started (Updated)",
                    body: "<p>Updated content</p>",
                    version: 3
                },
                expectedOutput: {
                    id: "131072",
                    title: "Getting Started (Updated)",
                    status: "current",
                    spaceId: "65536",
                    version: { number: 4 }
                }
            }
        ],
        errorCases: [
            {
                name: "version_conflict",
                description: "Page was modified since last read",
                input: {
                    pageId: "131072",
                    title: "Getting Started",
                    body: "<p>Stale update</p>",
                    version: 1
                },
                expectedError: {
                    type: "validation",
                    message: "Version conflict - page has been modified",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "searchContent",
        provider: "confluence",
        validCases: [
            {
                name: "search_by_text",
                description: "Search content by text query",
                input: {
                    query: "architecture"
                },
                expectedOutput: {
                    results: [
                        {
                            content: {
                                id: "131073",
                                title: "Architecture Overview",
                                type: "page",
                                status: "current"
                            },
                            excerpt: "This document describes the system architecture..."
                        }
                    ],
                    hasMore: false
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_cql",
                description: "Invalid CQL query syntax",
                input: {
                    query: "type = AND"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid CQL query",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getPageChildren",
        provider: "confluence",
        validCases: [
            {
                name: "get_children",
                description: "Get child pages of a parent page",
                input: {
                    pageId: "131072"
                },
                expectedOutput: {
                    children: [
                        {
                            id: "131074",
                            title: "Installation Guide",
                            status: "current",
                            spaceId: "65536"
                        },
                        {
                            id: "131075",
                            title: "Quick Start",
                            status: "current",
                            spaceId: "65536"
                        }
                    ],
                    hasMore: false
                }
            }
        ],
        errorCases: [
            {
                name: "page_not_found",
                description: "Parent page does not exist",
                input: {
                    pageId: "999999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in Confluence",
                    retryable: false
                }
            }
        ]
    }
];
