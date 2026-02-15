/**
 * Notion Provider Test Fixtures
 *
 * Based on official Notion API documentation:
 * - Create Page: https://developers.notion.com/reference/post-page
 * - Get Page: https://developers.notion.com/reference/retrieve-a-page
 * - Update Page: https://developers.notion.com/reference/patch-page
 * - Query Database: https://developers.notion.com/reference/post-database-query
 * - Search: https://developers.notion.com/reference/post-search
 */

import type { TestFixture } from "../../sandbox";

/**
 * Sample database pages for filterableData
 * Represents a task tracking database in Notion
 */
const sampleDatabasePages = [
    {
        object: "page",
        id: "page001-1234-1234-1234-123456789abc",
        created_time: "2024-01-10T09:00:00.000Z",
        last_edited_time: "2024-01-18T14:00:00.000Z",
        archived: false,
        in_trash: false,
        url: "https://www.notion.so/Task-1-page001",
        parent: {
            type: "database_id",
            database_id: "db123456-1234-1234-1234-123456789abc"
        },
        properties: {
            Name: {
                id: "title",
                type: "title",
                title: [
                    {
                        type: "text",
                        text: { content: "Implement user authentication" },
                        plain_text: "Implement user authentication"
                    }
                ]
            },
            Status: {
                id: "status",
                type: "select",
                select: { id: "sel-2", name: "In Progress", color: "blue" }
            },
            Priority: {
                id: "priority",
                type: "select",
                select: { id: "pri-1", name: "High", color: "red" }
            },
            Assignee: {
                id: "assignee",
                type: "people",
                people: [{ object: "user", id: "user-123", name: "Alice" }]
            }
        },
        // Internal filter fields
        _status: "In Progress",
        _priority: "High",
        _assignee: "user-123"
    },
    {
        object: "page",
        id: "page002-1234-1234-1234-123456789abc",
        created_time: "2024-01-12T11:00:00.000Z",
        last_edited_time: "2024-01-19T16:00:00.000Z",
        archived: false,
        in_trash: false,
        url: "https://www.notion.so/Task-2-page002",
        parent: {
            type: "database_id",
            database_id: "db123456-1234-1234-1234-123456789abc"
        },
        properties: {
            Name: {
                id: "title",
                type: "title",
                title: [
                    {
                        type: "text",
                        text: { content: "Design database schema" },
                        plain_text: "Design database schema"
                    }
                ]
            },
            Status: {
                id: "status",
                type: "select",
                select: { id: "sel-2", name: "In Progress", color: "blue" }
            },
            Priority: {
                id: "priority",
                type: "select",
                select: { id: "pri-2", name: "Medium", color: "yellow" }
            },
            Assignee: {
                id: "assignee",
                type: "people",
                people: [{ object: "user", id: "user-456", name: "Bob" }]
            }
        },
        _status: "In Progress",
        _priority: "Medium",
        _assignee: "user-456"
    },
    {
        object: "page",
        id: "page003-1234-1234-1234-123456789abc",
        created_time: "2024-01-08T08:00:00.000Z",
        last_edited_time: "2024-01-15T10:00:00.000Z",
        archived: false,
        in_trash: false,
        url: "https://www.notion.so/Task-3-page003",
        parent: {
            type: "database_id",
            database_id: "db123456-1234-1234-1234-123456789abc"
        },
        properties: {
            Name: {
                id: "title",
                type: "title",
                title: [
                    {
                        type: "text",
                        text: { content: "Write API documentation" },
                        plain_text: "Write API documentation"
                    }
                ]
            },
            Status: {
                id: "status",
                type: "select",
                select: { id: "sel-1", name: "To Do", color: "gray" }
            },
            Priority: {
                id: "priority",
                type: "select",
                select: { id: "pri-3", name: "Low", color: "green" }
            },
            Assignee: {
                id: "assignee",
                type: "people",
                people: []
            }
        },
        _status: "To Do",
        _priority: "Low",
        _assignee: null
    },
    {
        object: "page",
        id: "page004-1234-1234-1234-123456789abc",
        created_time: "2024-01-05T14:00:00.000Z",
        last_edited_time: "2024-01-20T09:00:00.000Z",
        archived: false,
        in_trash: false,
        url: "https://www.notion.so/Task-4-page004",
        parent: {
            type: "database_id",
            database_id: "db123456-1234-1234-1234-123456789abc"
        },
        properties: {
            Name: {
                id: "title",
                type: "title",
                title: [
                    {
                        type: "text",
                        text: { content: "Set up CI/CD pipeline" },
                        plain_text: "Set up CI/CD pipeline"
                    }
                ]
            },
            Status: {
                id: "status",
                type: "select",
                select: { id: "sel-3", name: "Done", color: "green" }
            },
            Priority: {
                id: "priority",
                type: "select",
                select: { id: "pri-1", name: "High", color: "red" }
            },
            Assignee: {
                id: "assignee",
                type: "people",
                people: [{ object: "user", id: "user-123", name: "Alice" }]
            }
        },
        _status: "Done",
        _priority: "High",
        _assignee: "user-123"
    },
    {
        object: "page",
        id: "page005-1234-1234-1234-123456789abc",
        created_time: "2024-01-15T10:00:00.000Z",
        last_edited_time: "2024-01-21T11:00:00.000Z",
        archived: false,
        in_trash: false,
        url: "https://www.notion.so/Task-5-page005",
        parent: {
            type: "database_id",
            database_id: "db123456-1234-1234-1234-123456789abc"
        },
        properties: {
            Name: {
                id: "title",
                type: "title",
                title: [
                    {
                        type: "text",
                        text: { content: "Review pull requests" },
                        plain_text: "Review pull requests"
                    }
                ]
            },
            Status: {
                id: "status",
                type: "select",
                select: { id: "sel-2", name: "In Progress", color: "blue" }
            },
            Priority: {
                id: "priority",
                type: "select",
                select: { id: "pri-1", name: "High", color: "red" }
            },
            Assignee: {
                id: "assignee",
                type: "people",
                people: [{ object: "user", id: "user-789", name: "Carol" }]
            }
        },
        _status: "In Progress",
        _priority: "High",
        _assignee: "user-789"
    },
    {
        object: "page",
        id: "page006-1234-1234-1234-123456789abc",
        created_time: "2024-01-18T09:00:00.000Z",
        last_edited_time: "2024-01-22T14:00:00.000Z",
        archived: false,
        in_trash: false,
        url: "https://www.notion.so/Task-6-page006",
        parent: {
            type: "database_id",
            database_id: "db123456-1234-1234-1234-123456789abc"
        },
        properties: {
            Name: {
                id: "title",
                type: "title",
                title: [
                    {
                        type: "text",
                        text: { content: "Fix production bug" },
                        plain_text: "Fix production bug"
                    }
                ]
            },
            Status: {
                id: "status",
                type: "select",
                select: { id: "sel-2", name: "In Progress", color: "blue" }
            },
            Priority: {
                id: "priority",
                type: "select",
                select: { id: "pri-1", name: "High", color: "red" }
            },
            Assignee: {
                id: "assignee",
                type: "people",
                people: [{ object: "user", id: "user-123", name: "Alice" }]
            }
        },
        _status: "In Progress",
        _priority: "High",
        _assignee: "user-123"
    }
];

/**
 * Sample search results (pages and databases)
 */
const sampleSearchResults = [
    {
        object: "page",
        id: "page123-1234-1234-1234-123456789abc",
        created_time: "2024-01-05T08:00:00.000Z",
        last_edited_time: "2024-01-15T12:00:00.000Z",
        archived: false,
        in_trash: false,
        url: "https://www.notion.so/Q1-Meeting-Notes-page123",
        parent: {
            type: "workspace",
            workspace: true
        },
        properties: {
            title: {
                id: "title",
                type: "title",
                title: [
                    {
                        type: "text",
                        text: { content: "Q1 Meeting Notes" },
                        plain_text: "Q1 Meeting Notes"
                    }
                ]
            }
        },
        _object: "page",
        _title: "Q1 Meeting Notes"
    },
    {
        object: "page",
        id: "page124-1234-1234-1234-123456789abc",
        created_time: "2024-02-01T09:00:00.000Z",
        last_edited_time: "2024-02-10T14:00:00.000Z",
        archived: false,
        in_trash: false,
        url: "https://www.notion.so/Q2-Meeting-Notes-page124",
        parent: {
            type: "workspace",
            workspace: true
        },
        properties: {
            title: {
                id: "title",
                type: "title",
                title: [
                    {
                        type: "text",
                        text: { content: "Q2 Meeting Notes" },
                        plain_text: "Q2 Meeting Notes"
                    }
                ]
            }
        },
        _object: "page",
        _title: "Q2 Meeting Notes"
    },
    {
        object: "database",
        id: "db001-1234-1234-1234-123456789abc",
        created_time: "2024-01-01T10:00:00.000Z",
        last_edited_time: "2024-01-20T16:00:00.000Z",
        archived: false,
        in_trash: false,
        url: "https://www.notion.so/Project-Tasks-db001",
        parent: {
            type: "workspace",
            workspace: true
        },
        title: [
            {
                type: "text",
                text: { content: "Project Tasks" },
                plain_text: "Project Tasks"
            }
        ],
        _object: "database",
        _title: "Project Tasks"
    },
    {
        object: "page",
        id: "page125-1234-1234-1234-123456789abc",
        created_time: "2024-01-10T11:00:00.000Z",
        last_edited_time: "2024-01-18T15:00:00.000Z",
        archived: false,
        in_trash: false,
        url: "https://www.notion.so/Engineering-Notes-page125",
        parent: {
            type: "page_id",
            page_id: "parent-page-001"
        },
        properties: {
            title: {
                id: "title",
                type: "title",
                title: [
                    {
                        type: "text",
                        text: { content: "Engineering Notes" },
                        plain_text: "Engineering Notes"
                    }
                ]
            }
        },
        _object: "page",
        _title: "Engineering Notes"
    },
    {
        object: "database",
        id: "db002-1234-1234-1234-123456789abc",
        created_time: "2024-01-15T08:00:00.000Z",
        last_edited_time: "2024-01-25T12:00:00.000Z",
        archived: false,
        in_trash: false,
        url: "https://www.notion.so/Meeting-Notes-db002",
        parent: {
            type: "workspace",
            workspace: true
        },
        title: [
            {
                type: "text",
                text: { content: "Meeting Notes Database" },
                plain_text: "Meeting Notes Database"
            }
        ],
        _object: "database",
        _title: "Meeting Notes Database"
    }
];

export const notionFixtures: TestFixture[] = [
    {
        operationId: "createPage",
        provider: "notion",
        validCases: [
            {
                name: "create_page_under_page",
                description: "Create a new page under an existing page",
                input: {
                    parent_id: "12345678-1234-1234-1234-123456789abc",
                    parent_type: "page_id",
                    title: "Meeting Notes"
                },
                expectedOutput: {
                    object: "page",
                    id: "87654321-4321-4321-4321-cba987654321",
                    created_time: "{{iso}}",
                    last_edited_time: "{{iso}}",
                    archived: false,
                    in_trash: false,
                    url: "https://www.notion.so/Meeting-Notes-87654321432143214321cba987654321",
                    public_url: null,
                    parent: {
                        type: "page_id",
                        page_id: "12345678-1234-1234-1234-123456789abc"
                    },
                    icon: null,
                    cover: null,
                    created_by: {
                        object: "user",
                        id: "user-123"
                    },
                    last_edited_by: {
                        object: "user",
                        id: "user-123"
                    },
                    properties: {
                        title: {
                            id: "title",
                            type: "title",
                            title: [
                                {
                                    type: "text",
                                    text: { content: "Meeting Notes", link: null },
                                    plain_text: "Meeting Notes"
                                }
                            ]
                        }
                    }
                }
            },
            {
                name: "create_page_in_database",
                description: "Create a new page (row) in a database",
                input: {
                    parent_id: "db123456-1234-1234-1234-123456789abc",
                    parent_type: "database_id",
                    title: "New Task",
                    properties: {
                        Status: { select: { name: "To Do" } },
                        Priority: { select: { name: "High" } }
                    }
                },
                expectedOutput: {
                    object: "page",
                    id: "page7890-4321-4321-4321-cba987654321",
                    created_time: "{{iso}}",
                    last_edited_time: "{{iso}}",
                    archived: false,
                    in_trash: false,
                    url: "https://www.notion.so/New-Task-page7890432143214321cba987654321",
                    public_url: null,
                    parent: {
                        type: "database_id",
                        database_id: "db123456-1234-1234-1234-123456789abc"
                    },
                    icon: null,
                    cover: null,
                    properties: {
                        Name: {
                            id: "title",
                            type: "title",
                            title: [
                                {
                                    type: "text",
                                    text: { content: "New Task" },
                                    plain_text: "New Task"
                                }
                            ]
                        },
                        Status: {
                            id: "status",
                            type: "select",
                            select: { id: "sel-1", name: "To Do", color: "gray" }
                        },
                        Priority: {
                            id: "priority",
                            type: "select",
                            select: { id: "sel-2", name: "High", color: "red" }
                        }
                    }
                }
            },
            {
                name: "create_page_with_content",
                description: "Create a page with rich content blocks",
                input: {
                    parent_id: "12345678-1234-1234-1234-123456789abc",
                    parent_type: "page_id",
                    title: "Project Documentation",
                    children: [
                        {
                            object: "block",
                            type: "heading_1",
                            heading_1: {
                                rich_text: [{ type: "text", text: { content: "Overview" } }]
                            }
                        },
                        {
                            object: "block",
                            type: "paragraph",
                            paragraph: {
                                rich_text: [
                                    {
                                        type: "text",
                                        text: {
                                            content:
                                                "This document describes the project architecture."
                                        }
                                    }
                                ]
                            }
                        }
                    ]
                },
                expectedOutput: {
                    object: "page",
                    id: "doc12345-4321-4321-4321-cba987654321",
                    created_time: "{{iso}}",
                    last_edited_time: "{{iso}}",
                    archived: false,
                    in_trash: false,
                    url: "https://www.notion.so/Project-Documentation-doc12345432143214321cba987654321",
                    public_url: null,
                    parent: {
                        type: "page_id",
                        page_id: "12345678-1234-1234-1234-123456789abc"
                    },
                    icon: null,
                    cover: null,
                    created_by: {
                        object: "user",
                        id: "user-123"
                    },
                    last_edited_by: {
                        object: "user",
                        id: "user-123"
                    },
                    properties: {
                        title: {
                            id: "title",
                            type: "title",
                            title: [
                                {
                                    type: "text",
                                    text: { content: "Project Documentation", link: null },
                                    plain_text: "Project Documentation"
                                }
                            ]
                        }
                    }
                }
            },
            {
                name: "create_page_with_icon_and_cover",
                description: "Create a page with emoji icon and cover image",
                input: {
                    parent_id: "12345678-1234-1234-1234-123456789abc",
                    parent_type: "page_id",
                    title: "Team Handbook",
                    icon: { type: "emoji", emoji: "📚" },
                    cover: {
                        type: "external",
                        external: { url: "https://images.unsplash.com/photo-123" }
                    }
                },
                expectedOutput: {
                    object: "page",
                    id: "handbook-4321-4321-4321-cba987654321",
                    created_time: "{{iso}}",
                    last_edited_time: "{{iso}}",
                    archived: false,
                    in_trash: false,
                    url: "https://www.notion.so/Team-Handbook-handbook432143214321cba987654321",
                    public_url: null,
                    parent: {
                        type: "page_id",
                        page_id: "12345678-1234-1234-1234-123456789abc"
                    },
                    icon: {
                        type: "emoji",
                        emoji: "📚"
                    },
                    cover: {
                        type: "external",
                        external: { url: "https://images.unsplash.com/photo-123" }
                    },
                    created_by: {
                        object: "user",
                        id: "user-123"
                    },
                    last_edited_by: {
                        object: "user",
                        id: "user-123"
                    },
                    properties: {
                        title: {
                            id: "title",
                            type: "title",
                            title: [
                                {
                                    type: "text",
                                    text: { content: "Team Handbook", link: null },
                                    plain_text: "Team Handbook"
                                }
                            ]
                        }
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "parent_not_found",
                description: "Parent page or database does not exist",
                input: {
                    parent_id: "nonexistent-page-id",
                    parent_type: "page_id",
                    title: "Test Page"
                },
                expectedError: {
                    type: "not_found",
                    message: "Could not find page with ID: nonexistent-page-id",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    parent_id: "rate-limit-parent-id",
                    parent_type: "page_id",
                    title: "Test Page"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limited. Please retry after a short delay.",
                    retryable: true
                }
            },
            {
                name: "no_permission",
                description: "No permission to create page in parent",
                input: {
                    parent_id: "restricted-parent-id",
                    parent_type: "page_id",
                    title: "Test Page"
                },
                expectedError: {
                    type: "permission",
                    message: "You do not have permission to create pages in this location",
                    retryable: false
                }
            },
            {
                name: "invalid_property",
                description: "Invalid property value for database page",
                input: {
                    parent_id: "db123456-1234-1234-1234-123456789abc",
                    parent_type: "database_id",
                    title: "New Task",
                    properties: {
                        InvalidProperty: { select: { name: "Value" } }
                    }
                },
                expectedError: {
                    type: "validation",
                    message: "Property 'InvalidProperty' does not exist on the database",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getPage",
        provider: "notion",
        validCases: [
            {
                name: "get_existing_page",
                description: "Retrieve an existing page by ID",
                input: {
                    page_id: "12345678-1234-1234-1234-123456789abc"
                },
                expectedOutput: {
                    object: "page",
                    id: "12345678-1234-1234-1234-123456789abc",
                    created_time: "2024-01-15T10:00:00.000Z",
                    last_edited_time: "2024-01-20T15:30:00.000Z",
                    archived: false,
                    in_trash: false,
                    url: "https://www.notion.so/My-Page-123456781234123412341234567890ab",
                    public_url: null,
                    parent: {
                        type: "workspace",
                        workspace: true
                    },
                    icon: {
                        type: "emoji",
                        emoji: "📝"
                    },
                    cover: null,
                    created_by: {
                        object: "user",
                        id: "user-123"
                    },
                    last_edited_by: {
                        object: "user",
                        id: "user-456"
                    },
                    properties: {
                        title: {
                            id: "title",
                            type: "title",
                            title: [
                                {
                                    type: "text",
                                    text: { content: "My Page", link: null },
                                    plain_text: "My Page"
                                }
                            ]
                        }
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "page_not_found",
                description: "Page does not exist",
                input: {
                    page_id: "nonexistent-page-id"
                },
                expectedError: {
                    type: "not_found",
                    message: "Could not find page with ID: nonexistent-page-id",
                    retryable: false
                }
            },
            {
                name: "permission",
                description: "No access to the page",
                input: {
                    page_id: "private-page-id"
                },
                expectedError: {
                    type: "permission",
                    message: "You do not have access to this page",
                    retryable: false
                }
            },
            {
                name: "invalid_page_id",
                description: "Invalid page ID format",
                input: {
                    page_id: "not-a-valid-uuid"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid page ID format",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "updatePage",
        provider: "notion",
        validCases: [
            {
                name: "update_page_properties",
                description: "Update page properties",
                input: {
                    page_id: "12345678-1234-1234-1234-123456789abc",
                    properties: {
                        Status: { select: { name: "Done" } }
                    }
                },
                expectedOutput: {
                    object: "page",
                    id: "12345678-1234-1234-1234-123456789abc",
                    created_time: "2024-01-15T10:00:00.000Z",
                    last_edited_time: "{{iso}}",
                    archived: false,
                    in_trash: false,
                    url: "https://www.notion.so/My-Page-12345678",
                    parent: {
                        type: "database_id",
                        database_id: "db123456-1234-1234-1234-123456789abc"
                    },
                    properties: {
                        Status: {
                            id: "status",
                            type: "select",
                            select: { id: "sel-3", name: "Done", color: "green" }
                        }
                    }
                }
            },
            {
                name: "update_page_icon",
                description: "Update page icon",
                input: {
                    page_id: "12345678-1234-1234-1234-123456789abc",
                    icon: { type: "emoji", emoji: "✅" }
                },
                expectedOutput: {
                    object: "page",
                    id: "12345678-1234-1234-1234-123456789abc",
                    created_time: "2024-01-15T10:00:00.000Z",
                    last_edited_time: "{{iso}}",
                    archived: false,
                    in_trash: false,
                    url: "https://www.notion.so/My-Page-12345678",
                    icon: {
                        type: "emoji",
                        emoji: "✅"
                    },
                    parent: {
                        type: "database_id",
                        database_id: "db123456-1234-1234-1234-123456789abc"
                    },
                    properties: {}
                }
            },
            {
                name: "archive_page",
                description: "Archive a page",
                input: {
                    page_id: "12345678-1234-1234-1234-123456789abc",
                    archived: true
                },
                expectedOutput: {
                    object: "page",
                    id: "12345678-1234-1234-1234-123456789abc",
                    created_time: "2024-01-15T10:00:00.000Z",
                    last_edited_time: "{{iso}}",
                    archived: true,
                    in_trash: false,
                    url: "https://www.notion.so/My-Page-12345678",
                    parent: {
                        type: "database_id",
                        database_id: "db123456-1234-1234-1234-123456789abc"
                    },
                    properties: {}
                }
            }
        ],
        errorCases: [
            {
                name: "page_not_found",
                description: "Page does not exist",
                input: {
                    page_id: "nonexistent-page-id",
                    properties: {}
                },
                expectedError: {
                    type: "not_found",
                    message: "Could not find page with ID: nonexistent-page-id",
                    retryable: false
                }
            },
            {
                name: "no_edit_permission",
                description: "No permission to edit page",
                input: {
                    page_id: "readonly-page-id",
                    properties: {
                        Status: { select: { name: "Done" } }
                    }
                },
                expectedError: {
                    type: "permission",
                    message: "You do not have permission to edit this page",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "queryDatabase",
        provider: "notion",
        filterableData: {
            records: sampleDatabasePages,
            recordsField: "results",
            offsetField: "next_cursor",
            defaultPageSize: 100,
            maxPageSize: 100,
            pageSizeParam: "page_size",
            filterConfig: {
                type: "generic",
                filterableFields: ["_status", "_priority", "_assignee"]
            }
        },
        validCases: [
            {
                name: "query_all_pages",
                description: "Query a database without filters",
                input: {
                    database_id: "db123456-1234-1234-1234-123456789abc"
                }
                // expectedOutput handled by filterableData
            },
            {
                name: "query_with_page_size",
                description: "Query a database with limited page size",
                input: {
                    database_id: "db123456-1234-1234-1234-123456789abc",
                    page_size: 2
                }
                // expectedOutput handled by filterableData - will return 2 results with next_cursor
            }
        ],
        errorCases: [
            {
                name: "database_not_found",
                description: "Database does not exist",
                input: {
                    database_id: "nonexistent-db-id"
                },
                expectedError: {
                    type: "not_found",
                    message: "Could not find database with ID: nonexistent-db-id",
                    retryable: false
                }
            },
            {
                name: "invalid_filter",
                description: "Filter references non-existent property",
                input: {
                    database_id: "db123456-1234-1234-1234-123456789abc",
                    filter: {
                        property: "NonExistentProperty",
                        select: { equals: "Value" }
                    }
                },
                expectedError: {
                    type: "validation",
                    message: "Property 'NonExistentProperty' does not exist on database",
                    retryable: false
                }
            },
            {
                name: "no_database_access",
                description: "No permission to access database",
                input: {
                    database_id: "private-db-id"
                },
                expectedError: {
                    type: "permission",
                    message: "You do not have access to this database",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "search",
        provider: "notion",
        filterableData: {
            records: sampleSearchResults,
            recordsField: "results",
            offsetField: "next_cursor",
            defaultPageSize: 100,
            maxPageSize: 100,
            pageSizeParam: "page_size",
            filterConfig: {
                type: "generic",
                filterableFields: ["_object", "_title"]
            }
        },
        validCases: [
            {
                name: "search_all",
                description: "Search workspace without filters",
                input: {}
                // expectedOutput handled by filterableData
            },
            {
                name: "search_with_query",
                description: "Search for pages with a specific query",
                input: {
                    query: "meeting notes"
                }
                // expectedOutput handled by filterableData
            },
            {
                name: "search_with_page_size",
                description: "Search with limited results",
                input: {
                    page_size: 2
                }
                // expectedOutput handled by filterableData
            }
        ],
        errorCases: [
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    query: "rate-limit-trigger"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limited. Please retry after a short delay.",
                    retryable: true
                }
            },
            {
                name: "invalid_filter_value",
                description: "Invalid filter object value",
                input: {
                    filter: { property: "object", value: "invalid_type" }
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid filter value. Must be 'page' or 'database'",
                    retryable: false
                }
            }
        ]
    }
];
