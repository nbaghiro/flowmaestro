/**
 * Monday.com Provider Test Fixtures
 *
 * Based on Monday.com API documentation:
 * - Boards: https://developer.monday.com/api-reference/reference/boards
 * - Items: https://developer.monday.com/api-reference/reference/items
 * - Groups: https://developer.monday.com/api-reference/reference/groups
 */

import type { TestFixture } from "../../sandbox";

/**
 * Sample boards for filterable data
 */
const sampleBoards = [
    {
        id: "1234567890",
        name: "Product Roadmap",
        description: "Q1 2024 Product Planning",
        state: "active",
        board_kind: "public",
        board_folder_id: "folder_001",
        workspace_id: "12345",
        permissions: "everyone",
        _type: "main"
    },
    {
        id: "1234567891",
        name: "Engineering Tasks",
        description: "Development sprint board",
        state: "active",
        board_kind: "private",
        board_folder_id: null,
        workspace_id: "12345",
        permissions: "owners",
        _type: "main"
    },
    {
        id: "1234567892",
        name: "Marketing Campaigns",
        description: "Active marketing initiatives",
        state: "active",
        board_kind: "share",
        board_folder_id: "folder_002",
        workspace_id: "12346",
        permissions: "everyone",
        _type: "main"
    },
    {
        id: "1234567893",
        name: "Archived Projects",
        description: "Completed projects archive",
        state: "archived",
        board_kind: "public",
        board_folder_id: null,
        workspace_id: "12345",
        permissions: "everyone",
        _type: "archive"
    }
];

/**
 * Sample items for filterable data
 */
const sampleItems = [
    {
        id: "9876543210",
        name: "Implement user authentication",
        state: "active",
        board_id: "1234567890",
        group_id: "new_group",
        _status: "working_on_it"
    },
    {
        id: "9876543211",
        name: "Design landing page",
        state: "active",
        board_id: "1234567890",
        group_id: "new_group",
        _status: "done"
    },
    {
        id: "9876543212",
        name: "Write API documentation",
        state: "active",
        board_id: "1234567890",
        group_id: "completed_group",
        _status: "stuck"
    }
];

export const mondayFixtures: TestFixture[] = [
    {
        operationId: "archiveBoard",
        provider: "monday",
        validCases: [
            {
                name: "archive_active_board",
                description: "Archive an active board",
                input: {
                    board_id: "1234567890"
                },
                expectedOutput: {
                    id: "1234567890",
                    state: "archived"
                }
            },
            {
                name: "archive_shared_board",
                description: "Archive a shared board",
                input: {
                    board_id: "1234567892"
                },
                expectedOutput: {
                    id: "1234567892",
                    state: "archived"
                }
            }
        ],
        errorCases: [
            {
                name: "board_not_found",
                description: "Board does not exist",
                input: {
                    board_id: "9999999999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Board with ID 9999999999 not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded (complexity budget exhausted)",
                input: {
                    board_id: "1234567890"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Complexity budget exhausted. Reset in 60 seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "createBoard",
        provider: "monday",
        validCases: [
            {
                name: "create_public_board",
                description: "Create a new public board",
                input: {
                    board_name: "New Project Board",
                    board_kind: "public",
                    description: "Board for tracking the new project"
                },
                expectedOutput: {
                    id: "1234567894",
                    name: "New Project Board",
                    description: "Board for tracking the new project",
                    state: "active",
                    board_kind: "public",
                    workspace_id: null
                }
            },
            {
                name: "create_private_board_in_workspace",
                description: "Create a private board in a specific workspace",
                input: {
                    board_name: "Team Sprint Board",
                    board_kind: "private",
                    description: "Sprint planning for the team",
                    workspace_id: "12345"
                },
                expectedOutput: {
                    id: "1234567895",
                    name: "Team Sprint Board",
                    description: "Sprint planning for the team",
                    state: "active",
                    board_kind: "private",
                    workspace_id: "12345"
                }
            },
            {
                name: "create_board_from_template",
                description: "Create a board from a template",
                input: {
                    board_name: "Customer Onboarding",
                    board_kind: "share",
                    template_id: "template_001",
                    folder_id: "folder_003"
                },
                expectedOutput: {
                    id: "1234567896",
                    name: "Customer Onboarding",
                    description: null,
                    state: "active",
                    board_kind: "share",
                    workspace_id: null
                }
            }
        ],
        errorCases: [
            {
                name: "workspace_not_found",
                description: "Workspace does not exist",
                input: {
                    board_name: "Test Board",
                    board_kind: "public",
                    workspace_id: "99999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Workspace not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    board_name: "Test Board",
                    board_kind: "public"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "deleteBoard",
        provider: "monday",
        validCases: [
            {
                name: "delete_board",
                description: "Permanently delete a board",
                input: {
                    board_id: "1234567893"
                },
                expectedOutput: {
                    id: "1234567893",
                    state: "deleted"
                }
            },
            {
                name: "delete_private_board",
                description: "Delete a private board",
                input: {
                    board_id: "1234567891"
                },
                expectedOutput: {
                    id: "1234567891",
                    state: "deleted"
                }
            }
        ],
        errorCases: [
            {
                name: "board_not_found",
                description: "Board does not exist",
                input: {
                    board_id: "9999999999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Board with ID 9999999999 not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    board_id: "1234567890"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "duplicateBoard",
        provider: "monday",
        validCases: [
            {
                name: "duplicate_structure_only",
                description: "Duplicate board with structure only",
                input: {
                    board_id: "1234567890",
                    duplicate_type: "duplicate_board_with_structure",
                    board_name: "Product Roadmap Copy"
                },
                expectedOutput: {
                    id: "1234567897",
                    name: "Product Roadmap Copy"
                }
            },
            {
                name: "duplicate_with_items",
                description: "Duplicate board with items",
                input: {
                    board_id: "1234567890",
                    duplicate_type: "duplicate_board_with_pulses",
                    workspace_id: "12346"
                },
                expectedOutput: {
                    id: "1234567898",
                    name: "Product Roadmap (copy)"
                }
            },
            {
                name: "duplicate_with_items_and_updates",
                description: "Duplicate board with items and updates",
                input: {
                    board_id: "1234567890",
                    duplicate_type: "duplicate_board_with_pulses_and_updates",
                    keep_subscribers: true
                },
                expectedOutput: {
                    id: "1234567899",
                    name: "Product Roadmap (copy)"
                }
            }
        ],
        errorCases: [
            {
                name: "board_not_found",
                description: "Source board does not exist",
                input: {
                    board_id: "9999999999",
                    duplicate_type: "duplicate_board_with_structure"
                },
                expectedError: {
                    type: "not_found",
                    message: "Board with ID 9999999999 not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    board_id: "1234567890",
                    duplicate_type: "duplicate_board_with_structure"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getBoard",
        provider: "monday",
        validCases: [
            {
                name: "get_board_full_details",
                description: "Get board with all details",
                input: {
                    board_id: "1234567890"
                },
                expectedOutput: {
                    id: "1234567890",
                    name: "Product Roadmap",
                    description: "Q1 2024 Product Planning",
                    state: "active",
                    board_kind: "public",
                    board_folder_id: "folder_001",
                    workspace_id: "12345",
                    permissions: "everyone",
                    columns: [
                        {
                            id: "status",
                            title: "Status",
                            type: "status",
                            settings_str: '{"labels":{"0":"Working on it","1":"Done","2":"Stuck"}}'
                        },
                        {
                            id: "person",
                            title: "Owner",
                            type: "people",
                            settings_str: "{}"
                        },
                        {
                            id: "date4",
                            title: "Due Date",
                            type: "date",
                            settings_str: "{}"
                        }
                    ],
                    groups: [
                        {
                            id: "new_group",
                            title: "To Do",
                            color: "#579bfc",
                            position: "0"
                        },
                        {
                            id: "completed_group",
                            title: "Completed",
                            color: "#00c875",
                            position: "1"
                        }
                    ],
                    owners: [
                        {
                            id: "12345678",
                            name: "John Smith",
                            email: "john@example.com"
                        }
                    ]
                }
            },
            {
                name: "get_private_board",
                description: "Get a private board",
                input: {
                    board_id: "1234567891"
                },
                expectedOutput: {
                    id: "1234567891",
                    name: "Engineering Tasks",
                    description: "Development sprint board",
                    state: "active",
                    board_kind: "private",
                    board_folder_id: null,
                    workspace_id: "12345",
                    permissions: "owners",
                    columns: [],
                    groups: [],
                    owners: []
                }
            }
        ],
        errorCases: [
            {
                name: "board_not_found",
                description: "Board does not exist",
                input: {
                    board_id: "9999999999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Board with ID 9999999999 not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    board_id: "1234567890"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listBoards",
        provider: "monday",
        filterableData: {
            records: sampleBoards,
            recordsField: "boards",
            defaultPageSize: 25,
            maxPageSize: 100,
            pageSizeParam: "limit",
            filterConfig: {
                type: "generic",
                filterableFields: ["state", "board_kind", "_type"]
            }
        },
        validCases: [
            {
                name: "list_all_boards",
                description: "List all boards",
                input: {
                    limit: 25
                }
            },
            {
                name: "list_active_boards",
                description: "List only active boards",
                input: {
                    state: "active",
                    limit: 50
                }
            },
            {
                name: "list_boards_by_workspace",
                description: "List boards in a specific workspace",
                input: {
                    workspace_ids: ["12345"],
                    limit: 25
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_workspace",
                description: "Invalid workspace ID",
                input: {
                    workspace_ids: ["invalid"],
                    limit: 25
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid workspace ID format",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    limit: 25
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "updateBoard",
        provider: "monday",
        validCases: [
            {
                name: "update_board_name",
                description: "Update board name",
                input: {
                    board_id: "1234567890",
                    board_attribute: "name",
                    new_value: "Updated Product Roadmap"
                },
                expectedOutput: {
                    success: true
                }
            },
            {
                name: "update_board_description",
                description: "Update board description",
                input: {
                    board_id: "1234567890",
                    board_attribute: "description",
                    new_value: "Updated Q1 2024 Product Planning"
                },
                expectedOutput: {
                    success: true
                }
            }
        ],
        errorCases: [
            {
                name: "board_not_found",
                description: "Board does not exist",
                input: {
                    board_id: "9999999999",
                    board_attribute: "name",
                    new_value: "Test"
                },
                expectedError: {
                    type: "not_found",
                    message: "Board with ID 9999999999 not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    board_id: "1234567890",
                    board_attribute: "name",
                    new_value: "Test"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "changeColumnValue",
        provider: "monday",
        validCases: [
            {
                name: "change_status_column",
                description: "Change a status column value",
                input: {
                    board_id: "1234567890",
                    item_id: "9876543210",
                    column_id: "status",
                    value: '{"label":"Done"}'
                },
                expectedOutput: {
                    id: "9876543210",
                    name: "Implement user authentication"
                }
            },
            {
                name: "change_date_column",
                description: "Change a date column value",
                input: {
                    board_id: "1234567890",
                    item_id: "9876543210",
                    column_id: "date4",
                    value: '{"date":"2024-03-15"}'
                },
                expectedOutput: {
                    id: "9876543210",
                    name: "Implement user authentication"
                }
            }
        ],
        errorCases: [
            {
                name: "item_not_found",
                description: "Item does not exist",
                input: {
                    board_id: "1234567890",
                    item_id: "9999999999",
                    column_id: "status",
                    value: '{"label":"Done"}'
                },
                expectedError: {
                    type: "not_found",
                    message: "Item not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    board_id: "1234567890",
                    item_id: "9876543210",
                    column_id: "status",
                    value: '{"label":"Done"}'
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "changeSimpleColumnValue",
        provider: "monday",
        validCases: [
            {
                name: "change_text_column",
                description: "Change a text column with simple value",
                input: {
                    board_id: "1234567890",
                    item_id: "9876543210",
                    column_id: "text_col",
                    value: "Updated text value"
                },
                expectedOutput: {
                    id: "9876543210",
                    name: "Implement user authentication"
                }
            },
            {
                name: "change_number_column",
                description: "Change a number column with simple value",
                input: {
                    board_id: "1234567890",
                    item_id: "9876543210",
                    column_id: "numbers",
                    value: "42"
                },
                expectedOutput: {
                    id: "9876543210",
                    name: "Implement user authentication"
                }
            }
        ],
        errorCases: [
            {
                name: "item_not_found",
                description: "Item does not exist",
                input: {
                    board_id: "1234567890",
                    item_id: "9999999999",
                    column_id: "text_col",
                    value: "Test"
                },
                expectedError: {
                    type: "not_found",
                    message: "Item not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    board_id: "1234567890",
                    item_id: "9876543210",
                    column_id: "text_col",
                    value: "Test"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "createColumn",
        provider: "monday",
        validCases: [
            {
                name: "create_status_column",
                description: "Create a new status column",
                input: {
                    board_id: "1234567890",
                    title: "Priority",
                    column_type: "status",
                    description: "Task priority level"
                },
                expectedOutput: {
                    id: "priority_col",
                    title: "Priority",
                    type: "status"
                }
            },
            {
                name: "create_date_column",
                description: "Create a new date column",
                input: {
                    board_id: "1234567890",
                    title: "Start Date",
                    column_type: "date"
                },
                expectedOutput: {
                    id: "start_date",
                    title: "Start Date",
                    type: "date"
                }
            },
            {
                name: "create_people_column",
                description: "Create a new people column",
                input: {
                    board_id: "1234567890",
                    title: "Assignee",
                    column_type: "people",
                    description: "Person assigned to this task"
                },
                expectedOutput: {
                    id: "assignee",
                    title: "Assignee",
                    type: "people"
                }
            }
        ],
        errorCases: [
            {
                name: "board_not_found",
                description: "Board does not exist",
                input: {
                    board_id: "9999999999",
                    title: "Test Column",
                    column_type: "text"
                },
                expectedError: {
                    type: "not_found",
                    message: "Board not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    board_id: "1234567890",
                    title: "Test Column",
                    column_type: "text"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "deleteColumn",
        provider: "monday",
        validCases: [
            {
                name: "delete_column",
                description: "Delete a column from board",
                input: {
                    board_id: "1234567890",
                    column_id: "old_column"
                },
                expectedOutput: {
                    id: "old_column"
                }
            },
            {
                name: "delete_custom_column",
                description: "Delete a custom column",
                input: {
                    board_id: "1234567890",
                    column_id: "custom_col_123"
                },
                expectedOutput: {
                    id: "custom_col_123"
                }
            }
        ],
        errorCases: [
            {
                name: "column_not_found",
                description: "Column does not exist",
                input: {
                    board_id: "1234567890",
                    column_id: "nonexistent"
                },
                expectedError: {
                    type: "not_found",
                    message: "Column not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    board_id: "1234567890",
                    column_id: "old_column"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listColumns",
        provider: "monday",
        validCases: [
            {
                name: "list_board_columns",
                description: "List all columns on a board",
                input: {
                    board_id: "1234567890"
                },
                expectedOutput: {
                    columns: [
                        {
                            id: "name",
                            title: "Name",
                            type: "name",
                            settings_str: "{}"
                        },
                        {
                            id: "status",
                            title: "Status",
                            type: "status",
                            settings_str: '{"labels":{"0":"Working on it","1":"Done","2":"Stuck"}}'
                        },
                        {
                            id: "person",
                            title: "Owner",
                            type: "people",
                            settings_str: "{}"
                        },
                        {
                            id: "date4",
                            title: "Due Date",
                            type: "date",
                            settings_str: "{}"
                        }
                    ]
                }
            },
            {
                name: "list_columns_empty_board",
                description: "List columns on a board with minimal setup",
                input: {
                    board_id: "1234567891"
                },
                expectedOutput: {
                    columns: [
                        {
                            id: "name",
                            title: "Name",
                            type: "name",
                            settings_str: "{}"
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "board_not_found",
                description: "Board does not exist",
                input: {
                    board_id: "9999999999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Board not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    board_id: "1234567890"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "archiveGroup",
        provider: "monday",
        validCases: [
            {
                name: "archive_group",
                description: "Archive a group on a board",
                input: {
                    board_id: "1234567890",
                    group_id: "completed_group"
                },
                expectedOutput: {
                    id: "completed_group",
                    archived: true
                }
            },
            {
                name: "archive_empty_group",
                description: "Archive an empty group",
                input: {
                    board_id: "1234567890",
                    group_id: "empty_group"
                },
                expectedOutput: {
                    id: "empty_group",
                    archived: true
                }
            }
        ],
        errorCases: [
            {
                name: "group_not_found",
                description: "Group does not exist",
                input: {
                    board_id: "1234567890",
                    group_id: "nonexistent"
                },
                expectedError: {
                    type: "not_found",
                    message: "Group not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    board_id: "1234567890",
                    group_id: "completed_group"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "createGroup",
        provider: "monday",
        validCases: [
            {
                name: "create_group",
                description: "Create a new group on a board",
                input: {
                    board_id: "1234567890",
                    group_name: "In Progress"
                },
                expectedOutput: {
                    id: "in_progress_group",
                    title: "In Progress"
                }
            },
            {
                name: "create_colored_group",
                description: "Create a group with a specific color",
                input: {
                    board_id: "1234567890",
                    group_name: "High Priority",
                    group_color: "e2445c"
                },
                expectedOutput: {
                    id: "high_priority_group",
                    title: "High Priority",
                    color: "#e2445c"
                }
            }
        ],
        errorCases: [
            {
                name: "board_not_found",
                description: "Board does not exist",
                input: {
                    board_id: "9999999999",
                    group_name: "Test Group"
                },
                expectedError: {
                    type: "not_found",
                    message: "Board not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    board_id: "1234567890",
                    group_name: "Test Group"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "deleteGroup",
        provider: "monday",
        validCases: [
            {
                name: "delete_group",
                description: "Delete a group and its items",
                input: {
                    board_id: "1234567890",
                    group_id: "old_group"
                },
                expectedOutput: {
                    id: "old_group",
                    deleted: true
                }
            },
            {
                name: "delete_archived_group",
                description: "Delete an archived group",
                input: {
                    board_id: "1234567890",
                    group_id: "archived_group"
                },
                expectedOutput: {
                    id: "archived_group",
                    deleted: true
                }
            }
        ],
        errorCases: [
            {
                name: "group_not_found",
                description: "Group does not exist",
                input: {
                    board_id: "1234567890",
                    group_id: "nonexistent"
                },
                expectedError: {
                    type: "not_found",
                    message: "Group not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    board_id: "1234567890",
                    group_id: "old_group"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "duplicateGroup",
        provider: "monday",
        validCases: [
            {
                name: "duplicate_group",
                description: "Duplicate a group on a board",
                input: {
                    board_id: "1234567890",
                    group_id: "new_group"
                },
                expectedOutput: {
                    id: "new_group_copy",
                    title: "To Do (copy)"
                }
            },
            {
                name: "duplicate_group_with_title",
                description: "Duplicate a group with custom title",
                input: {
                    board_id: "1234567890",
                    group_id: "new_group",
                    group_title: "Q2 Tasks",
                    add_to_top: true
                },
                expectedOutput: {
                    id: "q2_tasks",
                    title: "Q2 Tasks"
                }
            }
        ],
        errorCases: [
            {
                name: "group_not_found",
                description: "Group does not exist",
                input: {
                    board_id: "1234567890",
                    group_id: "nonexistent"
                },
                expectedError: {
                    type: "not_found",
                    message: "Group not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    board_id: "1234567890",
                    group_id: "new_group"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listGroups",
        provider: "monday",
        validCases: [
            {
                name: "list_board_groups",
                description: "List all groups on a board",
                input: {
                    board_id: "1234567890"
                },
                expectedOutput: {
                    groups: [
                        {
                            id: "new_group",
                            title: "To Do",
                            color: "#579bfc",
                            position: "0"
                        },
                        {
                            id: "completed_group",
                            title: "Completed",
                            color: "#00c875",
                            position: "1"
                        }
                    ]
                }
            },
            {
                name: "list_groups_single",
                description: "List groups on a board with one group",
                input: {
                    board_id: "1234567891"
                },
                expectedOutput: {
                    groups: [
                        {
                            id: "default_group",
                            title: "Group Title",
                            color: "#579bfc",
                            position: "0"
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "board_not_found",
                description: "Board does not exist",
                input: {
                    board_id: "9999999999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Board not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    board_id: "1234567890"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "updateGroup",
        provider: "monday",
        validCases: [
            {
                name: "update_group_title",
                description: "Update group title",
                input: {
                    board_id: "1234567890",
                    group_id: "new_group",
                    group_attribute: "title",
                    new_value: "Backlog"
                },
                expectedOutput: {
                    id: "new_group",
                    title: "Backlog"
                }
            },
            {
                name: "update_group_color",
                description: "Update group color",
                input: {
                    board_id: "1234567890",
                    group_id: "new_group",
                    group_attribute: "color",
                    new_value: "#ff642e"
                },
                expectedOutput: {
                    id: "new_group",
                    color: "#ff642e"
                }
            }
        ],
        errorCases: [
            {
                name: "group_not_found",
                description: "Group does not exist",
                input: {
                    board_id: "1234567890",
                    group_id: "nonexistent",
                    group_attribute: "title",
                    new_value: "Test"
                },
                expectedError: {
                    type: "not_found",
                    message: "Group not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    board_id: "1234567890",
                    group_id: "new_group",
                    group_attribute: "title",
                    new_value: "Test"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "archiveItem",
        provider: "monday",
        validCases: [
            {
                name: "archive_item",
                description: "Archive an item",
                input: {
                    item_id: "9876543211"
                },
                expectedOutput: {
                    id: "9876543211",
                    state: "archived"
                }
            },
            {
                name: "archive_completed_item",
                description: "Archive a completed item",
                input: {
                    item_id: "9876543212"
                },
                expectedOutput: {
                    id: "9876543212",
                    state: "archived"
                }
            }
        ],
        errorCases: [
            {
                name: "item_not_found",
                description: "Item does not exist",
                input: {
                    item_id: "9999999999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Item with ID 9999999999 not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    item_id: "9876543210"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "createItem",
        provider: "monday",
        validCases: [
            {
                name: "create_item_simple",
                description: "Create a simple item",
                input: {
                    board_id: "1234567890",
                    item_name: "New feature request"
                },
                expectedOutput: {
                    id: "9876543213",
                    name: "New feature request",
                    state: "active",
                    board: {
                        id: "1234567890",
                        name: "Product Roadmap"
                    },
                    group: null
                }
            },
            {
                name: "create_item_with_group",
                description: "Create an item in a specific group",
                input: {
                    board_id: "1234567890",
                    item_name: "Bug fix: login issue",
                    group_id: "new_group"
                },
                expectedOutput: {
                    id: "9876543214",
                    name: "Bug fix: login issue",
                    state: "active",
                    board: {
                        id: "1234567890",
                        name: "Product Roadmap"
                    },
                    group: {
                        id: "new_group",
                        title: "To Do"
                    }
                }
            },
            {
                name: "create_item_with_column_values",
                description: "Create an item with column values",
                input: {
                    board_id: "1234567890",
                    item_name: "API integration",
                    group_id: "new_group",
                    column_values: {
                        status: { label: "Working on it" },
                        date4: { date: "2024-04-01" }
                    }
                },
                expectedOutput: {
                    id: "9876543215",
                    name: "API integration",
                    state: "active",
                    board: {
                        id: "1234567890",
                        name: "Product Roadmap"
                    },
                    group: {
                        id: "new_group",
                        title: "To Do"
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "board_not_found",
                description: "Board does not exist",
                input: {
                    board_id: "9999999999",
                    item_name: "Test item"
                },
                expectedError: {
                    type: "not_found",
                    message: "Board not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    board_id: "1234567890",
                    item_name: "Test item"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "deleteItem",
        provider: "monday",
        validCases: [
            {
                name: "delete_item",
                description: "Permanently delete an item",
                input: {
                    item_id: "9876543212"
                },
                expectedOutput: {
                    id: "9876543212"
                }
            },
            {
                name: "delete_archived_item",
                description: "Delete an archived item",
                input: {
                    item_id: "9876543211"
                },
                expectedOutput: {
                    id: "9876543211"
                }
            }
        ],
        errorCases: [
            {
                name: "item_not_found",
                description: "Item does not exist",
                input: {
                    item_id: "9999999999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Item with ID 9999999999 not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    item_id: "9876543210"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "duplicateItem",
        provider: "monday",
        validCases: [
            {
                name: "duplicate_item",
                description: "Duplicate an item",
                input: {
                    board_id: "1234567890",
                    item_id: "9876543210"
                },
                expectedOutput: {
                    id: "9876543216",
                    name: "Implement user authentication (copy)"
                }
            },
            {
                name: "duplicate_item_with_updates",
                description: "Duplicate an item including updates",
                input: {
                    board_id: "1234567890",
                    item_id: "9876543210",
                    with_updates: true
                },
                expectedOutput: {
                    id: "9876543217",
                    name: "Implement user authentication (copy)"
                }
            }
        ],
        errorCases: [
            {
                name: "item_not_found",
                description: "Item does not exist",
                input: {
                    board_id: "1234567890",
                    item_id: "9999999999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Item not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    board_id: "1234567890",
                    item_id: "9876543210"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getItem",
        provider: "monday",
        validCases: [
            {
                name: "get_item_full",
                description: "Get item with full details",
                input: {
                    item_id: "9876543210"
                },
                expectedOutput: {
                    id: "9876543210",
                    name: "Implement user authentication",
                    state: "active",
                    board: {
                        id: "1234567890",
                        name: "Product Roadmap"
                    },
                    group: {
                        id: "new_group",
                        title: "To Do"
                    },
                    column_values: [
                        {
                            id: "status",
                            type: "status",
                            text: "Working on it",
                            value: '{"index":0}'
                        },
                        {
                            id: "person",
                            type: "people",
                            text: "John Smith",
                            value: '{"personsAndTeams":[{"id":12345678,"kind":"person"}]}'
                        }
                    ],
                    creator: {
                        id: "12345678",
                        name: "John Smith",
                        email: "john@example.com"
                    },
                    created_at: "2024-01-15T10:00:00Z",
                    updated_at: "2024-01-20T14:30:00Z"
                }
            },
            {
                name: "get_item_minimal",
                description: "Get item with minimal column values",
                input: {
                    item_id: "9876543211"
                },
                expectedOutput: {
                    id: "9876543211",
                    name: "Design landing page",
                    state: "active",
                    board: {
                        id: "1234567890",
                        name: "Product Roadmap"
                    },
                    group: {
                        id: "new_group",
                        title: "To Do"
                    },
                    column_values: [],
                    creator: null,
                    created_at: "2024-01-10T09:00:00Z",
                    updated_at: null
                }
            }
        ],
        errorCases: [
            {
                name: "item_not_found",
                description: "Item does not exist",
                input: {
                    item_id: "9999999999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Item with ID 9999999999 not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    item_id: "9876543210"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listItems",
        provider: "monday",
        filterableData: {
            records: sampleItems,
            recordsField: "items",
            defaultPageSize: 100,
            maxPageSize: 500,
            pageSizeParam: "limit",
            filterConfig: {
                type: "generic",
                filterableFields: ["state", "_status", "group_id"]
            }
        },
        validCases: [
            {
                name: "list_board_items",
                description: "List all items on a board",
                input: {
                    board_id: "1234567890",
                    limit: 100
                }
            },
            {
                name: "list_items_by_group",
                description: "List items in a specific group",
                input: {
                    board_id: "1234567890",
                    group_id: "new_group",
                    limit: 50
                }
            }
        ],
        errorCases: [
            {
                name: "board_not_found",
                description: "Board does not exist",
                input: {
                    board_id: "9999999999",
                    limit: 100
                },
                expectedError: {
                    type: "not_found",
                    message: "Board not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    board_id: "1234567890",
                    limit: 100
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "moveItemToBoard",
        provider: "monday",
        validCases: [
            {
                name: "move_item_to_board",
                description: "Move item to a different board",
                input: {
                    item_id: "9876543210",
                    board_id: "1234567891",
                    group_id: "default_group"
                },
                expectedOutput: {
                    id: "9876543210",
                    board_id: "1234567891"
                }
            },
            {
                name: "move_item_to_board_with_group",
                description: "Move item to a specific group on another board",
                input: {
                    item_id: "9876543211",
                    board_id: "1234567892",
                    group_id: "marketing_group"
                },
                expectedOutput: {
                    id: "9876543211",
                    board_id: "1234567892"
                }
            }
        ],
        errorCases: [
            {
                name: "item_not_found",
                description: "Item does not exist",
                input: {
                    item_id: "9999999999",
                    board_id: "1234567891",
                    group_id: "default_group"
                },
                expectedError: {
                    type: "not_found",
                    message: "Item not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    item_id: "9876543210",
                    board_id: "1234567891",
                    group_id: "default_group"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "moveItemToGroup",
        provider: "monday",
        validCases: [
            {
                name: "move_item_to_group",
                description: "Move item to a different group",
                input: {
                    item_id: "9876543210",
                    group_id: "completed_group"
                },
                expectedOutput: {
                    id: "9876543210"
                }
            },
            {
                name: "move_item_to_new_group",
                description: "Move item to a newly created group",
                input: {
                    item_id: "9876543211",
                    group_id: "in_progress_group"
                },
                expectedOutput: {
                    id: "9876543211"
                }
            }
        ],
        errorCases: [
            {
                name: "group_not_found",
                description: "Target group does not exist",
                input: {
                    item_id: "9876543210",
                    group_id: "nonexistent"
                },
                expectedError: {
                    type: "not_found",
                    message: "Group not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    item_id: "9876543210",
                    group_id: "completed_group"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "updateItem",
        provider: "monday",
        validCases: [
            {
                name: "update_item_columns",
                description: "Update item column values",
                input: {
                    board_id: "1234567890",
                    item_id: "9876543210",
                    column_values: {
                        status: { label: "Done" },
                        date4: { date: "2024-02-28" }
                    }
                },
                expectedOutput: {
                    id: "9876543210",
                    name: "Implement user authentication"
                }
            },
            {
                name: "update_single_column",
                description: "Update a single column value",
                input: {
                    board_id: "1234567890",
                    item_id: "9876543211",
                    column_values: {
                        status: { label: "Working on it" }
                    }
                },
                expectedOutput: {
                    id: "9876543211",
                    name: "Design landing page"
                }
            }
        ],
        errorCases: [
            {
                name: "item_not_found",
                description: "Item does not exist",
                input: {
                    board_id: "1234567890",
                    item_id: "9999999999",
                    column_values: {
                        status: { label: "Done" }
                    }
                },
                expectedError: {
                    type: "not_found",
                    message: "Item not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    board_id: "1234567890",
                    item_id: "9876543210",
                    column_values: {
                        status: { label: "Done" }
                    }
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listTags",
        provider: "monday",
        validCases: [
            {
                name: "list_board_tags",
                description: "List all tags on a board",
                input: {
                    board_id: "1234567890"
                },
                expectedOutput: {
                    tags: [
                        { id: "101", name: "urgent", color: "#e2445c" },
                        { id: "102", name: "bug", color: "#ff642e" },
                        { id: "103", name: "feature", color: "#00c875" },
                        { id: "104", name: "documentation", color: "#579bfc" }
                    ]
                }
            },
            {
                name: "list_tags_empty",
                description: "List tags on a board with no tags",
                input: {
                    board_id: "1234567891"
                },
                expectedOutput: {
                    tags: []
                }
            }
        ],
        errorCases: [
            {
                name: "board_not_found",
                description: "Board does not exist",
                input: {
                    board_id: "9999999999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Board not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    board_id: "1234567890"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listTeams",
        provider: "monday",
        validCases: [
            {
                name: "list_all_teams",
                description: "List all teams in the account",
                input: {
                    limit: 50
                },
                expectedOutput: {
                    teams: [
                        { id: "201", name: "Engineering", picture_url: null },
                        { id: "202", name: "Product", picture_url: null },
                        { id: "203", name: "Marketing", picture_url: null },
                        { id: "204", name: "Design", picture_url: null }
                    ]
                }
            },
            {
                name: "list_teams_paginated",
                description: "List teams with pagination",
                input: {
                    limit: 2,
                    page: 1
                },
                expectedOutput: {
                    teams: [
                        { id: "201", name: "Engineering", picture_url: null },
                        { id: "202", name: "Product", picture_url: null }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "unauthorized",
                description: "Not authorized to list teams",
                input: {
                    limit: 50
                },
                expectedError: {
                    type: "permission",
                    message: "Access denied",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    limit: 50
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "createUpdate",
        provider: "monday",
        validCases: [
            {
                name: "create_update",
                description: "Add an update to an item",
                input: {
                    item_id: "9876543210",
                    body: "Started working on this task. ETA: 2 days."
                },
                expectedOutput: {
                    id: "update_001",
                    body: "Started working on this task. ETA: 2 days.",
                    created_at: "2024-01-20T10:00:00Z"
                }
            },
            {
                name: "create_update_with_html",
                description: "Add an update with HTML formatting",
                input: {
                    item_id: "9876543211",
                    body: "<p>Completed the <strong>design</strong> phase.</p><ul><li>Logo finalized</li><li>Color scheme approved</li></ul>"
                },
                expectedOutput: {
                    id: "update_002",
                    body: "<p>Completed the <strong>design</strong> phase.</p><ul><li>Logo finalized</li><li>Color scheme approved</li></ul>",
                    created_at: "2024-01-20T11:00:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "item_not_found",
                description: "Item does not exist",
                input: {
                    item_id: "9999999999",
                    body: "Test update"
                },
                expectedError: {
                    type: "not_found",
                    message: "Item not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    item_id: "9876543210",
                    body: "Test update"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "deleteUpdate",
        provider: "monday",
        validCases: [
            {
                name: "delete_update",
                description: "Delete an update from an item",
                input: {
                    update_id: "update_001"
                },
                expectedOutput: {
                    id: "update_001"
                }
            },
            {
                name: "delete_old_update",
                description: "Delete an old update",
                input: {
                    update_id: "update_old_123"
                },
                expectedOutput: {
                    id: "update_old_123"
                }
            }
        ],
        errorCases: [
            {
                name: "update_not_found",
                description: "Update does not exist",
                input: {
                    update_id: "nonexistent"
                },
                expectedError: {
                    type: "not_found",
                    message: "Update not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    update_id: "update_001"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listUpdates",
        provider: "monday",
        validCases: [
            {
                name: "list_item_updates",
                description: "List all updates on an item",
                input: {
                    item_id: "9876543210",
                    limit: 25
                },
                expectedOutput: {
                    updates: [
                        {
                            id: "update_001",
                            body: "Started working on this task. ETA: 2 days.",
                            creator: { id: "12345678", name: "John Smith" },
                            created_at: "2024-01-20T10:00:00Z"
                        },
                        {
                            id: "update_002",
                            body: "Making good progress. 50% complete.",
                            creator: { id: "12345678", name: "John Smith" },
                            created_at: "2024-01-21T14:00:00Z"
                        }
                    ]
                }
            },
            {
                name: "list_updates_empty",
                description: "List updates on an item with no updates",
                input: {
                    item_id: "9876543212",
                    limit: 25
                },
                expectedOutput: {
                    updates: []
                }
            }
        ],
        errorCases: [
            {
                name: "item_not_found",
                description: "Item does not exist",
                input: {
                    item_id: "9999999999",
                    limit: 25
                },
                expectedError: {
                    type: "not_found",
                    message: "Item not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    item_id: "9876543210",
                    limit: 25
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getCurrentUser",
        provider: "monday",
        validCases: [
            {
                name: "get_current_user",
                description: "Get the authenticated user's profile",
                input: {},
                expectedOutput: {
                    user: {
                        id: "12345678",
                        name: "John Smith",
                        email: "john@example.com",
                        photo_thumb: "https://files.monday.com/users/12345678/small.jpg",
                        title: "Software Engineer",
                        account: {
                            id: "98765",
                            name: "Acme Corp",
                            slug: "acme-corp"
                        },
                        teams: [
                            { id: "201", name: "Engineering" },
                            { id: "202", name: "Product" }
                        ]
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "unauthorized",
                description: "Invalid or expired token",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "Invalid API token",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getUser",
        provider: "monday",
        validCases: [
            {
                name: "get_user_by_id",
                description: "Get a specific user by ID",
                input: {
                    user_id: "12345678"
                },
                expectedOutput: {
                    id: "12345678",
                    name: "John Smith",
                    email: "john@example.com",
                    photo_thumb: "https://files.monday.com/users/12345678/small.jpg",
                    title: "Software Engineer",
                    enabled: true,
                    is_admin: false,
                    is_guest: false
                }
            },
            {
                name: "get_guest_user",
                description: "Get a guest user",
                input: {
                    user_id: "12345680"
                },
                expectedOutput: {
                    id: "12345680",
                    name: "External Contractor",
                    email: "contractor@external.com",
                    photo_thumb: null,
                    title: "Contractor",
                    enabled: true,
                    is_admin: false,
                    is_guest: true
                }
            }
        ],
        errorCases: [
            {
                name: "user_not_found",
                description: "User does not exist",
                input: {
                    user_id: "9999999999"
                },
                expectedError: {
                    type: "not_found",
                    message: "User not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    user_id: "12345678"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listUsers",
        provider: "monday",
        validCases: [
            {
                name: "list_all_users",
                description: "List all users in the account",
                input: {
                    limit: 50
                },
                expectedOutput: {
                    users: [
                        { id: "12345678", name: "John Smith", email: "john@example.com" },
                        { id: "12345679", name: "Jane Doe", email: "jane@example.com" },
                        { id: "12345680", name: "Mike Wilson", email: "mike@example.com" }
                    ]
                }
            },
            {
                name: "list_non_guest_users",
                description: "List only non-guest users",
                input: {
                    kind: "non_guests",
                    limit: 50
                },
                expectedOutput: {
                    users: [
                        { id: "12345678", name: "John Smith", email: "john@example.com" },
                        { id: "12345679", name: "Jane Doe", email: "jane@example.com" }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "unauthorized",
                description: "Not authorized to list users",
                input: {
                    limit: 50
                },
                expectedError: {
                    type: "permission",
                    message: "Access denied",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    limit: 50
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getWorkspace",
        provider: "monday",
        validCases: [
            {
                name: "get_workspace",
                description: "Get a specific workspace",
                input: {
                    workspace_id: "12345"
                },
                expectedOutput: {
                    id: "12345",
                    name: "Engineering Workspace",
                    kind: "open",
                    description: "Workspace for engineering team projects"
                }
            },
            {
                name: "get_closed_workspace",
                description: "Get a closed workspace",
                input: {
                    workspace_id: "12346"
                },
                expectedOutput: {
                    id: "12346",
                    name: "Marketing Workspace",
                    kind: "closed",
                    description: "Private workspace for marketing"
                }
            }
        ],
        errorCases: [
            {
                name: "workspace_not_found",
                description: "Workspace does not exist",
                input: {
                    workspace_id: "99999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Workspace not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    workspace_id: "12345"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listWorkspaces",
        provider: "monday",
        validCases: [
            {
                name: "list_all_workspaces",
                description: "List all workspaces",
                input: {
                    limit: 50
                },
                expectedOutput: {
                    workspaces: [
                        { id: "12345", name: "Engineering Workspace", kind: "open" },
                        { id: "12346", name: "Marketing Workspace", kind: "closed" },
                        { id: "12347", name: "Main Workspace", kind: "open" }
                    ]
                }
            },
            {
                name: "list_workspaces_paginated",
                description: "List workspaces with pagination",
                input: {
                    limit: 2,
                    page: 1
                },
                expectedOutput: {
                    workspaces: [
                        { id: "12345", name: "Engineering Workspace", kind: "open" },
                        { id: "12346", name: "Marketing Workspace", kind: "closed" }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "unauthorized",
                description: "Not authorized to list workspaces",
                input: {
                    limit: 50
                },
                expectedError: {
                    type: "permission",
                    message: "Access denied",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    limit: 50
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    }
];
