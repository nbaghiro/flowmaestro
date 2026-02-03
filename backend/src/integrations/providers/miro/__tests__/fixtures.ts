/**
 * Miro Provider Test Fixtures
 *
 * Realistic test data for Miro whiteboard operations including
 * boards, sticky notes, cards, shapes, items, and tags.
 */

import type { TestFixture } from "../../../sandbox";

export const miroFixtures: TestFixture[] = [
    {
        operationId: "listBoards",
        provider: "miro",
        validCases: [
            {
                name: "list_all_boards",
                description: "List all boards in the user's account",
                input: {},
                expectedOutput: {
                    data: [
                        {
                            id: "uXjVOabc123",
                            name: "Sprint Planning - Q1 2024",
                            description: "Sprint planning board for Q1 product milestones",
                            team: {
                                id: "3458764512345678",
                                name: "Product Team"
                            },
                            owner: {
                                id: "3074457362577955410",
                                name: "Sarah Chen",
                                type: "user"
                            },
                            currentUserMembership: {
                                id: "3074457362577955410",
                                role: "owner",
                                type: "board_member"
                            },
                            viewLink: "https://miro.com/app/board/uXjVOabc123/",
                            createdAt: "2024-01-15T09:00:00Z",
                            modifiedAt: "2024-03-15T14:30:00Z"
                        },
                        {
                            id: "uXjVOdef456",
                            name: "User Journey Mapping",
                            description: "End-to-end user journey for the onboarding flow",
                            team: {
                                id: "3458764512345678",
                                name: "Product Team"
                            },
                            owner: {
                                id: "3074457362577955411",
                                name: "Alex Rivera",
                                type: "user"
                            },
                            currentUserMembership: {
                                id: "3074457362577955410",
                                role: "editor",
                                type: "board_member"
                            },
                            viewLink: "https://miro.com/app/board/uXjVOdef456/",
                            createdAt: "2024-02-01T10:00:00Z",
                            modifiedAt: "2024-03-14T16:45:00Z"
                        }
                    ],
                    total: 2,
                    size: 2,
                    offset: 0,
                    limit: 50
                }
            },
            {
                name: "search_boards",
                description: "Search boards by query",
                input: {
                    query: "Sprint"
                },
                expectedOutput: {
                    data: [
                        {
                            id: "uXjVOabc123",
                            name: "Sprint Planning - Q1 2024",
                            description: "Sprint planning board for Q1 product milestones",
                            team: {
                                id: "3458764512345678",
                                name: "Product Team"
                            },
                            owner: {
                                id: "3074457362577955410",
                                name: "Sarah Chen",
                                type: "user"
                            },
                            currentUserMembership: {
                                id: "3074457362577955410",
                                role: "owner",
                                type: "board_member"
                            },
                            viewLink: "https://miro.com/app/board/uXjVOabc123/",
                            createdAt: "2024-01-15T09:00:00Z",
                            modifiedAt: "2024-03-15T14:30:00Z"
                        }
                    ],
                    total: 1,
                    size: 1,
                    offset: 0,
                    limit: 50
                }
            }
        ],
        errorCases: [
            {
                name: "rate_limited",
                description: "Rate limit exceeded when listing boards",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Miro rate limit exceeded. Retry after 60 seconds.",
                    retryable: true
                }
            },
            {
                name: "unauthorized",
                description: "Authentication token expired",
                input: {},
                expectedError: {
                    type: "server_error",
                    message: "Miro authentication failed. Please reconnect.",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getBoard",
        provider: "miro",
        validCases: [
            {
                name: "get_board_details",
                description: "Retrieve detailed information about a specific board",
                input: {
                    boardId: "uXjVOabc123"
                },
                expectedOutput: {
                    id: "uXjVOabc123",
                    name: "Sprint Planning - Q1 2024",
                    description: "Sprint planning board for Q1 product milestones",
                    team: {
                        id: "3458764512345678",
                        name: "Product Team"
                    },
                    owner: {
                        id: "3074457362577955410",
                        name: "Sarah Chen",
                        type: "user"
                    },
                    currentUserMembership: {
                        id: "3074457362577955410",
                        role: "owner",
                        type: "board_member"
                    },
                    viewLink: "https://miro.com/app/board/uXjVOabc123/",
                    createdAt: "2024-01-15T09:00:00Z",
                    modifiedAt: "2024-03-15T14:30:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "board_not_found",
                description: "Get a non-existent board",
                input: {
                    boardId: "uXjVO_nonexistent"
                },
                expectedError: {
                    type: "not_found",
                    message: "Miro resource not found.",
                    retryable: false
                }
            },
            {
                name: "access_denied",
                description: "User lacks permission to view board",
                input: {
                    boardId: "uXjVO_private999"
                },
                expectedError: {
                    type: "permission",
                    message: "You don't have permission to access this Miro resource.",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "createBoard",
        provider: "miro",
        validCases: [
            {
                name: "create_basic_board",
                description: "Create a new board with just a name",
                input: {
                    name: "Retrospective - Sprint 12"
                },
                expectedOutput: {
                    id: "uXjVOnew789",
                    name: "Retrospective - Sprint 12",
                    description: "",
                    team: {
                        id: "3458764512345678",
                        name: "Product Team"
                    },
                    owner: {
                        id: "3074457362577955410",
                        name: "Sarah Chen",
                        type: "user"
                    },
                    currentUserMembership: {
                        id: "3074457362577955410",
                        role: "owner",
                        type: "board_member"
                    },
                    viewLink: "https://miro.com/app/board/uXjVOnew789/",
                    createdAt: "2024-03-16T10:00:00Z",
                    modifiedAt: "2024-03-16T10:00:00Z"
                }
            },
            {
                name: "create_board_with_description",
                description: "Create a board with name and description",
                input: {
                    name: "Architecture Review",
                    description: "System architecture review for the new microservices migration"
                },
                expectedOutput: {
                    id: "uXjVOnew012",
                    name: "Architecture Review",
                    description: "System architecture review for the new microservices migration",
                    team: {
                        id: "3458764512345678",
                        name: "Product Team"
                    },
                    owner: {
                        id: "3074457362577955410",
                        name: "Sarah Chen",
                        type: "user"
                    },
                    currentUserMembership: {
                        id: "3074457362577955410",
                        role: "owner",
                        type: "board_member"
                    },
                    viewLink: "https://miro.com/app/board/uXjVOnew012/",
                    createdAt: "2024-03-16T10:15:00Z",
                    modifiedAt: "2024-03-16T10:15:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "rate_limited",
                description: "Rate limit exceeded when creating board",
                input: {
                    name: "Rate Limited Board"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Miro rate limit exceeded. Retry after 30 seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "createStickyNote",
        provider: "miro",
        validCases: [
            {
                name: "create_basic_sticky",
                description: "Create a simple sticky note on a board",
                input: {
                    boardId: "uXjVOabc123",
                    content: "Improve onboarding flow for new users"
                },
                expectedOutput: {
                    id: "3458764523456789",
                    type: "sticky_note",
                    data: {
                        content: "Improve onboarding flow for new users",
                        shape: "square"
                    },
                    style: {
                        fillColor: "light_yellow",
                        textAlign: "center",
                        textAlignVertical: "top"
                    },
                    createdAt: "2024-03-16T10:30:00Z",
                    modifiedAt: "2024-03-16T10:30:00Z"
                }
            },
            {
                name: "create_positioned_sticky",
                description: "Create a sticky note at a specific position with custom color",
                input: {
                    boardId: "uXjVOabc123",
                    content: "High priority: Fix checkout bug",
                    x: 500,
                    y: -200,
                    fillColor: "light_pink"
                },
                expectedOutput: {
                    id: "3458764523456790",
                    type: "sticky_note",
                    data: {
                        content: "High priority: Fix checkout bug",
                        shape: "square"
                    },
                    position: {
                        x: 500,
                        y: -200,
                        origin: "center"
                    },
                    style: {
                        fillColor: "light_pink",
                        textAlign: "center",
                        textAlignVertical: "top"
                    },
                    createdAt: "2024-03-16T10:35:00Z",
                    modifiedAt: "2024-03-16T10:35:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "board_not_found",
                description: "Create sticky note on non-existent board",
                input: {
                    boardId: "uXjVO_nonexistent",
                    content: "This will fail"
                },
                expectedError: {
                    type: "not_found",
                    message: "Miro resource not found.",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "createCard",
        provider: "miro",
        validCases: [
            {
                name: "create_basic_card",
                description: "Create a card with title on a board",
                input: {
                    boardId: "uXjVOabc123",
                    title: "Implement user authentication"
                },
                expectedOutput: {
                    id: "3458764523456791",
                    type: "card",
                    data: {
                        title: "Implement user authentication"
                    },
                    style: {
                        cardTheme: "#2d9bf0"
                    },
                    createdAt: "2024-03-16T11:00:00Z",
                    modifiedAt: "2024-03-16T11:00:00Z"
                }
            },
            {
                name: "create_detailed_card",
                description: "Create a card with title, description, and position",
                input: {
                    boardId: "uXjVOabc123",
                    title: "API Rate Limiting",
                    description:
                        "Implement rate limiting for all public API endpoints using token bucket algorithm",
                    x: 1000,
                    y: 500,
                    cardTheme: "#da0063"
                },
                expectedOutput: {
                    id: "3458764523456792",
                    type: "card",
                    data: {
                        title: "API Rate Limiting",
                        description:
                            "Implement rate limiting for all public API endpoints using token bucket algorithm"
                    },
                    position: {
                        x: 1000,
                        y: 500,
                        origin: "center"
                    },
                    style: {
                        cardTheme: "#da0063"
                    },
                    createdAt: "2024-03-16T11:05:00Z",
                    modifiedAt: "2024-03-16T11:05:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "access_denied",
                description: "Create card on a board without write access",
                input: {
                    boardId: "uXjVO_readonly",
                    title: "No write access"
                },
                expectedError: {
                    type: "permission",
                    message: "You don't have permission to access this Miro resource.",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "createShape",
        provider: "miro",
        validCases: [
            {
                name: "create_rectangle",
                description: "Create a rectangle shape on a board",
                input: {
                    boardId: "uXjVOabc123",
                    shape: "rectangle",
                    content: "Start",
                    x: 0,
                    y: 0,
                    fillColor: "#4262ff"
                },
                expectedOutput: {
                    id: "3458764523456793",
                    type: "shape",
                    data: {
                        content: "Start",
                        shape: "rectangle"
                    },
                    position: {
                        x: 0,
                        y: 0,
                        origin: "center"
                    },
                    style: {
                        fillColor: "#4262ff",
                        borderColor: "#1a1a2e",
                        borderWidth: "2.0"
                    },
                    createdAt: "2024-03-16T11:30:00Z",
                    modifiedAt: "2024-03-16T11:30:00Z"
                }
            },
            {
                name: "create_circle",
                description: "Create a circle shape on a board",
                input: {
                    boardId: "uXjVOabc123",
                    shape: "circle",
                    x: 300,
                    y: 0
                },
                expectedOutput: {
                    id: "3458764523456794",
                    type: "shape",
                    data: {
                        shape: "circle"
                    },
                    position: {
                        x: 300,
                        y: 0,
                        origin: "center"
                    },
                    style: {
                        fillColor: "#ffffff",
                        borderColor: "#1a1a2e",
                        borderWidth: "2.0"
                    },
                    createdAt: "2024-03-16T11:35:00Z",
                    modifiedAt: "2024-03-16T11:35:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "board_not_found",
                description: "Create shape on non-existent board",
                input: {
                    boardId: "uXjVO_nonexistent",
                    shape: "rectangle"
                },
                expectedError: {
                    type: "not_found",
                    message: "Miro resource not found.",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getItems",
        provider: "miro",
        validCases: [
            {
                name: "get_all_items",
                description: "Get all items from a board",
                input: {
                    boardId: "uXjVOabc123"
                },
                expectedOutput: {
                    data: [
                        {
                            id: "3458764523456789",
                            type: "sticky_note",
                            data: {
                                content: "Improve onboarding flow for new users",
                                shape: "square"
                            },
                            createdAt: "2024-03-16T10:30:00Z",
                            modifiedAt: "2024-03-16T10:30:00Z"
                        },
                        {
                            id: "3458764523456791",
                            type: "card",
                            data: {
                                title: "Implement user authentication"
                            },
                            createdAt: "2024-03-16T11:00:00Z",
                            modifiedAt: "2024-03-16T11:00:00Z"
                        },
                        {
                            id: "3458764523456793",
                            type: "shape",
                            data: {
                                content: "Start",
                                shape: "rectangle"
                            },
                            createdAt: "2024-03-16T11:30:00Z",
                            modifiedAt: "2024-03-16T11:30:00Z"
                        }
                    ],
                    total: 3,
                    size: 3,
                    limit: 50
                }
            },
            {
                name: "get_sticky_notes_only",
                description: "Get only sticky notes from a board",
                input: {
                    boardId: "uXjVOabc123",
                    type: "sticky_note"
                },
                expectedOutput: {
                    data: [
                        {
                            id: "3458764523456789",
                            type: "sticky_note",
                            data: {
                                content: "Improve onboarding flow for new users",
                                shape: "square"
                            },
                            createdAt: "2024-03-16T10:30:00Z",
                            modifiedAt: "2024-03-16T10:30:00Z"
                        }
                    ],
                    total: 1,
                    size: 1,
                    limit: 50
                }
            }
        ],
        errorCases: [
            {
                name: "board_not_found",
                description: "Get items from a non-existent board",
                input: {
                    boardId: "uXjVO_nonexistent"
                },
                expectedError: {
                    type: "not_found",
                    message: "Miro resource not found.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when getting items",
                input: {
                    boardId: "uXjVOabc123"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Miro rate limit exceeded. Retry after 60 seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "createTag",
        provider: "miro",
        validCases: [
            {
                name: "create_basic_tag",
                description: "Create a tag on a board",
                input: {
                    boardId: "uXjVOabc123",
                    title: "High Priority"
                },
                expectedOutput: {
                    id: "3458764523456800",
                    type: "tag",
                    title: "High Priority",
                    fillColor: "red"
                }
            },
            {
                name: "create_colored_tag",
                description: "Create a tag with a specific color",
                input: {
                    boardId: "uXjVOabc123",
                    title: "In Progress",
                    fillColor: "cyan"
                },
                expectedOutput: {
                    id: "3458764523456801",
                    type: "tag",
                    title: "In Progress",
                    fillColor: "cyan"
                }
            }
        ],
        errorCases: [
            {
                name: "board_not_found",
                description: "Create tag on non-existent board",
                input: {
                    boardId: "uXjVO_nonexistent",
                    title: "Failed Tag"
                },
                expectedError: {
                    type: "not_found",
                    message: "Miro resource not found.",
                    retryable: false
                }
            }
        ]
    }
];
