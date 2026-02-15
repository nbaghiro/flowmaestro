/**
 * Evernote Provider Test Fixtures
 *
 * Comprehensive test fixtures for all Evernote operations including notes,
 * notebooks, tags, and search functionality.
 */

import type { TestFixture } from "../../sandbox";

export const evernoteFixtures: TestFixture[] = [
    {
        operationId: "createNote",
        provider: "evernote",
        validCases: [
            {
                name: "create_note_with_notebook_and_tags",
                description: "Create a note in a specific notebook with tags",
                input: {
                    title: "Project Alpha - Sprint Retrospective",
                    content:
                        "Sprint 23 Retrospective\n\nWhat went well:\n- Shipped authentication refactor ahead of schedule\n- Zero critical bugs in production\n\nWhat could improve:\n- Need better async communication\n- CI pipeline still slow\n\nAction items for next sprint:\n- Set up daily standups\n- Investigate parallel test execution",
                    notebookGuid: "nb-projects-87654321-09ba-fedc-4321-0987654321ba",
                    tagNames: ["agile", "retrospective", "project-alpha"]
                },
                expectedOutput: {
                    guid: "d4e5f6a7-b8c9-0123-def0-234567890123",
                    title: "Project Alpha - Sprint Retrospective",
                    notebookGuid: "nb-projects-87654321-09ba-fedc-4321-0987654321ba",
                    tagNames: ["agile", "retrospective", "project-alpha"],
                    createdAt: "2024-01-18T16:45:00.000Z",
                    updatedAt: "2024-01-18T16:45:00.000Z"
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_notebook_guid",
                description: "Error when specified notebook does not exist",
                input: {
                    title: "Test Note",
                    content: "Test content",
                    notebookGuid: "nb-nonexistent-00000000-0000-0000-0000-000000000000"
                },
                expectedError: {
                    type: "not_found",
                    message: "Notebook not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when creating notes",
                input: {
                    title: "Rate Limited Note",
                    content: "This request will be rate limited"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please wait before making more requests.",
                    retryable: true
                }
            },
            {
                name: "rate_limit",
                description: "User has exceeded their monthly upload quota",
                input: {
                    title: "Large Note",
                    content: "Very large content that exceeds quota limits..."
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Monthly upload quota exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "createNotebook",
        provider: "evernote",
        validCases: [
            {
                name: "create_notebook_in_stack",
                description: "Create a notebook assigned to a stack",
                input: {
                    name: "Q1 Planning",
                    stack: "2024 Planning"
                },
                expectedOutput: {
                    guid: "nb-new-22222222-3333-4444-5555-666666666666",
                    name: "Q1 Planning",
                    stack: "2024 Planning",
                    isDefault: false,
                    createdAt: "2024-01-21T09:30:00.000Z"
                }
            }
        ],
        errorCases: [
            {
                name: "duplicate_name",
                description: "Error when notebook name already exists",
                input: {
                    name: "Work Projects"
                },
                expectedError: {
                    type: "validation",
                    message: "A notebook with this name already exists",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when creating notebooks",
                input: {
                    name: "Rate Limited Notebook"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please wait before making more requests.",
                    retryable: true
                }
            },
            {
                name: "notebook_limit_reached",
                description: "User has reached maximum notebook count",
                input: {
                    name: "One Too Many"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Maximum number of notebooks reached for this account",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "createTag",
        provider: "evernote",
        validCases: [
            {
                name: "create_nested_tag",
                description: "Create a tag nested under a parent tag",
                input: {
                    name: "frontend",
                    parentGuid: "tag-projects-00000000-0000-0000-0000-000000000001"
                },
                expectedOutput: {
                    guid: "tag-22222222-3333-4444-5555-666666666666",
                    name: "frontend",
                    parentGuid: "tag-projects-00000000-0000-0000-0000-000000000001"
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_parent_guid",
                description: "Error when parent tag does not exist",
                input: {
                    name: "orphan-tag",
                    parentGuid: "tag-nonexistent-00000000-0000-0000-0000-000000000000"
                },
                expectedError: {
                    type: "not_found",
                    message: "Parent tag not found",
                    retryable: false
                }
            },
            {
                name: "duplicate_tag_name",
                description: "Error when tag name already exists",
                input: {
                    name: "important"
                },
                expectedError: {
                    type: "validation",
                    message: "A tag with this name already exists",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when creating tags",
                input: {
                    name: "rate-limited-tag"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please wait before making more requests.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getNote",
        provider: "evernote",
        validCases: [
            {
                name: "get_note_with_content",
                description: "Retrieve a note with full content and multiple tags",
                input: {
                    guid: "note-12345678-90ab-cdef-1234-567890abcdef",
                    withContent: true
                },
                expectedOutput: {
                    guid: "note-12345678-90ab-cdef-1234-567890abcdef",
                    title: "API Design Best Practices",
                    content:
                        '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd"><en-note><p>Key principles for designing robust APIs:</p><ul><li>Use consistent naming conventions</li><li>Version your APIs</li><li>Implement proper error handling</li><li>Document thoroughly</li></ul></en-note>',
                    plainTextContent:
                        "Key principles for designing robust APIs:\n- Use consistent naming conventions\n- Version your APIs\n- Implement proper error handling\n- Document thoroughly",
                    notebookGuid: "nb-engineering-12345678-90ab-cdef-1234-567890abcdef",
                    tagGuids: [
                        "tag-api-11111111-2222-3333-4444-555555555555",
                        "tag-bestpractices-22222222-3333-4444-5555-666666666666"
                    ],
                    tagNames: ["api", "best-practices"],
                    active: true,
                    createdAt: "2024-01-10T09:00:00.000Z",
                    updatedAt: "2024-01-12T15:30:00.000Z",
                    deletedAt: undefined
                }
            }
        ],
        errorCases: [
            {
                name: "note_not_found",
                description: "Error when note GUID does not exist",
                input: {
                    guid: "note-nonexistent-00000000-0000-0000-0000-000000000000"
                },
                expectedError: {
                    type: "not_found",
                    message: "Note not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when retrieving notes",
                input: {
                    guid: "note-12345678-90ab-cdef-1234-567890abcdef"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please wait before making more requests.",
                    retryable: true
                }
            },
            {
                name: "permission",
                description: "User does not have access to shared note",
                input: {
                    guid: "note-shared-private-00000000-1111-2222-3333-444444444444"
                },
                expectedError: {
                    type: "permission",
                    message: "You do not have permission to access this note",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "listNotebooks",
        provider: "evernote",
        validCases: [
            {
                name: "list_all_notebooks",
                description: "List all notebooks in the account",
                input: {},
                expectedOutput: {
                    notebookCount: 5,
                    notebooks: [
                        {
                            guid: "nb-default-12345678-90ab-cdef-1234-567890abcdef",
                            name: "My First Notebook",
                            isDefault: true,
                            stack: undefined,
                            createdAt: "2023-01-01T00:00:00.000Z",
                            updatedAt: "2024-01-20T14:30:00.000Z"
                        },
                        {
                            guid: "nb-work-22222222-3333-4444-5555-666666666666",
                            name: "Work Notes",
                            isDefault: false,
                            stack: "Professional",
                            createdAt: "2023-03-15T09:00:00.000Z",
                            updatedAt: "2024-01-19T16:45:00.000Z"
                        },
                        {
                            guid: "nb-projects-33333333-4444-5555-6666-777777777777",
                            name: "Active Projects",
                            isDefault: false,
                            stack: "Professional",
                            createdAt: "2023-06-01T10:30:00.000Z",
                            updatedAt: "2024-01-18T11:20:00.000Z"
                        },
                        {
                            guid: "nb-personal-44444444-5555-6666-7777-888888888888",
                            name: "Personal",
                            isDefault: false,
                            stack: undefined,
                            createdAt: "2023-02-10T14:00:00.000Z",
                            updatedAt: "2024-01-15T20:00:00.000Z"
                        },
                        {
                            guid: "nb-recipes-55555555-6666-7777-8888-999999999999",
                            name: "Recipes",
                            isDefault: false,
                            stack: "Hobbies",
                            createdAt: "2023-08-20T18:00:00.000Z",
                            updatedAt: "2024-01-10T12:30:00.000Z"
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "rate_limited",
                description: "Rate limit exceeded when listing notebooks",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please wait before making more requests.",
                    retryable: true
                }
            },
            {
                name: "auth_expired",
                description: "Authentication token has expired",
                input: {},
                expectedError: {
                    type: "permission",
                    message:
                        "Authentication token has expired. Please reconnect your Evernote account.",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "listTags",
        provider: "evernote",
        validCases: [
            {
                name: "list_all_tags",
                description: "List all tags in the account including hierarchy",
                input: {},
                expectedOutput: {
                    tagCount: 8,
                    tags: [
                        {
                            guid: "tag-important-11111111-2222-3333-4444-555555555555",
                            name: "important",
                            parentGuid: undefined
                        },
                        {
                            guid: "tag-work-22222222-3333-4444-5555-666666666666",
                            name: "work",
                            parentGuid: undefined
                        },
                        {
                            guid: "tag-meeting-33333333-4444-5555-6666-777777777777",
                            name: "meeting",
                            parentGuid: "tag-work-22222222-3333-4444-5555-666666666666"
                        },
                        {
                            guid: "tag-project-44444444-5555-6666-7777-888888888888",
                            name: "project",
                            parentGuid: "tag-work-22222222-3333-4444-5555-666666666666"
                        },
                        {
                            guid: "tag-personal-55555555-6666-7777-8888-999999999999",
                            name: "personal",
                            parentGuid: undefined
                        },
                        {
                            guid: "tag-todo-66666666-7777-8888-9999-aaaaaaaaaaaa",
                            name: "todo",
                            parentGuid: undefined
                        },
                        {
                            guid: "tag-reference-77777777-8888-9999-aaaa-bbbbbbbbbbbb",
                            name: "reference",
                            parentGuid: undefined
                        },
                        {
                            guid: "tag-archive-88888888-9999-aaaa-bbbb-cccccccccccc",
                            name: "archive",
                            parentGuid: undefined
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "rate_limited",
                description: "Rate limit exceeded when listing tags",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please wait before making more requests.",
                    retryable: true
                }
            },
            {
                name: "auth_expired",
                description: "Authentication token has expired",
                input: {},
                expectedError: {
                    type: "permission",
                    message:
                        "Authentication token has expired. Please reconnect your Evernote account.",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "searchNotes",
        provider: "evernote",
        validCases: [
            {
                name: "search_by_text",
                description: "Search notes by text content",
                input: {
                    query: "meeting agenda"
                },
                expectedOutput: {
                    query: "meeting agenda",
                    totalNotes: 3,
                    startIndex: 0,
                    returnedCount: 3,
                    notes: [
                        {
                            guid: "note-search-1-11111111-2222-3333-4444-555555555555",
                            title: "Weekly Team Meeting Agenda",
                            notebookGuid: "nb-work-22222222-3333-4444-5555-666666666666",
                            tagGuids: ["tag-meeting-33333333-4444-5555-6666-777777777777"],
                            tagNames: ["meeting"],
                            active: true,
                            createdAt: "2024-01-15T08:00:00.000Z",
                            updatedAt: "2024-01-15T08:00:00.000Z"
                        },
                        {
                            guid: "note-search-2-22222222-3333-4444-5555-666666666666",
                            title: "Q1 Planning Meeting Agenda",
                            notebookGuid: "nb-work-22222222-3333-4444-5555-666666666666",
                            tagGuids: [
                                "tag-meeting-33333333-4444-5555-6666-777777777777",
                                "tag-important-11111111-2222-3333-4444-555555555555"
                            ],
                            tagNames: ["meeting", "important"],
                            active: true,
                            createdAt: "2024-01-10T10:00:00.000Z",
                            updatedAt: "2024-01-12T14:30:00.000Z"
                        },
                        {
                            guid: "note-search-3-33333333-4444-5555-6666-777777777777",
                            title: "Client Meeting Agenda - Acme Corp",
                            notebookGuid: "nb-projects-33333333-4444-5555-6666-777777777777",
                            tagGuids: ["tag-meeting-33333333-4444-5555-6666-777777777777"],
                            tagNames: ["meeting"],
                            active: true,
                            createdAt: "2024-01-08T09:00:00.000Z",
                            updatedAt: "2024-01-08T09:00:00.000Z"
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_notebook_guid",
                description: "Error when searching in a non-existent notebook",
                input: {
                    query: "meeting",
                    notebookGuid: "nb-nonexistent-00000000-0000-0000-0000-000000000000"
                },
                expectedError: {
                    type: "not_found",
                    message: "Notebook not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when searching notes",
                input: {
                    query: "important documents"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please wait before making more requests.",
                    retryable: true
                }
            },
            {
                name: "invalid_search_syntax",
                description: "Error when search query has invalid syntax",
                input: {
                    query: "created:invalid-date"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid search query syntax",
                    retryable: false
                }
            }
        ]
    }
];
