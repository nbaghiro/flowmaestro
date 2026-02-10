/**
 * Trello Provider Test Fixtures
 *
 * Based on Trello API documentation:
 * - Boards: https://developer.atlassian.com/cloud/trello/rest/api-group-boards/
 * - Lists: https://developer.atlassian.com/cloud/trello/rest/api-group-lists/
 * - Cards: https://developer.atlassian.com/cloud/trello/rest/api-group-cards/
 * - Members: https://developer.atlassian.com/cloud/trello/rest/api-group-members/
 */

import type { TestFixture } from "../../../sandbox";

/**
 * Sample boards for filterableData
 */
const sampleBoards = [
    {
        id: "5f8d3c2b1a9e8d7c6b5a4321",
        name: "Product Roadmap Q3 2024",
        description: "Strategic planning and feature tracking for Q3",
        url: "https://trello.com/b/abc123/product-roadmap-q3-2024",
        shortUrl: "https://trello.com/b/abc123",
        closed: false,
        starred: true,
        _isStarred: true,
        _isClosed: false
    },
    {
        id: "5f8d3c2b1a9e8d7c6b5a4322",
        name: "Engineering Sprint Board",
        description: "Two-week sprints for the development team",
        url: "https://trello.com/b/def456/engineering-sprint-board",
        shortUrl: "https://trello.com/b/def456",
        closed: false,
        starred: false,
        _isStarred: false,
        _isClosed: false
    },
    {
        id: "5f8d3c2b1a9e8d7c6b5a4323",
        name: "Archive - Q2 2024",
        description: "Completed work from Q2",
        url: "https://trello.com/b/ghi789/archive-q2-2024",
        shortUrl: "https://trello.com/b/ghi789",
        closed: true,
        starred: false,
        _isStarred: false,
        _isClosed: true
    }
];

/**
 * Sample lists for filterableData
 */
const sampleLists = [
    {
        id: "5f8d3c2b1a9e8d7c6b5a1001",
        name: "To Do",
        closed: false,
        position: 16384,
        boardId: "5f8d3c2b1a9e8d7c6b5a4321",
        _isClosed: false
    },
    {
        id: "5f8d3c2b1a9e8d7c6b5a1002",
        name: "In Progress",
        closed: false,
        position: 32768,
        boardId: "5f8d3c2b1a9e8d7c6b5a4321",
        _isClosed: false
    },
    {
        id: "5f8d3c2b1a9e8d7c6b5a1003",
        name: "Done",
        closed: false,
        position: 49152,
        boardId: "5f8d3c2b1a9e8d7c6b5a4321",
        _isClosed: false
    }
];

export const trelloFixtures: TestFixture[] = [
    // ============================================================================
    // BOARDS
    // ============================================================================
    {
        operationId: "listBoards",
        provider: "trello",
        filterableData: {
            records: sampleBoards,
            recordsField: "boards",
            offsetField: undefined,
            defaultPageSize: 100,
            maxPageSize: 1000,
            pageSizeParam: undefined,
            filterConfig: {
                type: "generic",
                filterableFields: ["_isStarred", "_isClosed"]
            }
        },
        validCases: [
            {
                name: "list_all_boards",
                description: "List all boards accessible by the user",
                input: {}
            },
            {
                name: "list_open_boards",
                description: "List only open (non-archived) boards",
                input: {
                    filter: "open"
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_token",
                description: "API token is invalid or expired",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "invalid token",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getBoard",
        provider: "trello",
        validCases: [
            {
                name: "active_board",
                description: "Get details of an active board",
                input: {
                    boardId: "5f8d3c2b1a9e8d7c6b5a4321"
                },
                expectedOutput: {
                    id: "5f8d3c2b1a9e8d7c6b5a4321",
                    name: "Product Roadmap Q3 2024",
                    description: "Strategic planning and feature tracking for Q3",
                    closed: false,
                    url: "https://trello.com/b/abc123/product-roadmap-q3-2024",
                    shortUrl: "https://trello.com/b/abc123",
                    starred: true,
                    lastActivity: "2024-06-15T14:30:00.000Z",
                    lastViewed: "2024-06-15T16:00:00.000Z",
                    backgroundColor: "blue",
                    backgroundImage: null,
                    permissionLevel: "private",
                    labelNames: {
                        green: "Low Priority",
                        yellow: "Medium Priority",
                        orange: "High Priority",
                        red: "Critical",
                        purple: "Design",
                        blue: "Engineering"
                    },
                    organizationId: "5f8d3c2b1a9e8d7c6b5a9999"
                }
            },
            {
                name: "archived_board",
                description: "Get details of an archived board",
                input: {
                    boardId: "5f8d3c2b1a9e8d7c6b5a4323"
                },
                expectedOutput: {
                    id: "5f8d3c2b1a9e8d7c6b5a4323",
                    name: "Archive - Q2 2024",
                    description: "Completed work from Q2",
                    closed: true,
                    url: "https://trello.com/b/ghi789/archive-q2-2024",
                    shortUrl: "https://trello.com/b/ghi789",
                    starred: false,
                    lastActivity: "2024-03-31T23:59:59.000Z",
                    backgroundColor: "grey",
                    permissionLevel: "org"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Board does not exist or user lacks access",
                input: {
                    boardId: "nonexistent123456789012"
                },
                expectedError: {
                    type: "not_found",
                    message: "The requested resource was not found.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    boardId: "5f8d3c2b1a9e8d7c6b5a4321"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "createBoard",
        provider: "trello",
        validCases: [
            {
                name: "basic_board",
                description: "Create a new board with default settings",
                input: {
                    name: "New Project Board"
                },
                expectedOutput: {
                    id: "5f8d3c2b1a9e8d7c6b5a5001",
                    name: "New Project Board",
                    url: "https://trello.com/b/xyz789/new-project-board",
                    shortUrl: "https://trello.com/b/xyz789",
                    closed: false
                }
            },
            {
                name: "board_with_description",
                description: "Create a board with description and settings",
                input: {
                    name: "Q4 Planning Board",
                    desc: "Strategic planning for Q4 2024 objectives and key results",
                    defaultLists: true,
                    defaultLabels: true,
                    prefs_permissionLevel: "private",
                    prefs_background: "green"
                },
                expectedOutput: {
                    id: "5f8d3c2b1a9e8d7c6b5a5002",
                    name: "Q4 Planning Board",
                    description: "Strategic planning for Q4 2024 objectives and key results",
                    url: "https://trello.com/b/abc999/q4-planning-board",
                    shortUrl: "https://trello.com/b/abc999",
                    closed: false
                }
            },
            {
                name: "board_no_default_lists",
                description: "Create an empty board without default lists",
                input: {
                    name: "Custom Workflow Board",
                    defaultLists: false,
                    defaultLabels: false,
                    prefs_permissionLevel: "org"
                },
                expectedOutput: {
                    id: "5f8d3c2b1a9e8d7c6b5a5003",
                    name: "Custom Workflow Board",
                    url: "https://trello.com/b/def111/custom-workflow-board",
                    shortUrl: "https://trello.com/b/def111",
                    closed: false
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_name",
                description: "Board name is empty or invalid",
                input: {
                    name: ""
                },
                expectedError: {
                    type: "validation",
                    message: "invalid value for name",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    name: "Test Board"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "updateBoard",
        provider: "trello",
        validCases: [
            {
                name: "update_name",
                description: "Update board name",
                input: {
                    boardId: "5f8d3c2b1a9e8d7c6b5a4321",
                    name: "Product Roadmap Q4 2024"
                },
                expectedOutput: {
                    id: "5f8d3c2b1a9e8d7c6b5a4321",
                    name: "Product Roadmap Q4 2024",
                    description: "Strategic planning and feature tracking for Q3",
                    closed: false
                }
            },
            {
                name: "archive_board",
                description: "Archive a board",
                input: {
                    boardId: "5f8d3c2b1a9e8d7c6b5a4322",
                    closed: true
                },
                expectedOutput: {
                    id: "5f8d3c2b1a9e8d7c6b5a4322",
                    name: "Engineering Sprint Board",
                    closed: true
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Board does not exist",
                input: {
                    boardId: "nonexistent123456789012",
                    name: "Updated Name"
                },
                expectedError: {
                    type: "not_found",
                    message: "The requested resource was not found.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    boardId: "5f8d3c2b1a9e8d7c6b5a4321",
                    name: "Updated Name"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry later.",
                    retryable: true
                }
            }
        ]
    },

    // ============================================================================
    // LISTS
    // ============================================================================
    {
        operationId: "getLists",
        provider: "trello",
        filterableData: {
            records: sampleLists,
            recordsField: "lists",
            offsetField: undefined,
            defaultPageSize: 100,
            maxPageSize: 1000,
            pageSizeParam: undefined,
            filterConfig: {
                type: "generic",
                filterableFields: ["_isClosed"]
            }
        },
        validCases: [
            {
                name: "get_open_lists",
                description: "Get all open lists on a board",
                input: {
                    boardId: "5f8d3c2b1a9e8d7c6b5a4321",
                    filter: "open"
                }
            },
            {
                name: "get_all_lists",
                description: "Get all lists including archived",
                input: {
                    boardId: "5f8d3c2b1a9e8d7c6b5a4321",
                    filter: "all"
                }
            }
        ],
        errorCases: [
            {
                name: "board_not_found",
                description: "Board does not exist",
                input: {
                    boardId: "nonexistent123456789012"
                },
                expectedError: {
                    type: "not_found",
                    message: "The requested resource was not found.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    boardId: "5f8d3c2b1a9e8d7c6b5a4321"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getList",
        provider: "trello",
        validCases: [
            {
                name: "get_list_details",
                description: "Get details of a specific list",
                input: {
                    listId: "5f8d3c2b1a9e8d7c6b5a1001"
                },
                expectedOutput: {
                    id: "5f8d3c2b1a9e8d7c6b5a1001",
                    name: "To Do",
                    closed: false,
                    position: 16384,
                    boardId: "5f8d3c2b1a9e8d7c6b5a4321"
                }
            },
            {
                name: "get_closed_list",
                description: "Get details of an archived list",
                input: {
                    listId: "5f8d3c2b1a9e8d7c6b5a1099"
                },
                expectedOutput: {
                    id: "5f8d3c2b1a9e8d7c6b5a1099",
                    name: "Archive",
                    closed: true,
                    position: 65536,
                    boardId: "5f8d3c2b1a9e8d7c6b5a4321"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "List does not exist",
                input: {
                    listId: "nonexistent123456789012"
                },
                expectedError: {
                    type: "not_found",
                    message: "The requested resource was not found.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    listId: "5f8d3c2b1a9e8d7c6b5a1001"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "createList",
        provider: "trello",
        validCases: [
            {
                name: "create_list",
                description: "Create a new list on a board",
                input: {
                    name: "Backlog",
                    idBoard: "5f8d3c2b1a9e8d7c6b5a4321"
                },
                expectedOutput: {
                    id: "5f8d3c2b1a9e8d7c6b5a2001",
                    name: "Backlog",
                    closed: false,
                    position: 8192,
                    boardId: "5f8d3c2b1a9e8d7c6b5a4321"
                }
            },
            {
                name: "create_list_at_position",
                description: "Create a list at a specific position",
                input: {
                    name: "Review",
                    idBoard: "5f8d3c2b1a9e8d7c6b5a4321",
                    pos: "bottom"
                },
                expectedOutput: {
                    id: "5f8d3c2b1a9e8d7c6b5a2002",
                    name: "Review",
                    closed: false,
                    position: 65536,
                    boardId: "5f8d3c2b1a9e8d7c6b5a4321"
                }
            }
        ],
        errorCases: [
            {
                name: "board_not_found",
                description: "Board does not exist",
                input: {
                    name: "New List",
                    idBoard: "nonexistent123456789012"
                },
                expectedError: {
                    type: "not_found",
                    message: "The requested resource was not found.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    name: "New List",
                    idBoard: "5f8d3c2b1a9e8d7c6b5a4321"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "updateList",
        provider: "trello",
        validCases: [
            {
                name: "rename_list",
                description: "Rename a list",
                input: {
                    listId: "5f8d3c2b1a9e8d7c6b5a1001",
                    name: "Backlog"
                },
                expectedOutput: {
                    id: "5f8d3c2b1a9e8d7c6b5a1001",
                    name: "Backlog",
                    closed: false,
                    boardId: "5f8d3c2b1a9e8d7c6b5a4321"
                }
            },
            {
                name: "move_list",
                description: "Move list to a new position",
                input: {
                    listId: "5f8d3c2b1a9e8d7c6b5a1002",
                    pos: "top"
                },
                expectedOutput: {
                    id: "5f8d3c2b1a9e8d7c6b5a1002",
                    name: "In Progress",
                    closed: false,
                    position: 8192,
                    boardId: "5f8d3c2b1a9e8d7c6b5a4321"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "List does not exist",
                input: {
                    listId: "nonexistent123456789012",
                    name: "Updated Name"
                },
                expectedError: {
                    type: "not_found",
                    message: "The requested resource was not found.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    listId: "5f8d3c2b1a9e8d7c6b5a1001",
                    name: "Updated Name"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "archiveList",
        provider: "trello",
        validCases: [
            {
                name: "archive_list",
                description: "Archive a list",
                input: {
                    listId: "5f8d3c2b1a9e8d7c6b5a1003",
                    value: true
                },
                expectedOutput: {
                    id: "5f8d3c2b1a9e8d7c6b5a1003",
                    name: "Done",
                    closed: true,
                    boardId: "5f8d3c2b1a9e8d7c6b5a4321"
                }
            },
            {
                name: "unarchive_list",
                description: "Restore an archived list",
                input: {
                    listId: "5f8d3c2b1a9e8d7c6b5a1099",
                    value: false
                },
                expectedOutput: {
                    id: "5f8d3c2b1a9e8d7c6b5a1099",
                    name: "Archive",
                    closed: false,
                    boardId: "5f8d3c2b1a9e8d7c6b5a4321"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "List does not exist",
                input: {
                    listId: "nonexistent123456789012",
                    value: true
                },
                expectedError: {
                    type: "not_found",
                    message: "The requested resource was not found.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    listId: "5f8d3c2b1a9e8d7c6b5a1003",
                    value: true
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry later.",
                    retryable: true
                }
            }
        ]
    },

    // ============================================================================
    // CARDS
    // ============================================================================
    {
        operationId: "getCards",
        provider: "trello",
        validCases: [
            {
                name: "get_list_cards",
                description: "Get all cards in a list",
                input: {
                    listId: "5f8d3c2b1a9e8d7c6b5a1001"
                },
                expectedOutput: {
                    cards: [
                        {
                            id: "5f8d3c2b1a9e8d7c6b5a3001",
                            name: "Implement user authentication",
                            description: "Add OAuth2 support for Google and GitHub",
                            listId: "5f8d3c2b1a9e8d7c6b5a1001",
                            boardId: "5f8d3c2b1a9e8d7c6b5a4321",
                            position: 16384,
                            due: "2024-06-30T23:59:59.000Z",
                            dueComplete: false
                        },
                        {
                            id: "5f8d3c2b1a9e8d7c6b5a3002",
                            name: "Design system updates",
                            listId: "5f8d3c2b1a9e8d7c6b5a1001",
                            boardId: "5f8d3c2b1a9e8d7c6b5a4321",
                            position: 32768
                        }
                    ],
                    count: 2
                }
            },
            {
                name: "get_cards_with_filter",
                description: "Get open cards in a list",
                input: {
                    listId: "5f8d3c2b1a9e8d7c6b5a1002",
                    filter: "open"
                },
                expectedOutput: {
                    cards: [
                        {
                            id: "5f8d3c2b1a9e8d7c6b5a3003",
                            name: "API integration testing",
                            listId: "5f8d3c2b1a9e8d7c6b5a1002",
                            boardId: "5f8d3c2b1a9e8d7c6b5a4321",
                            position: 16384
                        }
                    ],
                    count: 1
                }
            }
        ],
        errorCases: [
            {
                name: "list_not_found",
                description: "List does not exist",
                input: {
                    listId: "nonexistent123456789012"
                },
                expectedError: {
                    type: "not_found",
                    message: "The requested resource was not found.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    listId: "5f8d3c2b1a9e8d7c6b5a1001"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getCard",
        provider: "trello",
        validCases: [
            {
                name: "get_card_details",
                description: "Get full card details",
                input: {
                    cardId: "5f8d3c2b1a9e8d7c6b5a3001"
                },
                expectedOutput: {
                    id: "5f8d3c2b1a9e8d7c6b5a3001",
                    name: "Implement user authentication",
                    description:
                        "Add OAuth2 support for Google and GitHub\n\n## Acceptance Criteria\n- Users can sign in with Google\n- Users can sign in with GitHub\n- Session management works correctly",
                    closed: false,
                    due: "2024-06-30T23:59:59.000Z",
                    dueComplete: false,
                    start: "2024-06-15T00:00:00.000Z",
                    listId: "5f8d3c2b1a9e8d7c6b5a1001",
                    boardId: "5f8d3c2b1a9e8d7c6b5a4321",
                    position: 16384,
                    shortUrl: "https://trello.com/c/abc123",
                    url: "https://trello.com/c/abc123/1-implement-user-authentication",
                    labels: [
                        { id: "5f8d3c2b1a9e8d7c6b5a8001", name: "Engineering", color: "blue" },
                        { id: "5f8d3c2b1a9e8d7c6b5a8002", name: "High Priority", color: "orange" }
                    ],
                    memberIds: ["5f8d3c2b1a9e8d7c6b5a7001", "5f8d3c2b1a9e8d7c6b5a7002"],
                    checklistIds: ["5f8d3c2b1a9e8d7c6b5a6001"],
                    lastActivity: "2024-06-15T14:30:00.000Z",
                    badges: {
                        votes: 3,
                        comments: 5,
                        attachments: 2,
                        checkItems: 4,
                        checkItemsChecked: 2,
                        hasDescription: true
                    }
                }
            },
            {
                name: "get_simple_card",
                description: "Get card with minimal data",
                input: {
                    cardId: "5f8d3c2b1a9e8d7c6b5a3002"
                },
                expectedOutput: {
                    id: "5f8d3c2b1a9e8d7c6b5a3002",
                    name: "Design system updates",
                    description: "",
                    closed: false,
                    listId: "5f8d3c2b1a9e8d7c6b5a1001",
                    boardId: "5f8d3c2b1a9e8d7c6b5a4321",
                    position: 32768,
                    shortUrl: "https://trello.com/c/def456",
                    url: "https://trello.com/c/def456/2-design-system-updates",
                    labels: [],
                    memberIds: [],
                    checklistIds: [],
                    badges: {
                        votes: 0,
                        comments: 0,
                        attachments: 0,
                        checkItems: 0,
                        checkItemsChecked: 0,
                        hasDescription: false
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Card does not exist",
                input: {
                    cardId: "nonexistent123456789012"
                },
                expectedError: {
                    type: "not_found",
                    message: "The requested resource was not found.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    cardId: "5f8d3c2b1a9e8d7c6b5a3001"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "createCard",
        provider: "trello",
        validCases: [
            {
                name: "create_basic_card",
                description: "Create a card with name only",
                input: {
                    idList: "5f8d3c2b1a9e8d7c6b5a1001",
                    name: "New feature request"
                },
                expectedOutput: {
                    id: "5f8d3c2b1a9e8d7c6b5a3010",
                    name: "New feature request",
                    listId: "5f8d3c2b1a9e8d7c6b5a1001",
                    boardId: "5f8d3c2b1a9e8d7c6b5a4321",
                    shortUrl: "https://trello.com/c/ghi789",
                    url: "https://trello.com/c/ghi789/10-new-feature-request",
                    position: 65536
                }
            },
            {
                name: "create_detailed_card",
                description: "Create a card with all details",
                input: {
                    idList: "5f8d3c2b1a9e8d7c6b5a1001",
                    name: "Implement payment processing",
                    desc: "Integrate Stripe for payment processing\n\n- Support credit cards\n- Support Apple Pay\n- Add webhook handling",
                    pos: "top",
                    due: "2024-07-15T23:59:59.000Z",
                    start: "2024-07-01T00:00:00.000Z",
                    idMembers: ["5f8d3c2b1a9e8d7c6b5a7001"],
                    idLabels: ["5f8d3c2b1a9e8d7c6b5a8001"]
                },
                expectedOutput: {
                    id: "5f8d3c2b1a9e8d7c6b5a3011",
                    name: "Implement payment processing",
                    description:
                        "Integrate Stripe for payment processing\n\n- Support credit cards\n- Support Apple Pay\n- Add webhook handling",
                    listId: "5f8d3c2b1a9e8d7c6b5a1001",
                    boardId: "5f8d3c2b1a9e8d7c6b5a4321",
                    shortUrl: "https://trello.com/c/jkl012",
                    url: "https://trello.com/c/jkl012/11-implement-payment-processing",
                    due: "2024-07-15T23:59:59.000Z",
                    position: 8192
                }
            }
        ],
        errorCases: [
            {
                name: "list_not_found",
                description: "Target list does not exist",
                input: {
                    idList: "nonexistent123456789012",
                    name: "New card"
                },
                expectedError: {
                    type: "not_found",
                    message: "The requested resource was not found.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    idList: "5f8d3c2b1a9e8d7c6b5a1001",
                    name: "New card"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "updateCard",
        provider: "trello",
        validCases: [
            {
                name: "update_card_name",
                description: "Update card name",
                input: {
                    cardId: "5f8d3c2b1a9e8d7c6b5a3001",
                    name: "Implement OAuth2 authentication"
                },
                expectedOutput: {
                    id: "5f8d3c2b1a9e8d7c6b5a3001",
                    name: "Implement OAuth2 authentication",
                    listId: "5f8d3c2b1a9e8d7c6b5a1001",
                    boardId: "5f8d3c2b1a9e8d7c6b5a4321"
                }
            },
            {
                name: "mark_due_complete",
                description: "Mark card due date as complete",
                input: {
                    cardId: "5f8d3c2b1a9e8d7c6b5a3001",
                    dueComplete: true
                },
                expectedOutput: {
                    id: "5f8d3c2b1a9e8d7c6b5a3001",
                    name: "Implement user authentication",
                    dueComplete: true,
                    listId: "5f8d3c2b1a9e8d7c6b5a1001",
                    boardId: "5f8d3c2b1a9e8d7c6b5a4321"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Card does not exist",
                input: {
                    cardId: "nonexistent123456789012",
                    name: "Updated name"
                },
                expectedError: {
                    type: "not_found",
                    message: "The requested resource was not found.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    cardId: "5f8d3c2b1a9e8d7c6b5a3001",
                    name: "Updated name"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "moveCard",
        provider: "trello",
        validCases: [
            {
                name: "move_to_list",
                description: "Move card to another list",
                input: {
                    cardId: "5f8d3c2b1a9e8d7c6b5a3001",
                    idList: "5f8d3c2b1a9e8d7c6b5a1002"
                },
                expectedOutput: {
                    id: "5f8d3c2b1a9e8d7c6b5a3001",
                    name: "Implement user authentication",
                    listId: "5f8d3c2b1a9e8d7c6b5a1002",
                    boardId: "5f8d3c2b1a9e8d7c6b5a4321"
                }
            },
            {
                name: "move_to_different_board",
                description: "Move card to a different board",
                input: {
                    cardId: "5f8d3c2b1a9e8d7c6b5a3002",
                    idList: "5f8d3c2b1a9e8d7c6b5a2001",
                    idBoard: "5f8d3c2b1a9e8d7c6b5a4322"
                },
                expectedOutput: {
                    id: "5f8d3c2b1a9e8d7c6b5a3002",
                    name: "Design system updates",
                    listId: "5f8d3c2b1a9e8d7c6b5a2001",
                    boardId: "5f8d3c2b1a9e8d7c6b5a4322"
                }
            }
        ],
        errorCases: [
            {
                name: "card_not_found",
                description: "Card does not exist",
                input: {
                    cardId: "nonexistent123456789012",
                    idList: "5f8d3c2b1a9e8d7c6b5a1002"
                },
                expectedError: {
                    type: "not_found",
                    message: "The requested resource was not found.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    cardId: "5f8d3c2b1a9e8d7c6b5a3001",
                    idList: "5f8d3c2b1a9e8d7c6b5a1002"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "deleteCard",
        provider: "trello",
        validCases: [
            {
                name: "delete_card",
                description: "Permanently delete a card",
                input: {
                    cardId: "5f8d3c2b1a9e8d7c6b5a3099"
                },
                expectedOutput: {
                    deleted: true
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Card does not exist",
                input: {
                    cardId: "nonexistent123456789012"
                },
                expectedError: {
                    type: "not_found",
                    message: "The requested resource was not found.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    cardId: "5f8d3c2b1a9e8d7c6b5a3099"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry later.",
                    retryable: true
                }
            }
        ]
    },

    // ============================================================================
    // COMMENTS
    // ============================================================================
    {
        operationId: "addComment",
        provider: "trello",
        validCases: [
            {
                name: "add_simple_comment",
                description: "Add a text comment to a card",
                input: {
                    cardId: "5f8d3c2b1a9e8d7c6b5a3001",
                    text: "Started working on this task. ETA: End of day."
                },
                expectedOutput: {
                    id: "5f8d3c2b1a9e8d7c6b5a9001",
                    text: "Started working on this task. ETA: End of day.",
                    date: "2024-06-15T09:00:00.000Z",
                    cardId: "5f8d3c2b1a9e8d7c6b5a3001",
                    memberId: "5f8d3c2b1a9e8d7c6b5a7001"
                }
            },
            {
                name: "add_mention_comment",
                description: "Add a comment mentioning another user",
                input: {
                    cardId: "5f8d3c2b1a9e8d7c6b5a3001",
                    text: "@johnsmith Please review the PR when you have a chance."
                },
                expectedOutput: {
                    id: "5f8d3c2b1a9e8d7c6b5a9002",
                    text: "@johnsmith Please review the PR when you have a chance.",
                    date: "2024-06-15T10:30:00.000Z",
                    cardId: "5f8d3c2b1a9e8d7c6b5a3001",
                    memberId: "5f8d3c2b1a9e8d7c6b5a7001"
                }
            }
        ],
        errorCases: [
            {
                name: "card_not_found",
                description: "Card does not exist",
                input: {
                    cardId: "nonexistent123456789012",
                    text: "Comment text"
                },
                expectedError: {
                    type: "not_found",
                    message: "The requested resource was not found.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    cardId: "5f8d3c2b1a9e8d7c6b5a3001",
                    text: "Comment text"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry later.",
                    retryable: true
                }
            }
        ]
    },

    // ============================================================================
    // MEMBERS
    // ============================================================================
    {
        operationId: "getMe",
        provider: "trello",
        validCases: [
            {
                name: "get_current_user",
                description: "Get information about the authenticated user",
                input: {},
                expectedOutput: {
                    id: "5f8d3c2b1a9e8d7c6b5a7001",
                    fullName: "John Smith",
                    username: "johnsmith",
                    email: "john.smith@example.com",
                    avatarUrl: "https://trello-avatars.s3.amazonaws.com/abc123/170.png",
                    bio: "Software Engineer | Workflow automation enthusiast",
                    initials: "JS",
                    profileUrl: "https://trello.com/johnsmith"
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_token",
                description: "API token is invalid",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "invalid token",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getBoardMembers",
        provider: "trello",
        validCases: [
            {
                name: "get_board_members",
                description: "Get all members of a board",
                input: {
                    boardId: "5f8d3c2b1a9e8d7c6b5a4321"
                },
                expectedOutput: {
                    members: [
                        {
                            id: "5f8d3c2b1a9e8d7c6b5a7001",
                            fullName: "John Smith",
                            username: "johnsmith",
                            avatarUrl: "https://trello-avatars.s3.amazonaws.com/abc123/170.png",
                            initials: "JS",
                            memberType: "admin"
                        },
                        {
                            id: "5f8d3c2b1a9e8d7c6b5a7002",
                            fullName: "Jane Doe",
                            username: "janedoe",
                            avatarUrl: "https://trello-avatars.s3.amazonaws.com/def456/170.png",
                            initials: "JD",
                            memberType: "normal"
                        },
                        {
                            id: "5f8d3c2b1a9e8d7c6b5a7003",
                            fullName: "Bob Wilson",
                            username: "bobwilson",
                            avatarUrl: null,
                            initials: "BW",
                            memberType: "normal"
                        }
                    ],
                    count: 3
                }
            }
        ],
        errorCases: [
            {
                name: "board_not_found",
                description: "Board does not exist",
                input: {
                    boardId: "nonexistent123456789012"
                },
                expectedError: {
                    type: "not_found",
                    message: "The requested resource was not found.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    boardId: "5f8d3c2b1a9e8d7c6b5a4321"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry later.",
                    retryable: true
                }
            }
        ]
    }
];
