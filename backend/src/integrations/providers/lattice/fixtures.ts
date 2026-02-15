/**
 * Lattice Provider Test Fixtures
 *
 * Based on Lattice API response types for performance and engagement operations
 */

import type { TestFixture } from "../../sandbox";

/**
 * Sample users for filterableData
 */
const sampleUsers = [
    {
        id: "usr_01H8X9KPZN4Q5R6S7T8U9V0W1X",
        name: "Alice Martin",
        email: "alice.martin@acmecorp.com",
        title: "Senior Software Engineer",
        department: { id: "dept_eng_001", name: "Engineering" },
        managerId: "usr_01H8X9KPZN4Q5R6S7T8U9V0W2Y",
        managerName: "Bob Lee",
        status: "active",
        startDate: "2022-03-15",
        avatarUrl: null,
        _department: "Engineering",
        _status: "active"
    },
    {
        id: "usr_01H8X9KPZN4Q5R6S7T8U9V0W2Y",
        name: "Bob Lee",
        email: "bob.lee@acmecorp.com",
        title: "Engineering Manager",
        department: { id: "dept_eng_001", name: "Engineering" },
        managerId: "usr_01H8X9KPZN4Q5R6S7T8U9V0W3Z",
        managerName: "Carol Davis",
        status: "active",
        startDate: "2021-06-01",
        avatarUrl: null,
        _department: "Engineering",
        _status: "active"
    },
    {
        id: "usr_01H8X9KPZN4Q5R6S7T8U9V0W3Z",
        name: "Carol Davis",
        email: "carol.davis@acmecorp.com",
        title: "VP of Engineering",
        department: { id: "dept_eng_001", name: "Engineering" },
        managerId: null,
        managerName: null,
        status: "active",
        startDate: "2020-01-15",
        avatarUrl: null,
        _department: "Engineering",
        _status: "active"
    },
    {
        id: "usr_01H8X9KPZN4Q5R6S7T8U9V0W4A",
        name: "Diana Kim",
        email: "diana.kim@acmecorp.com",
        title: "Product Designer",
        department: { id: "dept_design_001", name: "Design" },
        managerId: "usr_01H8X9KPZN4Q5R6S7T8U9V0W2Y",
        managerName: "Bob Lee",
        status: "active",
        startDate: "2023-02-01",
        avatarUrl: null,
        _department: "Design",
        _status: "active"
    }
];

/**
 * Sample departments for filterableData
 */
const sampleDepartments = [
    {
        id: "dept_eng_001",
        name: "Engineering",
        parentId: null,
        parentName: null,
        headId: "usr_01H8X9KPZN4Q5R6S7T8U9V0W3Z",
        headName: "Carol Davis",
        memberCount: 35,
        createdAt: "2020-01-01T00:00:00Z",
        updatedAt: "2024-01-15T10:30:00Z"
    },
    {
        id: "dept_design_001",
        name: "Design",
        parentId: "dept_eng_001",
        parentName: "Engineering",
        headId: "usr_01H8X9KPZN4Q5R6S7T8U9V0W4A",
        headName: "Diana Kim",
        memberCount: 8,
        createdAt: "2021-06-15T00:00:00Z",
        updatedAt: "2024-01-20T09:00:00Z"
    },
    {
        id: "dept_mkt_001",
        name: "Marketing",
        parentId: null,
        parentName: null,
        headId: null,
        headName: null,
        memberCount: 12,
        createdAt: "2020-01-01T00:00:00Z",
        updatedAt: "2024-02-01T14:00:00Z"
    }
];

export const latticeFixtures: TestFixture[] = [
    {
        operationId: "listUsers",
        provider: "lattice",
        filterableData: {
            records: sampleUsers,
            recordsField: "users",
            offsetField: "nextOffset",
            defaultPageSize: 50,
            maxPageSize: 100,
            pageSizeParam: "limit",
            filterConfig: {
                type: "generic",
                filterableFields: ["_department", "_status"]
            }
        },
        validCases: [
            {
                name: "list_all_users",
                description: "List all users in Lattice",
                input: {}
            },
            {
                name: "list_users_with_pagination",
                description: "List users with custom page size",
                input: {
                    limit: 10,
                    offset: 0
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_pagination",
                description: "Invalid pagination parameters",
                input: {
                    limit: 500
                },
                expectedError: {
                    type: "validation",
                    message: "Limit must be between 1 and 100",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after 60 seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getUser",
        provider: "lattice",
        validCases: [
            {
                name: "get_user_details",
                description: "Get detailed user information by ID",
                input: {
                    userId: "usr_01H8X9KPZN4Q5R6S7T8U9V0W1X"
                },
                expectedOutput: {
                    id: "usr_01H8X9KPZN4Q5R6S7T8U9V0W1X",
                    name: "Alice Martin",
                    email: "alice.martin@acmecorp.com",
                    title: "Senior Software Engineer",
                    department: { id: "dept_eng_001", name: "Engineering" },
                    managerId: "usr_01H8X9KPZN4Q5R6S7T8U9V0W2Y",
                    managerName: "Bob Lee",
                    status: "active",
                    startDate: "2022-03-15",
                    avatarUrl: null,
                    createdAt: "2022-03-10T08:00:00Z",
                    updatedAt: "2024-01-15T14:30:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "User does not exist",
                input: {
                    userId: "usr_nonexistent_123"
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
                    userId: "usr_01H8X9KPZN4Q5R6S7T8U9V0W1X"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after 60 seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listGoals",
        provider: "lattice",
        validCases: [
            {
                name: "list_all_goals",
                description: "List all goals",
                input: {},
                expectedOutput: {
                    goals: [
                        {
                            id: "goal_01H8X9KPZN4Q5R6S7T8U9V0W1X",
                            title: "Increase platform reliability to 99.9%",
                            description: "Improve uptime and reduce incidents",
                            ownerId: "usr_01H8X9KPZN4Q5R6S7T8U9V0W3Z",
                            ownerName: "Carol Davis",
                            status: "on_track",
                            progress: 72,
                            dueDate: "2024-06-30",
                            parentGoalId: null,
                            keyResults: [
                                {
                                    id: "kr_001",
                                    title: "Reduce P1 incidents by 50%",
                                    currentValue: 3,
                                    targetValue: 2,
                                    unit: "incidents/month"
                                }
                            ]
                        }
                    ],
                    pagination: {
                        total: 1,
                        limit: 50,
                        offset: 0,
                        hasMore: false
                    }
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
                    message: "Rate limit exceeded. Please retry after 60 seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getGoal",
        provider: "lattice",
        validCases: [
            {
                name: "get_goal_details",
                description: "Get detailed goal information",
                input: {
                    goalId: "goal_01H8X9KPZN4Q5R6S7T8U9V0W1X"
                },
                expectedOutput: {
                    id: "goal_01H8X9KPZN4Q5R6S7T8U9V0W1X",
                    title: "Increase platform reliability to 99.9%",
                    description: "Improve uptime and reduce incidents",
                    ownerId: "usr_01H8X9KPZN4Q5R6S7T8U9V0W3Z",
                    ownerName: "Carol Davis",
                    status: "on_track",
                    progress: 72,
                    dueDate: "2024-06-30",
                    parentGoalId: null,
                    keyResults: [
                        {
                            id: "kr_001",
                            title: "Reduce P1 incidents by 50%",
                            currentValue: 3,
                            targetValue: 2,
                            unit: "incidents/month"
                        }
                    ],
                    createdAt: "2024-01-05T09:00:00Z",
                    updatedAt: "2024-02-01T15:30:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Goal does not exist",
                input: {
                    goalId: "goal_nonexistent_123"
                },
                expectedError: {
                    type: "not_found",
                    message: "Goal not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "createGoal",
        provider: "lattice",
        validCases: [
            {
                name: "create_goal",
                description: "Create a new goal",
                input: {
                    title: "Ship v2.0 by Q2",
                    ownerId: "usr_01H8X9KPZN4Q5R6S7T8U9V0W1X",
                    description: "Complete and launch version 2.0",
                    dueDate: "2024-06-30"
                },
                expectedOutput: {
                    id: "goal_new_001",
                    title: "Ship v2.0 by Q2",
                    description: "Complete and launch version 2.0",
                    ownerId: "usr_01H8X9KPZN4Q5R6S7T8U9V0W1X",
                    ownerName: "Alice Martin",
                    status: "not_started",
                    progress: 0,
                    dueDate: "2024-06-30",
                    parentGoalId: null,
                    keyResults: [],
                    createdAt: "2024-02-01T10:00:00Z",
                    updatedAt: null
                }
            }
        ],
        errorCases: [
            {
                name: "missing_title",
                description: "Title is required",
                input: {
                    ownerId: "usr_01H8X9KPZN4Q5R6S7T8U9V0W1X"
                },
                expectedError: {
                    type: "validation",
                    message: "Title is required",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "updateGoal",
        provider: "lattice",
        validCases: [
            {
                name: "update_goal_progress",
                description: "Update goal progress and status",
                input: {
                    goalId: "goal_01H8X9KPZN4Q5R6S7T8U9V0W1X",
                    progress: 85,
                    status: "on_track"
                },
                expectedOutput: {
                    id: "goal_01H8X9KPZN4Q5R6S7T8U9V0W1X",
                    title: "Increase platform reliability to 99.9%",
                    description: "Improve uptime and reduce incidents",
                    ownerId: "usr_01H8X9KPZN4Q5R6S7T8U9V0W3Z",
                    ownerName: "Carol Davis",
                    status: "on_track",
                    progress: 85,
                    dueDate: "2024-06-30",
                    parentGoalId: null,
                    keyResults: [],
                    createdAt: "2024-01-05T09:00:00Z",
                    updatedAt: "2024-02-15T11:00:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Goal does not exist",
                input: {
                    goalId: "goal_nonexistent_123",
                    progress: 50
                },
                expectedError: {
                    type: "not_found",
                    message: "Goal not found",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "listReviewCycles",
        provider: "lattice",
        validCases: [
            {
                name: "list_all_review_cycles",
                description: "List all review cycles",
                input: {},
                expectedOutput: {
                    reviewCycles: [
                        {
                            id: "rc_01H8X9KPZN4Q5R6S7T8U9V0W1X",
                            name: "Q1 2024 Performance Review",
                            status: "active",
                            startDate: "2024-01-15",
                            endDate: "2024-02-15",
                            reviewType: "performance",
                            participantCount: 120,
                            completedCount: 85,
                            createdAt: "2024-01-10T09:00:00Z",
                            updatedAt: "2024-02-01T14:00:00Z"
                        },
                        {
                            id: "rc_01H8X9KPZN4Q5R6S7T8U9V0W2Y",
                            name: "Mid-Year 2024 360 Review",
                            status: "draft",
                            startDate: "2024-06-01",
                            endDate: "2024-07-01",
                            reviewType: "360",
                            participantCount: 0,
                            completedCount: 0,
                            createdAt: "2024-01-20T10:00:00Z",
                            updatedAt: null
                        }
                    ],
                    pagination: {
                        total: 2,
                        limit: 50,
                        offset: 0,
                        hasMore: false
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "unauthorized",
                description: "Invalid or expired API key",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "Invalid API key or insufficient permissions",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after 60 seconds.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listDepartments",
        provider: "lattice",
        filterableData: {
            records: sampleDepartments,
            recordsField: "departments",
            offsetField: "nextOffset",
            defaultPageSize: 50,
            maxPageSize: 100,
            pageSizeParam: "limit",
            filterConfig: {
                type: "generic",
                filterableFields: ["name"]
            }
        },
        validCases: [
            {
                name: "list_all_departments",
                description: "List all departments",
                input: {}
            },
            {
                name: "list_departments_paginated",
                description: "List departments with pagination",
                input: {
                    limit: 10,
                    offset: 0
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
                    message: "Rate limit exceeded. Please retry after 60 seconds.",
                    retryable: true
                }
            }
        ]
    }
];
