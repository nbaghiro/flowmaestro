/**
 * ClickUp Provider Test Fixtures
 *
 * Based on official ClickUp API documentation:
 * - API Reference: https://clickup.com/api
 * - Tasks: https://clickup.com/api/clickupreference/operation/CreateTask/
 * - Comments: https://clickup.com/api/clickupreference/operation/CreateTaskComment/
 * - Hierarchy: https://clickup.com/api/clickupreference/operation/GetSpaces/
 */

import type { TestFixture } from "../../sandbox";

export const clickupFixtures: TestFixture[] = [
    // =========================================================================
    // Comments Operations
    // =========================================================================
    {
        operationId: "createTaskComment",
        provider: "clickup",
        validCases: [
            {
                name: "basic_comment",
                description: "Add a simple comment to a task",
                input: {
                    taskId: "abc123xyz",
                    commentText: "Great progress on this task! Let me know if you need any help."
                },
                expectedOutput: {
                    id: "comment-90080001",
                    commentText: "Great progress on this task! Let me know if you need any help.",
                    user: {
                        id: 12345678,
                        username: "sarah.chen",
                        email: "sarah.chen@acmecorp.com"
                    },
                    date: "1706640000000",
                    resolved: false,
                    assignee: null
                }
            }
        ],
        errorCases: [
            {
                name: "task_not_found",
                description: "Task does not exist",
                input: {
                    taskId: "nonexistent-task-id",
                    commentText: "This will fail"
                },
                expectedError: {
                    type: "not_found",
                    message: "Task not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    taskId: "abc123xyz",
                    commentText: "Test comment"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after a short delay.",
                    retryable: true
                }
            },
            {
                name: "empty_comment",
                description: "Comment text is empty",
                input: {
                    taskId: "abc123xyz",
                    commentText: ""
                },
                expectedError: {
                    type: "validation",
                    message: "Comment text cannot be empty",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getTaskComments",
        provider: "clickup",
        validCases: [
            {
                name: "task_with_comments",
                description: "Get all comments on a task",
                input: {
                    taskId: "abc123xyz"
                },
                expectedOutput: {
                    comments: [
                        {
                            id: "comment-90080001",
                            commentText: "Started working on this. The database schema looks good.",
                            user: {
                                id: 12345678,
                                username: "sarah.chen",
                                email: "sarah.chen@acmecorp.com"
                            },
                            date: "1706540000000",
                            resolved: false,
                            assignee: null,
                            reactions: []
                        },
                        {
                            id: "comment-90080002",
                            commentText: "Great! Let me know when it is ready for code review.",
                            user: {
                                id: 87654321,
                                username: "mike.johnson",
                                email: "mike.johnson@acmecorp.com"
                            },
                            date: "1706550000000",
                            resolved: false,
                            assignee: null,
                            reactions: [
                                {
                                    reaction: "thumbsup",
                                    user: "sarah.chen"
                                }
                            ]
                        },
                        {
                            id: "comment-90080003",
                            commentText: "PR is up: https://github.com/acme/project/pull/142",
                            user: {
                                id: 12345678,
                                username: "sarah.chen",
                                email: "sarah.chen@acmecorp.com"
                            },
                            date: "1706640000000",
                            resolved: true,
                            assignee: {
                                id: 87654321,
                                username: "mike.johnson"
                            },
                            reactions: []
                        }
                    ],
                    count: 3
                }
            }
        ],
        errorCases: [
            {
                name: "task_not_found",
                description: "Task does not exist",
                input: {
                    taskId: "nonexistent-task-id"
                },
                expectedError: {
                    type: "not_found",
                    message: "Task not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    taskId: "abc123xyz"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after a short delay.",
                    retryable: true
                }
            }
        ]
    },

    // =========================================================================
    // Hierarchy Operations
    // =========================================================================
    {
        operationId: "getLists",
        provider: "clickup",
        validCases: [
            {
                name: "lists_from_folder",
                description: "Get all lists in a folder",
                input: {
                    folderId: "folder-90020001"
                },
                expectedOutput: {
                    lists: [
                        {
                            id: "list-90030001",
                            name: "Sprint 23 - API Development",
                            orderindex: 0,
                            content: "Tasks for API development in Sprint 23",
                            status: {
                                status: "green",
                                color: "#6bc950"
                            },
                            priority: {
                                priority: "high",
                                color: "#f9d900"
                            },
                            taskCount: 12,
                            dueDate: "1707436800000",
                            startDate: "1706832000000",
                            archived: false,
                            folder: {
                                id: "folder-90020001",
                                name: "Sprints"
                            },
                            space: {
                                id: "space-90010001",
                                name: "Engineering"
                            },
                            statuses: [
                                { status: "to do", type: "open", color: "#d3d3d3" },
                                { status: "in progress", type: "custom", color: "#4194f6" },
                                { status: "review", type: "custom", color: "#a142f4" },
                                { status: "complete", type: "closed", color: "#6bc950" }
                            ]
                        },
                        {
                            id: "list-90030002",
                            name: "Sprint 23 - Frontend",
                            orderindex: 1,
                            content: "Frontend tasks for Sprint 23",
                            status: {
                                status: "yellow",
                                color: "#f9d900"
                            },
                            priority: {
                                priority: "normal",
                                color: "#808080"
                            },
                            taskCount: 8,
                            dueDate: "1707436800000",
                            startDate: "1706832000000",
                            archived: false,
                            folder: {
                                id: "folder-90020001",
                                name: "Sprints"
                            },
                            space: {
                                id: "space-90010001",
                                name: "Engineering"
                            },
                            statuses: [
                                { status: "to do", type: "open", color: "#d3d3d3" },
                                { status: "in progress", type: "custom", color: "#4194f6" },
                                { status: "review", type: "custom", color: "#a142f4" },
                                { status: "complete", type: "closed", color: "#6bc950" }
                            ]
                        }
                    ],
                    count: 2
                }
            }
        ],
        errorCases: [
            {
                name: "missing_folder_and_space",
                description: "Neither folderId nor spaceId provided",
                input: {},
                expectedError: {
                    type: "validation",
                    message: "Either folderId or spaceId must be provided",
                    retryable: false
                }
            },
            {
                name: "folder_not_found",
                description: "Folder does not exist",
                input: {
                    folderId: "nonexistent-folder"
                },
                expectedError: {
                    type: "not_found",
                    message: "Folder not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    folderId: "folder-90020001"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after a short delay.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getSpaces",
        provider: "clickup",
        validCases: [
            {
                name: "workspace_spaces",
                description: "Get all spaces in a workspace",
                input: {
                    workspaceId: "workspace-9001"
                },
                expectedOutput: {
                    spaces: [
                        {
                            id: "space-90010001",
                            name: "Engineering",
                            private: false,
                            archived: false,
                            statuses: [
                                { status: "to do", type: "open", color: "#d3d3d3" },
                                { status: "in progress", type: "custom", color: "#4194f6" },
                                { status: "review", type: "custom", color: "#a142f4" },
                                { status: "complete", type: "closed", color: "#6bc950" }
                            ],
                            features: {
                                dueDates: true,
                                sprints: true,
                                timeTracking: true,
                                points: true,
                                priorities: true,
                                tags: true,
                                milestones: true
                            }
                        },
                        {
                            id: "space-90010002",
                            name: "Product",
                            private: false,
                            archived: false,
                            statuses: [
                                { status: "Backlog", type: "open", color: "#d3d3d3" },
                                { status: "In Design", type: "custom", color: "#ff7fab" },
                                { status: "Ready for Dev", type: "custom", color: "#f9d900" },
                                { status: "Shipped", type: "closed", color: "#6bc950" }
                            ],
                            features: {
                                dueDates: true,
                                sprints: false,
                                timeTracking: false,
                                points: false,
                                priorities: true,
                                tags: true,
                                milestones: true
                            }
                        },
                        {
                            id: "space-90010003",
                            name: "Marketing",
                            private: true,
                            archived: false,
                            statuses: [
                                { status: "To Do", type: "open", color: "#d3d3d3" },
                                { status: "In Progress", type: "custom", color: "#4194f6" },
                                { status: "Done", type: "closed", color: "#6bc950" }
                            ],
                            features: {
                                dueDates: true,
                                sprints: false,
                                timeTracking: false,
                                points: false,
                                priorities: true,
                                tags: true,
                                milestones: false
                            }
                        }
                    ],
                    count: 3
                }
            }
        ],
        errorCases: [
            {
                name: "workspace_not_found",
                description: "Workspace does not exist",
                input: {
                    workspaceId: "nonexistent-workspace"
                },
                expectedError: {
                    type: "not_found",
                    message: "Team not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    workspaceId: "workspace-9001"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after a short delay.",
                    retryable: true
                }
            },
            {
                name: "permission",
                description: "No access to workspace",
                input: {
                    workspaceId: "workspace-restricted"
                },
                expectedError: {
                    type: "permission",
                    message: "You do not have access to this workspace",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getWorkspaces",
        provider: "clickup",
        validCases: [
            {
                name: "user_workspaces",
                description: "Get all workspaces the user has access to",
                input: {},
                expectedOutput: {
                    workspaces: [
                        {
                            id: "workspace-9001",
                            name: "Acme Corporation",
                            color: "#7B68EE",
                            avatar: "https://attachments.clickup.com/avatar/acme.png",
                            memberCount: 45
                        },
                        {
                            id: "workspace-9002",
                            name: "Side Project",
                            color: "#FF6B6B",
                            avatar: null,
                            memberCount: 3
                        },
                        {
                            id: "workspace-9003",
                            name: "Freelance Clients",
                            color: "#4ECDC4",
                            avatar: null,
                            memberCount: 8
                        }
                    ],
                    count: 3
                }
            }
        ],
        errorCases: [
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after a short delay.",
                    retryable: true
                }
            },
            {
                name: "permission",
                description: "Invalid or expired API token",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "Invalid or expired API token",
                    retryable: false
                }
            }
        ]
    },

    // =========================================================================
    // Task Operations
    // =========================================================================
    {
        operationId: "createTask",
        provider: "clickup",
        validCases: [
            {
                name: "simple_task",
                description: "Create a simple task with just a name",
                input: {
                    listId: "list-90030001",
                    name: "Implement user authentication"
                },
                expectedOutput: {
                    id: "abc123xyz",
                    name: "Implement user authentication",
                    status: "to do",
                    url: "https://app.clickup.com/t/abc123xyz",
                    dateCreated: "1706640000000",
                    creator: "sarah.chen",
                    list: "Sprint 23 - API Development"
                }
            }
        ],
        errorCases: [
            {
                name: "list_not_found",
                description: "List does not exist",
                input: {
                    listId: "nonexistent-list",
                    name: "Test task"
                },
                expectedError: {
                    type: "not_found",
                    message: "List not found",
                    retryable: false
                }
            },
            {
                name: "invalid_priority",
                description: "Priority value out of valid range",
                input: {
                    listId: "list-90030001",
                    name: "Test task",
                    priority: 10
                },
                expectedError: {
                    type: "validation",
                    message: "Priority must be between 1 (Urgent) and 4 (Low)",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    listId: "list-90030001",
                    name: "Test task"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after a short delay.",
                    retryable: true
                }
            },
            {
                name: "name_too_long",
                description: "Task name exceeds maximum length",
                input: {
                    listId: "list-90030001",
                    name: "A".repeat(300)
                },
                expectedError: {
                    type: "validation",
                    message: "Task name must be 255 characters or less",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "deleteTask",
        provider: "clickup",
        validCases: [
            {
                name: "delete_existing_task",
                description: "Delete a task by ID",
                input: {
                    taskId: "abc123xyz"
                },
                expectedOutput: {
                    deleted: true,
                    taskId: "abc123xyz"
                }
            }
        ],
        errorCases: [
            {
                name: "task_not_found",
                description: "Task does not exist",
                input: {
                    taskId: "nonexistent-task-id"
                },
                expectedError: {
                    type: "not_found",
                    message: "Task not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    taskId: "abc123xyz"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after a short delay.",
                    retryable: true
                }
            },
            {
                name: "permission",
                description: "User does not have permission to delete task",
                input: {
                    taskId: "restricted-task-id"
                },
                expectedError: {
                    type: "permission",
                    message: "You do not have permission to delete this task",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getTask",
        provider: "clickup",
        validCases: [
            {
                name: "get_task_full_details",
                description: "Get a task with all details",
                input: {
                    taskId: "abc123xyz"
                },
                expectedOutput: {
                    id: "abc123xyz",
                    customId: "PROJ-142",
                    name: "Implement user authentication",
                    description: "Add OAuth2 authentication flow with Google and GitHub support.",
                    status: "in progress",
                    statusColor: "#4194f6",
                    priority: {
                        id: "2",
                        priority: "high",
                        color: "#f9d900"
                    },
                    creator: {
                        id: 12345678,
                        username: "sarah.chen",
                        email: "sarah.chen@acmecorp.com"
                    },
                    assignees: [
                        {
                            id: 12345678,
                            username: "sarah.chen",
                            email: "sarah.chen@acmecorp.com"
                        },
                        {
                            id: 87654321,
                            username: "mike.johnson",
                            email: "mike.johnson@acmecorp.com"
                        }
                    ],
                    tags: ["permission", "backend", "security"],
                    dueDate: "1707436800000",
                    startDate: "1706832000000",
                    dateCreated: "1706540000000",
                    dateUpdated: "1706640000000",
                    dateClosed: null,
                    archived: false,
                    url: "https://app.clickup.com/t/abc123xyz",
                    list: {
                        id: "list-90030001",
                        name: "Sprint 23 - API Development"
                    },
                    folder: {
                        id: "folder-90020001",
                        name: "Sprints"
                    },
                    space: {
                        id: "space-90010001"
                    },
                    timeEstimate: 28800000,
                    timeSpent: 14400000,
                    points: 5,
                    parent: null
                }
            }
        ],
        errorCases: [
            {
                name: "task_not_found",
                description: "Task does not exist",
                input: {
                    taskId: "nonexistent-task-id"
                },
                expectedError: {
                    type: "not_found",
                    message: "Task not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    taskId: "abc123xyz"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after a short delay.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getTasks",
        provider: "clickup",
        validCases: [
            {
                name: "list_all_tasks",
                description: "Get all tasks from a list",
                input: {
                    listId: "list-90030001"
                },
                expectedOutput: {
                    tasks: [
                        {
                            id: "abc123xyz",
                            customId: "PROJ-142",
                            name: "Implement user authentication",
                            status: "in progress",
                            priority: "high",
                            assignees: [
                                { id: 12345678, username: "sarah.chen" },
                                { id: 87654321, username: "mike.johnson" }
                            ],
                            tags: ["permission", "backend", "security"],
                            dueDate: "1707436800000",
                            startDate: "1706832000000",
                            dateCreated: "1706540000000",
                            dateUpdated: "1706640000000",
                            archived: false,
                            url: "https://app.clickup.com/t/abc123xyz"
                        },
                        {
                            id: "def456uvw",
                            customId: "PROJ-143",
                            name: "Add rate limiting to API",
                            status: "to do",
                            priority: "normal",
                            assignees: [{ id: 87654321, username: "mike.johnson" }],
                            tags: ["api", "performance"],
                            dueDate: "1707523200000",
                            startDate: null,
                            dateCreated: "1706550000000",
                            dateUpdated: "1706550000000",
                            archived: false,
                            url: "https://app.clickup.com/t/def456uvw"
                        },
                        {
                            id: "ghi789rst",
                            customId: "PROJ-144",
                            name: "Write API documentation",
                            status: "review",
                            priority: "low",
                            assignees: [{ id: 12345678, username: "sarah.chen" }],
                            tags: ["documentation"],
                            dueDate: "1707609600000",
                            startDate: "1706659200000",
                            dateCreated: "1706560000000",
                            dateUpdated: "1706660000000",
                            archived: false,
                            url: "https://app.clickup.com/t/ghi789rst"
                        }
                    ],
                    lastPage: true,
                    count: 3
                }
            }
        ],
        errorCases: [
            {
                name: "list_not_found",
                description: "List does not exist",
                input: {
                    listId: "nonexistent-list"
                },
                expectedError: {
                    type: "not_found",
                    message: "List not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    listId: "list-90030001"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after a short delay.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "updateTask",
        provider: "clickup",
        validCases: [
            {
                name: "update_name_and_description",
                description: "Update task name and description",
                input: {
                    taskId: "abc123xyz",
                    name: "Implement user authentication with SSO",
                    description: "Updated requirements: Add SSO support for enterprise customers"
                },
                expectedOutput: {
                    id: "abc123xyz",
                    name: "Implement user authentication with SSO",
                    status: "in progress",
                    priority: "high",
                    url: "https://app.clickup.com/t/abc123xyz",
                    dateUpdated: "1706730000000",
                    assignees: [
                        { id: 12345678, username: "sarah.chen" },
                        { id: 87654321, username: "mike.johnson" }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "task_not_found",
                description: "Task does not exist",
                input: {
                    taskId: "nonexistent-task-id",
                    name: "Updated name"
                },
                expectedError: {
                    type: "not_found",
                    message: "Task not found",
                    retryable: false
                }
            },
            {
                name: "invalid_status",
                description: "Status does not exist in list",
                input: {
                    taskId: "abc123xyz",
                    status: "invalid-status"
                },
                expectedError: {
                    type: "validation",
                    message: "Status 'invalid-status' is not valid for this list",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    taskId: "abc123xyz",
                    name: "Updated name"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after a short delay.",
                    retryable: true
                }
            },
            {
                name: "permission",
                description: "User does not have permission to update task",
                input: {
                    taskId: "restricted-task",
                    name: "Try to update"
                },
                expectedError: {
                    type: "permission",
                    message: "You do not have permission to update this task",
                    retryable: false
                }
            }
        ]
    }
];
